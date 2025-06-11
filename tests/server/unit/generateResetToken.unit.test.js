// Mock nodemailer (the external dependency that email.js uses)
let emailSendCalls = []
const mockNodemailer = {
	createTransport: (config) => ({
		sendMail: (mailOptions, callback) => {
			// Capture the email call for verification
			emailSendCalls.push(mailOptions)
			// Simulate successful sending
			setImmediate(() => callback(null, { response: "Email sent successfully" }))
		}
	})
}

// Replace nodemailer in require cache
const nodemailerPath = require.resolve("nodemailer")
delete require.cache[nodemailerPath]
require.cache[nodemailerPath] = {
	exports: mockNodemailer,
	loaded: true,
	id: nodemailerPath
}

const path = require("path")
const {
	createMockRequest,
	createMockResponse,
	assertEquals,
	runTests
} = require("../shared/serverTestSetup.js")

// Import the handler we're testing (after mocking everything)
const generateResetToken = require("../../../server/session/generateResetToken.js")

// Initialize the email module so it has a transporter
const email = require("../../../server/email.js")
email.init()

const tests = {
	testGenerateResetTokenSuccess: async () => {
		// Reset email calls
		emailSendCalls = []
		
		// Setup mock request with valid email
		const req = createMockRequest(
			{ 
				email: "user@example.com"
				// No password field (required condition)
			},
			{ session_id: "session-id-123" }
		)
		req.results = {}
		
		// Setup mock database responses
		req.client.addQueryMock(
			"SELECT user_id",
			{ 
				rows: [
					{
						user_id: "found-user-456"
					}
				]
			}
		)
		req.client.addQueryMock(
			"INSERT INTO reset_tokens",
			{ rows: [] }
		)
		
		// Set specific UUID for this test
		mockUuidResult = "reset-token-uuid-789"
		
		const res = createMockResponse()
		
		// Execute the handler
		await generateResetToken(req, res)
		
		// Verify success response was sent
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
		
		// Verify email was sent
		assertEquals(
			1,
			emailSendCalls.length,
			"Should send one email."
		)
		
		const emailCall = emailSendCalls[0]
		assertEquals(
			"user@example.com",
			emailCall.to,
			"Should send email to correct address."
		)
		assertEquals(
			"Reset your password on Truce.net",
			emailCall.subject,
			"Should have correct email subject."
		)
		assertEquals(
			"\"Derek Bredensteiner\" <derek@truce.net>",
			emailCall.from,
			"Should have correct from address."
		)
		assertEquals(
			true,
			emailCall.text.includes("https://truce.net/reset/"),
			"Email text should contain reset URL base."
		)
		assertEquals(
			true,
			emailCall.html.includes("https://truce.net/reset/"),
			"Email HTML should contain reset URL base."
		)
		// Check that a UUID-like string follows the URL (36 characters including dashes)
		const textMatch = emailCall.text.match(/https:\/\/truce\.net\/reset\/([a-f0-9-]{36})/)
		const htmlMatch = emailCall.html.match(/https:\/\/truce\.net\/reset\/([a-f0-9-]{36})/)
		assertEquals(
			true,
			textMatch !== null,
			"Email text should contain valid UUID in reset URL."
		)
		assertEquals(
			true,
			htmlMatch !== null,
			"Email HTML should contain valid UUID in reset URL."
		)
		assertEquals(
			true,
			emailCall.text.includes("30 minutes"),
			"Email should mention expiration time."
		)
	},

	testUserNotFound: async () => {
		// Reset email calls
		emailSendCalls = []
		
		// Setup mock request with email that doesn't exist
		const req = createMockRequest(
			{ 
				email: "nonexistent@example.com"
			},
			{ session_id: "session-id-456" }
		)
		req.results = {}
		
		// Setup mock database response with no results
		req.client.addQueryMock(
			"SELECT user_id",
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await generateResetToken(req, res)
		
		// Verify success response (same response whether user exists or not for security)
		assertEquals(
			true,
			res.isEnded(),
			"Response should be ended."
		)
		
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			responseData.success,
			"Should return success even when user not found."
		)
		
		// Verify no email was sent
		assertEquals(
			0,
			emailSendCalls.length,
			"Should not send email when user not found."
		)
	},

	testCaseInsensitiveEmail: async () => {
		// Reset email calls
		emailSendCalls = []
		
		// Setup mock request with mixed case email
		const req = createMockRequest(
			{ 
				email: "User@Example.COM"
			},
			{ session_id: "session-id-case" }
		)
		req.results = {}
		
		// Setup mock database response
		req.client.addQueryMock(
			"SELECT user_id",
			{ 
				rows: [
					{
						user_id: "case-test-user"
					}
				]
			}
		)
		req.client.addQueryMock(
			"INSERT INTO reset_tokens",
			{ rows: [] }
		)
		
		mockUuidResult = "case-test-uuid"
		
		const res = createMockResponse()
		
		// Execute the handler
		await generateResetToken(req, res)
		
		// Verify email was sent to original case
		assertEquals(
			1,
			emailSendCalls.length,
			"Should send email for case-insensitive match."
		)
		assertEquals(
			"User@Example.COM",
			emailSendCalls[0].to,
			"Should send email to original case format."
		)
	},

	testNoActionWhenPasswordProvided: async () => {
		// Reset email calls
		emailSendCalls = []
		
		// Setup mock request WITH password (should prevent action)
		const req = createMockRequest(
			{ 
				email: "user@example.com",
				password: "somePassword" // This should prevent processing
			},
			{ session_id: "session-id-123" }
		)
		req.results = {}
		
		const res = createMockResponse()
		
		// Execute the handler
		await generateResetToken(req, res)
		
		// Verify no action taken when password is provided
		assertEquals(
			false,
			res.isEnded(),
			"Should not end response when password is provided."
		)
		assertEquals(
			0,
			emailSendCalls.length,
			"Should not send email when password is provided."
		)
	},

	testNoActionWhenMissingEmail: async () => {
		// Reset email calls
		emailSendCalls = []
		
		// Setup mock request without email
		const req = createMockRequest(
			{}, // no email
			{ session_id: "session-id-123" }
		)
		req.results = {}
		
		const res = createMockResponse()
		
		// Execute the handler
		await generateResetToken(req, res)
		
		// Verify no action taken
		assertEquals(
			false,
			res.isEnded(),
			"Should not end response when email missing."
		)
		assertEquals(
			0,
			emailSendCalls.length,
			"Should not send email when email missing."
		)
	},

	testNoActionWhenMissingSessionId: async () => {
		// Reset email calls
		emailSendCalls = []
		
		// Setup mock request without session_id
		const req = createMockRequest(
			{ 
				email: "user@example.com"
			},
			{ session_id: undefined }
		)
		req.results = {}
		
		const res = createMockResponse()
		
		// Execute the handler
		await generateResetToken(req, res)
		
		// Verify no action taken
		assertEquals(
			false,
			res.isEnded(),
			"Should not end response when session_id missing."
		)
		assertEquals(
			0,
			emailSendCalls.length,
			"Should not send email when session_id missing."
		)
	},

	testNoActionWhenAlreadyEnded: async () => {
		// Reset email calls
		emailSendCalls = []
		
		// Setup mock request
		const req = createMockRequest(
			{ 
				email: "user@example.com"
			},
			{ session_id: "session-id-123" }
		)
		req.results = {}
		
		const res = createMockResponse()
		// Simulate response already ended
		res.writableEnded = true
		
		// Execute the handler
		await generateResetToken(req, res)
		
		// Verify no action taken
		assertEquals(
			true,
			res.writableEnded,
			"Response should remain ended."
		)
		assertEquals(
			0,
			emailSendCalls.length,
			"Should not send email when response already ended."
		)
	},

	testUuidGeneration: async () => {
		// Reset email calls
		emailSendCalls = []
		
		// Setup multiple requests to verify UUIDs are generated
		for (let i = 0; i < 3; i++) {
			const req = createMockRequest(
				{ 
					email: `user${i}@example.com`
				},
				{ session_id: "session-id-uuid" }
			)
			req.results = {}
			
			req.client.clearQueryMocks()
			req.client.addQueryMock(
				"SELECT user_id",
				{ 
					rows: [
						{
							user_id: `uuid-test-user-${i}`
						}
					]
				}
			)
			req.client.addQueryMock(
				"INSERT INTO reset_tokens",
				{ rows: [] }
			)
			
			const res = createMockResponse()
			
			await generateResetToken(req, res)
		}
		
		// Verify each email contains a valid UUID
		assertEquals(
			3,
			emailSendCalls.length,
			"Should send three emails."
		)
		
		const generatedUuids = []
		for (let i = 0; i < 3; i++) {
			const match = emailSendCalls[i].text.match(/https:\/\/truce\.net\/reset\/([a-f0-9-]{36})/)
			assertEquals(
				true,
				match !== null,
				`Email ${i} should contain valid UUID.`
			)
			if (match) {
				generatedUuids.push(match[1])
			}
		}
		
		// Verify UUIDs are different (high probability they should be)
		const uniqueUuids = new Set(generatedUuids)
		assertEquals(
			3,
			uniqueUuids.size,
			"Generated UUIDs should be unique."
		)
	},

	testEmailContentFormat: async () => {
		// Reset email calls
		emailSendCalls = []
		
		const req = createMockRequest(
			{ 
				email: "content@example.com"
			},
			{ session_id: "session-content" }
		)
		req.results = {}
		
		req.client.addQueryMock(
			"SELECT user_id",
			{ 
				rows: [
					{
						user_id: "content-user"
					}
				]
			}
		)
		req.client.addQueryMock(
			"INSERT INTO reset_tokens",
			{ rows: [] }
		)
		
		mockUuidResult = "content-test-uuid"
		
		const res = createMockResponse()
		
		await generateResetToken(req, res)
		
		const emailCall = emailSendCalls[0]
		
		// Verify email content structure
		assertEquals(
			true,
			emailCall.text.includes("A password reset request was made"),
			"Email text should contain reset request message."
		)
		assertEquals(
			true,
			emailCall.text.includes("If you did not request this"),
			"Email text should contain security disclaimer."
		)
		assertEquals(
			true,
			emailCall.html.includes("<p>"),
			"Email HTML should contain HTML topics."
		)
		assertEquals(
			true,
			emailCall.html.includes("<a href="),
			"Email HTML should contain clickable link."
		)
		assertEquals(
			true,
			emailCall.html.includes("https://truce.net/reset/"),
			"Email HTML should contain reset URL base."
		)
		// Verify it contains a valid UUID
		const htmlMatch = emailCall.html.match(/https:\/\/truce\.net\/reset\/([a-f0-9-]{36})/)
		assertEquals(
			true,
			htmlMatch !== null,
			"Email HTML should contain valid UUID in reset URL."
		)
	},

	testDatabaseSequence: async () => {
		// Reset email calls
		emailSendCalls = []
		
		// Test that both database queries execute in correct sequence
		const req = createMockRequest(
			{ 
				email: "sequence@example.com"
			},
			{ session_id: "session-sequence" }
		)
		req.results = {}
		
		// Setup sequential mock responses
		req.client.addQueryMock(
			"SELECT user_id",
			{ 
				rows: [
					{
						user_id: "sequence-user-123"
					}
				]
			}
		)
		req.client.addQueryMock(
			"INSERT INTO reset_tokens",
			{ rows: [] }
		)
		
		mockUuidResult = "sequence-test-uuid"
		
		const res = createMockResponse()
		
		// Execute the handler
		await generateResetToken(req, res)
		
		// Verify successful sequence completion
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			responseData.success,
			"Should complete database sequence successfully."
		)
		assertEquals(
			1,
			emailSendCalls.length,
			"Should send email after successful database sequence."
		)
	},

	testEmptyEmailString: async () => {
		// Reset email calls
		emailSendCalls = []
		
		// Setup mock request with empty email string
		const req = createMockRequest(
			{ 
				email: "" // Empty string
			},
			{ session_id: "session-id-empty" }
		)
		req.results = {}
		
		const res = createMockResponse()
		
		// Execute the handler
		await generateResetToken(req, res)
		
		// Should not process empty email (falsy check)
		assertEquals(
			false,
			res.isEnded(),
			"Should not process empty email string."
		)
		assertEquals(
			0,
			emailSendCalls.length,
			"Should not send email for empty email string."
		)
	},

	testMultipleUsersSameEmail: async () => {
		// Reset email calls
		emailSendCalls = []
		
		// Test edge case where multiple users have same email (shouldn't happen)
		const req = createMockRequest(
			{ 
				email: "duplicate@example.com"
			},
			{ session_id: "session-duplicate" }
		)
		req.results = {}
		
		req.client.addQueryMock(
			"SELECT user_id",
			{ 
				rows: [
					{
						user_id: "first-user"
					},
					{
						user_id: "second-user"
					}
				]
			}
		)
		req.client.addQueryMock(
			"INSERT INTO reset_tokens",
			{ rows: [] }
		)
		
		mockUuidResult = "duplicate-test-uuid"
		
		const res = createMockResponse()
		
		await generateResetToken(req, res)
		
		// Should use first user and succeed
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			responseData.success,
			"Should succeed using first user when multiple users found."
		)
		assertEquals(
			1,
			emailSendCalls.length,
			"Should send one email for multiple user match."
		)
	}
}

// Restore original functions after tests
const cleanup = () => {
	// Restore original nodemailer
	delete require.cache[nodemailerPath]
}

runTests(path.basename(__filename), Object.values(tests))
cleanup()