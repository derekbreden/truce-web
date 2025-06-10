// Set up required environment variables before any modules initialize
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

// Mock S3 client (external dependency)
let s3_send_calls = []
const mock_s3_client = {
	send: async (command) => {
		s3_send_calls.push(command)
		// Simulate different S3 responses based on command type
		if (command.commandType === "GetObject") {
			return {
				Body: {
					transformToString: async () => "data:image/png;base64,mockImageData"
				}
			}
		}
		// Default successful response for PUT/DELETE
		return { $metadata: { httpStatusCode: 200 } }
	}
}

// Replace AWS S3 client in require cache
const aws_s3_path = require.resolve("@aws-sdk/client-s3")
delete require.cache[aws_s3_path]
require.cache[aws_s3_path] = {
	exports: {
		S3Client: function() { return mock_s3_client },
		GetObjectCommand: function(params) {
			this.input = params
			this.commandType = "GetObject"
		},
		PutObjectCommand: function(params) {
			this.input = params
			this.commandType = "PutObject"
		},
		DeleteObjectCommand: function(params) {
			this.input = params
			this.commandType = "Delete"
		}
	},
	loaded: true,
	id: aws_s3_path
}

// Mock AI module (internal dependency - use real one but control responses)
let ai_ask_calls = []
const mock_ai = {
	ask: async (messages, type, format) => {
		ai_ask_calls.push({ messages, type, format })
		// Default to OK for content moderation
		return JSON.stringify({ keyword: "OK" })
	}
}

// Replace AI module in require cache
const ai_path = require.resolve("../../../server/ai")
delete require.cache[ai_path]
require.cache[ai_path] = {
	exports: mock_ai,
	loaded: true,
	id: ai_path
}

// Mock crypto.randomUUID
let mock_uuid_result = "test-uuid-123"
const mock_crypto = {
	randomUUID: () => mock_uuid_result
}

// Clear and replace node:crypto in require cache
const node_crypto_path = "node:crypto"
const crypto_path = require.resolve("crypto")
delete require.cache[node_crypto_path]
delete require.cache[crypto_path]
require.cache[node_crypto_path] = {
	exports: mock_crypto,
	loaded: true,
	id: node_crypto_path
}
require.cache[crypto_path] = {
	exports: mock_crypto,
	loaded: true,
	id: crypto_path
}

// Mock web-push (external dependency)
let web_push_calls = []
const mock_web_push = {
	setVapidDetails: () => {},
	sendNotification: async (subscription, payload) => {
		web_push_calls.push({ subscription, payload })
		return Promise.resolve()
	}
}

// Replace web-push in require cache
const web_push_path = require.resolve("web-push")
delete require.cache[web_push_path]
require.cache[web_push_path] = {
	exports: mock_web_push,
	loaded: true,
	id: web_push_path
}

// Mock Firebase Admin (external dependency)
let fcm_send_calls = []
const mock_fcm_messaging = {
	send: async (message) => {
		fcm_send_calls.push(message)
		return "fcm-message-id-123"
	}
}

const mock_firebase_admin = {
	credential: {
		cert: () => ({})
	}
}

const mock_firebase_app = {
	initializeApp: () => ({}),
	getMessaging: () => mock_fcm_messaging
}

// Replace Firebase modules in require cache
const firebase_admin_path = require.resolve("firebase-admin")
const firebase_app_path = require.resolve("firebase-admin/app")
const firebase_messaging_path = require.resolve("firebase-admin/messaging")

delete require.cache[firebase_admin_path]
delete require.cache[firebase_app_path]
delete require.cache[firebase_messaging_path]

require.cache[firebase_admin_path] = {
	exports: mock_firebase_admin,
	loaded: true,
	id: firebase_admin_path
}
require.cache[firebase_app_path] = {
	exports: mock_firebase_app,
	loaded: true,
	id: firebase_app_path
}
require.cache[firebase_messaging_path] = {
	exports: mock_firebase_app,
	loaded: true,
	id: firebase_messaging_path
}

// Track updateDisplayName calls by monitoring for its specific database query
let update_display_name_calls = []

const path = require("path")
const {
	createMockRequest,
	createMockResponse,
	assertEquals,
	runTests
} = require("../shared/serverTestSetup.js")

// Clear the handler cache and import it after setting up mocks
const save_reply_path = require.resolve("../../../server/session/saveReply.js")
delete require.cache[save_reply_path]

// Import the handler we"re testing (after mocking everything)
const saveReply = require("../../../server/session/saveReply.js")

// Import prompts for verification
const prompts = require("../../../server/prompts.js")

const tests = {
	testSuccessfulPostReply: async () => {
		// Reset all calls
		s3_send_calls = []
		ai_ask_calls = []
		web_push_calls = []
		fcm_send_calls = []
		update_display_name_calls = []
		
		// Setup mock request for new reply on post
		const req = createMockRequest(
			{ 
				display_name: "Test User",
				body: "This is a test reply on a post.",
				path: "/post/456",
				pngs: [
					{ url: "data:image/png;base64,image1data" }
				]
			},
			{ 
				session_id: "123",
				user_id: "456",
				display_name: "Test User"
			}
		)
		
		// Mock websocket functionality
		req.sendWsMessage = (type, postId) => {
			req.wsMessages = req.wsMessages || []
			req.wsMessages.push({ type, postId })
		}
		
		// Setup mock database responses
		req.client.addQueryMock(
			"SELECT post_id as post_id",
			{ 
				rows: [
					{ post_id: 789 }
				]
			}
		)
		req.client.addQueryMock(
			"SELECT\n        t.title,",
			{ 
				rows: [
					{
						title: "Test Post Title",
						body: "Test post body content",
						note: null,
						display_name: "Post Author",
						image_uuids: "post-image-uuid"
					}
				]
			}
		)
		req.client.addQueryMock(
			"INSERT INTO replies",
			{ 
				rows: [
					{ reply_id: 123 }
				]
			}
		)
		req.client.addQueryMock("UPDATE replies", { rows: [] })
		req.client.addQueryMock("UPDATE users", { rows: [] }) // updateDisplayName
		req.client.addQueryMock("UPDATE posts", { rows: [] })
		req.client.addQueryMock("SELECT\n        user_id,", { rows: [] }) // subscriptions
		req.client.addQueryMock("SELECT user_id\n      FROM posts", { rows: [] }) // notifications
		
		const res = createMockResponse()
		
		// Track updateDisplayName calls by monitoring for its specific database query
		const original_query = req.client.query
		req.client.query = async (sql, params) => {
			// Check if this is the updateDisplayName query
			if (sql.includes("UPDATE users") && sql.includes("display_name = $1")) {
				update_display_name_calls.push({ display_name: params[0], user_id: params[1] })
			}
			return await original_query.call(req.client, sql, params)
		}
		
		// Execute the handler
		await saveReply(req, res)
		
		// Allow async operations to complete (updateDisplayName happens after response)
		await new Promise(resolve => setTimeout(resolve, 10))
		
		// Verify AI moderation was called
		assertEquals(
			1,
			ai_ask_calls.length,
			"Should call AI for content moderation."
		)
		
		const moderation_call = ai_ask_calls[0]
		assertEquals(
			"common",
			moderation_call.type,
			"Should use common type for moderation."
		)
		assertEquals(
			prompts.common_response_format,
			moderation_call.format,
			"Should use common response format."
		)
		
		// Verify moderation includes post context
		assertEquals(
			true,
			moderation_call.messages.length >= 3,
			"Should include post, system response, and reply in messages."
		)
		assertEquals(
			"Test Post Title\n\nTest post body content",
			moderation_call.messages[0].content[0].text,
			"Should include post title and body."
		)
		assertEquals(
			"Test User:\nThis is a test reply on a post.",
			moderation_call.messages[2].content[0].text,
			"Should include reply with display name (original in content)."
		)
		
		// Verify S3 operations
		assertEquals(
			2,
			s3_send_calls.length,
			"Should perform 2 S3 operations: get post image + upload reply image."
		)
		assertEquals(
			"GetObject",
			s3_send_calls[0].commandType,
			"First S3 operation should get post image."
		)
		assertEquals(
			"PutObject",
			s3_send_calls[1].commandType,
			"Second S3 operation should upload reply image."
		)
		
		// Verify updateDisplayName was called
		assertEquals(
			1,
			update_display_name_calls.length,
			"Should call updateDisplayName."
		)
		
		// Verify successful response
		assertEquals(
			true,
			res.isEnded(),
			"Response should be ended."
		)
		
		const response_data = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			response_data.success,
			"Should return success."
		)
		assertEquals(
			"456",
			response_data.user_id,
			"Should return user ID."
		)
		
		// Verify websocket message
		assertEquals(
			1,
			req.wsMessages.length,
			"Should send websocket update."
		)
		assertEquals(
			"UPDATE",
			req.wsMessages[0].type,
			"Should send UPDATE message."
		)
		assertEquals(
			789,
			req.wsMessages[0].postId,
			"Should send correct post ID."
		)
	},

	testSuccessfulReplyReply: async () => {
		// Reset all calls
		s3_send_calls = []
		ai_ask_calls = []
		web_push_calls = []
		fcm_send_calls = []
		update_display_name_calls = []
		
		// Setup mock request for reply to reply
		const req = createMockRequest(
			{ 
				display_name: "Reply User",
				body: "This is a reply to another reply.",
				path: "/reply/parent-reply-456",
				pngs: [],
				parent_reply_id: 456
			},
			{ 
				session_id: "789",
				user_id: "101",
				display_name: "Reply User"
			}
		)
		
		req.sendWsMessage = () => {}
		
		// Setup mock database responses
		req.client.addQueryMock(
			"SELECT parent_post_id",
			{ 
				rows: [
					{ parent_post_id: 234 }
				]
			}
		)
		req.client.addQueryMock(
			"SELECT\n        t.title,",
			{ 
				rows: [
					{
						title: "Parent Post",
						body: "Parent post content",
						note: null,
						display_name: "Post Creator",
						image_uuids: null
					}
				]
			}
		)
		req.client.addQueryMock(
			"SELECT\n          u.display_name,",
			{ 
				rows: [
					{
						display_name: "Parent Reply Author",
						body: "Parent reply content",
						note: null,
						reply_id: 456,
						image_uuids: null
					}
				]
			}
		)
		req.client.addQueryMock(
			"INSERT INTO replies",
			{ 
				rows: [
					{ reply_id: 789 }
				]
			}
		)
		req.client.addQueryMock("INSERT INTO reply_ancestors", { rows: [] })
		req.client.addQueryMock("UPDATE replies", { rows: [] })
		req.client.addQueryMock("UPDATE posts", { rows: [] })
		req.client.addQueryMock("SELECT\n        user_id,", { rows: [] })
		req.client.addQueryMock("SELECT user_id\n      FROM posts", { rows: [] })
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveReply(req, res)
		
		// Verify AI moderation includes ancestor context
		assertEquals(
			1,
			ai_ask_calls.length,
			"Should call AI for moderation."
		)
		
		const moderation_call = ai_ask_calls[0]
		assertEquals(
			true,
			moderation_call.messages.length >= 5,
			"Should include post, system, replies header, parent reply, system, and reply."
		)
		assertEquals(
			"Replies:",
			moderation_call.messages[2].content,
			"Should include replies header."
		)
		assertEquals(
			"Parent Reply Author:\nParent reply content",
			moderation_call.messages[3].content[0].text,
			"Should include parent reply context."
		)
		
		// Verify successful response
		const response_data = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			response_data.success,
			"Should succeed with reply reply."
		)
	},

	testReplyUpdate: async () => {
		// Reset all calls
		s3_send_calls = []
		ai_ask_calls = []
		web_push_calls = []
		fcm_send_calls = []
		update_display_name_calls = []
		
		// Setup mock request for reply update
		const req = createMockRequest(
			{ 
				display_name: "Update User",
				body: "Updated reply content.",
				path: "/post/test-slug",
				pngs: [
					{ url: "data:image/png;base64,newimage" }
				],
				reply_id: 123
			},
			{ 
				session_id: "234",
				user_id: "345",
				display_name: "Update User"
			}
		)
		
		req.sendWsMessage = () => {}
		
		// Setup mock database responses
		req.client.addQueryMock("SELECT post_id as post_id", { rows: [{ post_id: 567 }] })
		req.client.addQueryMock("SELECT\n        t.title,", { 
			rows: [{
				title: "Post Title",
				body: "Post body",
				note: null,
				display_name: "Post Author",
				image_uuids: null // No post images
			}]
		})
		req.client.addQueryMock("UPDATE replies", { rows: [] })
		req.client.addQueryMock(
			"SELECT image_uuids",
			{ 
				rows: [
					{ image_uuids: "old-image1,old-image2" }
				]
			}
		)
		req.client.addQueryMock("UPDATE posts", { rows: [] })
		req.client.addQueryMock("SELECT\n        user_id,", { rows: [] })
		req.client.addQueryMock("SELECT user_id\n      FROM posts", { rows: [] })
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveReply(req, res)
		
		// Allow async operations to complete
		await new Promise(resolve => setTimeout(resolve, 10))
		
		// Verify old images were deleted from S3 (no post image since image_uuids is null)
		assertEquals(
			3,
			s3_send_calls.length,
			"Should perform 3 S3 operations: delete 2 old + upload 1 new."
		)
		assertEquals(
			"Delete",
			s3_send_calls[0].commandType,
			"First operation should delete old image."
		)
		assertEquals(
			"old-image1.png",
			s3_send_calls[0].input.Key,
			"Should delete first old image."
		)
		assertEquals(
			"Delete",
			s3_send_calls[1].commandType,
			"Second operation should delete old image."
		)
		assertEquals(
			"old-image2.png",
			s3_send_calls[1].input.Key,
			"Should delete second old image."
		)
		assertEquals(
			"PutObject",
			s3_send_calls[2].commandType,
			"Third operation should upload new image."
		)
		
		// Verify successful response
		const response_data = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			response_data.success,
			"Should succeed with reply update."
		)
	},

	testSpamReplyRejected: async () => {
		// Reset all calls
		s3_send_calls = []
		ai_ask_calls = []
		web_push_calls = []
		fcm_send_calls = []
		update_display_name_calls = []
		
		// Mock AI to return Spam
		mock_ai.ask = async (messages, type, format) => {
			ai_ask_calls.push({ messages, type, format })
			return JSON.stringify({ 
				keyword: "Spam",
				note: "This appears to be spam content"
			})
		}
		
		// Setup mock request
		const req = createMockRequest(
			{ 
				display_name: "Spam User",
				body: "Spam reply content",
				path: "/post/test-slug",
				pngs: []
			},
			{ 
				session_id: "456",
				user_id: "567",
				display_name: "Spam User"
			}
		)
		
		// Setup minimal database mocks
		req.client.addQueryMock("SELECT post_id as post_id", { rows: [{ post_id: 890 }] })
		req.client.addQueryMock("SELECT\n        t.title,", { 
			rows: [{
				title: "Post Title",
				body: "Post body",
				note: null,
				display_name: "Post Author",
				image_uuids: null // No post images
			}]
		})
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveReply(req, res)
		
		// Verify AI was called for moderation
		assertEquals(
			1,
			ai_ask_calls.length,
			"Should call AI for moderation."
		)
		
		// Verify no S3 operations for spam (no post images to get)
		assertEquals(
			0,
			s3_send_calls.length,
			"Should not perform S3 operations for spam."
		)
		assertEquals(
			0,
			update_display_name_calls.length,
			"Should not call updateDisplayName for spam."
		)
		
		// Verify spam error response
		assertEquals(
			true,
			res.isEnded(),
			"Response should be ended."
		)
		
		const response_data = JSON.parse(res.getResponseData())
		assertEquals(
			"Spam",
			response_data.error,
			"Should return spam error."
		)
		assertEquals(
			undefined,
			response_data.success,
			"Should not return success for spam."
		)
		
		// Reset AI mock for other tests
		mock_ai.ask = async (messages, type, format) => {
			ai_ask_calls.push({ messages, type, format })
			return JSON.stringify({ keyword: "OK" })
		}
	},

	testFlaggedReplyCreated: async () => {
		// Reset all calls
		s3_send_calls = []
		ai_ask_calls = []
		web_push_calls = []
		fcm_send_calls = []
		update_display_name_calls = []
		
		// Mock AI to return flagged content
		mock_ai.ask = async (messages, type, format) => {
			ai_ask_calls.push({ messages, type, format })
			return JSON.stringify({ 
				keyword: "Inappropriate",
				note: "Contains inappropriate language"
			})
		}
		
		// Setup mock request
		const req = createMockRequest(
			{ 
				display_name: "Flag User",
				body: "Inappropriate reply content",
				path: "/post/test-slug",
				pngs: []
			},
			{ 
				session_id: "678",
				user_id: "789",
				display_name: "Flag User"
			}
		)
		
		req.sendWsMessage = () => {}
		
		// Setup mock database responses
		req.client.addQueryMock("SELECT post_id as post_id", { rows: [{ post_id: 321 }] })
		req.client.addQueryMock("SELECT\n        t.title,", { 
			rows: [{
				title: "Post Title",
				body: "Post body",
				note: null,
				display_name: "Post Author",
				image_uuids: null // No post images
			}]
		})
		req.client.addQueryMock(
			"INSERT INTO replies",
			{ 
				rows: [
					{ reply_id: 456 }
				]
			}
		)
		req.client.addQueryMock("UPDATE replies", { rows: [] })
		req.client.addQueryMock("UPDATE users", { rows: [] }) // updateDisplayName
		req.client.addQueryMock("UPDATE posts", { rows: [] })
		req.client.addQueryMock("SELECT\n        user_id,", { rows: [] })
		req.client.addQueryMock("SELECT user_id\n      FROM posts", { rows: [] })
		
		const res = createMockResponse()
		
		// Track updateDisplayName calls by monitoring for its specific database query
		const original_query = req.client.query
		req.client.query = async (sql, params) => {
			// Check if this is the updateDisplayName query
			if (sql.includes("UPDATE users") && sql.includes("display_name = $1")) {
				update_display_name_calls.push({ display_name: params[0], user_id: params[1] })
			}
			return await original_query.call(req.client, sql, params)
		}
		
		// Execute the handler
		await saveReply(req, res)
		
		// Allow async operations to complete
		await new Promise(resolve => setTimeout(resolve, 10))
		
		// Verify AI moderation was called
		assertEquals(
			1,
			ai_ask_calls.length,
			"Should call AI for moderation."
		)
		
		// Verify reply was still created but flagged (no post images, no reply images)
		assertEquals(
			0,
			s3_send_calls.length,
			"Should not perform S3 operations (no images)."
		)
		assertEquals(
			1,
			update_display_name_calls.length,
			"Should call updateDisplayName even for flagged content."
		)
		
		// Verify successful response (flagged content still creates reply)
		const response_data = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			response_data.success,
			"Should succeed even with flagged content."
		)
		
		// Reset AI mock
		mock_ai.ask = async (messages, type, format) => {
			ai_ask_calls.push({ messages, type, format })
			return JSON.stringify({ keyword: "OK" })
		}
	},

	testPushNotifications: async () => {
		// Reset all calls
		s3_send_calls = []
		ai_ask_calls = []
		web_push_calls = []
		fcm_send_calls = []
		update_display_name_calls = []
		
		// Setup mock request
		const req = createMockRequest(
			{ 
				display_name: "Notification User",
				body: "This reply should trigger notifications",
				path: "/post/notify-post",
				pngs: []
			},
			{ 
				session_id: "890",
				user_id: "901",
				display_name: "Notification User"
			}
		)
		
		req.sendWsMessage = () => {}
		
		// Setup mock database responses
		req.client.addQueryMock("SELECT post_id as post_id", { rows: [{ post_id: 654 }] })
		req.client.addQueryMock("SELECT\n        t.title,", { 
			rows: [{
				title: "Notify Post",
				body: "Post body",
				note: null,
				display_name: "Post Author",
				image_uuids: null
			}]
		})
		req.client.addQueryMock(
			"INSERT INTO replies",
			{ 
				rows: [
					{ reply_id: 789 }
				]
			}
		)
		req.client.addQueryMock("UPDATE replies", { rows: [] })
		req.client.addQueryMock("UPDATE posts", { rows: [] })
		
		// Mock subscriptions for notifications
		req.client.addQueryMock(
			"SELECT\n        user_id,",
			{ 
				rows: [
					{
						user_id: "789",
						subscription_json: `{"endpoint":"https://fcm.googleapis.com/fcm/send/test"}`,
						fcm_token: null
					},
					{
						user_id: "111",
						subscription_json: null,
						fcm_token: `"fcm-token-123"`
					}
				]
			}
		)
		
		// Mock users to notify
		req.client.addQueryMock(
			"SELECT user_id\n      FROM posts",
			{ 
				rows: [
					{ user_id: "789" },
					{ user_id: "111" }
				]
			}
		)
		
		// Mock notification insertions
		req.client.addQueryMock("INSERT INTO reply_notifications", { rows: [] })
		
		// Mock unread counts for badge
		req.client.addQueryMock(
			"SELECT \n          COUNT(*)",
			{ 
				rows: [
					{ unread_count: 3 }
				]
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveReply(req, res)
		
		// Allow async notifications to process
		await new Promise(resolve => setTimeout(resolve, 50))
		
		// Verify push notifications were sent
		assertEquals(
			1,
			web_push_calls.length,
			"Should send web push notification."
		)
		assertEquals(
			1,
			fcm_send_calls.length,
			"Should send FCM notification."
		)
		
		// Verify web push content
		const web_push_payload = JSON.parse(web_push_calls[0].payload)
		assertEquals(
			"Notification User replied",
			web_push_payload.title,
			"Web push should have correct title."
		)
		assertEquals(
			"This reply should trigger notifications",
			web_push_payload.body,
			"Web push should have reply body."
		)
		assertEquals(
			3,
			web_push_payload.unread_count,
			"Web push should include unread count."
		)
		
		// Verify FCM message content
		const fcm_message = fcm_send_calls[0]
		assertEquals(
			"Notification User replied",
			fcm_message.notification.title,
			"FCM should have correct title."
		)
		assertEquals(
			"This reply should trigger notifications",
			fcm_message.notification.body,
			"FCM should have reply body."
		)
		assertEquals(
			3,
			fcm_message.apns.payload.aps.badge,
			"FCM should include badge count."
		)
		
		// Verify successful response
		const response_data = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			response_data.success,
			"Should succeed with notifications."
		)
	},

	testPostNotFound: async () => {
		// Reset all calls
		s3_send_calls = []
		ai_ask_calls = []
		web_push_calls = []
		fcm_send_calls = []
		update_display_name_calls = []
		
		// Setup mock request with non-existent post
		const req = createMockRequest(
			{ 
				display_name: "Test User",
				body: "Reply on non-existent post",
				path: "/post/non-existent-slug",
				pngs: []
			},
			{ 
				session_id: "123",
				user_id: "456",
				display_name: "Test User"
			}
		)
		
		// Setup database response for non-existent post
		req.client.addQueryMock(
			"SELECT post_id as post_id",
			{ rows: [] } // No post found
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveReply(req, res)
		
		// Verify no AI or S3 operations
		assertEquals(
			0,
			ai_ask_calls.length,
			"Should not call AI when post not found."
		)
		assertEquals(
			0,
			s3_send_calls.length,
			"Should not perform S3 operations when post not found."
		)
		
		// Verify error response
		assertEquals(
			true,
			res.isEnded(),
			"Response should be ended."
		)
		
		const response_data = JSON.parse(res.getResponseData())
		assertEquals(
			"Path not found",
			response_data.error,
			"Should return path not found error."
		)
	},

	testReplyNotFound: async () => {
		// Reset all calls
		s3_send_calls = []
		ai_ask_calls = []
		web_push_calls = []
		fcm_send_calls = []
		update_display_name_calls = []
		
		// Setup mock request with non-existent parent reply
		const req = createMockRequest(
			{ 
				display_name: "Test User",
				body: "Reply to non-existent reply",
				path: "/reply/non-existent-reply",
				pngs: []
			},
			{ 
				session_id: "123",
				user_id: "456",
				display_name: "Test User"
			}
		)
		
		// Setup database response for non-existent reply
		req.client.addQueryMock(
			"SELECT parent_post_id",
			{ rows: [] } // No reply found
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveReply(req, res)
		
		// Verify error response
		const response_data = JSON.parse(res.getResponseData())
		assertEquals(
			"Path not found",
			response_data.error,
			"Should return path not found error for non-existent reply."
		)
	},

	testNoActionWhenMissingFields: async () => {
		// Reset all calls
		s3_send_calls = []
		ai_ask_calls = []
		web_push_calls = []
		fcm_send_calls = []
		update_display_name_calls = []
		
		// Setup mock request without required fields
		const req = createMockRequest(
			{ 
				// Missing display_name, body, path, or pngs
				display_name: "Test User"
				// body missing
			},
			{ 
				session_id: "123",
				user_id: "456"
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveReply(req, res)
		
		// Verify no action taken
		assertEquals(
			false,
			res.isEnded(),
			"Should not end response when required fields missing."
		)
		assertEquals(
			0,
			ai_ask_calls.length,
			"Should not call AI when required fields missing."
		)
		assertEquals(
			0,
			s3_send_calls.length,
			"Should not perform S3 operations when required fields missing."
		)
	},

	testNoActionWhenAlreadyEnded: async () => {
		// Reset all calls
		s3_send_calls = []
		ai_ask_calls = []
		web_push_calls = []
		fcm_send_calls = []
		update_display_name_calls = []
		
		// Setup mock request
		const req = createMockRequest(
			{ 
				display_name: "Test User",
				body: "Test reply",
				path: "/post/test-slug",
				pngs: []
			},
			{ 
				session_id: "123",
				user_id: "456"
			}
		)
		
		const res = createMockResponse()
		// Simulate response already ended
		res.writableEnded = true
		
		// Execute the handler
		await saveReply(req, res)
		
		// Verify no action taken
		assertEquals(
			true,
			res.writableEnded,
			"Response should remain ended."
		)
		assertEquals(
			0,
			ai_ask_calls.length,
			"Should not call AI when response already ended."
		)
	}
}

// Restore original functions after tests
const cleanup = () => {
	// Restore original modules
	delete require.cache[aws_s3_path]
	delete require.cache[ai_path]
	delete require.cache[node_crypto_path]
	delete require.cache[crypto_path]
	delete require.cache[web_push_path]
	delete require.cache[firebase_admin_path]
	delete require.cache[firebase_app_path]
	delete require.cache[firebase_messaging_path]
	// updateDisplayNamePath was removed
	delete require.cache[save_reply_path]
}

runTests(path.basename(__filename), Object.values(tests))
cleanup()