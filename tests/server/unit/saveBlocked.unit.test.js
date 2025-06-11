const path = require("path")
const {
	createMockRequest,
	createMockResponse,
	assertEquals,
	runTests
} = require("../shared/serverTestSetup.js")

// Import the handler we're testing
const saveBlocked = require("../../../server/session/saveBlocked.js")

const tests = {
	testBlockUserFromPost: async () => {
		// Setup mock request with post blocking data
		const req = createMockRequest({
			post_id_to_block: "post-456"
		})
		
		// Setup mock database responses
		// First query: Get user_id from post
		req.client.addQueryMock(
			"SELECT user_id FROM posts WHERE post_id = $1",
			{ rows: [{ user_id: "author-user-789" }] }
		)
		// Second query: Insert blocked user relationship
		req.client.addQueryMock(
			"INSERT INTO blocked_users",
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveBlocked(req, res)
		
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
			"123",
			responseData.user_id,
			"Response should include user_id."
		)
		assertEquals(
			"Test User",
			responseData.display_name,
			"Response should include display_name."
		)
	},

	testBlockUserFromReply: async () => {
		// Setup mock request with reply blocking data
		const req = createMockRequest({
			reply_id_to_block: "reply-789"
		})
		
		// Setup mock database responses
		// First query: Get user_id from reply
		req.client.addQueryMock(
			"SELECT user_id FROM replies WHERE reply_id = $1",
			{ rows: [{ user_id: "replyer-user-456" }] }
		)
		// Second query: Insert blocked user relationship
		req.client.addQueryMock(
			"INSERT INTO blocked_users",
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveBlocked(req, res)
		
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

	testBlockPostWithNoResults: async () => {
		// Setup mock request with post blocking data
		const req = createMockRequest({
			post_id_to_block: "nonexistent-post"
		})
		
		// Setup mock database responses
		// Post query returns no results
		req.client.addQueryMock(
			"SELECT user_id FROM posts WHERE post_id = $1",
			{ rows: [] }
		)
		// Insert should still happen but with user_id 0
		req.client.addQueryMock(
			"INSERT INTO blocked_users",
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveBlocked(req, res)
		
		// Should still succeed (blocking user_id 0)
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			responseData.success,
			"Response should indicate success even when post not found."
		)
	},

	testBlockReplyWithNoResults: async () => {
		// Setup mock request with reply blocking data
		const req = createMockRequest({
			reply_id_to_block: "nonexistent-reply"
		})
		
		// Setup mock database responses
		// Reply query returns no results
		req.client.addQueryMock(
			"SELECT user_id FROM replies WHERE reply_id = $1",
			{ rows: [] }
		)
		// Insert should still happen but with user_id 0
		req.client.addQueryMock(
			"INSERT INTO blocked_users",
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveBlocked(req, res)
		
		// Should still succeed (blocking user_id 0)
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			responseData.success,
			"Response should indicate success even when reply not found."
		)
	},

	testNoActionWhenAlreadyEnded: async () => {
		// Setup mock request
		const req = createMockRequest({
			post_id_to_block: "post-123"
		})
		
		const res = createMockResponse()
		// Simulate response already ended
		res.writableEnded = true
		
		// Execute the handler
		await saveBlocked(req, res)
		
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
			post_id_to_block: "post-123"
		}, { user_id: null })
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveBlocked(req, res)
		
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
			// No post_id_to_block or reply_id_to_block
		})
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveBlocked(req, res)
		
		// Verify no action taken
		assertEquals(
			null,
			res.getResponseData(),
			"No response should be sent when target IDs are missing."
		)
	},

	testBothPostAndReplyIds: async () => {
		// Edge case: both post_id and reply_id provided
		// Handler should process reply_id since it comes after post_id
		const req = createMockRequest({
			post_id_to_block: "post-123",
			reply_id_to_block: "reply-456"
		})
		
		// Setup mock database responses for both queries
		req.client.addQueryMock(
			"SELECT user_id FROM posts WHERE post_id = $1",
			{ rows: [{ user_id: "post-author-123" }] }
		)
		req.client.addQueryMock(
			"SELECT user_id FROM replies WHERE reply_id = $1",
			{ rows: [{ user_id: "reply-author-456" }] }
		)
		req.client.addQueryMock(
			"INSERT INTO blocked_users",
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveBlocked(req, res)
		
		// Should succeed - reply_id takes precedence (overwrites user_id_blocked)
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			responseData.success,
			"Response should indicate success when both IDs provided."
		)
	}
}

runTests(path.basename(__filename), Object.values(tests))