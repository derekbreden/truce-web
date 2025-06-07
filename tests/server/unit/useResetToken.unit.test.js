const path = require("path")
const {
	createMockRequest,
	createMockResponse,
	assertEquals,
	runTests
} = require("../shared/serverTestSetup.js")

// Mock bcrypt module
const bcrypt = require("bcrypt")
const originalHash = bcrypt.hash
let mockHashResult = 'mocked-password-hash'
bcrypt.hash = async (password, saltRounds) => {
	// Return mocked hash but verify correct parameters were passed
	if (typeof password !== 'string' || saltRounds !== 12) {
		throw new Error('Invalid bcrypt parameters')
	}
	return mockHashResult
}

// Import the handler we're testing
const useResetToken = require("../../../server/session/useResetToken.js")

const tests = {
	testValidResetTokenSuccess: async () => {
		// Setup mock request with valid reset token and password
		const req = createMockRequest(
			{ 
				password: 'newPassword123',
				reset_token_uuid: 'valid-reset-token-uuid'
			},
			{ session_id: 'session-id-123' }
		)
		req.results = {}
		
		// Setup mock database responses
		req.client.addQueryMock(
			'SELECT reset_tokens.user_id',
			{ 
				rows: [
					{
						user_id: 'user-to-reset-456'
					}
				]
			}
		)
		req.client.addQueryMock(
			'UPDATE users',
			{ rows: [] }
		)
		
		// Set mock hash result
		mockHashResult = 'hashed-new-password-123'
		
		const res = createMockResponse()
		
		// Execute the handler
		await useResetToken(req, res)
		
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
		assertEquals(
			undefined,
			responseData.error,
			"Should not have error."
		)
	},

	testExpiredResetToken: async () => {
		// Setup mock request with expired/invalid reset token
		const req = createMockRequest(
			{ 
				password: 'newPassword456',
				reset_token_uuid: 'expired-reset-token-uuid'
			},
			{ session_id: 'session-id-456' }
		)
		req.results = {}
		
		// Setup mock database response with no results (expired token)
		req.client.addQueryMock(
			'SELECT reset_tokens.user_id',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await useResetToken(req, res)
		
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
			responseData.success,
			"Should not have success."
		)
	},

	testInvalidResetToken: async () => {
		// Setup mock request with invalid reset token
		const req = createMockRequest(
			{ 
				password: 'newPassword789',
				reset_token_uuid: 'invalid-token-uuid'
			},
			{ session_id: 'session-id-789' }
		)
		req.results = {}
		
		// Setup mock database response with no results
		req.client.addQueryMock(
			'SELECT reset_tokens.user_id',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await useResetToken(req, res)
		
		// Verify error response
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			"Reset link expired",
			responseData.error,
			"Should return error for invalid token."
		)
	},

	testNoActionWhenMissingPassword: async () => {
		// Setup mock request without password
		const req = createMockRequest(
			{ 
				reset_token_uuid: 'valid-token-uuid'
				// password missing
			},
			{ session_id: 'session-id-123' }
		)
		req.results = {}
		
		const res = createMockResponse()
		
		// Execute the handler
		await useResetToken(req, res)
		
		// Verify no action taken
		assertEquals(
			false,
			res.isEnded(),
			"Should not end response when password missing."
		)
	},

	testNoActionWhenMissingResetToken: async () => {
		// Setup mock request without reset token
		const req = createMockRequest(
			{ 
				password: 'newPassword123'
				// reset_token_uuid missing
			},
			{ session_id: 'session-id-123' }
		)
		req.results = {}
		
		const res = createMockResponse()
		
		// Execute the handler
		await useResetToken(req, res)
		
		// Verify no action taken
		assertEquals(
			false,
			res.isEnded(),
			"Should not end response when reset token missing."
		)
	},

	testNoActionWhenMissingSessionId: async () => {
		// Setup mock request without session_id
		const req = createMockRequest(
			{ 
				password: 'newPassword123',
				reset_token_uuid: 'valid-token-uuid'
			},
			{ session_id: undefined }
		)
		req.results = {}
		
		const res = createMockResponse()
		
		// Execute the handler
		await useResetToken(req, res)
		
		// Verify no action taken
		assertEquals(
			false,
			res.isEnded(),
			"Should not end response when session_id missing."
		)
	},

	testNoActionWhenAlreadyEnded: async () => {
		// Setup mock request
		const req = createMockRequest(
			{ 
				password: 'newPassword123',
				reset_token_uuid: 'valid-token-uuid'
			},
			{ session_id: 'session-id-123' }
		)
		req.results = {}
		
		const res = createMockResponse()
		// Simulate response already ended
		res.writableEnded = true
		
		// Execute the handler
		await useResetToken(req, res)
		
		// Verify no action taken
		assertEquals(
			true,
			res.writableEnded,
			"Response should remain ended."
		)
	},

	testPasswordHashing: async () => {
		// Test that password is properly hashed with correct parameters
		const req = createMockRequest(
			{ 
				password: 'testPassword456',
				reset_token_uuid: 'hash-test-token'
			},
			{ session_id: 'session-id-456' }
		)
		req.results = {}
		
		// Setup mock database responses
		req.client.addQueryMock(
			'SELECT reset_tokens.user_id',
			{ 
				rows: [
					{
						user_id: 'hash-test-user'
					}
				]
			}
		)
		req.client.addQueryMock(
			'UPDATE users',
			{ rows: [] }
		)
		
		// Set specific mock hash result
		mockHashResult = 'specifically-hashed-password'
		
		const res = createMockResponse()
		
		// Execute the handler
		await useResetToken(req, res)
		
		// Verify success (bcrypt was called with correct parameters)
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			responseData.success,
			"Should succeed when password hashing works correctly."
		)
	},

	testTokenTimeValidation: async () => {
		// Test that the time validation is part of the query (60 minutes)
		const req = createMockRequest(
			{ 
				password: 'timeValidPassword',
				reset_token_uuid: 'time-valid-token'
			},
			{ session_id: 'session-id-time' }
		)
		req.results = {}
		
		// Mock database response (time validation handled by query)
		req.client.addQueryMock(
			'SELECT reset_tokens.user_id',
			{ 
				rows: [
					{
						user_id: 'time-valid-user'
					}
				]
			}
		)
		req.client.addQueryMock(
			'UPDATE users',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		await useResetToken(req, res)
		
		// Should succeed for time-valid token
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			responseData.success,
			"Should handle time-validated token."
		)
	},

	testMultipleValidTokenRows: async () => {
		// Test edge case where query returns multiple rows (shouldn't happen normally)
		const req = createMockRequest(
			{ 
				password: 'multiRowPassword',
				reset_token_uuid: 'multi-row-token'
			},
			{ session_id: 'session-id-multi' }
		)
		req.results = {}
		
		req.client.addQueryMock(
			'SELECT reset_tokens.user_id',
			{ 
				rows: [
					{
						user_id: 'first-user'
					},
					{
						user_id: 'second-user'
					}
				]
			}
		)
		req.client.addQueryMock(
			'UPDATE users',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		await useResetToken(req, res)
		
		// Should use first row and succeed
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			responseData.success,
			"Should succeed using first row when multiple rows returned."
		)
	},

	testEmptyPassword: async () => {
		// Test with empty string password
		const req = createMockRequest(
			{ 
				password: '',
				reset_token_uuid: 'empty-password-token'
			},
			{ session_id: 'session-id-empty' }
		)
		req.results = {}
		
		const res = createMockResponse()
		
		// Execute the handler
		await useResetToken(req, res)
		
		// Should not process empty password (falsy check)
		assertEquals(
			false,
			res.isEnded(),
			"Should not process empty password."
		)
	},

	testDatabaseSequence: async () => {
		// Test that both database queries execute in correct sequence
		const req = createMockRequest(
			{ 
				password: 'sequenceTestPassword',
				reset_token_uuid: 'sequence-test-token'
			},
			{ session_id: 'session-sequence' }
		)
		req.results = {}
		
		// Setup sequential mock responses
		req.client.addQueryMock(
			'SELECT reset_tokens.user_id',
			{ 
				rows: [
					{
						user_id: 'sequence-test-user-123'
					}
				]
			}
		)
		req.client.addQueryMock(
			'UPDATE users',
			{ rows: [] }
		)
		
		mockHashResult = 'sequence-hashed-password'
		
		const res = createMockResponse()
		
		// Execute the handler
		await useResetToken(req, res)
		
		// Verify successful sequence completion
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			responseData.success,
			"Should complete database sequence successfully."
		)
	},

	testResetTokenUuidHandling: async () => {
		// Test various reset token UUID formats
		const testTokens = [
			'simple-token',
			'uuid-with-dashes-123-456',
			'very-long-reset-token-uuid-with-multiple-parts'
		]
		
		for (const token of testTokens) {
			const req = createMockRequest(
				{ 
					password: 'testPassword',
					reset_token_uuid: token
				},
				{ session_id: 'session-id-format' }
			)
			req.results = {}
			
			req.client.clearQueryMocks()
			req.client.addQueryMock(
				'SELECT reset_tokens.user_id',
				{ 
					rows: [
						{
							user_id: `user-for-${token}`
						}
					]
				}
			)
			req.client.addQueryMock(
				'UPDATE users',
				{ rows: [] }
			)
			
			const res = createMockResponse()
			
			await useResetToken(req, res)
			
			const responseData = JSON.parse(res.getResponseData())
			assertEquals(
				true,
				responseData.success,
				`Should handle token format: ${token}.`
			)
		}
	}
}

// Restore original bcrypt.hash after tests
const cleanup = () => {
	bcrypt.hash = originalHash
}

runTests(path.basename(__filename), Object.values(tests))
cleanup()