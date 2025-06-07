const path = require("path")
const {
	createMockRequest,
	createMockResponse,
	assertEquals,
	runTests
} = require("../shared/serverTestSetup.js")

// Import the handler we're testing
const getSettings = require("../../../server/session/getSettings.js")

const tests = {
	testGetSettingsForLoggedInUser: async () => {
		// Setup mock request for settings path with logged in user
		const req = createMockRequest(
			{ path: "/settings" },
			{ user_id: 'user-123' }
		)
		req.results = {}
		
		// Setup mock database response with subscribed users
		req.client.addQueryMock(
			'SELECT',
			{ 
				rows: [
					{
						user_id: 'subscribed-user-1',
						display_name: 'John Doe',
						display_name_index: 0,
						user_slug: 'johndoe',
						profile_picture_uuid: 'pic-uuid-1',
						user_verified: true,
						subscribed: true
					},
					{
						user_id: 'subscribed-user-2',
						display_name: 'Jane Smith',
						display_name_index: 1,
						user_slug: 'janesmith',
						profile_picture_uuid: 'pic-uuid-2',
						user_verified: false,
						subscribed: true
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await getSettings(req, res)
		
		// Verify users were loaded
		assertEquals(
			2,
			req.results.users.length,
			"Should return array of subscribed users."
		)
		assertEquals(
			'subscribed-user-1',
			req.results.users[0].user_id,
			"First user should have correct user_id."
		)
		assertEquals(
			'John Doe',
			req.results.users[0].display_name,
			"First user should have correct display_name."
		)
		assertEquals(
			'johndoe',
			req.results.users[0].user_slug,
			"First user should have correct user_slug."
		)
		assertEquals(
			true,
			req.results.users[0].user_verified,
			"First user should be verified."
		)
		assertEquals(
			true,
			req.results.users[0].subscribed,
			"All users should be marked as subscribed."
		)
	},

	testGetSettingsForGuestUser: async () => {
		// Setup mock request for settings path without user_id
		const req = createMockRequest(
			{ path: "/settings" },
			{ user_id: undefined }
		)
		req.results = {}
		
		// Setup mock database response (query uses 0 for guest users)
		req.client.addQueryMock(
			'SELECT',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await getSettings(req, res)
		
		// Verify empty results for guest user
		assertEquals(
			0,
			req.results.users.length,
			"Guest user should have no subscribed users."
		)
	},

	testNoActionWhenWrongPath: async () => {
		// Setup mock request with wrong path
		const req = createMockRequest(
			{ path: "/topics" },
			{ user_id: 'user-123' }
		)
		req.results = {}
		
		const res = createMockResponse()
		
		// Execute the handler
		await getSettings(req, res)
		
		// Verify no action taken
		assertEquals(
			undefined,
			req.results.users,
			"Should not set results for wrong path."
		)
	},

	testNoActionWhenNoPath: async () => {
		// Setup mock request without path
		const req = createMockRequest(
			{}, // no path
			{ user_id: 'user-123' }
		)
		req.results = {}
		
		const res = createMockResponse()
		
		// Execute the handler
		await getSettings(req, res)
		
		// Verify no action taken
		assertEquals(
			undefined,
			req.results.users,
			"Should not set results when path is missing."
		)
	},

	testNoActionWhenAlreadyEnded: async () => {
		// Setup mock request
		const req = createMockRequest(
			{ path: "/settings" },
			{ user_id: 'user-123' }
		)
		req.results = {}
		
		const res = createMockResponse()
		// Simulate response already ended
		res.writableEnded = true
		
		// Execute the handler
		await getSettings(req, res)
		
		// Verify no action taken
		assertEquals(
			undefined,
			req.results.users,
			"Should not set results when response already ended."
		)
	},

	testUserSlugHandling: async () => {
		// Test that user_slug defaults to user_id when slug is empty/null
		const req = createMockRequest(
			{ path: "/settings" },
			{ user_id: 'user-123' }
		)
		req.results = {}
		
		req.client.addQueryMock(
			'SELECT',
			{ 
				rows: [
					{
						user_id: 'user-with-slug',
						display_name: 'User With Slug',
						user_slug: 'custom-slug',
						user_verified: true,
						subscribed: true
					},
					{
						user_id: 'user-without-slug',
						display_name: 'User Without Slug',
						user_slug: 'user-without-slug', // This will be the user_id converted to VARCHAR
						user_verified: false,
						subscribed: true
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		await getSettings(req, res)
		
		// Verify slug handling
		assertEquals(
			'custom-slug',
			req.results.users[0].user_slug,
			"Should use custom slug when available."
		)
		assertEquals(
			'user-without-slug',
			req.results.users[1].user_slug,
			"Should default to user_id when no custom slug."
		)
	},

	testUserVerificationStatus: async () => {
		// Test user verification status based on email
		const req = createMockRequest(
			{ path: "/settings" },
			{ user_id: 'user-123' }
		)
		req.results = {}
		
		req.client.addQueryMock(
			'SELECT',
			{ 
				rows: [
					{
						user_id: 'verified-user',
						display_name: 'Verified User',
						user_verified: true,
						subscribed: true
					},
					{
						user_id: 'unverified-user',
						display_name: 'Unverified User',
						user_verified: false,
						subscribed: true
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		await getSettings(req, res)
		
		// Verify verification status
		assertEquals(
			true,
			req.results.users[0].user_verified,
			"Verified user should have user_verified true."
		)
		assertEquals(
			false,
			req.results.users[1].user_verified,
			"Unverified user should have user_verified false."
		)
	},

	testDisplayNameIndex: async () => {
		// Test display_name_index field handling
		const req = createMockRequest(
			{ path: "/settings" },
			{ user_id: 'user-123' }
		)
		req.results = {}
		
		req.client.addQueryMock(
			'SELECT',
			{ 
				rows: [
					{
						user_id: 'user-1',
						display_name: 'Alice',
						display_name_index: 0,
						user_slug: 'alice',
						subscribed: true
					},
					{
						user_id: 'user-2',
						display_name: 'Bob',
						display_name_index: 1,
						user_slug: 'bob',
						subscribed: true
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		await getSettings(req, res)
		
		// Verify display_name_index
		assertEquals(
			0,
			req.results.users[0].display_name_index,
			"Should include display_name_index."
		)
		assertEquals(
			1,
			req.results.users[1].display_name_index,
			"Should handle different display_name_index values."
		)
	},

	testProfilePictureUuid: async () => {
		// Test profile_picture_uuid field handling
		const req = createMockRequest(
			{ path: "/settings" },
			{ user_id: 'user-123' }
		)
		req.results = {}
		
		req.client.addQueryMock(
			'SELECT',
			{ 
				rows: [
					{
						user_id: 'user-with-pic',
						display_name: 'User With Picture',
						profile_picture_uuid: 'pic-uuid-123',
						subscribed: true
					},
					{
						user_id: 'user-without-pic',
						display_name: 'User Without Picture',
						profile_picture_uuid: null,
						subscribed: true
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		await getSettings(req, res)
		
		// Verify profile picture handling
		assertEquals(
			'pic-uuid-123',
			req.results.users[0].profile_picture_uuid,
			"Should include profile picture UUID when available."
		)
		assertEquals(
			null,
			req.results.users[1].profile_picture_uuid,
			"Should handle null profile picture UUID."
		)
	},

	testEmptyResults: async () => {
		// Test when user has no subscriptions
		const req = createMockRequest(
			{ path: "/settings" },
			{ user_id: 'user-123' }
		)
		req.results = {}
		
		req.client.addQueryMock(
			'SELECT',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		await getSettings(req, res)
		
		// Should handle empty results gracefully
		assertEquals(
			0,
			req.results.users.length,
			"Should handle empty subscriptions gracefully."
		)
	},

	testNullUserIdDefaults: async () => {
		// Test that null user_id defaults to 0 in query
		const req = createMockRequest(
			{ path: "/settings" },
			{ user_id: null }
		)
		req.results = {}
		
		req.client.addQueryMock(
			'SELECT',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		await getSettings(req, res)
		
		// Should execute query with default value
		assertEquals(
			0,
			req.results.users.length,
			"Should handle null user_id by defaulting to 0."
		)
	},

	testAllFieldsPresent: async () => {
		// Test that all expected fields are present in results
		const req = createMockRequest(
			{ path: "/settings" },
			{ user_id: 'user-123' }
		)
		req.results = {}
		
		req.client.addQueryMock(
			'SELECT',
			{ 
				rows: [
					{
						user_id: 'complete-user',
						display_name: 'Complete User',
						display_name_index: 2,
						user_slug: 'complete-user-slug',
						profile_picture_uuid: 'complete-pic-uuid',
						user_verified: true,
						subscribed: true
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		await getSettings(req, res)
		
		const user = req.results.users[0]
		
		// Verify all fields are present
		assertEquals('complete-user', user.user_id, "Should have user_id.")
		assertEquals('Complete User', user.display_name, "Should have display_name.")
		assertEquals(2, user.display_name_index, "Should have display_name_index.")
		assertEquals('complete-user-slug', user.user_slug, "Should have user_slug.")
		assertEquals('complete-pic-uuid', user.profile_picture_uuid, "Should have profile_picture_uuid.")
		assertEquals(true, user.user_verified, "Should have user_verified.")
		assertEquals(true, user.subscribed, "Should have subscribed flag.")
	}
}

runTests(path.basename(__filename), Object.values(tests))