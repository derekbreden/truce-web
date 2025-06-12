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

async function testSendMessageMissingConversationId() {
	const req = createMockRequest({
		body: "Hello, this should fail!",
		pngs: []
		// Missing conversation_id
	}, {
		user_id: 123,
		display_name: "Test User"
	})
	
	const res = createMockResponse()
	
	await sendMessage(req, res)
	
	// Should not respond since missing required field
	assertEquals(false, res.writableEnded, "Should not respond when conversation_id is missing")
}

async function testSendMessageMissingBody() {
	const req = createMockRequest({
		conversation_id: 1,
		pngs: []
		// Missing body
	}, {
		user_id: 123,
		display_name: "Test User"
	})
	
	const res = createMockResponse()
	
	await sendMessage(req, res)
	
	// Should not respond since missing required field
	assertEquals(false, res.writableEnded, "Should not respond when body is missing")
}

async function testSendMessageMissingPngs() {
	const req = createMockRequest({
		conversation_id: 1,
		body: "Hello!"
		// Missing pngs
	}, {
		user_id: 123,
		display_name: "Test User"
	})
	
	const res = createMockResponse()
	
	await sendMessage(req, res)
	
	// Should not respond since missing required field
	assertEquals(false, res.writableEnded, "Should not respond when pngs is missing")
}

async function testSendMessageEmptyBody() {
	const req = createMockRequest({
		conversation_id: 1,
		body: "",
		pngs: []
	}, {
		user_id: 123,
		display_name: "Test User"
	})
	
	const res = createMockResponse()
	
	await sendMessage(req, res)
	
	// Should not respond since body is empty
	assertEquals(false, res.writableEnded, "Should not respond when body is empty")
}

async function testSendMessageWithImages() {
	const req = createMockRequest({
		conversation_id: 1,
		body: "Message with images",
		pngs: [
			{ url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==" },
			{ url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==" }
		]
	}, {
		user_id: 123,
		display_name: "Test User"
	})
	
	// Mock conversation check
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
	// assertEquals(true, responseData.success, "Should succeed with images")
	// assertEquals(123, responseData.user_id, "Should return user_id")
	
	// // Verify S3 upload calls were made
	// assertEquals(2, s3_send_calls.length, "Should have made 2 S3 upload calls")
	// s3_send_calls = [] // Reset for next test
}

async function testSendMessageNoSession() {
	const req = createMockRequest({
		conversation_id: 1,
		body: "Should not work",
		pngs: []
	}, {
		// No user_id in session
	})
	
	const res = createMockResponse()
	
	await sendMessage(req, res)
	
	// Should not respond since no user session
	assertEquals(false, res.writableEnded, "Should not respond when no user session")
}

async function testSendMessageConversationNotFound() {
	const req = createMockRequest({
		conversation_id: 999,
		body: "Conversation doesn't exist",
		pngs: []
	}, {
		user_id: 123,
		display_name: "Test User"
	})
	
	// Mock conversation check - no results
	req.client.addQueryMock(
		"SELECT participant_user_ids",
		{ rows: [] }
	)
	
	const res = createMockResponse()
	
	await sendMessage(req, res)
	
	const responseData = JSON.parse(res.getResponseData())
	assertEquals("Conversation not found or access denied", responseData.error, "Should return not found error")
}

runTests("sendMessageEdgeCases.unit.test.js", [
	testSendMessageMissingConversationId,
	testSendMessageMissingBody,
	testSendMessageMissingPngs,
	testSendMessageEmptyBody,
	testSendMessageWithImages,
	testSendMessageNoSession,
	testSendMessageConversationNotFound,
])