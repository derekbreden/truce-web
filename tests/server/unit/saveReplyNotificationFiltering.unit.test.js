// Test for saveReply.js notification filtering based on WebSocket connection
process.env.FIREBASE_CREDENTIAL = JSON.stringify({
	type: "service_account",
	project_id: "test-project",
	private_key_id: "test-key-id",
	private_key: "-----BEGIN PRIVATE KEY-----\ntest-private-key\n-----END PRIVATE KEY-----\n",
	client_email: "test@test-project.iam.gserviceaccount.com",
	client_id: "test-client-id",
	auth_uri: "https://accounts.google.com/o/oauth2/auth",
	token_uri: "https://oauth2.googleapis.com/token",
	auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
	client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/test%40test-project.iam.gserviceaccount.com"
})
process.env.VAPID_PUBLIC_KEY = "test-vapid-public-key"
process.env.VAPID_PRIVATE_KEY = "test-vapid-private-key"

// Mock external dependencies
const mock_s3_client = {
	send: async () => ({ $metadata: { httpStatusCode: 200 } })
}

const aws_s3_path = require.resolve("@aws-sdk/client-s3")
delete require.cache[aws_s3_path]
require.cache[aws_s3_path] = {
	exports: {
		S3Client: function() { return mock_s3_client },
		GetObjectCommand: function() {},
		PutObjectCommand: function() {},
		DeleteObjectCommand: function() {}
	},
	loaded: true,
	id: aws_s3_path
}

const mock_ai = {
	ask: async () => JSON.stringify({ keyword: "OK" })
}
const ai_path = require.resolve("../../../server/ai")
delete require.cache[ai_path]
require.cache[ai_path] = {
	exports: mock_ai,
	loaded: true,
	id: ai_path
}

const mock_crypto = {
	randomUUID: () => "test-uuid-123"
}
const node_crypto_path = "node:crypto"
delete require.cache[node_crypto_path]
require.cache[node_crypto_path] = {
	exports: mock_crypto,
	loaded: true,
	id: node_crypto_path
}

// Track push notification calls
let web_push_calls = []
let fcm_send_calls = []

const mock_web_push = {
	setVapidDetails: () => {},
	sendNotification: async (subscription, payload) => {
		web_push_calls.push({ subscription, payload })
		return Promise.resolve()
	}
}
const web_push_path = require.resolve("web-push")
delete require.cache[web_push_path]
require.cache[web_push_path] = {
	exports: mock_web_push,
	loaded: true,
	id: web_push_path
}

const mock_fcm_messaging = {
	send: async (message) => {
		fcm_send_calls.push(message)
		return "fcm-message-id-123"
	}
}

const mock_firebase_admin = {
	credential: { cert: () => ({}) }
}
const mock_firebase_app = {
	initializeApp: () => ({}),
	getMessaging: () => mock_fcm_messaging
}

const firebase_admin_path = require.resolve("firebase-admin")
const firebase_app_path = require.resolve("firebase-admin/app")
const firebase_messaging_path = require.resolve("firebase-admin/messaging")

delete require.cache[firebase_admin_path]
delete require.cache[firebase_app_path]
delete require.cache[firebase_messaging_path]

require.cache[firebase_admin_path] = { exports: mock_firebase_admin, loaded: true, id: firebase_admin_path }
require.cache[firebase_app_path] = { exports: mock_firebase_app, loaded: true, id: firebase_app_path }
require.cache[firebase_messaging_path] = { exports: mock_firebase_app, loaded: true, id: firebase_messaging_path }

// Track WebSocket calls and instant alerts
let websocket_calls = []
let instant_alert_calls = []

const mock_websocket = {
	hasActiveWebSocketConnection: (user_id) => {
		websocket_calls.push({ function: "hasActiveWebSocketConnection", user_id })
		// Return true for "active-user-123", false for others
		return user_id === "active-user-123"
	},
	sendInstantAlert: (user_id, message, notification_data, context_id) => {
		instant_alert_calls.push({ user_id, message, notification_data, context_id })
		return true
	}
}

const websocket_path = require.resolve("../../../server/websocket")
delete require.cache[websocket_path]
require.cache[websocket_path] = {
	exports: mock_websocket,
	loaded: true,
	id: websocket_path
}

const { createMockRequest, createMockResponse, assertEquals, runTests } = require("../shared/serverTestSetup.js")

// Import saveReply after mocking
const save_reply_path = require.resolve("../../../server/session/saveReply.js")
delete require.cache[save_reply_path]
const saveReply = require("../../../server/session/saveReply.js")

async function testActiveUserGetsInstantAlert() {
	// Reset tracking
	websocket_calls = []
	instant_alert_calls = []
	web_push_calls = []
	fcm_send_calls = []
	
	const req = createMockRequest(
		{ 
			display_name: "Active User",
			body: "Test reply from active user",
			path: "/post/test-slug",
			pngs: []
		},
		{ 
			session_id: "123",
			user_id: "456",
			display_name: "Active User"
		}
	)
	
	req.sendWsMessage = () => {}
	
	// Setup minimal database mocks
	req.client.addQueryMock("SELECT post_id as post_id", { rows: [{ post_id: 789 }] })
	req.client.addQueryMock("SELECT\n        t.title,", { 
		rows: [{
			title: "Test Post",
			body: "Test body",
			note: null,
			display_name: "Post Author",
			image_uuids: null
		}]
	})
	req.client.addQueryMock("INSERT INTO replies", { rows: [{ reply_id: 123 }] })
	req.client.addQueryMock("UPDATE replies", { rows: [] })
	req.client.addQueryMock("UPDATE users", { rows: [] })
	req.client.addQueryMock("UPDATE posts", { rows: [] })
	
	// Mock subscription for active user
	req.client.addQueryMock("SELECT\n        user_id,", { 
		rows: [{ user_id: "active-user-123", subscription_json: `{"endpoint":"test"}`, fcm_token: null }]
	})
	req.client.addQueryMock("SELECT user_id\n      FROM posts", { rows: [{ user_id: "active-user-123" }] })
	req.client.addQueryMock("INSERT INTO reply_notifications", { rows: [] })
	req.client.addQueryMock("UPDATE reply_notifications", { rows: [] }) // For marking as read
	req.client.addQueryMock("SELECT COUNT(*) AS unread_count", { rows: [{ unread_count: 1 }] }) // For instant alert
	
	const res = createMockResponse()
	
	// Execute handler
	await saveReply(req, res)
	
	// Allow async operations to complete
	await new Promise(resolve => setTimeout(resolve, 50))
	
	// Verify WebSocket check was called
	assertEquals(1, websocket_calls.length, "Should check WebSocket connection")
	assertEquals("active-user-123", websocket_calls[0].user_id, "Should check for correct user")
	
	// For active users: should send instant alert, not push notification
	assertEquals(1, instant_alert_calls.length, "Should send instant alert for active user")
	assertEquals(0, web_push_calls.length, "Should NOT send web push for active user")
	assertEquals(0, fcm_send_calls.length, "Should NOT send FCM for active user")
	
	// Verify instant alert content
	const alert = instant_alert_calls[0]
	assertEquals("active-user-123", alert.user_id, "Should alert correct user")
	assertEquals(true, alert.message.includes("Active User"), "Should include display name in message")
	assertEquals(true, alert.message.includes("replied"), "Should indicate it's a reply")
}

async function testInactiveUserGetsPushNotification() {
	// Reset tracking
	websocket_calls = []
	instant_alert_calls = []
	web_push_calls = []
	fcm_send_calls = []
	
	const req = createMockRequest(
		{ 
			display_name: "Inactive User",
			body: "Test reply from inactive user",
			path: "/post/test-slug",
			pngs: []
		},
		{ 
			session_id: "456",
			user_id: "789",
			display_name: "Inactive User"
		}
	)
	
	req.sendWsMessage = () => {}
	
	// Setup minimal database mocks
	req.client.addQueryMock("SELECT post_id as post_id", { rows: [{ post_id: 789 }] })
	req.client.addQueryMock("SELECT\n        t.title,", { 
		rows: [{
			title: "Test Post",
			body: "Test body",
			note: null,
			display_name: "Post Author",
			image_uuids: null
		}]
	})
	req.client.addQueryMock("INSERT INTO replies", { rows: [{ reply_id: 456 }] })
	req.client.addQueryMock("UPDATE replies", { rows: [] })
	req.client.addQueryMock("UPDATE users", { rows: [] })
	req.client.addQueryMock("UPDATE posts", { rows: [] })
	
	// Mock subscription for inactive user
	req.client.addQueryMock("SELECT\n        user_id,", { 
		rows: [{ user_id: "inactive-user-456", subscription_json: `{"endpoint":"test"}`, fcm_token: null }]
	})
	req.client.addQueryMock("SELECT user_id\n      FROM posts", { rows: [{ user_id: "inactive-user-456" }] })
	req.client.addQueryMock("INSERT INTO reply_notifications", { rows: [] })
	req.client.addQueryMock("SELECT \n          COUNT(*) AS unread_count", { rows: [{ unread_count: 2 }] })
	
	const res = createMockResponse()
	
	// Execute handler
	await saveReply(req, res)
	
	// Allow async operations to complete
	await new Promise(resolve => setTimeout(resolve, 50))
	
	// Verify WebSocket check was called
	assertEquals(1, websocket_calls.length, "Should check WebSocket connection")
	assertEquals("inactive-user-456", websocket_calls[0].user_id, "Should check for correct user")
	
	// For inactive users: should send push notification, not instant alert
	assertEquals(0, instant_alert_calls.length, "Should NOT send instant alert for inactive user")
	assertEquals(1, web_push_calls.length, "Should send web push for inactive user")
	assertEquals(0, fcm_send_calls.length, "Should send web push, not FCM for this test")
	
	// Verify push notification content
	const push_payload = JSON.parse(web_push_calls[0].payload)
	assertEquals("Inactive User replied", push_payload.title, "Should have correct push title")
	assertEquals("Test reply from inactive user", push_payload.body, "Should have reply body")
	assertEquals(2, push_payload.unread_count, "Should include unread count")
}

const cleanup = () => {
	// Clean up require cache
	delete require.cache[aws_s3_path]
	delete require.cache[ai_path]
	delete require.cache[node_crypto_path]
	delete require.cache[web_push_path]
	delete require.cache[firebase_admin_path]
	delete require.cache[firebase_app_path]
	delete require.cache[firebase_messaging_path]
	delete require.cache[websocket_path]
	delete require.cache[save_reply_path]
}

runTests("saveReplyNotificationFiltering.unit.test.js", [
	testActiveUserGetsInstantAlert,
	testInactiveUserGetsPushNotification
])

cleanup()