const path = require("path")
const {
	createMockRequest,
	createMockResponse,
	assertEquals,
	runTests
} = require("../shared/serverTestSetup.js")

// Import the handler we're testing
const getUpdatedCounts = require("../../../server/session/getUpdatedCounts.js")

const tests = {
	testGetTopicCounts: async () => {
		// Setup mock request to get topic counts
		const req = createMockRequest(
			{ 
				min_create_date_for_counts: '2024-01-10T00:00:00Z',
				min_counts_create_date: '2024-01-12T00:00:00Z',
				has_topics: true
			},
			{ user_id: 'user-456' }
		)
		req.results = {}
		
		// Setup mock database response for topic counts
		req.client.addQueryMock(
			'FROM topics t',
			{ 
				rows: [
					{
						topic_id: 'topic-1',
						favorite_count: 15,
						poll_counts: '8,5,2',
						comment_count: 12
					},
					{
						topic_id: 'topic-2',
						favorite_count: 7,
						poll_counts: null,
						comment_count: 3
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await getUpdatedCounts(req, res)
		
		// Verify topic counts were loaded
		assertEquals(
			2,
			req.results.topic_counts.length,
			"Should return array of topic counts."
		)
		assertEquals(
			'topic-1',
			req.results.topic_counts[0].topic_id,
			"First topic should have correct ID."
		)
		assertEquals(
			15,
			req.results.topic_counts[0].favorite_count,
			"First topic should have correct favorite count."
		)
		assertEquals(
			'8,5,2',
			req.results.topic_counts[0].poll_counts,
			"First topic should have poll counts."
		)
		assertEquals(
			12,
			req.results.topic_counts[0].comment_count,
			"First topic should have comment count."
		)
		assertEquals(
			'topic-2',
			req.results.topic_counts[1].topic_id,
			"Second topic should have correct ID."
		)
		assertEquals(
			null,
			req.results.topic_counts[1].poll_counts,
			"Second topic should handle null poll counts."
		)
	},

	testGetCommentCounts: async () => {
		// Setup mock request to get comment counts
		const req = createMockRequest(
			{ 
				min_create_date_for_counts: '2024-01-10T00:00:00Z',
				min_counts_create_date: '2024-01-12T00:00:00Z',
				has_comments: true
			},
			{ user_id: 'user-456' }
		)
		req.results = {}
		
		// Setup mock database response for comment counts
		req.client.addQueryMock(
			'FROM comments c',
			{ 
				rows: [
					{
						comment_id: 'comment-1',
						favorite_count: 5
					},
					{
						comment_id: 'comment-2',
						favorite_count: 0
					},
					{
						comment_id: 'comment-3',
						favorite_count: 23
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await getUpdatedCounts(req, res)
		
		// Verify comment counts were loaded
		assertEquals(
			3,
			req.results.comment_counts.length,
			"Should return array of comment counts."
		)
		assertEquals(
			'comment-1',
			req.results.comment_counts[0].comment_id,
			"First comment should have correct ID."
		)
		assertEquals(
			5,
			req.results.comment_counts[0].favorite_count,
			"First comment should have correct favorite count."
		)
		assertEquals(
			'comment-2',
			req.results.comment_counts[1].comment_id,
			"Second comment should have correct ID."
		)
		assertEquals(
			0,
			req.results.comment_counts[1].favorite_count,
			"Second comment should handle zero favorite count."
		)
		assertEquals(
			23,
			req.results.comment_counts[2].favorite_count,
			"Third comment should have correct favorite count."
		)
	},

	testGetBothTopicAndCommentCounts: async () => {
		// Setup mock request to get both topic and comment counts
		const req = createMockRequest(
			{ 
				min_create_date_for_counts: '2024-01-10T00:00:00Z',
				min_counts_create_date: '2024-01-12T00:00:00Z',
				has_topics: true,
				has_comments: true
			},
			{ user_id: 'user-456' }
		)
		req.results = {}
		
		// Setup mock database responses
		req.client.addQueryMock(
			'FROM topics t',
			{ 
				rows: [
					{
						topic_id: 'topic-1',
						favorite_count: 10,
						poll_counts: '5,3',
						comment_count: 8
					}
				]
			}
		)
		req.client.addQueryMock(
			'FROM comments c',
			{ 
				rows: [
					{
						comment_id: 'comment-1',
						favorite_count: 2
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await getUpdatedCounts(req, res)
		
		// Verify both counts were loaded
		assertEquals(
			1,
			req.results.topic_counts.length,
			"Should return topic counts."
		)
		assertEquals(
			1,
			req.results.comment_counts.length,
			"Should return comment counts."
		)
		assertEquals(
			'topic-1',
			req.results.topic_counts[0].topic_id,
			"Topic count should be correct."
		)
		assertEquals(
			'comment-1',
			req.results.comment_counts[0].comment_id,
			"Comment count should be correct."
		)
	},

	testNoActionWhenMissingRequiredFields: async () => {
		// Test various missing required field combinations
		const missingFieldTests = [
			{ 
				// Missing min_counts_create_date
				min_create_date_for_counts: '2024-01-10T00:00:00Z',
				has_topics: true
			},
			{ 
				// Missing min_create_date_for_counts
				min_counts_create_date: '2024-01-12T00:00:00Z',
				has_topics: true
			},
			{ 
				// Missing both
				has_topics: true
			}
		]
		
		for (const testData of missingFieldTests) {
			const req = createMockRequest(testData, { user_id: 'user-456' })
			req.results = {}
			
			const res = createMockResponse()
			
			await getUpdatedCounts(req, res)
			
			// Should not set any results
			assertEquals(
				undefined,
				req.results.topic_counts,
				`Should not set topic_counts when required fields missing: ${JSON.stringify(testData)}.`
			)
			assertEquals(
				undefined,
				req.results.comment_counts,
				`Should not set comment_counts when required fields missing: ${JSON.stringify(testData)}.`
			)
		}
	},

	testNoActionWhenAlreadyEnded: async () => {
		// Setup mock request
		const req = createMockRequest(
			{ 
				min_create_date_for_counts: '2024-01-10T00:00:00Z',
				min_counts_create_date: '2024-01-12T00:00:00Z',
				has_topics: true
			},
			{ user_id: 'user-456' }
		)
		req.results = {}
		
		const res = createMockResponse()
		// Simulate response already ended
		res.writableEnded = true
		
		// Execute the handler
		await getUpdatedCounts(req, res)
		
		// Verify no action taken
		assertEquals(
			undefined,
			req.results.topic_counts,
			"Should not set results when response already ended."
		)
	},

	testNoTopicsWhenHasTopicsFalse: async () => {
		// Setup mock request without has_topics flag
		const req = createMockRequest(
			{ 
				min_create_date_for_counts: '2024-01-10T00:00:00Z',
				min_counts_create_date: '2024-01-12T00:00:00Z',
				has_topics: false,
				has_comments: true
			},
			{ user_id: 'user-456' }
		)
		req.results = {}
		
		// Setup mock database response only for comments
		req.client.addQueryMock(
			'FROM comments c',
			{ 
				rows: [
					{
						comment_id: 'comment-1',
						favorite_count: 5
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await getUpdatedCounts(req, res)
		
		// Should only load comments, not topics
		assertEquals(
			undefined,
			req.results.topic_counts,
			"Should not load topic counts when has_topics is false."
		)
		assertEquals(
			1,
			req.results.comment_counts.length,
			"Should load comment counts when has_comments is true."
		)
	},

	testNoCommentsWhenHasCommentsFalse: async () => {
		// Setup mock request without has_comments flag
		const req = createMockRequest(
			{ 
				min_create_date_for_counts: '2024-01-10T00:00:00Z',
				min_counts_create_date: '2024-01-12T00:00:00Z',
				has_topics: true,
				has_comments: false
			},
			{ user_id: 'user-456' }
		)
		req.results = {}
		
		// Setup mock database response only for topics
		req.client.addQueryMock(
			'FROM topics t',
			{ 
				rows: [
					{
						topic_id: 'topic-1',
						favorite_count: 10,
						poll_counts: '5,3',
						comment_count: 8
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await getUpdatedCounts(req, res)
		
		// Should only load topics, not comments
		assertEquals(
			1,
			req.results.topic_counts.length,
			"Should load topic counts when has_topics is true."
		)
		assertEquals(
			undefined,
			req.results.comment_counts,
			"Should not load comment counts when has_comments is false."
		)
	},

	testGuestUserAccess: async () => {
		// Test access without logged in user (uses 0 for user_id)
		const req = createMockRequest(
			{ 
				min_create_date_for_counts: '2024-01-10T00:00:00Z',
				min_counts_create_date: '2024-01-12T00:00:00Z',
				has_topics: true
			},
			{ user_id: undefined }
		)
		req.results = {}
		
		req.client.addQueryMock(
			'FROM topics t',
			{ 
				rows: [
					{
						topic_id: 'public-topic-1',
						favorite_count: 5,
						poll_counts: null,
						comment_count: 2
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		await getUpdatedCounts(req, res)
		
		// Guest user should be able to get counts
		assertEquals(
			1,
			req.results.topic_counts.length,
			"Guest user should be able to get topic counts."
		)
		assertEquals(
			'public-topic-1',
			req.results.topic_counts[0].topic_id,
			"Should return correct topic data for guest user."
		)
	},

	testEmptyResults: async () => {
		// Test when no updated counts are found
		const req = createMockRequest(
			{ 
				min_create_date_for_counts: '2024-01-10T00:00:00Z',
				min_counts_create_date: '2024-01-12T00:00:00Z',
				has_topics: true,
				has_comments: true
			},
			{ user_id: 'user-456' }
		)
		req.results = {}
		
		// Setup mock responses with no results
		req.client.addQueryMock(
			'FROM topics t',
			{ rows: [] }
		)
		req.client.addQueryMock(
			'FROM comments c',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		await getUpdatedCounts(req, res)
		
		// Should handle empty results gracefully
		assertEquals(
			0,
			req.results.topic_counts.length,
			"Should handle empty topic counts gracefully."
		)
		assertEquals(
			0,
			req.results.comment_counts.length,
			"Should handle empty comment counts gracefully."
		)
	},

	testDateFiltering: async () => {
		// Test that date filtering works correctly
		const req = createMockRequest(
			{ 
				min_create_date_for_counts: '2024-01-15T00:00:00Z',
				min_counts_create_date: '2024-01-16T00:00:00Z',
				has_topics: true,
				has_comments: true
			},
			{ user_id: 'user-456' }
		)
		req.results = {}
		
		// Setup mock responses with date-filtered results
		req.client.addQueryMock(
			'FROM topics t',
			{ 
				rows: [
					{
						topic_id: 'recent-topic',
						favorite_count: 3,
						poll_counts: '2,1',
						comment_count: 1
					}
				]
			}
		)
		req.client.addQueryMock(
			'FROM comments c',
			{ 
				rows: [
					{
						comment_id: 'recent-comment',
						favorite_count: 1
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		await getUpdatedCounts(req, res)
		
		// Should return filtered results
		assertEquals(
			1,
			req.results.topic_counts.length,
			"Should return date-filtered topic counts."
		)
		assertEquals(
			1,
			req.results.comment_counts.length,
			"Should return date-filtered comment counts."
		)
		assertEquals(
			'recent-topic',
			req.results.topic_counts[0].topic_id,
			"Should return recent topic."
		)
		assertEquals(
			'recent-comment',
			req.results.comment_counts[0].comment_id,
			"Should return recent comment."
		)
	},

	testTopicCountFields: async () => {
		// Test that all expected topic count fields are present
		const req = createMockRequest(
			{ 
				min_create_date_for_counts: '2024-01-10T00:00:00Z',
				min_counts_create_date: '2024-01-12T00:00:00Z',
				has_topics: true
			},
			{ user_id: 'user-456' }
		)
		req.results = {}
		
		req.client.addQueryMock(
			'FROM topics t',
			{ 
				rows: [
					{
						topic_id: 'complete-topic',
						favorite_count: 25,
						poll_counts: '15,8,2',
						comment_count: 42
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		await getUpdatedCounts(req, res)
		
		const topicCount = req.results.topic_counts[0]
		
		// Verify all fields are present
		assertEquals('complete-topic', topicCount.topic_id, "Should have topic_id.")
		assertEquals(25, topicCount.favorite_count, "Should have favorite_count.")
		assertEquals('15,8,2', topicCount.poll_counts, "Should have poll_counts.")
		assertEquals(42, topicCount.comment_count, "Should have comment_count.")
	},

	testCommentCountFields: async () => {
		// Test that all expected comment count fields are present
		const req = createMockRequest(
			{ 
				min_create_date_for_counts: '2024-01-10T00:00:00Z',
				min_counts_create_date: '2024-01-12T00:00:00Z',
				has_comments: true
			},
			{ user_id: 'user-456' }
		)
		req.results = {}
		
		req.client.addQueryMock(
			'FROM comments c',
			{ 
				rows: [
					{
						comment_id: 'complete-comment',
						favorite_count: 18
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		await getUpdatedCounts(req, res)
		
		const commentCount = req.results.comment_counts[0]
		
		// Verify all fields are present
		assertEquals('complete-comment', commentCount.comment_id, "Should have comment_id.")
		assertEquals(18, commentCount.favorite_count, "Should have favorite_count.")
	}
}

runTests(path.basename(__filename), Object.values(tests))