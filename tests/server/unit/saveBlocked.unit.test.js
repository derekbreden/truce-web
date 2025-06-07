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
	testBlockUserFromTopic: async () => {
		// Setup mock request with topic blocking data
		const req = createMockRequest({
			topic_id_to_block: 'topic-456'
		})
		
		// Setup mock database responses
		// First query: Get user_id from topic
		req.client.addQueryMock(
			'SELECT user_id FROM topics WHERE topic_id = $1',
			{ rows: [{ user_id: 'author-user-789' }] }
		)
		// Second query: Insert blocked user relationship
		req.client.addQueryMock(
			'INSERT INTO blocked_users',
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

	testBlockUserFromComment: async () => {
		// Setup mock request with comment blocking data
		const req = createMockRequest({
			comment_id_to_block: 'comment-789'
		})
		
		// Setup mock database responses
		// First query: Get user_id from comment
		req.client.addQueryMock(
			'SELECT user_id FROM comments WHERE comment_id = $1',
			{ rows: [{ user_id: 'commenter-user-456' }] }
		)
		// Second query: Insert blocked user relationship
		req.client.addQueryMock(
			'INSERT INTO blocked_users',
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

	testBlockTopicWithNoResults: async () => {
		// Setup mock request with topic blocking data
		const req = createMockRequest({
			topic_id_to_block: 'nonexistent-topic'
		})
		
		// Setup mock database responses
		// Topic query returns no results
		req.client.addQueryMock(
			'SELECT user_id FROM topics WHERE topic_id = $1',
			{ rows: [] }
		)
		// Insert should still happen but with user_id 0
		req.client.addQueryMock(
			'INSERT INTO blocked_users',
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
			"Response should indicate success even when topic not found."
		)
	},

	testBlockCommentWithNoResults: async () => {
		// Setup mock request with comment blocking data
		const req = createMockRequest({
			comment_id_to_block: 'nonexistent-comment'
		})
		
		// Setup mock database responses
		// Comment query returns no results
		req.client.addQueryMock(
			'SELECT user_id FROM comments WHERE comment_id = $1',
			{ rows: [] }
		)
		// Insert should still happen but with user_id 0
		req.client.addQueryMock(
			'INSERT INTO blocked_users',
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
			"Response should indicate success even when comment not found."
		)
	},

	testNoActionWhenAlreadyEnded: async () => {
		// Setup mock request
		const req = createMockRequest({
			topic_id_to_block: 'topic-123'
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
			topic_id_to_block: 'topic-123'
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
		// Setup mock request without topic_id or comment_id
		const req = createMockRequest({
			// No topic_id_to_block or comment_id_to_block
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

	testBothTopicAndCommentIds: async () => {
		// Edge case: both topic_id and comment_id provided
		// Handler should process comment_id since it comes after topic_id
		const req = createMockRequest({
			topic_id_to_block: 'topic-123',
			comment_id_to_block: 'comment-456'
		})
		
		// Setup mock database responses for both queries
		req.client.addQueryMock(
			'SELECT user_id FROM topics WHERE topic_id = $1',
			{ rows: [{ user_id: 'topic-author-123' }] }
		)
		req.client.addQueryMock(
			'SELECT user_id FROM comments WHERE comment_id = $1',
			{ rows: [{ user_id: 'comment-author-456' }] }
		)
		req.client.addQueryMock(
			'INSERT INTO blocked_users',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveBlocked(req, res)
		
		// Should succeed - comment_id takes precedence (overwrites user_id_blocked)
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			responseData.success,
			"Response should indicate success when both IDs provided."
		)
	}
}

runTests(path.basename(__filename), Object.values(tests))