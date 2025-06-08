const path = require("path")
const {
	createMockRequest,
	createMockResponse,
	assertEquals,
	runTests
} = require("../shared/serverTestSetup.js")

// Import the handler we're testing
const saveFavorite = require("../../../server/session/saveFavorite.js")

const tests = {
	testAddPostFavorite: async () => {
		// Setup mock request with post favorite data
		const req = createMockRequest({
			post_id_to_favorite: 'post-123',
			was_favorited: false // Adding a favorite
		})
		
		// Setup mock database responses
		req.client.addQueryMock(
			'INSERT INTO favorite_posts',
			{ rows: [] }
		)
		req.client.addQueryMock(
			'UPDATE posts',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveFavorite(req, res)
		
		// Verify response
		assertEquals(
			true,
			res.isEnded(),
			"Response should be ended after processing."
		)
		
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			responseData.success,
			"Response should indicate success."
		)
		assertEquals(
			'test-user-123',
			responseData.user_id,
			"Response should include user_id."
		)
		assertEquals(
			'Test User',
			responseData.display_name,
			"Response should include display_name."
		)
	},

	testRemovePostFavorite: async () => {
		// Setup mock request with post unfavorite data
		const req = createMockRequest({
			post_id_to_favorite: 'post-123',
			was_favorited: true // Removing a favorite
		})
		
		// Setup mock database responses
		req.client.addQueryMock(
			'DELETE FROM favorite_posts',
			{ rows: [] }
		)
		req.client.addQueryMock(
			'UPDATE posts',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveFavorite(req, res)
		
		// Verify response
		assertEquals(
			true,
			res.isEnded(),
			"Response should be ended after processing."
		)
		
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			responseData.success,
			"Response should indicate success."
		)
	},

	testAddReplyFavorite: async () => {
		// Setup mock request with reply favorite data
		const req = createMockRequest({
			reply_id_to_favorite: 'reply-456',
			was_favorited: false // Adding a favorite
		})
		
		// Setup mock database responses
		req.client.addQueryMock(
			'INSERT INTO favorite_replies',
			{ rows: [] }
		)
		req.client.addQueryMock(
			'UPDATE replies',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveFavorite(req, res)
		
		// Verify response
		assertEquals(
			true,
			res.isEnded(),
			"Response should be ended after processing."
		)
		
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			responseData.success,
			"Response should indicate success."
		)
	},

	testNoActionWhenAlreadyEnded: async () => {
		// Setup mock request
		const req = createMockRequest({
			post_id_to_favorite: 'post-123',
			was_favorited: false
		})
		
		const res = createMockResponse()
		// Simulate response already ended
		res.writableEnded = true
		
		// Execute the handler
		await saveFavorite(req, res)
		
		// Verify no database calls were made and no response sent
		assertEquals(
			null,
			res.getResponseData(),
			"No response data should be set when response already ended."
		)
	},

	testNoActionWhenMissingUserId: async () => {
		// Setup mock request without user_id
		const req = createMockRequest({
			post_id_to_favorite: 'post-123',
			was_favorited: false
		}, { user_id: null })
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveFavorite(req, res)
		
		// Verify no action taken
		assertEquals(
			null,
			res.getResponseData(),
			"No response should be sent when user_id is missing."
		)
	},

	testNoActionWhenMissingTargetIds: async () => {
		// Setup mock request without post_id or reply_id
		const req = createMockRequest({
			was_favorited: false
			// No post_id_to_favorite or reply_id_to_favorite
		})
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveFavorite(req, res)
		
		// Verify no action taken
		assertEquals(
			null,
			res.getResponseData(),
			"No response should be sent when target IDs are missing."
		)
	}
}

runTests(path.basename(__filename), Object.values(tests))