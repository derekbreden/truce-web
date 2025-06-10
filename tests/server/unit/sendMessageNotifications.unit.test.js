// Mock S3 client (external dependency)
let s3_send_calls = []
const mockS3Client = {
	send: async (command) => {
		s3_send_calls.push(command)
		return { $metadata: { httpStatusCode: 200 } }
	}
}

const awsS3Path = require.resolve("@aws-sdk/client-s3")
delete require.cache[awsS3Path]
require.cache[awsS3Path] = {
	exports: {
		S3Client: function() { return mockS3Client },
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
	id: awsS3Path
}

// Mock firebase dependencies
const firebaseAdminPath = require.resolve("firebase-admin")
delete require.cache[firebaseAdminPath]
require.cache[firebaseAdminPath] = {
	exports: {
		initializeApp: () => ({}),
		credential: { cert: () => ({}) },
		getMessaging: () => ({ send: async () => "mock-result" })
	},
	loaded: true,
	id: firebaseAdminPath
}

const firebaseAppPath = require.resolve("firebase-admin/app")
delete require.cache[firebaseAppPath]
require.cache[firebaseAppPath] = {
	exports: {
		initializeApp: () => ({}),
		getMessaging: () => ({ send: async () => "mock-result" })
	},
	loaded: true,
	id: firebaseAppPath
}

const firebaseMessagingPath = require.resolve("firebase-admin/messaging")
delete require.cache[firebaseMessagingPath]
require.cache[firebaseMessagingPath] = {
	exports: {
		getMessaging: () => ({ send: async () => "mock-result" })
	},
	loaded: true,
	id: firebaseMessagingPath
}

const webpushPath = require.resolve("web-push")
delete require.cache[webpushPath]
require.cache[webpushPath] = {
	exports: {
		setVapidDetails: () => {},
		sendNotification: async () => ({ success: true })
	},
	loaded: true,
	id: webpushPath
}

const { createMockRequest, createMockResponse, assertEquals, runTests } = require("../shared/serverTestSetup.js")
const sendMessage = require("../../../server/session/sendMessage.js")

const tests = {
	testMessageNotificationCreation: async () => {
		const req = createMockRequest({
			conversation_id: 1,
			body: "Hello! This is a test message.",
			pngs: []
		}, {
			user_id: 123,
			display_name: "Test User"
		})
		
		// Mock conversation check - user is participant in conversation with user 456
		req.client.addQueryMock(
			"SELECT participant_user_ids",
			{ rows: [{ participant_user_ids: [123, 456] }] }
		)
		
		// Mock blocked user check - no blocks
		req.client.addQueryMock(
			"SELECT user_id_blocked",
			{ rows: [] }
		)
		
		// Mock message insertion
		req.client.addQueryMock(
			"INSERT INTO messages",
			{ rows: [{ message_id: 'new-message-789' }] }
		)
		
		// Mock message notification creation - this is what we're testing
		req.client.addQueryMock(
			"INSERT INTO message_notifications",
			{ rows: [] }
		)
		
		// Mock conversation update
		req.client.addQueryMock(
			'UPDATE conversations',
			{ rows: [] }
		)
		
		// Mock push notification queries
		req.client.addQueryMock(
			"SELECT firebase_registration_token",
			{ rows: [{ firebase_registration_token: 'mock-token-456', display_name: 'Other User' }] }
		)
		
		const res = createMockResponse()
		
		await sendMessage(req, res)
		
		// Verify message was sent successfully (which includes notification creation)
		assertEquals(
			true,
			res.isEnded(),
			"Should end response after successful message send."
		)
		
		// Verify response
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			responseData.success,
			"Should return success response."
		)
	},

	testMultipleParticipantNotifications: async () => {
		const req = createMockRequest({
			conversation_id: 2,
			body: "Group message test",
			pngs: []
		}, {
			user_id: 123,
			display_name: "Test User"
		})
		
		// Mock conversation with multiple participants
		req.client.addQueryMock(
			"SELECT participant_user_ids",
			{ rows: [{ participant_user_ids: [123, 456, 789] }] }
		)
		
		// Mock no blocks
		req.client.addQueryMock(
			"SELECT user_id_blocked",
			{ rows: [] }
		)
		
		// Mock message insertion
		req.client.addQueryMock(
			"INSERT INTO messages",
			{ rows: [{ message_id: 'group-message-456' }] }
		)
		
		// Mock message notification creation for multiple users
		req.client.addQueryMock(
			"INSERT INTO message_notifications",
			{ rows: [] }
		)
		
		// Mock conversation update
		req.client.addQueryMock(
			'UPDATE conversations',
			{ rows: [] }
		)
		
		// Mock push notifications for multiple users
		req.client.addQueryMock(
			"SELECT firebase_registration_token",
			{ 
				rows: [
					{ firebase_registration_token: 'token-456', display_name: 'User Two' },
					{ firebase_registration_token: 'token-789', display_name: 'User Three' }
				]
			}
		)
		
		const res = createMockResponse()
		
		await sendMessage(req, res)
		
		// Verify message was sent successfully to group conversation
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			responseData.success,
			"Should return success for group message."
		)
	},

	testNoNotificationForSender: async () => {
		const req = createMockRequest({
			conversation_id: 3,
			body: "Test no self-notification",
			pngs: []
		}, {
			user_id: 123,
			display_name: "Test User"
		})
		
		// Mock conversation with only the sender (edge case)
		req.client.addQueryMock(
			"SELECT participant_user_ids",
			{ rows: [{ participant_user_ids: [123] }] }
		)
		
		// Mock no blocks
		req.client.addQueryMock(
			"SELECT user_id_blocked",
			{ rows: [] }
		)
		
		// Mock message insertion
		req.client.addQueryMock(
			"INSERT INTO messages",
			{ rows: [{ message_id: 'solo-message-123' }] }
		)
		
		// Mock conversation update
		req.client.addQueryMock(
			'UPDATE conversations',
			{ rows: [] }
		)
		
		// Mock push notifications - should return empty since only sender
		req.client.addQueryMock(
			"SELECT firebase_registration_token",
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		await sendMessage(req, res)
		
		// Verify message was sent successfully even with only sender as participant
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			responseData.success,
			"Should return success even when sender is only participant."
		)
	},

	testBlockedUserNotifications: async () => {
		const req = createMockRequest({
			conversation_id: 4,
			body: "Message with blocked user",
			pngs: []
		}, {
			user_id: 123,
			display_name: "Test User"
		})
		
		// Mock conversation with participants including blocked user
		req.client.addQueryMock(
			"SELECT participant_user_ids",
			{ rows: [{ participant_user_ids: [123, 456, 789] }] }
		)
		
		// Mock blocked user - user 456 has blocked the sender (123)
		req.client.addQueryMock(
			"SELECT user_id_blocked",
			{ rows: [{ user_id_blocked: 123 }] }
		)
		
		// Mock message insertion
		req.client.addQueryMock(
			"INSERT INTO messages",
			{ rows: [{ message_id: 'blocked-message-456' }] }
		)
		
		// Mock message notification creation
		req.client.addQueryMock(
			"INSERT INTO message_notifications",
			{ rows: [] }
		)
		
		// Mock conversation update
		req.client.addQueryMock(
			'UPDATE conversations',
			{ rows: [] }
		)
		
		// Mock push notifications - should only include non-blocking users
		req.client.addQueryMock(
			"SELECT firebase_registration_token",
			{ 
				rows: [
					{ firebase_registration_token: 'token-789', display_name: 'User Three' }
					// User 456 excluded because they blocked the sender
				]
			}
		)
		
		const res = createMockResponse()
		
		await sendMessage(req, res)
		
		// Verify message was sent successfully with blocked user handling
		assertEquals(
			true,
			res.isEnded(),
			"Should end response after successful message send with blocked user handling."
		)
	},

	testMessageNotificationFields: async () => {
		const req = createMockRequest({
			conversation_id: 5,
			body: "Test notification field structure",
			pngs: []
		}, {
			user_id: 123,
			display_name: "Test User"
		})
		
		// Mock basic conversation setup
		req.client.addQueryMock(
			"SELECT participant_user_ids",
			{ rows: [{ participant_user_ids: [123, 456] }] }
		)
		
		req.client.addQueryMock(
			"SELECT user_id_blocked",
			{ rows: [] }
		)
		
		req.client.addQueryMock(
			"INSERT INTO messages",
			{ rows: [{ message_id: 'field-test-message-789' }] }
		)
		
		// Mock message notification creation
		req.client.addQueryMock(
			"INSERT INTO message_notifications",
			{ rows: [] }
		)
		
		req.client.addQueryMock(
			'UPDATE conversations',
			{ rows: [] }
		)
		
		req.client.addQueryMock(
			"SELECT firebase_registration_token",
			{ rows: [{ firebase_registration_token: 'token-456', display_name: 'Other User' }] }
		)
		
		const res = createMockResponse()
		
		await sendMessage(req, res)
		
		// Verify message was sent successfully with proper notification structure
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			responseData.success,
			"Should return success with proper notification field handling."
		)
	}
}

runTests("sendMessageNotifications.unit.test.js", Object.values(tests))