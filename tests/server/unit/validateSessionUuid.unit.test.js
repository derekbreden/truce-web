const path = require("path")
const {
	createMockRequest,
	createMockResponse,
	assertEquals,
	runTests
} = require("../shared/serverTestSetup.js")

// Import the handler we're testing
const validateSessionUuid = require("../../../server/session/validateSessionUuid.js")

const tests = {
	testValidSessionWithUser: async () => {
		// Setup mock request with session cookie and valid session
		const req = createMockRequest({})
		req.headers = {
			cookie: "session_uuid=valid-session-uuid-123; other_cookie=value"
		}
		req.session = {}
		
		// Setup mock database response with user data
		req.client.addQueryMock(
			"SELECT",
			{ 
				rows: [
					{
						session_uuid: "valid-session-uuid-123",
						session_id: "session-id-456",
						email: "user@example.com",
						display_name: "John Doe",
						display_name_index: 0,
						profile_picture_uuid: "pic-uuid-789",
						admin: true,
						user_id: "user-123",
						slug: "johndoe",
						subscribed_to_users: "5"
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await validateSessionUuid(req, res)
		
		// Verify session was populated
		assertEquals(
			"valid-session-uuid-123",
			req.session.session_uuid,
			"Should set session_uuid."
		)
		assertEquals(
			"session-id-456",
			req.session.session_id,
			"Should set session_id."
		)
		assertEquals(
			"user@example.com",
			req.session.email,
			"Should set email."
		)
		assertEquals(
			"John Doe",
			req.session.display_name,
			"Should set display_name."
		)
		assertEquals(
			0,
			req.session.display_name_index,
			"Should set display_name_index."
		)
		assertEquals(
			"pic-uuid-789",
			req.session.profile_picture_uuid,
			"Should set profile_picture_uuid."
		)
		assertEquals(
			true,
			req.session.admin,
			"Should set admin status."
		)
		assertEquals(
			"user-123",
			req.session.user_id,
			"Should set user_id."
		)
		assertEquals(
			"johndoe",
			req.session.user_slug,
			"Should set user_slug."
		)
		assertEquals(
			"5",
			req.session.subscribed_to_users,
			"Should set subscribed_to_users."
		)
	},

	testValidSessionWithoutUser: async () => {
		// Setup mock request with session that has no associated user
		const req = createMockRequest({})
		req.headers = {
			cookie: "session_uuid=valid-session-no-user"
		}
		req.session = {}
		
		// Setup mock database response with session but no user
		req.client.addQueryMock(
			"SELECT",
			{ 
				rows: [
					{
						session_uuid: "valid-session-no-user",
						session_id: "session-id-789",
						email: null,
						display_name: null,
						display_name_index: null,
						profile_picture_uuid: null,
						admin: null,
						user_id: null,
						slug: null,
						subscribed_to_users: null
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await validateSessionUuid(req, res)
		
		// Verify session was populated with defaults
		assertEquals(
			"valid-session-no-user",
			req.session.session_uuid,
			"Should set session_uuid."
		)
		assertEquals(
			"session-id-789",
			req.session.session_id,
			"Should set session_id."
		)
		assertEquals(
			null,
			req.session.email,
			"Should set email to null when no user."
		)
		assertEquals(
			false,
			req.session.admin,
			"Should default admin to false."
		)
		assertEquals(
			"",
			req.session.user_id,
			"Should default user_id to empty string."
		)
		assertEquals(
			"",
			req.session.user_slug,
			"Should default user_slug to empty string."
		)
		assertEquals(
			"0",
			req.session.subscribed_to_users,
			"Should default subscribed_to_users to '0'."
		)
	},

	testInvalidSession: async () => {
		// Setup mock request with invalid session
		const req = createMockRequest({})
		req.headers = {
			cookie: "session_uuid=invalid-session-uuid"
		}
		req.session = {}
		
		// Setup mock database response with no results
		req.client.addQueryMock(
			"SELECT",
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await validateSessionUuid(req, res)
		
		// Verify session was not modified
		assertEquals(
			undefined,
			req.session.session_uuid,
			"Should not set session properties for invalid session."
		)
		assertEquals(
			undefined,
			req.session.user_id,
			"Should not set user_id for invalid session."
		)
	},

	testNoCookie: async () => {
		// Setup mock request without cookie header
		const req = createMockRequest({})
		req.headers = {}
		req.session = {}
		
		const res = createMockResponse()
		
		// Execute the handler
		await validateSessionUuid(req, res)
		
		// Verify session was not modified
		assertEquals(
			undefined,
			req.session.session_uuid,
			"Should not set session properties when no cookie."
		)
	},

	testEmptyCookie: async () => {
		// Setup mock request with empty cookie header
		const req = createMockRequest({})
		req.headers = {
			cookie: ""
		}
		req.session = {}
		
		const res = createMockResponse()
		
		// Execute the handler
		await validateSessionUuid(req, res)
		
		// Verify session was not modified
		assertEquals(
			undefined,
			req.session.session_uuid,
			"Should not set session properties when cookie is empty."
		)
	},

	testAuthorizationHeader: async () => {
		// Test the replit workaround using Authorization header
		const req = createMockRequest({})
		req.headers = {
			authorization: "Bearer auth-session-uuid-123"
		}
		req.session = {}
		
		// Setup mock database response
		req.client.addQueryMock(
			"SELECT",
			{ 
				rows: [
					{
						session_uuid: "auth-session-uuid-123",
						session_id: "auth-session-id",
						email: "auth@example.com",
						display_name: "Auth User",
						user_id: "auth-user-123",
						slug: "authuser"
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await validateSessionUuid(req, res)
		
		// Verify session was populated from authorization header
		assertEquals(
			"auth-session-uuid-123",
			req.session.session_uuid,
			"Should set session from Authorization header."
		)
		assertEquals(
			"auth@example.com",
			req.session.email,
			"Should set user data from Authorization header session."
		)
	},

	testAuthorizationHeaderOverridesCookie: async () => {
		// Test that Authorization header takes precedence over cookie
		const req = createMockRequest({})
		req.headers = {
			cookie: "session_uuid=cookie-session-uuid",
			authorization: "Bearer auth-session-uuid-456"
		}
		req.session = {}
		
		// Setup mock database response for auth header session
		req.client.addQueryMock(
			"SELECT",
			{ 
				rows: [
					{
						session_uuid: "auth-session-uuid-456",
						session_id: "auth-session-id-456",
						user_id: "auth-user-456"
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await validateSessionUuid(req, res)
		
		// Verify authorization header session was used
		assertEquals(
			"auth-session-uuid-456",
			req.session.session_uuid,
			"Should use Authorization header over cookie."
		)
	},

	testInvalidAuthorizationHeader: async () => {
		// Test authorization header without Bearer prefix
		const req = createMockRequest({})
		req.headers = {
			authorization: "Token invalid-format",
			cookie: "session_uuid=cookie-session-uuid"
		}
		req.session = {}
		
		// Setup mock database response for cookie session
		req.client.addQueryMock(
			"SELECT",
			{ 
				rows: [
					{
						session_uuid: "cookie-session-uuid",
						session_id: "cookie-session-id",
						user_id: "cookie-user"
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await validateSessionUuid(req, res)
		
		// Should fall back to cookie when authorization header is invalid format
		assertEquals(
			"cookie-session-uuid",
			req.session.session_uuid,
			"Should fall back to cookie when authorization header invalid."
		)
	},

	testCookieParsing: async () => {
		// Test various cookie formats
		const cookieFormats = [
			"session_uuid=single-cookie",
			"other=value; session_uuid=with-other-cookies; third=value",
			"session_uuid=first-occurrence; session_uuid=second-occurrence"
		]
		
		for (let i = 0; i < cookieFormats.length; i++) {
			const req = createMockRequest({})
			req.headers = {
				cookie: cookieFormats[i]
			}
			req.session = {}
			
			req.client.clearQueryMocks()
			req.client.addQueryMock(
				"SELECT",
				{ 
					rows: [
						{
							session_uuid: i === 2 ? "first-occurrence" : (i === 0 ? "single-cookie" : "with-other-cookies"),
							session_id: `session-id-${i}`,
							user_id: `user-${i}`
						}
					]
				}
			)
			
			const res = createMockResponse()
			
			await validateSessionUuid(req, res)
			
			// Should correctly parse session_uuid
			if (i === 2) {
				assertEquals(
					"first-occurrence",
					req.session.session_uuid,
					"Should use first occurrence when duplicate cookies."
				)
			} else if (i === 0) {
				assertEquals(
					"single-cookie",
					req.session.session_uuid,
					"Should parse single cookie correctly."
				)
			} else {
				assertEquals(
					"with-other-cookies",
					req.session.session_uuid,
					"Should parse session_uuid from multiple cookies."
				)
			}
		}
	},

	testUserSlugDefaulting: async () => {
		// Test user_slug defaulting logic
		const testCases = [
			{ slug: "custom-slug", user_id: "user-123", expected: "custom-slug" },
			{ slug: null, user_id: "user-456", expected: "user-456" },
			{ slug: "", user_id: "user-789", expected: "user-789" },
			{ slug: null, user_id: null, expected: "" }
		]
		
		for (const testCase of testCases) {
			const req = createMockRequest({})
			req.headers = {
				cookie: "session_uuid=slug-test-session"
			}
			req.session = {}
			
			req.client.clearQueryMocks()
			req.client.addQueryMock(
				"SELECT",
				{ 
					rows: [
						{
							session_uuid: "slug-test-session",
							session_id: "session-id",
							user_id: testCase.user_id,
							slug: testCase.slug
						}
					]
				}
			)
			
			const res = createMockResponse()
			
			await validateSessionUuid(req, res)
			
			assertEquals(
				testCase.expected,
				req.session.user_slug,
				`User slug should be '${testCase.expected}' for slug='${testCase.slug}' and user_id='${testCase.user_id}'.`
			)
		}
	},

	testAdminDefaulting: async () => {
		// Test admin status defaulting
		const adminValues = [true, false, null, undefined]
		
		for (const adminValue of adminValues) {
			const req = createMockRequest({})
			req.headers = {
				cookie: "session_uuid=admin-test-session"
			}
			req.session = {}
			
			req.client.clearQueryMocks()
			req.client.addQueryMock(
				"SELECT",
				{ 
					rows: [
						{
							session_uuid: "admin-test-session",
							session_id: "session-id",
							admin: adminValue
						}
					]
				}
			)
			
			const res = createMockResponse()
			
			await validateSessionUuid(req, res)
			
			const expected = adminValue || false
			assertEquals(
				expected,
				req.session.admin,
				`Admin should be ${expected} for admin value ${adminValue}.`
			)
		}
	},

	testSubscribedToUsersDefaulting: async () => {
		// Test subscribed_to_users defaulting
		const subscribedValues = ["5", "0", "", null, undefined]
		
		for (const subscribedValue of subscribedValues) {
			const req = createMockRequest({})
			req.headers = {
				cookie: "session_uuid=subscribed-test-session"
			}
			req.session = {}
			
			req.client.clearQueryMocks()
			req.client.addQueryMock(
				"SELECT",
				{ 
					rows: [
						{
							session_uuid: "subscribed-test-session",
							session_id: "session-id",
							subscribed_to_users: subscribedValue
						}
					]
				}
			)
			
			const res = createMockResponse()
			
			await validateSessionUuid(req, res)
			
			const expected = subscribedValue || "0"
			assertEquals(
				expected,
				req.session.subscribed_to_users,
				`Subscribed to users should be '${expected}' for value ${subscribedValue}.`
			)
		}
	},

	testCompleteUserProfile: async () => {
		// Test with complete user profile data
		const req = createMockRequest({})
		req.headers = {
			cookie: "session_uuid=complete-profile-session"
		}
		req.session = {}
		
		req.client.addQueryMock(
			"SELECT",
			{ 
				rows: [
					{
						session_uuid: "complete-profile-session",
						session_id: "complete-session-id",
						email: "complete@example.com",
						display_name: "Complete User",
						display_name_index: 5,
						profile_picture_uuid: "complete-pic-uuid",
						admin: false,
						user_id: "complete-user-id",
						slug: "complete-user-slug",
						subscribed_to_users: "10"
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		await validateSessionUuid(req, res)
		
		// Verify all fields are set correctly
		assertEquals("complete-profile-session", req.session.session_uuid, "Should set session_uuid.")
		assertEquals("complete-session-id", req.session.session_id, "Should set session_id.")
		assertEquals("complete@example.com", req.session.email, "Should set email.")
		assertEquals("Complete User", req.session.display_name, "Should set display_name.")
		assertEquals(5, req.session.display_name_index, "Should set display_name_index.")
		assertEquals("complete-pic-uuid", req.session.profile_picture_uuid, "Should set profile_picture_uuid.")
		assertEquals(false, req.session.admin, "Should set admin status.")
		assertEquals("complete-user-id", req.session.user_id, "Should set user_id.")
		assertEquals("complete-user-slug", req.session.user_slug, "Should set user_slug.")
		assertEquals("10", req.session.subscribed_to_users, "Should set subscribed_to_users.")
	}
}

runTests(path.basename(__filename), Object.values(tests))