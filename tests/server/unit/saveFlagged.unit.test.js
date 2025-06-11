const path = require("path")
const {
	createMockRequest,
	createMockResponse,
	assertEquals,
	runTests
} = require("../shared/serverTestSetup.js")

// Import the handler we're testing
const saveFlagged = require("../../../server/session/saveFlagged.js")

const tests = {
	testFlagPost: async () => {
		// Setup mock request with post flagging data
		const req = createMockRequest({
			post_id_to_flag: "post-456"
		})
		
		// Setup mock database responses
		req.client.addQueryMock(
			"INSERT INTO flagged_posts",
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveFlagged(req, res)
		
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

	testFlagReply: async () => {
		// Setup mock request with reply flagging data
		const req = createMockRequest({
			reply_id_to_flag: "reply-789"
		})
		
		// Mock response tracker to handle sequential queries
		let queryCount = 0
		
		// Setup mock database responses
		req.client.addQueryMock(
			() => {
				queryCount++
				return queryCount === 1 // INSERT INTO flagged_replies
			},
			{ rows: [] }
		)
		req.client.addQueryMock(
			() => queryCount === 2, // UPDATE posts (reply count recalculation)
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveFlagged(req, res)
		
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

	testFlagBothPostAndReply: async () => {
		// Edge case: both post_id and reply_id provided
		const req = createMockRequest({
			post_id_to_flag: "post-123",
			reply_id_to_flag: "reply-456"
		})
		
		let queryCount = 0
		
		// Setup mock database responses for all queries
		req.client.addQueryMock(
			() => {
				queryCount++
				return queryCount === 1 // INSERT INTO flagged_posts
			},
			{ rows: [] }
		)
		req.client.addQueryMock(
			() => queryCount === 2, // INSERT INTO flagged_replies
			{ rows: [] }
		)
		req.client.addQueryMock(
			() => queryCount === 3, // UPDATE posts (reply count)
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveFlagged(req, res)
		
		// Should succeed and process both flags
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			responseData.success,
			"Response should indicate success when both IDs provided."
		)
	},

	testNoActionWhenAlreadyEnded: async () => {
		// Setup mock request
		const req = createMockRequest({
			post_id_to_flag: "post-123"
		})
		
		const res = createMockResponse()
		// Simulate response already ended
		res.writableEnded = true
		
		// Execute the handler
		await saveFlagged(req, res)
		
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
			post_id_to_flag: "post-123"
		}, { user_id: null })
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveFlagged(req, res)
		
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
			// No post_id_to_flag or reply_id_to_flag
		})
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveFlagged(req, res)
		
		// Verify no action taken
		assertEquals(
			null,
			res.getResponseData(),
			"No response should be sent when target IDs are missing."
		)
	},

	testFlagMultiplePosts: async () => {
		// Test flagging multiple posts (sequential calls)
		const postIds = ["post-1", "post-2", "post-3"]
		
		for (const postId of postIds) {
			const req = createMockRequest({
				post_id_to_flag: postId
			})
			
			req.client.clearQueryMocks()
			req.client.addQueryMock(
				"INSERT INTO flagged_posts",
				{ rows: [] }
			)
			
			const res = createMockResponse()
			
			// Execute the handler
			await saveFlagged(req, res)
			
			// Each should succeed
			const responseData = JSON.parse(res.getResponseData())
			assertEquals(
				true,
				responseData.success,
				`Should succeed flagging post ${postId}.`
			)
		}
	},

	testFlagMultipleReplies: async () => {
		// Test flagging multiple replies (each triggers reply count update)
		const replyIds = ["reply-1", "reply-2"]
		
		for (const replyId of replyIds) {
			const req = createMockRequest({
				reply_id_to_flag: replyId
			})
			
			let queryCount = 0
			
			req.client.clearQueryMocks()
			req.client.addQueryMock(
				() => {
					queryCount++
					return queryCount === 1
				},
				{ rows: [] }
			)
			req.client.addQueryMock(
				() => queryCount === 2,
				{ rows: [] }
			)
			
			const res = createMockResponse()
			
			// Execute the handler
			await saveFlagged(req, res)
			
			// Each should succeed
			const responseData = JSON.parse(res.getResponseData())
			assertEquals(
				true,
				responseData.success,
				`Should succeed flagging reply ${replyId}.`
			)
			
			// Reset for next iteration
			queryCount = 0
		}
	},

	testResponseStructure: async () => {
		// Test that response has correct structure
		const req = createMockRequest({
			post_id_to_flag: "response-test-post"
		})
		
		req.client.addQueryMock(
			"INSERT INTO flagged_posts",
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveFlagged(req, res)
		
		// Verify response structure
		const responseData = JSON.parse(res.getResponseData())
		
		// Should have exactly these fields
		const expectedFields = ["success", "user_id", "display_name"]
		const actualFields = Object.keys(responseData)
		
		assertEquals(
			expectedFields.length,
			actualFields.length,
			"Response should have exactly 3 fields."
		)
		
		for (const field of expectedFields) {
			assertEquals(
				true,
				actualFields.includes(field),
				`Response should include ${field} field.`
			)
		}
		
		// Verify field types and values
		assertEquals(
			"boolean",
			typeof responseData.success,
			"Success field should be boolean."
		)
		assertEquals(
			"string",
			typeof responseData.user_id,
			"User_id field should be string."
		)
		assertEquals(
			"string",
			typeof responseData.display_name,
			"Display_name field should be string."
		)
	}
}

runTests(path.basename(__filename), Object.values(tests))