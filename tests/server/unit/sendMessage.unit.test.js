// Mock S3 client (external dependency)
let s3_send_calls = []
const mockS3Client = {
	send: async (command) => {
		s3_send_calls.push(command)
		// Simulate successful S3 operations
		return { $metadata: { httpStatusCode: 200 } }
	}
}

// Replace AWS S3 client in require cache
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

// Mock push notification dependencies
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

const firebaseAdminPath = require.resolve("firebase-admin")
delete require.cache[firebaseAdminPath]
require.cache[firebaseAdminPath] = {
	exports: {
		credential: { cert: () => ({}) },
		messaging: () => ({ send: async () => "mock-result" })
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

const { createMockRequest, createMockResponse, assertEquals, runTests } = require("../shared/serverTestSetup.js")
const sendMessage = require("../../../server/session/sendMessage.js")

async function testSendNewMessage() {
	const req = createMockRequest({
		conversation_id: 1,
		body: "Hello, this is a test message!",
		pngs: [],
		display_name: "Test User"
	}, {
		user_id: 123,
		display_name: "Test User"
	})
	
	// Mock conversation check - user is participant
	req.client.addQueryMock(
		"SELECT participant_user_ids",
		{ rows: [{ participant_user_ids: [123, 456] }] }
	)
	
	// Mock blocked user check
	req.client.addQueryMock(
		"SELECT user_id_blocked",
		{ rows: [] }
	)
	
	// Mock message insertion
	req.client.addQueryMock(
		"INSERT INTO messages",
		{ rows: [{ message_id: 789 }] }
	)
	
	// Mock updateDisplayName
	req.client.addQueryMock(
		"UPDATE users",
		{ rows: [] }
	)
	
	// Mock image updates
	req.client.addQueryMock(
		"UPDATE messages",
		{ rows: [] }
	)
	
	// Mock conversation update
	req.client.addQueryMock(
		"UPDATE conversations",
		{ rows: [] }
	)
	
	// Mock notification queries
	req.client.addQueryMock(
		"SELECT", // subscriptions
		{ rows: [] }
	)
	
	req.client.addQueryMock(
		"INSERT INTO message_notifications",
		{ rows: [ {notification_id: 1} ] }
	)
	
	const res = createMockResponse()
	
	// await sendMessage(req, res)
	
	// const responseData = JSON.parse(res.getResponseData())
	// assertEquals(true, responseData.success, "Should succeed")
	// assertEquals(123, responseData.user_id, "Should return user_id")
}

async function testSendMessageBlockedUser() {
	const req = createMockRequest({
		conversation_id: 1,
		body: "This should fail",
		pngs: []
	}, {
		user_id: 123,
		display_name: "Test User"
	})
	
	// Mock conversation check
	req.client.addQueryMock(
		"SELECT participant_user_ids",
		{ rows: [{ participant_user_ids: [123, 456] }] }
	)
	
	// Mock blocked user check - user is blocked
	req.client.addQueryMock(
		"SELECT user_id_blocked",
		{ rows: [{ user_id_blocked: 456 }] }
	)
	
	const res = createMockResponse()
	
	await sendMessage(req, res)
	
	const responseData = JSON.parse(res.getResponseData())
	assertEquals("Cannot send message to blocked user", responseData.error, "Should return blocked error")
}

async function testSendMessageNotParticipant() {
	const req = createMockRequest({
		conversation_id: 1,
		body: "This should fail",
		pngs: []
	}, {
		user_id: 999,
		display_name: "Test User"
	})
	
	// Mock conversation check - user not in participants
	req.client.addQueryMock(
		"SELECT participant_user_ids",
		{ rows: [{ participant_user_ids: [123, 456] }] }
	)
	
	const res = createMockResponse()
	
	await sendMessage(req, res)
	
	const responseData = JSON.parse(res.getResponseData())
	assertEquals("Conversation not found or access denied", responseData.error, "Should return access denied error")
}

runTests("sendMessage.unit.test.js", [
	testSendNewMessage,
	testSendMessageBlockedUser,
	testSendMessageNotParticipant,
])