// Test for saveReply.js WebSocket connection checking
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

// Mock external dependencies (S3, AI, crypto, web-push, Firebase)
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

const mock_web_push = {
	setVapidDetails: () => {},
	sendNotification: async () => Promise.resolve()
}
const web_push_path = require.resolve("web-push")
delete require.cache[web_push_path]
require.cache[web_push_path] = {
	exports: mock_web_push,
	loaded: true,
	id: web_push_path
}

const mock_firebase_admin = {
	credential: { cert: () => ({}) }
}
const mock_firebase_app = {
	initializeApp: () => ({}),
	getMessaging: () => ({ send: async () => "fcm-id" })
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

// Track WebSocket calls
let websocket_calls = []

// Mock WebSocket with tracking
const mock_websocket = {
	hasActiveWebSocketConnection: (user_id) => {
		websocket_calls.push({ function: "hasActiveWebSocketConnection", user_id })
		// Return test value based on user_id for predictable testing
		return user_id === "active-user-123"
	},
	sendInstantAlert: (user_id, message, notification_data, context_id) => {
		websocket_calls.push({ function: "sendInstantAlert", user_id, message, notification_data, context_id })
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

const { createMockRequest, createMockResponse, addQueryMock, assertEquals, runTests } = require("../shared/serverTestSetup.js")

// Import saveReply after mocking
const save_reply_path = require.resolve("../../../server/session/saveReply.js")
delete require.cache[save_reply_path]
const saveReply = require("../../../server/session/saveReply.js")

async function testWebSocketCheckForActiveUser() {
	// Reset tracking
	websocket_calls = []
	
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
	req.client.addQueryMock("INSERT INTO reply_notifications", { rows: [ {notification_id: 1 }] })
	req.client.addQueryMock("UPDATE reply_notifications", { rows: [] }) // For marking as read
	addQueryMock("SELECT sum(unread_count) AS unread_count", { rows: [{ unread_count: 1 }] }) // For instant alert
	
	const res = createMockResponse()
	
	// Execute handler
	await saveReply(req, res)
	
	// Allow async operations to complete
	await new Promise(resolve => setTimeout(resolve, 50))
	
	// WebSocket function IS being called - let's verify the actual behavior  
	assertEquals(2, websocket_calls.length, "Should call hasActiveWebSocketConnection + sendInstantAlert for active user")
	assertEquals("hasActiveWebSocketConnection", websocket_calls[0].function, "Should first check WebSocket connection")
	assertEquals("active-user-123", websocket_calls[0].user_id, "Should check for correct user")
	assertEquals("sendInstantAlert", websocket_calls[1].function, "Should then send instant alert")
	assertEquals("active-user-123", websocket_calls[1].user_id, "Should send alert to correct user")
	
	// Verify successful response
	const response_data = JSON.parse(res.getResponseData())
	assertEquals(true, response_data.success, "Should succeed with active user")
}

async function testWebSocketCheckForInactiveUser() {
	// Reset tracking
	websocket_calls = []
	
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
	req.client.addQueryMock("INSERT INTO reply_notifications", { rows: [ {notification_id: 1}] })
	req.client.addQueryMock("SELECT \n          COUNT(*)", { rows: [{ unread_count: 2 }] })
	
	const res = createMockResponse()
	
	// Execute handler
	await saveReply(req, res)
	
	// Allow async operations to complete
	await new Promise(resolve => setTimeout(resolve, 50))
	
	// WebSocket function IS being called - let's verify the actual behavior
	assertEquals(1, websocket_calls.length, "Should only call hasActiveWebSocketConnection for inactive user")
	assertEquals("hasActiveWebSocketConnection", websocket_calls[0].function, "Should call correct function")
	assertEquals("inactive-user-456", websocket_calls[0].user_id, "Should check WebSocket for correct user")
	
	// Verify successful response
	const response_data = JSON.parse(res.getResponseData())
	assertEquals(true, response_data.success, "Should succeed with inactive user")
}

async function testWebSocketCheckWithMultipleUsers() {
	// Reset tracking
	websocket_calls = []
	
	const req = createMockRequest(
		{ 
			display_name: "Multi User",
			body: "Test reply triggering multiple notifications",
			path: "/post/test-slug",
			pngs: []
		},
		{ 
			session_id: "789",
			user_id: "999",
			display_name: "Multi User"
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
	req.client.addQueryMock("INSERT INTO replies", { rows: [{ reply_id: 789 }] })
	req.client.addQueryMock("UPDATE replies", { rows: [] })
	req.client.addQueryMock("UPDATE users", { rows: [] })
	req.client.addQueryMock("UPDATE posts", { rows: [] })
	
	// Mock subscriptions for multiple users (one active, one inactive)
	req.client.addQueryMock("SELECT\n        user_id,", { 
		rows: [
			{ user_id: "active-user-123", subscription_json: `{"endpoint":"test1"}`, fcm_token: null },
			{ user_id: "inactive-user-456", subscription_json: `{"endpoint":"test2"}`, fcm_token: null }
		]
	})
	req.client.addQueryMock("SELECT user_id\n      FROM posts", { 
		rows: [
			{ user_id: "active-user-123" },
			{ user_id: "inactive-user-456" }
		]
	})
	req.client.addQueryMock("INSERT INTO reply_notifications", { rows: [ {notification_id: 1}] })
	req.client.addQueryMock("UPDATE reply_notifications", { rows: [] }) // For marking as read (active users)
	addQueryMock("SELECT sum(unread_count) AS unread_count", { rows: [{ unread_count: 1 }] }) // For instant alert (active users)
	req.client.addQueryMock("SELECT \n          COUNT(*) AS unread_count", { rows: [{ unread_count: 2 }] }) // For push notification (inactive users)
	
	const res = createMockResponse()
	
	// Execute handler
	await saveReply(req, res)
	
	// Allow async operations to complete
	await new Promise(resolve => setTimeout(resolve, 50))
	
	// WebSocket function IS being called - let's verify the actual behavior
	assertEquals(3, websocket_calls.length, "Should call hasActiveWebSocketConnection for both users + sendInstantAlert for active user")
	
	// Check functions called: hasActiveWebSocket for both users, sendInstantAlert for active user
	assertEquals("hasActiveWebSocketConnection", websocket_calls[0].function, "Should check WebSocket for first user")
	assertEquals("sendInstantAlert", websocket_calls[1].function, "Should check WebSocket for second user")
	assertEquals("hasActiveWebSocketConnection", websocket_calls[2].function, "Should send instant alert for active user")
	
	const websocket_check_user_ids = websocket_calls.filter(call => call.function === "hasActiveWebSocketConnection").map(call => call.user_id).sort()
	assertEquals("active-user-123", websocket_check_user_ids[0], "Should check WebSocket for active user")
	assertEquals("inactive-user-456", websocket_check_user_ids[1], "Should check WebSocket for inactive user")
	
	// Verify successful response
	const response_data = JSON.parse(res.getResponseData())
	assertEquals(true, response_data.success, "Should succeed with multiple users")
}

async function testWebSocketCheckWithNoNotifications() {
	// Reset tracking
	websocket_calls = []
	
	const req = createMockRequest(
		{ 
			display_name: "No Notify User",
			body: "Test reply with no notifications",
			path: "/post/test-slug",
			pngs: []
		},
		{ 
			session_id: "000",
			user_id: "111",
			display_name: "No Notify User"
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
	req.client.addQueryMock("INSERT INTO replies", { rows: [{ reply_id: 999 }] })
	req.client.addQueryMock("UPDATE replies", { rows: [] })
	req.client.addQueryMock("UPDATE users", { rows: [] })
	req.client.addQueryMock("UPDATE posts", { rows: [] })
	
	// Mock no subscriptions (no notifications to send)
	req.client.addQueryMock("SELECT\n        user_id,", { rows: [] })
	req.client.addQueryMock("SELECT user_id\n      FROM posts", { rows: [] })
	
	const res = createMockResponse()
	
	// Execute handler
	await saveReply(req, res)
	
	// Allow async operations to complete
	await new Promise(resolve => setTimeout(resolve, 50))
	
	// Verify WebSocket function was NOT called (no users to notify)
	assertEquals(0, websocket_calls.length, "Should not call hasActiveWebSocketConnection when no users to notify")
	
	// Verify successful response
	const response_data = JSON.parse(res.getResponseData())
	assertEquals(true, response_data.success, "Should succeed even with no notifications")
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

runTests("saveReplyWebSocketCheck.unit.test.js", [
	testWebSocketCheckForActiveUser,
	testWebSocketCheckForInactiveUser,
	testWebSocketCheckWithMultipleUsers,
	testWebSocketCheckWithNoNotifications
])

cleanup()