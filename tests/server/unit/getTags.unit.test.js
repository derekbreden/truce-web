const path = require("path")
const {
	createMockRequest,
	createMockResponse,
	assertEquals,
	runTests
} = require("../shared/serverTestSetup.js")

// Import the handler we're testing
const getTags = require("../../../server/session/getTags.js")

const tests = {
	testGetAllTags: async () => {
		// Setup mock request for /tags path
		const req = createMockRequest({
			path: "/tags"
		})
		req.results = {}
		
		// Setup mock database responses
		req.client.addQueryMock(
			'SELECT',
			{ 
				rows: [
					{
						tag_name: 'technology',
						subtitle: 'Technology discussions',
						topics: '5'
					},
					{
						tag_name: 'general',
						subtitle: 'General topics',
						topics: '12'
					},
					{
						tag_name: 'science',
						subtitle: 'Science and research',
						topics: '3'
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await getTags(req, res)
		
		// Verify results were set
		assertEquals(
			"/tags",
			req.results.path,
			"Path should be set in results."
		)
		assertEquals(
			3,
			req.results.tags.length,
			"Should return array of tags."
		)
		assertEquals(
			'technology',
			req.results.tags[0].tag_name,
			"First tag should have correct name."
		)
		assertEquals(
			'5',
			req.results.tags[0].topics,
			"First tag should have topic count."
		)
	},

	testGetSingleTag: async () => {
		// Setup mock request for specific tag
		const req = createMockRequest({
			path: "/tag/technology"
		})
		req.results = {}
		
		// Setup mock database responses
		req.client.addQueryMock(
			'SELECT',
			{ 
				rows: [{
					tag_name: 'technology',
					subtitle: 'Technology discussions'
				}]
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await getTags(req, res)
		
		// Verify single tag result
		assertEquals(
			'technology',
			req.results.tag.tag_name,
			"Should return correct tag name."
		)
		assertEquals(
			'Technology discussions',
			req.results.tag.subtitle,
			"Should return correct tag subtitle."
		)
	},

	testGetNonexistentTag: async () => {
		// Setup mock request for tag that doesn't exist
		const req = createMockRequest({
			path: "/tag/nonexistent"
		})
		req.results = {}
		
		// Setup mock database responses
		req.client.addQueryMock(
			'SELECT',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await getTags(req, res)
		
		// Should return empty object for nonexistent tag
		assertEquals(
			'object',
			typeof req.results.tag,
			"Should return empty object for nonexistent tag."
		)
		assertEquals(
			undefined,
			req.results.tag.tag_name,
			"Empty tag object should not have tag_name."
		)
	},

	testBothPathsInSequence: async () => {
		// Test calling both /tags and /tag/specific in sequence
		
		// First call: get all tags
		const req1 = createMockRequest({ path: "/tags" })
		req1.results = {}
		
		req1.client.addQueryMock(
			'SELECT',
			{ 
				rows: [
					{ tag_name: 'general', subtitle: 'General', topics: '10' }
				]
			}
		)
		
		const res1 = createMockResponse()
		await getTags(req1, res1)
		
		// Second call: get specific tag
		const req2 = createMockRequest({ path: "/tag/general" })
		req2.results = {}
		
		req2.client.addQueryMock(
			'SELECT',
			{ 
				rows: [
					{ tag_name: 'general', subtitle: 'General topics' }
				]
			}
		)
		
		const res2 = createMockResponse()
		await getTags(req2, res2)
		
		// Verify both results
		assertEquals(
			1,
			req1.results.tags.length,
			"First call should return tags array."
		)
		assertEquals(
			'general',
			req2.results.tag.tag_name,
			"Second call should return specific tag."
		)
	},

	testNoActionWhenAlreadyEnded: async () => {
		// Setup mock request
		const req = createMockRequest({
			path: "/tags"
		})
		req.results = {}
		
		const res = createMockResponse()
		// Simulate response already ended
		res.writableEnded = true
		
		// Execute the handler
		await getTags(req, res)
		
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
			path: "/topics"
		})
		req.results = {}
		
		const res = createMockResponse()
		
		// Execute the handler
		await getTags(req, res)
		
		// Verify no action taken
		assertEquals(
			undefined,
			req.results.path,
			"Should not set results for non-tags path."
		)
		assertEquals(
			undefined,
			req.results.tags,
			"Should not set tags for wrong path."
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
		await getTags(req, res)
		
		// Verify no action taken
		assertEquals(
			undefined,
			req.results.path,
			"Should not set results when path is missing."
		)
	},

	testTagPathExtraction: async () => {
		// Test various tag path formats
		const testCases = [
			{ path: "/tag/tech", expectedTag: "tech" },
			{ path: "/tag/science-fiction", expectedTag: "science-fiction" },
			{ path: "/tag/general", expectedTag: "general" },
			{ path: "/tag/", expectedTag: "" }
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
						tag_name: testCase.expectedTag,
						subtitle: `Subtitle for ${testCase.expectedTag}`
					}]
				}
			)
			
			const res = createMockResponse()
			
			// Execute the handler
			await getTags(req, res)
			
			// Verify tag extraction
			assertEquals(
				testCase.expectedTag,
				req.results.tag.tag_name,
				`Path "${testCase.path}" should extract tag "${testCase.expectedTag}".`
			)
		}
	},

	testEmptyTagsResult: async () => {
		// Test when no tags exist in database
		const req = createMockRequest({
			path: "/tags"
		})
		req.results = {}
		
		req.client.addQueryMock(
			'SELECT',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await getTags(req, res)
		
		// Should handle empty result gracefully
		assertEquals(
			"/tags",
			req.results.path,
			"Path should still be set."
		)
		assertEquals(
			0,
			req.results.tags.length,
			"Should return empty array when no tags exist."
		)
	},

	testTagsWithZeroTopics: async () => {
		// Test tags that have no associated topics
		const req = createMockRequest({
			path: "/tags"
		})
		req.results = {}
		
		req.client.addQueryMock(
			'SELECT',
			{ 
				rows: [
					{
						tag_name: 'unused-tag',
						subtitle: 'Unused tag',
						topics: '0'
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await getTags(req, res)
		
		// Should include tags with zero topics
		assertEquals(
			1,
			req.results.tags.length,
			"Should include tags with zero topics."
		)
		assertEquals(
			'0',
			req.results.tags[0].topics,
			"Should show correct topic count of zero."
		)
	}
}

runTests(path.basename(__filename), Object.values(tests))