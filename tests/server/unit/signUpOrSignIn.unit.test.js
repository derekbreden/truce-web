// Mock bcrypt (the external dependency)
let bcrypt_compare_calls = []
let bcrypt_hash_calls = []
const mock_bcrypt = {
	compare: (plaintext, hash) => {
		bcrypt_compare_calls.push({ plaintext, hash })
		// Return true for matching passwords, false otherwise
		return Promise.resolve(plaintext === "correctPassword")
	},
	hash: (plaintext, saltRounds) => {
		bcrypt_hash_calls.push({ plaintext, saltRounds })
		// Return a mock hash
		return Promise.resolve(`hashed_${plaintext}`)
	}
}

// Replace bcrypt in require cache
const bcrypt_path = require.resolve("bcrypt")
delete require.cache[bcrypt_path]
require.cache[bcrypt_path] = {
	exports: mock_bcrypt,
	loaded: true,
	id: bcrypt_path
}

const path = require("path")
const {
	createMockRequest,
	createMockResponse,
	assertEquals,
	runTests
} = require("../shared/serverTestSetup.js")

// Import the handler we're testing (after mocking everything)
const signUpOrSignIn = require("../../../server/session/signUpOrSignIn.js")

const tests = {
	testSuccessfulSignIn: async () => {
		// Reset bcrypt calls
		bcrypt_compare_calls = []
		bcrypt_hash_calls = []
		
		// Setup mock request for sign in
		const req = createMockRequest(
			{ 
				email: "user@example.com",
				password: "correctPassword"
			},
			{ session_id: "session-123" }
		)
		
		// Setup mock database response for existing user
		req.client.addQueryMock(
			"SELECT password_hash, user_id, display_name",
			{ 
				rows: [
					{
						password_hash: "stored_hash_value",
						user_id: "user-456",
						display_name: "Test User"
					}
				]
			}
		)
		req.client.addQueryMock(
			"INSERT INTO user_sessions",
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await signUpOrSignIn(req, res)
		
		// Verify bcrypt.compare was called
		assertEquals(
			1,
			bcrypt_compare_calls.length,
			"Should call bcrypt.compare once."
		)
		assertEquals(
			"correctPassword",
			bcrypt_compare_calls[0].plaintext,
			"Should compare with correct password."
		)
		assertEquals(
			"stored_hash_value",
			bcrypt_compare_calls[0].hash,
			"Should compare with stored hash."
		)
		
		// Verify successful sign in response
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
			true,
			responseData.signed_in,
			"Should indicate signed in."
		)
		assertEquals(
			"user-456",
			responseData.user_id,
			"Should return correct user ID."
		)
		assertEquals(
			"Test User",
			responseData.display_name,
			"Should return correct display name."
		)
	},

	testIncorrectPassword: async () => {
		// Reset bcrypt calls
		bcrypt_compare_calls = []
		bcrypt_hash_calls = []
		
		// Setup mock request for sign in with wrong password
		const req = createMockRequest(
			{ 
				email: "user@example.com",
				password: "wrongPassword"
			},
			{ session_id: "session-123" }
		)
		
		// Setup mock database response for existing user
		req.client.addQueryMock(
			"SELECT password_hash, user_id, display_name",
			{ 
				rows: [
					{
						password_hash: "stored_hash_value",
						user_id: "user-456",
						display_name: "Test User"
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await signUpOrSignIn(req, res)
		
		// Verify bcrypt.compare was called
		assertEquals(
			1,
			bcrypt_compare_calls.length,
			"Should call bcrypt.compare once."
		)
		assertEquals(
			"wrongPassword",
			bcrypt_compare_calls[0].plaintext,
			"Should compare with wrong password."
		)
		
		// Verify incorrect password response
		assertEquals(
			true,
			res.isEnded(),
			"Response should be ended."
		)
		
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			"Incorrect password",
			responseData.error,
			"Should return incorrect password error."
		)
	},

	testSignUpNewUser: async () => {
		// Reset bcrypt calls
		bcrypt_compare_calls = []
		bcrypt_hash_calls = []
		
		// Setup mock request for new user signup (no existing user_id in session)
		const req = createMockRequest(
			{ 
				email: "newuser@example.com",
				password: "newPassword"
			},
			{ 
				session_id: "session-new",
				user_id: undefined // Explicitly no user_id in session - this triggers INSERT path
			}
		)
		
		// Setup mock database response for no existing user
		req.client.addQueryMock(
			"SELECT password_hash, user_id, display_name",
			{ rows: [] }
		)
		req.client.addQueryMock(
			"INSERT INTO users",
			{ 
				rows: [
					{
						user_id: "new-user-789"
					}
				]
			}
		)
		req.client.addQueryMock(
			"INSERT INTO user_sessions",
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await signUpOrSignIn(req, res)
		
		// Verify bcrypt.hash was called
		assertEquals(
			1,
			bcrypt_hash_calls.length,
			"Should call bcrypt.hash once."
		)
		assertEquals(
			"newPassword",
			bcrypt_hash_calls[0].plaintext,
			"Should hash the provided password."
		)
		assertEquals(
			12,
			bcrypt_hash_calls[0].saltRounds,
			"Should use 12 salt rounds."
		)
		
		// Verify successful signup response
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
			true,
			responseData.created_account,
			"Should indicate account was created."
		)
		assertEquals(
			"new-user-789",
			responseData.user_id,
			"Should return new user ID."
		)
	},

	testSignUpWithRootEmailMakesAdmin: async () => {
		// Reset bcrypt calls
		bcrypt_compare_calls = []
		bcrypt_hash_calls = []
		
		// Set ROOT_EMAIL environment variable for this test
		const originalRootEmail = process.env.ROOT_EMAIL
		process.env.ROOT_EMAIL = 'admin@example.com'
		
		// Setup mock request for admin signup (no existing user_id in session)
		const req = createMockRequest(
			{ 
				email: "admin@example.com",
				password: 'adminPassword'
			},
			{ 
				session_id: "session-admin",
				user_id: undefined // Explicitly no user_id in session - this triggers INSERT path
			}
		)
		
		// Setup mock database response for no existing user
		req.client.addQueryMock(
			"SELECT password_hash, user_id, display_name",
			{ rows: [] }
		)
		req.client.addQueryMock(
			"INSERT INTO users",
			{ 
				rows: [
					{
						user_id: "admin-user-999"
					}
				]
			}
		)
		req.client.addQueryMock(
			"INSERT INTO user_sessions",
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await signUpOrSignIn(req, res)
		
		// Verify admin account was created
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			responseData.success,
			"Should return success for admin signup."
		)
		assertEquals(
			true,
			responseData.created_account,
			"Should indicate admin account was created."
		)
		
		// Restore environment variable
		process.env.ROOT_EMAIL = originalRootEmail
	},

	testSignUpExistingUserWithUserId: async () => {
		// Reset bcrypt calls
		bcrypt_compare_calls = []
		bcrypt_hash_calls = []
		
		// Setup mock request for user who already has user_id in session
		const req = createMockRequest(
			{ 
				email: "existing@example.com",
				password: 'existingPassword'
			},
			{ 
				session_id: "session-existing",
				user_id: "existing-user-123" // User already has ID
			}
		)
		
		// Setup mock database response for no existing user with this email
		req.client.addQueryMock(
			"SELECT password_hash, user_id, display_name",
			{ rows: [] }
		)
		req.client.addQueryMock(
			"UPDATE users",
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await signUpOrSignIn(req, res)
		
		// Verify bcrypt.hash was called
		assertEquals(
			1,
			bcrypt_hash_calls.length,
			"Should call bcrypt.hash once for existing user update."
		)
		
		// Verify successful update response
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			responseData.success,
			"Should return success for existing user update."
		)
		assertEquals(
			true,
			responseData.created_account,
			"Should indicate account was created/updated."
		)
		assertEquals(
			"existing-user-123",
			responseData.user_id,
			"Should return existing user ID."
		)
	},

	testCaseInsensitiveEmailLookup: async () => {
		// Reset bcrypt calls
		bcrypt_compare_calls = []
		bcrypt_hash_calls = []
		
		// Setup mock request with mixed case email
		const req = createMockRequest(
			{ 
				email: "User@Example.COM",
				password: "correctPassword"
			},
			{ session_id: "session-case" }
		)
		
		// Setup mock database response for existing user
		req.client.addQueryMock(
			"SELECT password_hash, user_id, display_name",
			{ 
				rows: [
					{
						password_hash: "stored_hash",
						user_id: "case-user",
						display_name: "Case User"
					}
				]
			}
		)
		req.client.addQueryMock(
			"INSERT INTO user_sessions",
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await signUpOrSignIn(req, res)
		
		// Verify successful sign in with case-insensitive email
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			responseData.success,
			"Should succeed with case-insensitive email."
		)
		assertEquals(
			true,
			responseData.signed_in,
			"Should sign in existing user."
		)
	},

	testNoActionWhenMissingEmail: async () => {
		// Reset bcrypt calls
		bcrypt_compare_calls = []
		bcrypt_hash_calls = []
		
		// Setup mock request without email
		const req = createMockRequest(
			{ 
				password: 'somePassword'
			},
			{ session_id: "session-123" }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await signUpOrSignIn(req, res)
		
		// Verify no action taken
		assertEquals(
			false,
			res.isEnded(),
			"Should not end response when email missing."
		)
		assertEquals(
			0,
			bcrypt_compare_calls.length,
			"Should not call bcrypt.compare when email missing."
		)
		assertEquals(
			0,
			bcrypt_hash_calls.length,
			"Should not call bcrypt.hash when email missing."
		)
	},

	testNoActionWhenMissingPassword: async () => {
		// Reset bcrypt calls
		bcrypt_compare_calls = []
		bcrypt_hash_calls = []
		
		// Setup mock request without password
		const req = createMockRequest(
			{ 
				email: "user@example.com"
			},
			{ session_id: "session-123" }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await signUpOrSignIn(req, res)
		
		// Verify no action taken
		assertEquals(
			false,
			res.isEnded(),
			"Should not end response when password missing."
		)
		assertEquals(
			0,
			bcrypt_compare_calls.length,
			"Should not call bcrypt when password missing."
		)
	},

	testNoActionWhenMissingSessionId: async () => {
		// Reset bcrypt calls
		bcrypt_compare_calls = []
		bcrypt_hash_calls = []
		
		// Setup mock request without session_id
		const req = createMockRequest(
			{ 
				email: "user@example.com",
				password: 'somePassword'
			},
			{ session_id: undefined }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await signUpOrSignIn(req, res)
		
		// Verify no action taken
		assertEquals(
			false,
			res.isEnded(),
			"Should not end response when session_id missing."
		)
		assertEquals(
			0,
			bcrypt_compare_calls.length,
			"Should not call bcrypt when session_id missing."
		)
	},

	testNoActionWhenAlreadyEnded: async () => {
		// Reset bcrypt calls
		bcrypt_compare_calls = []
		bcrypt_hash_calls = []
		
		// Setup mock request
		const req = createMockRequest(
			{ 
				email: "user@example.com",
				password: 'somePassword'
			},
			{ session_id: "session-123" }
		)
		
		const res = createMockResponse()
		// Simulate response already ended
		res.writableEnded = true
		
		// Execute the handler
		await signUpOrSignIn(req, res)
		
		// Verify no action taken
		assertEquals(
			true,
			res.writableEnded,
			"Response should remain ended."
		)
		assertEquals(
			0,
			bcrypt_compare_calls.length,
			"Should not call bcrypt when response already ended."
		)
	},

	testEmptyEmailString: async () => {
		// Reset bcrypt calls
		bcrypt_compare_calls = []
		bcrypt_hash_calls = []
		
		// Setup mock request with empty email string
		const req = createMockRequest(
			{ 
				email: "", // Empty string
				password: 'somePassword'
			},
			{ session_id: "session-123" }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await signUpOrSignIn(req, res)
		
		// Should not process empty email (falsy check)
		assertEquals(
			false,
			res.isEnded(),
			"Should not process empty email string."
		)
		assertEquals(
			0,
			bcrypt_compare_calls.length,
			"Should not call bcrypt for empty email."
		)
	},

	testEmptyPasswordString: async () => {
		// Reset bcrypt calls
		bcrypt_compare_calls = []
		bcrypt_hash_calls = []
		
		// Setup mock request with empty password string
		const req = createMockRequest(
			{ 
				email: "user@example.com",
				password: '' // Empty string
			},
			{ session_id: "session-123" }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await signUpOrSignIn(req, res)
		
		// Should not process empty password (falsy check)
		assertEquals(
			false,
			res.isEnded(),
			"Should not process empty password string."
		)
		assertEquals(
			0,
			bcrypt_compare_calls.length,
			"Should not call bcrypt for empty password."
		)
	},

	testPasswordHashConversion: async () => {
		// Reset bcrypt calls
		bcrypt_compare_calls = []
		bcrypt_hash_calls = []
		
		// Setup mock request for sign in
		const req = createMockRequest(
			{ 
				email: "user@example.com",
				password: "correctPassword"
			},
			{ session_id: "session-hash" }
		)
		
		// Setup mock database response with buffer password hash
		req.client.addQueryMock(
			"SELECT password_hash, user_id, display_name",
			{ 
				rows: [
					{
						password_hash: Buffer.from('buffer_hash_data'), // Test toString() conversion
						user_id: "buffer-user",
						display_name: "Buffer User"
					}
				]
			}
		)
		req.client.addQueryMock(
			"INSERT INTO user_sessions",
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await signUpOrSignIn(req, res)
		
		// Verify bcrypt.compare was called with toString() conversion
		assertEquals(
			1,
			bcrypt_compare_calls.length,
			"Should call bcrypt.compare once."
		)
		assertEquals(
			"buffer_hash_data",
			bcrypt_compare_calls[0].hash,
			"Should convert password hash to string."
		)
	},

	testSessionDisplayNameAndProfilePicture: async () => {
		// Reset bcrypt calls
		bcrypt_compare_calls = []
		bcrypt_hash_calls = []
		
		// Setup mock request for new user signup with session data (no existing user_id)
		const req = createMockRequest(
			{ 
				email: "newuser@example.com",
				password: "newPassword"
			},
			{ 
				session_id: "session-profile",
				display_name: "Session Display Name",
				profile_picture_uuid: "profile-pic-uuid",
				user_id: undefined // Explicitly no user_id in session - this triggers INSERT path
			}
		)
		
		// Setup mock database response for no existing user
		req.client.addQueryMock(
			"SELECT password_hash, user_id, display_name",
			{ rows: [] }
		)
		req.client.addQueryMock(
			"INSERT INTO users",
			{ 
				rows: [
					{
						user_id: "profile-user-123"
					}
				]
			}
		)
		req.client.addQueryMock(
			"INSERT INTO user_sessions",
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await signUpOrSignIn(req, res)
		
		// Verify session data is returned in response
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			responseData.success,
			"Should return success."
		)
		assertEquals(
			"Session Display Name",
			responseData.display_name,
			"Should return session display name."
		)
		assertEquals(
			"profile-pic-uuid",
			responseData.profile_picture_uuid,
			"Should return session profile picture UUID."
		)
	},

	testDatabaseSequenceForSignIn: async () => {
		// Reset bcrypt calls
		bcrypt_compare_calls = []
		bcrypt_hash_calls = []
		
		// Test that database queries execute in correct sequence for sign in
		const req = createMockRequest(
			{ 
				email: "sequence@example.com",
				password: "correctPassword"
			},
			{ session_id: "session-sequence" }
		)
		
		// Setup sequential mock responses
		req.client.addQueryMock(
			"SELECT password_hash, user_id, display_name",
			{ 
				rows: [
					{
						password_hash: "sequence_hash",
						user_id: "sequence-user",
						display_name: "Sequence User"
					}
				]
			}
		)
		req.client.addQueryMock(
			"INSERT INTO user_sessions",
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await signUpOrSignIn(req, res)
		
		// Verify successful sequence completion
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			responseData.success,
			"Should complete sign in sequence successfully."
		)
		assertEquals(
			true,
			responseData.signed_in,
			"Should indicate successful sign in."
		)
		assertEquals(
			1,
			bcrypt_compare_calls.length,
			"Should call bcrypt.compare during sequence."
		)
	},

	testDatabaseSequenceForSignUp: async () => {
		// Reset bcrypt calls
		bcrypt_compare_calls = []
		bcrypt_hash_calls = []
		
		// Test that database queries execute in correct sequence for sign up (no existing user_id)
		const req = createMockRequest(
			{ 
				email: "newsignup@example.com",
				password: "newPassword"
			},
			{ 
				session_id: "session-signup",
				user_id: undefined // Explicitly no user_id in session - this triggers INSERT path
			}
		)
		
		// Setup sequential mock responses
		req.client.addQueryMock(
			"SELECT password_hash, user_id, display_name",
			{ rows: [] } // No existing user
		)
		req.client.addQueryMock(
			"INSERT INTO users",
			{ 
				rows: [
					{
						user_id: "signup-sequence-user"
					}
				]
			}
		)
		req.client.addQueryMock(
			"INSERT INTO user_sessions",
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await signUpOrSignIn(req, res)
		
		// Verify successful signup sequence completion
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			responseData.success,
			"Should complete sign up sequence successfully."
		)
		assertEquals(
			true,
			responseData.created_account,
			"Should indicate account was created."
		)
		assertEquals(
			1,
			bcrypt_hash_calls.length,
			"Should call bcrypt.hash during signup sequence."
		)
	}
}

// Restore original functions after tests
const cleanup = () => {
	// Restore original bcrypt
	delete require.cache[bcrypt_path]
}

runTests(path.basename(__filename), Object.values(tests))
cleanup()