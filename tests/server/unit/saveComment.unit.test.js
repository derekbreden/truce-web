// Mock S3 client (external dependency)
let s3SendCalls = []
const mockS3Client = {
	send: async (command) => {
		s3SendCalls.push(command)
		// Simulate different S3 responses based on command type
		if (command.commandType === 'GetObject') {
			return {
				Body: {
					transformToString: async () => 'data:image/png;base64,mockImageData'
				}
			}
		}
		// Default successful response for PUT/DELETE
		return { $metadata: { httpStatusCode: 200 } }
	}
}

// Replace AWS S3 client in require cache
const awsS3Path = require.resolve("@aws-sdk/client-s3")
delete require.cache[awsS3Path]
require.cache[awsS3Path] = {
	exports: {
		S3Client: function() { return mockS3Client },
		GetObjectCommand: function(params) {
			this.input = params
			this.commandType = 'GetObject'
		},
		PutObjectCommand: function(params) {
			this.input = params
			this.commandType = 'PutObject'
		},
		DeleteObjectCommand: function(params) {
			this.input = params
			this.commandType = 'Delete'
		}
	},
	loaded: true,
	id: awsS3Path
}

// Mock AI module (internal dependency - use real one but control responses)
let aiAskCalls = []
const mockAI = {
	ask: async (messages, type, format) => {
		aiAskCalls.push({ messages, type, format })
		// Default to OK for content moderation
		return JSON.stringify({ keyword: "OK" })
	}
}

// Replace AI module in require cache
const aiPath = require.resolve("../../../server/ai")
delete require.cache[aiPath]
require.cache[aiPath] = {
	exports: mockAI,
	loaded: true,
	id: aiPath
}

// Mock crypto.randomUUID
let mockUuidResult = 'test-uuid-123'
const mockCrypto = {
	randomUUID: () => mockUuidResult
}

// Clear and replace node:crypto in require cache
const nodeCryptoPath = "node:crypto"
const cryptoPath = require.resolve("crypto")
delete require.cache[nodeCryptoPath]
delete require.cache[cryptoPath]
require.cache[nodeCryptoPath] = {
	exports: mockCrypto,
	loaded: true,
	id: nodeCryptoPath
}
require.cache[cryptoPath] = {
	exports: mockCrypto,
	loaded: true,
	id: cryptoPath
}

// Mock web-push (external dependency)
let webPushCalls = []
const mockWebPush = {
	setVapidDetails: () => {},
	sendNotification: async (subscription, payload) => {
		webPushCalls.push({ subscription, payload })
		return Promise.resolve()
	}
}

// Replace web-push in require cache
const webPushPath = require.resolve("web-push")
delete require.cache[webPushPath]
require.cache[webPushPath] = {
	exports: mockWebPush,
	loaded: true,
	id: webPushPath
}

// Mock Firebase Admin (external dependency)
let fcmSendCalls = []
const mockFCMMessaging = {
	send: async (message) => {
		fcmSendCalls.push(message)
		return 'fcm-message-id-123'
	}
}

const mockFirebaseAdmin = {
	credential: {
		cert: () => ({})
	}
}

const mockFirebaseApp = {
	initializeApp: () => ({}),
	getMessaging: () => mockFCMMessaging
}

// Replace Firebase modules in require cache
const firebaseAdminPath = require.resolve("firebase-admin")
const firebaseAppPath = require.resolve("firebase-admin/app")
const firebaseMessagingPath = require.resolve("firebase-admin/messaging")

delete require.cache[firebaseAdminPath]
delete require.cache[firebaseAppPath]
delete require.cache[firebaseMessagingPath]

require.cache[firebaseAdminPath] = {
	exports: mockFirebaseAdmin,
	loaded: true,
	id: firebaseAdminPath
}
require.cache[firebaseAppPath] = {
	exports: mockFirebaseApp,
	loaded: true,
	id: firebaseAppPath
}
require.cache[firebaseMessagingPath] = {
	exports: mockFirebaseApp,
	loaded: true,
	id: firebaseMessagingPath
}

// Track updateDisplayName calls by monitoring for its specific database query
let updateDisplayNameCalls = []

const path = require("path")
const {
	createMockRequest,
	createMockResponse,
	assertEquals,
	runTests
} = require("../shared/serverTestSetup.js")

// Clear the handler cache and import it after setting up mocks
const saveCommentPath = require.resolve("../../../server/session/saveComment.js")
delete require.cache[saveCommentPath]

// Import the handler we're testing (after mocking everything)
const saveComment = require("../../../server/session/saveComment.js")

// Import prompts for verification
const prompts = require("../../../server/prompts.js")

const tests = {
	testSuccessfulTopicComment: async () => {
		// Reset all calls
		s3SendCalls = []
		aiAskCalls = []
		webPushCalls = []
		fcmSendCalls = []
		updateDisplayNameCalls = []
		
		// Setup mock request for new comment on topic
		const req = createMockRequest(
			{ 
				display_name: 'Test User',
				body: 'This is a test comment on a topic.',
				path: '/topic/test-topic-slug',
				pngs: [
					{ url: 'data:image/png;base64,image1data' }
				]
			},
			{ 
				session_id: 'session-123',
				user_id: 'user-456',
				display_name: 'Test User'
			}
		)
		
		// Mock websocket functionality
		req.sendWsMessage = (type, topicId) => {
			req.wsMessages = req.wsMessages || []
			req.wsMessages.push({ type, topicId })
		}
		
		// Setup mock database responses
		req.client.addQueryMock(
			'SELECT post_id as topic_id',
			{ 
				rows: [
					{ topic_id: 'topic-789' }
				]
			}
		)
		req.client.addQueryMock(
			'SELECT\n        t.title,',
			{ 
				rows: [
					{
						title: 'Test Topic Title',
						body: 'Test topic body content',
						note: null,
						display_name: 'Topic Author',
						image_uuids: 'topic-image-uuid'
					}
				]
			}
		)
		req.client.addQueryMock(
			'INSERT INTO replies',
			{ 
				rows: [
					{ comment_id: 'new-comment-123' }
				]
			}
		)
		req.client.addQueryMock('UPDATE replies', { rows: [] })
		req.client.addQueryMock('UPDATE users', { rows: [] }) // updateDisplayName
		req.client.addQueryMock('UPDATE topics', { rows: [] })
		req.client.addQueryMock('SELECT\n        user_id,', { rows: [] }) // subscriptions
		req.client.addQueryMock('SELECT user_id\n      FROM posts', { rows: [] }) // notifications
		
		const res = createMockResponse()
		
		// Track updateDisplayName calls by monitoring for its specific database query
		const originalQuery = req.client.query
		req.client.query = async (sql, params) => {
			// Check if this is the updateDisplayName query
			if (sql.includes('UPDATE users') && sql.includes('display_name = $1')) {
				updateDisplayNameCalls.push({ display_name: params[0], user_id: params[1] })
			}
			return await originalQuery.call(req.client, sql, params)
		}
		
		// Execute the handler
		await saveComment(req, res)
		
		// Allow async operations to complete (updateDisplayName happens after response)
		await new Promise(resolve => setTimeout(resolve, 10))
		
		// Verify AI moderation was called
		assertEquals(
			1,
			aiAskCalls.length,
			"Should call AI for content moderation."
		)
		
		const moderationCall = aiAskCalls[0]
		assertEquals(
			'common',
			moderationCall.type,
			"Should use common type for moderation."
		)
		assertEquals(
			prompts.common_response_format,
			moderationCall.format,
			"Should use common response format."
		)
		
		// Verify moderation includes topic context
		assertEquals(
			true,
			moderationCall.messages.length >= 3,
			"Should include topic, system response, and comment in messages."
		)
		assertEquals(
			'Test Topic Title\n\nTest topic body content',
			moderationCall.messages[0].content[0].text,
			"Should include topic title and body."
		)
		assertEquals(
			'Test User:\nThis is a test comment on a topic.',
			moderationCall.messages[2].content[0].text,
			"Should include comment with display name (original in content)."
		)
		
		// Verify S3 operations
		assertEquals(
			2,
			s3SendCalls.length,
			"Should perform 2 S3 operations: get topic image + upload comment image."
		)
		assertEquals(
			'GetObject',
			s3SendCalls[0].commandType,
			"First S3 operation should get topic image."
		)
		assertEquals(
			'PutObject',
			s3SendCalls[1].commandType,
			"Second S3 operation should upload comment image."
		)
		
		// Verify updateDisplayName was called
		assertEquals(
			1,
			updateDisplayNameCalls.length,
			"Should call updateDisplayName."
		)
		
		// Verify successful response
		assertEquals(
			true,
			res.isEnded(),
			"Response should be ended."
		)
		
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			responseData.success,
			"Should return success."
		)
		assertEquals(
			'user-456',
			responseData.user_id,
			"Should return user ID."
		)
		
		// Verify websocket message
		assertEquals(
			1,
			req.wsMessages.length,
			"Should send websocket update."
		)
		assertEquals(
			'UPDATE',
			req.wsMessages[0].type,
			"Should send UPDATE message."
		)
		assertEquals(
			'topic-789',
			req.wsMessages[0].topicId,
			"Should send correct topic ID."
		)
	},

	testSuccessfulCommentReply: async () => {
		// Reset all calls
		s3SendCalls = []
		aiAskCalls = []
		webPushCalls = []
		fcmSendCalls = []
		updateDisplayNameCalls = []
		
		// Setup mock request for reply to comment
		const req = createMockRequest(
			{ 
				display_name: 'Reply User',
				body: 'This is a reply to another comment.',
				path: '/comment/parent-comment-456',
				pngs: [],
				parent_comment_id: 'parent-comment-456'
			},
			{ 
				session_id: 'session-reply',
				user_id: 'user-reply',
				display_name: 'Reply User'
			}
		)
		
		req.sendWsMessage = () => {}
		
		// Setup mock database responses
		req.client.addQueryMock(
			'SELECT parent_post_id',
			{ 
				rows: [
					{ parent_post_id: 'topic-for-comment' }
				]
			}
		)
		req.client.addQueryMock(
			'SELECT\n        t.title,',
			{ 
				rows: [
					{
						title: 'Parent Topic',
						body: 'Parent topic content',
						note: null,
						display_name: 'Topic Creator',
						image_uuids: null
					}
				]
			}
		)
		req.client.addQueryMock(
			'SELECT\n          u.display_name,',
			{ 
				rows: [
					{
						display_name: 'Parent Comment Author',
						body: 'Parent comment content',
						note: null,
						reply_id: 'parent-comment-456',
						image_uuids: null
					}
				]
			}
		)
		req.client.addQueryMock(
			'INSERT INTO replies',
			{ 
				rows: [
					{ comment_id: 'reply-comment-789' }
				]
			}
		)
		req.client.addQueryMock('INSERT INTO reply_ancestors', { rows: [] })
		req.client.addQueryMock('UPDATE replies', { rows: [] })
		req.client.addQueryMock('UPDATE topics', { rows: [] })
		req.client.addQueryMock('SELECT\n        user_id,', { rows: [] })
		req.client.addQueryMock('SELECT user_id\n      FROM posts', { rows: [] })
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveComment(req, res)
		
		// Verify AI moderation includes ancestor context
		assertEquals(
			1,
			aiAskCalls.length,
			"Should call AI for moderation."
		)
		
		const moderationCall = aiAskCalls[0]
		assertEquals(
			true,
			moderationCall.messages.length >= 5,
			"Should include topic, system, comments header, parent comment, system, and reply."
		)
		assertEquals(
			'Comments:',
			moderationCall.messages[2].content,
			"Should include comments header."
		)
		assertEquals(
			'Parent Comment Author:\nParent comment content',
			moderationCall.messages[3].content[0].text,
			"Should include parent comment context."
		)
		
		// Verify successful response
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			responseData.success,
			"Should succeed with comment reply."
		)
	},

	testCommentUpdate: async () => {
		// Reset all calls
		s3SendCalls = []
		aiAskCalls = []
		webPushCalls = []
		fcmSendCalls = []
		updateDisplayNameCalls = []
		
		// Setup mock request for comment update
		const req = createMockRequest(
			{ 
				display_name: 'Update User',
				body: 'Updated comment content.',
				path: '/topic/test-slug',
				pngs: [
					{ url: 'data:image/png;base64,newimage' }
				],
				comment_id: 'existing-comment-123'
			},
			{ 
				session_id: 'session-update',
				user_id: 'user-update',
				display_name: 'Update User'
			}
		)
		
		req.sendWsMessage = () => {}
		
		// Setup mock database responses
		req.client.addQueryMock('SELECT post_id as topic_id', { rows: [{ topic_id: 'topic-update' }] })
		req.client.addQueryMock('SELECT\n        t.title,', { 
			rows: [{
				title: 'Topic Title',
				body: 'Topic body',
				note: null,
				display_name: 'Topic Author',
				image_uuids: null // No topic images
			}]
		})
		req.client.addQueryMock('UPDATE replies', { rows: [] })
		req.client.addQueryMock(
			'SELECT image_uuids',
			{ 
				rows: [
					{ image_uuids: 'old-image1,old-image2' }
				]
			}
		)
		req.client.addQueryMock('UPDATE topics', { rows: [] })
		req.client.addQueryMock('SELECT\n        user_id,', { rows: [] })
		req.client.addQueryMock('SELECT user_id\n      FROM posts', { rows: [] })
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveComment(req, res)
		
		// Allow async operations to complete
		await new Promise(resolve => setTimeout(resolve, 10))
		
		// Verify old images were deleted from S3 (no topic image since image_uuids is null)
		assertEquals(
			3,
			s3SendCalls.length,
			"Should perform 3 S3 operations: delete 2 old + upload 1 new."
		)
		assertEquals(
			'Delete',
			s3SendCalls[0].commandType,
			"First operation should delete old image."
		)
		assertEquals(
			'old-image1.png',
			s3SendCalls[0].input.Key,
			"Should delete first old image."
		)
		assertEquals(
			'Delete',
			s3SendCalls[1].commandType,
			"Second operation should delete old image."
		)
		assertEquals(
			'old-image2.png',
			s3SendCalls[1].input.Key,
			"Should delete second old image."
		)
		assertEquals(
			'PutObject',
			s3SendCalls[2].commandType,
			"Third operation should upload new image."
		)
		
		// Verify successful response
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			responseData.success,
			"Should succeed with comment update."
		)
	},

	testSpamCommentRejected: async () => {
		// Reset all calls
		s3SendCalls = []
		aiAskCalls = []
		webPushCalls = []
		fcmSendCalls = []
		updateDisplayNameCalls = []
		
		// Mock AI to return Spam
		mockAI.ask = async (messages, type, format) => {
			aiAskCalls.push({ messages, type, format })
			return JSON.stringify({ 
				keyword: "Spam",
				note: "This appears to be spam content"
			})
		}
		
		// Setup mock request
		const req = createMockRequest(
			{ 
				display_name: 'Spam User',
				body: 'Spam comment content',
				path: '/topic/test-slug',
				pngs: []
			},
			{ 
				session_id: 'session-spam',
				user_id: 'user-spam',
				display_name: 'Spam User'
			}
		)
		
		// Setup minimal database mocks
		req.client.addQueryMock('SELECT post_id as topic_id', { rows: [{ topic_id: 'topic-spam' }] })
		req.client.addQueryMock('SELECT\n        t.title,', { 
			rows: [{
				title: 'Topic Title',
				body: 'Topic body',
				note: null,
				display_name: 'Topic Author',
				image_uuids: null // No topic images
			}]
		})
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveComment(req, res)
		
		// Verify AI was called for moderation
		assertEquals(
			1,
			aiAskCalls.length,
			"Should call AI for moderation."
		)
		
		// Verify no S3 operations for spam (no topic images to get)
		assertEquals(
			0,
			s3SendCalls.length,
			"Should not perform S3 operations for spam."
		)
		assertEquals(
			0,
			updateDisplayNameCalls.length,
			"Should not call updateDisplayName for spam."
		)
		
		// Verify spam error response
		assertEquals(
			true,
			res.isEnded(),
			"Response should be ended."
		)
		
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			"Spam",
			responseData.error,
			"Should return spam error."
		)
		assertEquals(
			undefined,
			responseData.success,
			"Should not return success for spam."
		)
		
		// Reset AI mock for other tests
		mockAI.ask = async (messages, type, format) => {
			aiAskCalls.push({ messages, type, format })
			return JSON.stringify({ keyword: "OK" })
		}
	},

	testFlaggedCommentCreated: async () => {
		// Reset all calls
		s3SendCalls = []
		aiAskCalls = []
		webPushCalls = []
		fcmSendCalls = []
		updateDisplayNameCalls = []
		
		// Mock AI to return flagged content
		mockAI.ask = async (messages, type, format) => {
			aiAskCalls.push({ messages, type, format })
			return JSON.stringify({ 
				keyword: "Inappropriate",
				note: "Contains inappropriate language"
			})
		}
		
		// Setup mock request
		const req = createMockRequest(
			{ 
				display_name: 'Flag User',
				body: 'Inappropriate comment content',
				path: '/topic/test-slug',
				pngs: []
			},
			{ 
				session_id: 'session-flag',
				user_id: 'user-flag',
				display_name: 'Flag User'
			}
		)
		
		req.sendWsMessage = () => {}
		
		// Setup mock database responses
		req.client.addQueryMock('SELECT post_id as topic_id', { rows: [{ topic_id: 'topic-flag' }] })
		req.client.addQueryMock('SELECT\n        t.title,', { 
			rows: [{
				title: 'Topic Title',
				body: 'Topic body',
				note: null,
				display_name: 'Topic Author',
				image_uuids: null // No topic images
			}]
		})
		req.client.addQueryMock(
			'INSERT INTO replies',
			{ 
				rows: [
					{ comment_id: 'flagged-comment-456' }
				]
			}
		)
		req.client.addQueryMock('UPDATE replies', { rows: [] })
		req.client.addQueryMock('UPDATE users', { rows: [] }) // updateDisplayName
		req.client.addQueryMock('UPDATE topics', { rows: [] })
		req.client.addQueryMock('SELECT\n        user_id,', { rows: [] })
		req.client.addQueryMock('SELECT user_id\n      FROM posts', { rows: [] })
		
		const res = createMockResponse()
		
		// Track updateDisplayName calls by monitoring for its specific database query
		const originalQuery = req.client.query
		req.client.query = async (sql, params) => {
			// Check if this is the updateDisplayName query
			if (sql.includes('UPDATE users') && sql.includes('display_name = $1')) {
				updateDisplayNameCalls.push({ display_name: params[0], user_id: params[1] })
			}
			return await originalQuery.call(req.client, sql, params)
		}
		
		// Execute the handler
		await saveComment(req, res)
		
		// Allow async operations to complete
		await new Promise(resolve => setTimeout(resolve, 10))
		
		// Verify AI moderation was called
		assertEquals(
			1,
			aiAskCalls.length,
			"Should call AI for moderation."
		)
		
		// Verify comment was still created but flagged (no topic images, no comment images)
		assertEquals(
			0,
			s3SendCalls.length,
			"Should not perform S3 operations (no images)."
		)
		assertEquals(
			1,
			updateDisplayNameCalls.length,
			"Should call updateDisplayName even for flagged content."
		)
		
		// Verify successful response (flagged content still creates comment)
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			responseData.success,
			"Should succeed even with flagged content."
		)
		
		// Reset AI mock
		mockAI.ask = async (messages, type, format) => {
			aiAskCalls.push({ messages, type, format })
			return JSON.stringify({ keyword: "OK" })
		}
	},

	testPushNotifications: async () => {
		// Reset all calls
		s3SendCalls = []
		aiAskCalls = []
		webPushCalls = []
		fcmSendCalls = []
		updateDisplayNameCalls = []
		
		// Setup mock request
		const req = createMockRequest(
			{ 
				display_name: 'Notification User',
				body: 'This comment should trigger notifications',
				path: '/topic/notify-topic',
				pngs: []
			},
			{ 
				session_id: 'session-notify',
				user_id: 'user-notify',
				display_name: 'Notification User'
			}
		)
		
		req.sendWsMessage = () => {}
		
		// Setup mock database responses
		req.client.addQueryMock('SELECT post_id as topic_id', { rows: [{ topic_id: 'topic-notify' }] })
		req.client.addQueryMock('SELECT\n        t.title,', { 
			rows: [{
				title: 'Notify Topic',
				body: 'Topic body',
				note: null,
				display_name: 'Topic Author',
				image_uuids: null
			}]
		})
		req.client.addQueryMock(
			'INSERT INTO replies',
			{ 
				rows: [
					{ comment_id: 'notify-comment-789' }
				]
			}
		)
		req.client.addQueryMock('UPDATE replies', { rows: [] })
		req.client.addQueryMock('UPDATE topics', { rows: [] })
		
		// Mock subscriptions for notifications
		req.client.addQueryMock(
			'SELECT\n        user_id,',
			{ 
				rows: [
					{
						user_id: 'topic-author-user',
						subscription_json: '{"endpoint":"https://fcm.googleapis.com/fcm/send/test"}',
						fcm_token: null
					},
					{
						user_id: 'other-commenter',
						subscription_json: null,
						fcm_token: '"fcm-token-123"'
					}
				]
			}
		)
		
		// Mock users to notify
		req.client.addQueryMock(
			'SELECT user_id\n      FROM posts',
			{ 
				rows: [
					{ user_id: 'topic-author-user' },
					{ user_id: 'other-commenter' }
				]
			}
		)
		
		// Mock notification insertions
		req.client.addQueryMock('INSERT INTO reply_notifications', { rows: [] })
		
		// Mock unread counts for badge
		req.client.addQueryMock(
			'SELECT \n          COUNT(*)',
			{ 
				rows: [
					{ unread_count: 3 }
				]
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveComment(req, res)
		
		// Allow async notifications to process
		await new Promise(resolve => setTimeout(resolve, 50))
		
		// Verify push notifications were sent
		assertEquals(
			1,
			webPushCalls.length,
			"Should send web push notification."
		)
		assertEquals(
			1,
			fcmSendCalls.length,
			"Should send FCM notification."
		)
		
		// Verify web push content
		const webPushPayload = JSON.parse(webPushCalls[0].payload)
		assertEquals(
			'Notification User replied',
			webPushPayload.title,
			"Web push should have correct title."
		)
		assertEquals(
			'This comment should trigger notifications',
			webPushPayload.body,
			"Web push should have comment body."
		)
		assertEquals(
			3,
			webPushPayload.unread_count,
			"Web push should include unread count."
		)
		
		// Verify FCM message content
		const fcmMessage = fcmSendCalls[0]
		assertEquals(
			'Notification User replied',
			fcmMessage.notification.title,
			"FCM should have correct title."
		)
		assertEquals(
			'This comment should trigger notifications',
			fcmMessage.notification.body,
			"FCM should have comment body."
		)
		assertEquals(
			3,
			fcmMessage.apns.payload.aps.badge,
			"FCM should include badge count."
		)
		
		// Verify successful response
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			responseData.success,
			"Should succeed with notifications."
		)
	},

	testTopicNotFound: async () => {
		// Reset all calls
		s3SendCalls = []
		aiAskCalls = []
		webPushCalls = []
		fcmSendCalls = []
		updateDisplayNameCalls = []
		
		// Setup mock request with non-existent topic
		const req = createMockRequest(
			{ 
				display_name: 'Test User',
				body: 'Comment on non-existent topic',
				path: '/topic/non-existent-slug',
				pngs: []
			},
			{ 
				session_id: 'session-123',
				user_id: 'user-456',
				display_name: 'Test User'
			}
		)
		
		// Setup database response for non-existent topic
		req.client.addQueryMock(
			'SELECT post_id as topic_id',
			{ rows: [] } // No topic found
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveComment(req, res)
		
		// Verify no AI or S3 operations
		assertEquals(
			0,
			aiAskCalls.length,
			"Should not call AI when topic not found."
		)
		assertEquals(
			0,
			s3SendCalls.length,
			"Should not perform S3 operations when topic not found."
		)
		
		// Verify error response
		assertEquals(
			true,
			res.isEnded(),
			"Response should be ended."
		)
		
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			"Path not found",
			responseData.error,
			"Should return path not found error."
		)
	},

	testCommentNotFound: async () => {
		// Reset all calls
		s3SendCalls = []
		aiAskCalls = []
		webPushCalls = []
		fcmSendCalls = []
		updateDisplayNameCalls = []
		
		// Setup mock request with non-existent parent comment
		const req = createMockRequest(
			{ 
				display_name: 'Test User',
				body: 'Reply to non-existent comment',
				path: '/comment/non-existent-comment',
				pngs: []
			},
			{ 
				session_id: 'session-123',
				user_id: 'user-456',
				display_name: 'Test User'
			}
		)
		
		// Setup database response for non-existent comment
		req.client.addQueryMock(
			'SELECT parent_post_id',
			{ rows: [] } // No comment found
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveComment(req, res)
		
		// Verify error response
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			"Path not found",
			responseData.error,
			"Should return path not found error for non-existent comment."
		)
	},

	testNoActionWhenMissingFields: async () => {
		// Reset all calls
		s3SendCalls = []
		aiAskCalls = []
		webPushCalls = []
		fcmSendCalls = []
		updateDisplayNameCalls = []
		
		// Setup mock request without required fields
		const req = createMockRequest(
			{ 
				// Missing display_name, body, path, or pngs
				display_name: 'Test User'
				// body missing
			},
			{ 
				session_id: 'session-123',
				user_id: 'user-456'
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveComment(req, res)
		
		// Verify no action taken
		assertEquals(
			false,
			res.isEnded(),
			"Should not end response when required fields missing."
		)
		assertEquals(
			0,
			aiAskCalls.length,
			"Should not call AI when required fields missing."
		)
		assertEquals(
			0,
			s3SendCalls.length,
			"Should not perform S3 operations when required fields missing."
		)
	},

	testNoActionWhenAlreadyEnded: async () => {
		// Reset all calls
		s3SendCalls = []
		aiAskCalls = []
		webPushCalls = []
		fcmSendCalls = []
		updateDisplayNameCalls = []
		
		// Setup mock request
		const req = createMockRequest(
			{ 
				display_name: 'Test User',
				body: 'Test comment',
				path: '/topic/test-slug',
				pngs: []
			},
			{ 
				session_id: 'session-123',
				user_id: 'user-456'
			}
		)
		
		const res = createMockResponse()
		// Simulate response already ended
		res.writableEnded = true
		
		// Execute the handler
		await saveComment(req, res)
		
		// Verify no action taken
		assertEquals(
			true,
			res.writableEnded,
			"Response should remain ended."
		)
		assertEquals(
			0,
			aiAskCalls.length,
			"Should not call AI when response already ended."
		)
	}
}

// Restore original functions after tests
const cleanup = () => {
	// Restore original modules
	delete require.cache[awsS3Path]
	delete require.cache[aiPath]
	delete require.cache[nodeCryptoPath]
	delete require.cache[cryptoPath]
	delete require.cache[webPushPath]
	delete require.cache[firebaseAdminPath]
	delete require.cache[firebaseAppPath]
	delete require.cache[firebaseMessagingPath]
	// updateDisplayNamePath was removed
	delete require.cache[saveCommentPath]
}

runTests(path.basename(__filename), Object.values(tests))
cleanup()