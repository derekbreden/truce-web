const path = require("path")
const {
	createMockRequest,
	createMockResponse,
	assertEquals,
	runTests
} = require("../shared/serverTestSetup.js")

// Import the handler we're testing
const getUser = require("../../../server/session/getUser.js")

const tests = {
	testGetUserByNumericId: async () => {
		// Setup mock request with numeric user ID in path
		const req = createMockRequest({
			path: "/user/123"
		})
		// Initialize results object (middleware pattern)
		req.results = {}
		
		// Setup mock database responses
		// User query with numeric ID
		req.client.addQueryMock(
			"SELECT", // Will match the complex user SELECT query
			{ 
				rows: [{
					user_id: "123",
					display_name: "Test User",
					display_name_index: 0,
					user_slug: "123",
					profile_picture_uuid: null,
					user_verified: true,
					subscribed: false
				}]
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await getUser(req, res)
		
		// Verify results were set (middleware pattern - no direct response)
		assertEquals(
			"123",
			req.results.user.user_id,
			"Should set user_id in results."
		)
		assertEquals(
			"Test User",
			req.results.user.display_name,
			"Should set display_name in results."
		)
		assertEquals(
			true,
			req.results.user.user_verified,
			"Should set user_verified in results."
		)
		assertEquals(
			false,
			req.results.user.subscribed,
			"Should set subscribed status in results."
		)
	},

	testGetUserBySlug: async () => {
		// Setup mock request with string slug in path
		const req = createMockRequest({
			path: "/user/test-user-slug"
		})
		req.results = {}
		
		// Setup mock database responses
		// User query with slug
		req.client.addQueryMock(
			"SELECT",
			{ 
				rows: [{
					user_id: "456",
					display_name: "Slug User",
					display_name_index: 1,
					user_slug: "test-user-slug",
					profile_picture_uuid: "pic-uuid-123",
					user_verified: false,
					subscribed: true
				}]
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await getUser(req, res)
		
		// Verify results
		assertEquals(
			"456",
			req.results.user.user_id,
			"Should find user by slug."
		)
		assertEquals(
			"test-user-slug",
			req.results.user.user_slug,
			"Should return correct slug."
		)
		assertEquals(
			"pic-uuid-123",
			req.results.user.profile_picture_uuid,
			"Should return profile picture UUID."
		)
		assertEquals(
			true,
			req.results.user.subscribed,
			"Should show subscribed status."
		)
	},

	testGetUserNotFound: async () => {
		// Setup mock request with nonexistent user
		const req = createMockRequest({
			path: "/user/nonexistent"
		})
		req.results = {}
		
		// Setup mock database responses
		// User query returns no results
		req.client.addQueryMock(
			"SELECT",
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await getUser(req, res)
		
		// Should set empty object when user not found
		assertEquals(
			"object",
			typeof req.results.user,
			"Should set user as empty object when not found."
		)
		assertEquals(
			undefined,
			req.results.user.user_id,
			"Empty user object should not have user_id."
		)
	},

	testGetUserWithSubscribers: async () => {
		// Setup mock request for user subscribers page
		const req = createMockRequest({
			path: "/user/789/subscribers"
		})
		req.results = {}
		
		// Mock response tracker to handle sequential queries
		let queryCount = 0
		
		// Setup mock database responses
		req.client.addQueryMock(
			() => {
				queryCount++
				return queryCount === 1 // First query
			},
			{ 
				rows: [{
					user_id: "789",
					display_name: "Popular User",
					display_name_index: 0,
					user_slug: "789",
					profile_picture_uuid: null,
					user_verified: true,
					subscribed: false
				}]
			}
		)
		req.client.addQueryMock(
			() => queryCount === 2, // Second query
			{
				rows: [
					{
						user_id: "100",
						display_name: "Subscriber One",
						display_name_index: 0,
						user_slug: "100",
						profile_picture_uuid: null,
						user_verified: true,
						subscribed: false
					},
					{
						user_id: "101",
						display_name: "Subscriber Two",
						display_name_index: 1,
						user_slug: "sub-two",
						profile_picture_uuid: "pic-456",
						user_verified: false,
						subscribed: true
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await getUser(req, res)
		
		// Verify main user and subscribers
		assertEquals(
			"789",
			req.results.user.user_id,
			"Should set main user."
		)
		assertEquals(
			2,
			req.results.users.length,
			"Should return array of subscribers."
		)
		assertEquals(
			"Subscriber One",
			req.results.users[0].display_name,
			"Should include first subscriber."
		)
		assertEquals(
			"Subscriber Two",
			req.results.users[1].display_name,
			"Should include second subscriber."
		)
	},

	testGetUserWithSubscribedToUsers: async () => {
		// Setup mock request for user's subscriptions page
		const req = createMockRequest({
			path: "/user/555/subscribed_to_users"
		})
		req.results = {}
		
		// Mock response tracker to handle sequential queries
		let queryCount2 = 0
		
		// Setup mock database responses
		req.client.addQueryMock(
			() => {
				queryCount2++
				return queryCount2 === 1 // First query
			},
			{ 
				rows: [{
					user_id: "555",
					display_name: "Following User",
					display_name_index: 2,
					user_slug: "following-user",
					profile_picture_uuid: "pic-789",
					user_verified: false,
					subscribed: true
				}]
			}
		)
		req.client.addQueryMock(
			() => queryCount2 === 2, // Second query
			{
				rows: [
					{
						user_id: "200",
						display_name: "Followed One",
						display_name_index: 0,
						user_slug: "200",
						profile_picture_uuid: null,
						user_verified: true,
						subscribed: false
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await getUser(req, res)
		
		// Verify main user and followed users
		assertEquals(
			"555",
			req.results.user.user_id,
			"Should set main user."
		)
		assertEquals(
			1,
			req.results.users.length,
			"Should return array of followed users."
		)
		assertEquals(
			"Followed One",
			req.results.users[0].display_name,
			"Should include followed user."
		)
	},

	testGetUserWithNoSession: async () => {
		// Setup mock request without session user_id
		const req = createMockRequest({
			path: "/user/666"
		}, { user_id: null })
		req.results = {}
		
		// Setup mock database responses
		req.client.addQueryMock(
			"SELECT",
			{ 
				rows: [{
					user_id: "666",
					display_name: "Public User",
					display_name_index: 0,
					user_slug: "666",
					profile_picture_uuid: null,
					user_verified: true,
					subscribed: false // Will be false since no session user
				}]
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await getUser(req, res)
		
		// Should still work but subscription status will be based on user_id = 0
		assertEquals(
			"666",
			req.results.user.user_id,
			"Should work without session user_id."
		)
		assertEquals(
			false,
			req.results.user.subscribed,
			"Should show not subscribed when no session."
		)
	},

	testNoActionWhenAlreadyEnded: async () => {
		// Setup mock request
		const req = createMockRequest({
			path: "/user/123"
		})
		req.results = {}
		
		const res = createMockResponse()
		// Simulate response already ended
		res.writableEnded = true
		
		// Execute the handler
		await getUser(req, res)
		
		// Verify no action taken
		assertEquals(
			undefined,
			req.results.user,
			"Should not set results when response already ended."
		)
	},

	testNoActionWhenMissingPath: async () => {
		// Setup mock request without path
		const req = createMockRequest({
			// No path
		})
		req.results = {}
		
		const res = createMockResponse()
		
		// Execute the handler
		await getUser(req, res)
		
		// Verify no action taken
		assertEquals(
			undefined,
			req.results.user,
			"Should not set results when path is missing."
		)
	},

	testNoActionWhenWrongPathPrefix: async () => {
		// Setup mock request with wrong path prefix
		const req = createMockRequest({
			path: "/post/123" // Wrong prefix, should be /user/
		})
		req.results = {}
		
		const res = createMockResponse()
		
		// Execute the handler
		await getUser(req, res)
		
		// Verify no action taken
		assertEquals(
			undefined,
			req.results.user,
			"Should not set results when path doesn't start with /user/."
		)
	},

	testMixedNumericAndSlugScenarios: async () => {
		// Test edge case with numeric-looking slug
		const req = createMockRequest({
			path: "/user/123abc" // Looks numeric but isn't pure number
		})
		req.results = {}
		
		// Setup mock database responses
		req.client.addQueryMock(
			"SELECT",
			{ 
				rows: [{
					user_id: "999",
					display_name: "Mixed User",
					display_name_index: 0,
					user_slug: "123abc",
					profile_picture_uuid: null,
					user_verified: true,
					subscribed: false
				}]
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await getUser(req, res)
		
		// Should treat as slug since it's not pure numeric
		assertEquals(
			"999",
			req.results.user.user_id,
			"Should handle mixed alphanumeric slug correctly."
		)
		assertEquals(
			"123abc",
			req.results.user.user_slug,
			"Should return the slug correctly."
		)
	},

	testGetUserWithEmptySubscribersResult: async () => {
		// Test subscribers page with no subscribers
		const req = createMockRequest({
			path: "/user/lonely/subscribers"
		})
		req.results = {}
		
		// Mock response tracker to handle sequential queries
		let queryCount3 = 0
		
		// Setup mock database responses
		req.client.addQueryMock(
			() => {
				queryCount3++
				return queryCount3 === 1 // First query
			},
			{ 
				rows: [{
					user_id: "lonely-id",
					display_name: "Lonely User",
					display_name_index: 0,
					user_slug: "lonely",
					profile_picture_uuid: null,
					user_verified: true,
					subscribed: false
				}]
			}
		)
		req.client.addQueryMock(
			() => queryCount3 === 2, // Second query (no subscribers)
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await getUser(req, res)
		
		// Should set empty users array
		assertEquals(
			"lonely-id",
			req.results.user.user_id,
			"Should set main user."
		)
		assertEquals(
			0,
			req.results.users.length,
			"Should return empty array when no subscribers."
		)
	}
}

runTests(path.basename(__filename), Object.values(tests))