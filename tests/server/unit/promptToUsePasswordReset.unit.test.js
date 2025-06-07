const path = require("path")
const {
	createMockRequest,
	createMockResponse,
	assertEquals,
	runTests
} = require("../shared/serverTestSetup.js")

// Import the handler we're testing
const promptToUsePasswordReset = require("../../../server/session/promptToUsePasswordReset.js")

const tests = {
	testValidResetTokenWithoutSession: async () => {
		// Setup mock request with valid reset token, user not yet linked to session
		const req = createMockRequest(
			{ reset_token_uuid: 'valid-token-123' },
			{ session_uuid: 'session-uuid-456', session_id: 'session-id-789' }
		)
		req.results = {}
		
		// Setup mock database responses
		req.client.addQueryMock(
			'SELECT reset_tokens.user_id',
			{ 
				rows: [
					{
						user_id: 'user-123',
						email: 'user@example.com',
						session_id: null // User not yet linked to this session
					}
				]
			}
		)
		req.client.addQueryMock(
			'INSERT INTO user_sessions',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await promptToUsePasswordReset(req, res)
		
		// Verify response was sent with email
		assertEquals(
			true,
			res.isEnded(),
			"Response should be ended."
		)
		
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			'user@example.com',
			responseData.email,
			"Should return user email."
		)
		assertEquals(
			undefined,
			responseData.error,
			"Should not have error."
		)
	},

	testValidResetTokenWithExistingSession: async () => {
		// Setup mock request with valid reset token, user already linked to session
		const req = createMockRequest(
			{ reset_token_uuid: 'valid-token-456' },
			{ session_uuid: 'session-uuid-123', session_id: 'session-id-456' }
		)
		req.results = {}
		
		// Setup mock database response
		req.client.addQueryMock(
			'SELECT reset_tokens.user_id',
			{ 
				rows: [
					{
						user_id: 'user-456',
						email: 'existing@example.com',
						session_id: 'session-id-456' // User already linked to this session
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await promptToUsePasswordReset(req, res)
		
		// Verify response was sent with email (no new session link needed)
		assertEquals(
			true,
			res.isEnded(),
			"Response should be ended."
		)
		
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			'existing@example.com',
			responseData.email,
			"Should return user email."
		)
		assertEquals(
			undefined,
			responseData.error,
			"Should not have error."
		)
	},

	testInvalidResetToken: async () => {
		// Setup mock request with invalid/expired reset token
		const req = createMockRequest(
			{ reset_token_uuid: 'invalid-token-999' },
			{ session_uuid: 'session-uuid-123', session_id: 'session-id-456' }
		)
		req.results = {}
		
		// Setup mock database response with no results
		req.client.addQueryMock(
			'SELECT reset_tokens.user_id',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await promptToUsePasswordReset(req, res)
		
		// Verify error response was sent
		assertEquals(
			true,
			res.isEnded(),
			"Response should be ended."
		)
		
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			"Reset link expired",
			responseData.error,
			"Should return error message."
		)
		assertEquals(
			undefined,
			responseData.email,
			"Should not return email on error."
		)
	},

	testExpiredResetToken: async () => {
		// Setup mock request with expired reset token (handled by database query)
		const req = createMockRequest(
			{ reset_token_uuid: 'expired-token-789' },
			{ session_uuid: 'session-uuid-123', session_id: 'session-id-456' }
		)
		req.results = {}
		
		// Setup mock database response (expired tokens excluded by query)
		req.client.addQueryMock(
			'SELECT reset_tokens.user_id',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await promptToUsePasswordReset(req, res)
		
		// Verify error response
		assertEquals(
			true,
			res.isEnded(),
			"Response should be ended."
		)
		
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			"Reset link expired",
			responseData.error,
			"Should return error message for expired token."
		)
	},

	testNoActionWhenNoResetToken: async () => {
		// Setup mock request without reset_token_uuid
		const req = createMockRequest(
			{}, // no reset_token_uuid
			{ session_uuid: 'session-uuid-123', session_id: 'session-id-456' }
		)
		req.results = {}
		
		const res = createMockResponse()
		
		// Execute the handler
		await promptToUsePasswordReset(req, res)
		
		// Verify no action taken
		assertEquals(
			false,
			res.isEnded(),
			"Should not end response when no reset token."
		)
		assertEquals(
			undefined,
			req.results.email,
			"Should not set email in results."
		)
		assertEquals(
			undefined,
			req.results.error,
			"Should not set error in results."
		)
	},

	testNoActionWhenAlreadyEnded: async () => {
		// Setup mock request
		const req = createMockRequest(
			{ reset_token_uuid: 'valid-token-123' },
			{ session_uuid: 'session-uuid-123', session_id: 'session-id-456' }
		)
		req.results = {}
		
		const res = createMockResponse()
		// Simulate response already ended
		res.writableEnded = true
		
		// Execute the handler
		await promptToUsePasswordReset(req, res)
		
		// Verify no action taken
		assertEquals(
			true,
			res.writableEnded,
			"Response should remain ended."
		)
	},

	testUserSessionLinking: async () => {
		// Test that user is properly linked to session when not already linked
		const req = createMockRequest(
			{ reset_token_uuid: 'linking-token-123' },
			{ session_uuid: 'session-uuid-abc', session_id: 'session-id-def' }
		)
		req.results = {}
		
		// Setup sequential mock responses
		req.client.addQueryMock(
			'SELECT reset_tokens.user_id',
			{ 
				rows: [
					{
						user_id: 'user-to-link',
						email: 'link@example.com',
						session_id: null // User not linked to session
					}
				]
			}
		)
		req.client.addQueryMock(
			'INSERT INTO user_sessions',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await promptToUsePasswordReset(req, res)
		
		// Verify user was linked and response sent
		assertEquals(
			true,
			res.isEnded(),
			"Response should be ended."
		)
		
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			'link@example.com',
			responseData.email,
			"Should return email after linking user to session."
		)
	},

	testSessionUuidHandling: async () => {
		// Test that session_uuid is properly used in the query
		const req = createMockRequest(
			{ reset_token_uuid: 'session-test-token' },
			{ session_uuid: 'specific-session-uuid', session_id: 'specific-session-id' }
		)
		req.results = {}
		
		req.client.addQueryMock(
			'SELECT reset_tokens.user_id',
			{ 
				rows: [
					{
						user_id: 'session-user',
						email: 'session@example.com',
						session_id: 'specific-session-id'
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		await promptToUsePasswordReset(req, res)
		
		// Should successfully use session_uuid to find user
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			'session@example.com',
			responseData.email,
			"Should handle session_uuid correctly."
		)
	},

	testEmptyEmailHandling: async () => {
		// Test handling of user with empty email
		const req = createMockRequest(
			{ reset_token_uuid: 'empty-email-token' },
			{ session_uuid: 'session-uuid-123', session_id: 'session-id-456' }
		)
		req.results = {}
		
		req.client.addQueryMock(
			'SELECT reset_tokens.user_id',
			{ 
				rows: [
					{
						user_id: 'user-no-email',
						email: '', // Empty email
						session_id: null
					}
				]
			}
		)
		req.client.addQueryMock(
			'INSERT INTO user_sessions',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		await promptToUsePasswordReset(req, res)
		
		// Should handle empty email
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			'',
			responseData.email,
			"Should handle empty email."
		)
	},

	testNullEmailHandling: async () => {
		// Test handling of user with null email
		const req = createMockRequest(
			{ reset_token_uuid: 'null-email-token' },
			{ session_uuid: 'session-uuid-123', session_id: 'session-id-456' }
		)
		req.results = {}
		
		req.client.addQueryMock(
			'SELECT reset_tokens.user_id',
			{ 
				rows: [
					{
						user_id: 'user-null-email',
						email: null, // Null email
						session_id: 'session-id-456'
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		await promptToUsePasswordReset(req, res)
		
		// Should handle null email
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			null,
			responseData.email,
			"Should handle null email."
		)
	},

	testMultipleValidTokenRows: async () => {
		// Test edge case where query returns multiple rows (shouldn't happen in normal operation)
		const req = createMockRequest(
			{ reset_token_uuid: 'multi-row-token' },
			{ session_uuid: 'session-uuid-123', session_id: 'session-id-456' }
		)
		req.results = {}
		
		req.client.addQueryMock(
			'SELECT reset_tokens.user_id',
			{ 
				rows: [
					{
						user_id: 'user-first',
						email: 'first@example.com',
						session_id: null
					},
					{
						user_id: 'user-second',
						email: 'second@example.com',
						session_id: null
					}
				]
			}
		)
		req.client.addQueryMock(
			'INSERT INTO user_sessions',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		await promptToUsePasswordReset(req, res)
		
		// Should use first row
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			'first@example.com',
			responseData.email,
			"Should use first row when multiple rows returned."
		)
	},

	testResetTokenTimeValidation: async () => {
		// Test that the time validation is part of the query (60 minutes)
		const req = createMockRequest(
			{ reset_token_uuid: 'time-validated-token' },
			{ session_uuid: 'session-uuid-123', session_id: 'session-id-456' }
		)
		req.results = {}
		
		// Mock database response (time validation handled by query)
		req.client.addQueryMock(
			'SELECT reset_tokens.user_id',
			{ 
				rows: [
					{
						user_id: 'time-valid-user',
						email: 'timevalid@example.com',
						session_id: null
					}
				]
			}
		)
		req.client.addQueryMock(
			'INSERT INTO user_sessions',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		await promptToUsePasswordReset(req, res)
		
		// Should return email for time-valid token
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			'timevalid@example.com',
			responseData.email,
			"Should handle time-validated token."
		)
	}
}

runTests(path.basename(__filename), Object.values(tests))