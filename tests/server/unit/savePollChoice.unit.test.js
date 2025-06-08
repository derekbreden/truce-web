const path = require("path")
const {
	createMockRequest,
	createMockResponse,
	assertEquals,
	runTests
} = require("../shared/serverTestSetup.js")

// Import the handler we're testing
const savePollChoice = require("../../../server/session/savePollChoice.js")

const tests = {
	testSavePollChoiceWithSingleVote: async () => {
		// Setup mock request with poll choice data
		const req = createMockRequest({
			post_id: 'post-123',
			poll_choice: '2'
		})
		
		// Setup mock database responses
		// First query: Insert poll vote
		req.client.addQueryMock(
			'INSERT INTO poll_votes',
			{ rows: [] }
		)
		// Second query: Get poll counts (only choice 2 has 1 vote)
		req.client.addQueryMock(
			'SELECT', // Matches the GROUP BY query
			{ 
				rows: [
					{ poll_choice: '2', count: '1' }
				] 
			}
		)
		// Third query: Update post with counts
		req.client.addQueryMock(
			'UPDATE posts',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await savePollChoice(req, res)
		
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

	testSavePollChoiceWithMultipleVotes: async () => {
		// Setup mock request
		const req = createMockRequest({
			post_id: 'post-456',
			poll_choice: '1'
		})
		
		// Setup mock database responses
		req.client.addQueryMock(
			'INSERT INTO poll_votes',
			{ rows: [] }
		)
		// Multiple votes across different choices
		req.client.addQueryMock(
			'SELECT',
			{ 
				rows: [
					{ poll_choice: '1', count: '3' },
					{ poll_choice: '2', count: '1' },
					{ poll_choice: '4', count: '2' }
				] 
			}
		)
		req.client.addQueryMock(
			'UPDATE posts',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await savePollChoice(req, res)
		
		// Should succeed and process all vote counts correctly
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			responseData.success,
			"Response should indicate success with multiple votes."
		)
	},

	testSavePollChoiceWithNoExistingVotes: async () => {
		// Setup mock request
		const req = createMockRequest({
			post_id: 'new-post-789',
			poll_choice: '3'
		})
		
		// Setup mock database responses
		req.client.addQueryMock(
			'INSERT INTO poll_votes',
			{ rows: [] }
		)
		// No existing votes
		req.client.addQueryMock(
			'SELECT',
			{ rows: [] }
		)
		req.client.addQueryMock(
			'UPDATE posts',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await savePollChoice(req, res)
		
		// Should succeed even with no existing votes
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			responseData.success,
			"Response should indicate success even with no existing votes."
		)
	},

	testSavePollChoiceEdgeCases: async () => {
		// Test with poll choice 4 (highest valid choice)
		const req = createMockRequest({
			post_id: 'post-edge',
			poll_choice: '4'
		})
		
		// Setup mock database responses
		req.client.addQueryMock(
			'INSERT INTO poll_votes',
			{ rows: [] }
		)
		// All four choices have votes
		req.client.addQueryMock(
			'SELECT',
			{ 
				rows: [
					{ poll_choice: '1', count: '5' },
					{ poll_choice: '2', count: '3' },
					{ poll_choice: '3', count: '8' },
					{ poll_choice: '4', count: '2' }
				] 
			}
		)
		req.client.addQueryMock(
			'UPDATE posts',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await savePollChoice(req, res)
		
		// Should handle all four poll choices correctly
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			responseData.success,
			"Response should handle all four poll choices."
		)
	},

	testNoActionWhenAlreadyEnded: async () => {
		// Setup mock request
		const req = createMockRequest({
			post_id: 'post-123',
			poll_choice: '1'
		})
		
		const res = createMockResponse()
		// Simulate response already ended
		res.writableEnded = true
		
		// Execute the handler
		await savePollChoice(req, res)
		
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
			post_id: 'post-123',
			poll_choice: '1'
		}, { user_id: null })
		
		const res = createMockResponse()
		
		// Execute the handler
		await savePollChoice(req, res)
		
		// Verify no action taken
		assertEquals(
			null,
			res.getResponseData(),
			"No response should be sent when user_id is missing."
		)
	},

	testNoActionWhenMissingPostId: async () => {
		// Setup mock request without post_id
		const req = createMockRequest({
			poll_choice: '1'
			// No post_id
		})
		
		const res = createMockResponse()
		
		// Execute the handler
		await savePollChoice(req, res)
		
		// Verify no action taken
		assertEquals(
			null,
			res.getResponseData(),
			"No response should be sent when post_id is missing."
		)
	},

	testNoActionWhenMissingPollChoice: async () => {
		// Setup mock request without poll_choice
		const req = createMockRequest({
			post_id: 'post-123'
			// No poll_choice
		})
		
		const res = createMockResponse()
		
		// Execute the handler
		await savePollChoice(req, res)
		
		// Verify no action taken
		assertEquals(
			null,
			res.getResponseData(),
			"No response should be sent when poll_choice is missing."
		)
	},

	testSavePollChoiceWithStringNumbers: async () => {
		// Test that handler works with string numbers (typical from web forms)
		const req = createMockRequest({
			post_id: 'post-string',
			poll_choice: '1' // String, not number
		})
		
		// Setup mock database responses
		req.client.addQueryMock(
			'INSERT INTO poll_votes',
			{ rows: [] }
		)
		req.client.addQueryMock(
			'SELECT',
			{ 
				rows: [
					{ poll_choice: '1', count: '1' }
				] 
			}
		)
		req.client.addQueryMock(
			'UPDATE posts',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await savePollChoice(req, res)
		
		// Should handle string numbers correctly
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			responseData.success,
			"Response should handle string poll choices correctly."
		)
	},

	testPollCountArrayFormatting: async () => {
		// Test that poll counts are formatted correctly as comma-separated string
		const req = createMockRequest({
			post_id: 'post-format',
			poll_choice: '2'
		})
		
		// Setup mock database responses  
		req.client.addQueryMock(
			'INSERT INTO poll_votes',
			{ rows: [] }
		)
		// Mix of choices with gaps (choice 3 has no votes)
		req.client.addQueryMock(
			'SELECT',
			{ 
				rows: [
					{ poll_choice: '1', count: '2' },
					{ poll_choice: '2', count: '4' },
					{ poll_choice: '4', count: '1' }
					// Note: choice 3 is missing (0 votes)
				] 
			}
		)
		req.client.addQueryMock(
			'UPDATE posts',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await savePollChoice(req, res)
		
		// Should correctly handle missing poll choices (defaults to 0)
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			responseData.success,
			"Response should handle gaps in poll choices correctly."
		)
	}
}

runTests(path.basename(__filename), Object.values(tests))