const path = require("path")
const {
	createMockRequest,
	createMockResponse,
	assertEquals,
	runTests
} = require("../shared/serverTestSetup.js")

// Import the handler we're testing
const getTopics = require("../../../server/session/getTopics.js")

const tests = {
	testGetAllTopics: async () => {
		// Setup mock request for /topics path
		const req = createMockRequest({
			path: "/topics"
		})
		req.results = {}
		
		// Setup mock database responses
		req.client.addQueryMock(
			'SELECT',
			{ 
				rows: [
					{
						topic_name: 'technology',
						subtitle: 'Technology discussions',
						posts: '5'
					},
					{
						topic_name: 'general',
						subtitle: 'General posts',
						posts: '12'
					},
					{
						topic_name: 'science',
						subtitle: 'Science and research',
						posts: '3'
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await getTopics(req, res)
		
		// Verify results were set
		assertEquals(
			"/topics",
			req.results.path,
			"Path should be set in results."
		)
		assertEquals(
			3,
			req.results.topics.length,
			"Should return array of topics."
		)
		assertEquals(
			'technology',
			req.results.topics[0].topic_name,
			"First topic should have correct name."
		)
		assertEquals(
			'5',
			req.results.topics[0].posts,
			"First topic should have post count."
		)
	},

	testGetSingleTopic: async () => {
		// Setup mock request for specific topic
		const req = createMockRequest({
			path: "/topic/technology"
		})
		req.results = {}
		
		// Setup mock database responses
		req.client.addQueryMock(
			'SELECT',
			{ 
				rows: [{
					topic_name: 'technology',
					subtitle: 'Technology discussions'
				}]
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await getTopics(req, res)
		
		// Verify single topic result
		assertEquals(
			'technology',
			req.results.topic.topic_name,
			"Should return correct topic name."
		)
		assertEquals(
			'Technology discussions',
			req.results.topic.subtitle,
			"Should return correct topic subtitle."
		)
	},

	testGetNonexistentTopic: async () => {
		// Setup mock request for topic that doesn't exist
		const req = createMockRequest({
			path: "/topic/nonexistent"
		})
		req.results = {}
		
		// Setup mock database responses
		req.client.addQueryMock(
			'SELECT',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await getTopics(req, res)
		
		// Should return empty object for nonexistent topic
		assertEquals(
			'object',
			typeof req.results.topic,
			"Should return empty object for nonexistent topic."
		)
		assertEquals(
			undefined,
			req.results.topic.topic_name,
			"Empty topic object should not have topic_name."
		)
	},

	testBothPathsInSequence: async () => {
		// Test calling both /topics and /topic/specific in sequence
		
		// First call: get all topics
		const req1 = createMockRequest({ path: "/topics" })
		req1.results = {}
		
		req1.client.addQueryMock(
			'SELECT',
			{ 
				rows: [
					{ topic_name: 'general', subtitle: 'General', posts: '10' }
				]
			}
		)
		
		const res1 = createMockResponse()
		await getTopics(req1, res1)
		
		// Second call: get specific topic
		const req2 = createMockRequest({ path: "/topic/general" })
		req2.results = {}
		
		req2.client.addQueryMock(
			'SELECT',
			{ 
				rows: [
					{ topic_name: 'general', subtitle: 'General posts' }
				]
			}
		)
		
		const res2 = createMockResponse()
		await getTopics(req2, res2)
		
		// Verify both results
		assertEquals(
			1,
			req1.results.topics.length,
			"First call should return topics array."
		)
		assertEquals(
			'general',
			req2.results.topic.topic_name,
			"Second call should return specific topic."
		)
	},

	testNoActionWhenAlreadyEnded: async () => {
		// Setup mock request
		const req = createMockRequest({
			path: "/topics"
		})
		req.results = {}
		
		const res = createMockResponse()
		// Simulate response already ended
		res.writableEnded = true
		
		// Execute the handler
		await getTopics(req, res)
		
		// Verify no action taken
		assertEquals(
			undefined,
			req.results.path,
			"Should not set results when response already ended."
		)
	},

	testNoActionWhenWrongPath: async () => {
		// Setup mock request with wrong path
		const req = createMockRequest({
			path: "/posts"
		})
		req.results = {}
		
		const res = createMockResponse()
		
		// Execute the handler
		await getTopics(req, res)
		
		// Verify no action taken
		assertEquals(
			undefined,
			req.results.path,
			"Should not set results for non-topics path."
		)
		assertEquals(
			undefined,
			req.results.topics,
			"Should not set topics for wrong path."
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
		await getTopics(req, res)
		
		// Verify no action taken
		assertEquals(
			undefined,
			req.results.path,
			"Should not set results when path is missing."
		)
	},

	testTopicPathExtraction: async () => {
		// Test various topic path formats
		const testCases = [
			{ path: "/topic/tech", expectedTopic: "tech" },
			{ path: "/topic/science-fiction", expectedTopic: "science-fiction" },
			{ path: "/topic/general", expectedTopic: "general" },
			{ path: "/topic/", expectedTopic: "" }
		]
		
		for (const testCase of testCases) {
			const req = createMockRequest({
				path: testCase.path
			})
			req.results = {}
			
			req.client.clearQueryMocks()
			req.client.addQueryMock(
				'SELECT',
				{ 
					rows: [{
						topic_name: testCase.expectedTopic,
						subtitle: `Subtitle for ${testCase.expectedTopic}`
					}]
				}
			)
			
			const res = createMockResponse()
			
			// Execute the handler
			await getTopics(req, res)
			
			// Verify topic extraction
			assertEquals(
				testCase.expectedTopic,
				req.results.topic.topic_name,
				`Path "${testCase.path}" should extract topic "${testCase.expectedTopic}".`
			)
		}
	},

	testEmptyTopicsResult: async () => {
		// Test when no topics exist in database
		const req = createMockRequest({
			path: "/topics"
		})
		req.results = {}
		
		req.client.addQueryMock(
			'SELECT',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await getTopics(req, res)
		
		// Should handle empty result gracefully
		assertEquals(
			"/topics",
			req.results.path,
			"Path should still be set."
		)
		assertEquals(
			0,
			req.results.topics.length,
			"Should return empty array when no topics exist."
		)
	},

	testTopicsWithZeroPosts: async () => {
		// Test topics that have no associated posts
		const req = createMockRequest({
			path: "/topics"
		})
		req.results = {}
		
		req.client.addQueryMock(
			'SELECT',
			{ 
				rows: [
					{
						topic_name: 'unused-topic',
						subtitle: 'Unused topic',
						posts: '0'
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await getTopics(req, res)
		
		// Should include topics with zero posts
		assertEquals(
			1,
			req.results.topics.length,
			"Should include topics with zero posts."
		)
		assertEquals(
			'0',
			req.results.topics[0].posts,
			"Should show correct post count of zero."
		)
	}
}

runTests(path.basename(__filename), Object.values(tests))