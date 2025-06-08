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
	testGetPostCounts: async () => {
		// Setup mock request to get topic counts
		const req = createMockRequest(
			{ 
				min_create_date_for_counts: '2024-01-10T00:00:00Z',
				min_counts_create_date: '2024-01-12T00:00:00Z',
				has_posts: true
			},
			{ user_id: 'user-456' }
		)
		req.results = {}
		
		// Setup mock database response for topic counts
		req.client.addQueryMock(
			'FROM posts t',
			{ 
				rows: [
					{
						post_id: 'topic-1',
						favorite_count: 15,
						poll_counts: '8,5,2',
						reply_count: 12
					},
					{
						post_id: 'topic-2',
						favorite_count: 7,
						poll_counts: null,
						reply_count: 3
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
			req.results.topic_counts[0].post_id,
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
			req.results.topic_counts[0].reply_count,
			"First topic should have reply count."
		)
		assertEquals(
			'topic-2',
			req.results.topic_counts[1].post_id,
			"Second topic should have correct ID."
		)
		assertEquals(
			null,
			req.results.topic_counts[1].poll_counts,
			"Second topic should handle null poll counts."
		)
	},

	testGetReplyCounts: async () => {
		// Setup mock request to get reply counts
		const req = createMockRequest(
			{ 
				min_create_date_for_counts: '2024-01-10T00:00:00Z',
				min_counts_create_date: '2024-01-12T00:00:00Z',
				has_replies: true
			},
			{ user_id: 'user-456' }
		)
		req.results = {}
		
		// Setup mock database response for reply counts
		req.client.addQueryMock(
			'FROM replies c',
			{ 
				rows: [
					{
						reply_id: 'reply-1',
						favorite_count: 5
					},
					{
						reply_id: 'reply-2',
						favorite_count: 0
					},
					{
						reply_id: 'reply-3',
						favorite_count: 23
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await getUpdatedCounts(req, res)
		
		// Verify reply counts were loaded
		assertEquals(
			3,
			req.results.reply_counts.length,
			"Should return array of reply counts."
		)
		assertEquals(
			'reply-1',
			req.results.reply_counts[0].reply_id,
			"First reply should have correct ID."
		)
		assertEquals(
			5,
			req.results.reply_counts[0].favorite_count,
			"First reply should have correct favorite count."
		)
		assertEquals(
			'reply-2',
			req.results.reply_counts[1].reply_id,
			"Second reply should have correct ID."
		)
		assertEquals(
			0,
			req.results.reply_counts[1].favorite_count,
			"Second reply should handle zero favorite count."
		)
		assertEquals(
			23,
			req.results.reply_counts[2].favorite_count,
			"Third reply should have correct favorite count."
		)
	},

	testGetBothPostAndReplyCounts: async () => {
		// Setup mock request to get both topic and reply counts
		const req = createMockRequest(
			{ 
				min_create_date_for_counts: '2024-01-10T00:00:00Z',
				min_counts_create_date: '2024-01-12T00:00:00Z',
				has_posts: true,
				has_replies: true
			},
			{ user_id: 'user-456' }
		)
		req.results = {}
		
		// Setup mock database responses
		req.client.addQueryMock(
			'FROM posts t',
			{ 
				rows: [
					{
						post_id: 'topic-1',
						favorite_count: 10,
						poll_counts: '5,3',
						reply_count: 8
					}
				]
			}
		)
		req.client.addQueryMock(
			'FROM replies c',
			{ 
				rows: [
					{
						reply_id: 'reply-1',
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
			req.results.reply_counts.length,
			"Should return reply counts."
		)
		assertEquals(
			'topic-1',
			req.results.topic_counts[0].post_id,
			"Post count should be correct."
		)
		assertEquals(
			'reply-1',
			req.results.reply_counts[0].reply_id,
			"Reply count should be correct."
		)
	},

	testNoActionWhenMissingRequiredFields: async () => {
		// Test various missing required field combinations
		const missingFieldTests = [
			{ 
				// Missing min_counts_create_date
				min_create_date_for_counts: '2024-01-10T00:00:00Z',
				has_posts: true
			},
			{ 
				// Missing min_create_date_for_counts
				min_counts_create_date: '2024-01-12T00:00:00Z',
				has_posts: true
			},
			{ 
				// Missing both
				has_posts: true
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
				req.results.reply_counts,
				`Should not set reply_counts when required fields missing: ${JSON.stringify(testData)}.`
			)
		}
	},

	testNoActionWhenAlreadyEnded: async () => {
		// Setup mock request
		const req = createMockRequest(
			{ 
				min_create_date_for_counts: '2024-01-10T00:00:00Z',
				min_counts_create_date: '2024-01-12T00:00:00Z',
				has_posts: true
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

	testNoPostsWhenHasPostsFalse: async () => {
		// Setup mock request without has_posts flag
		const req = createMockRequest(
			{ 
				min_create_date_for_counts: '2024-01-10T00:00:00Z',
				min_counts_create_date: '2024-01-12T00:00:00Z',
				has_posts: false,
				has_replies: true
			},
			{ user_id: 'user-456' }
		)
		req.results = {}
		
		// Setup mock database response only for replies
		req.client.addQueryMock(
			'FROM replies c',
			{ 
				rows: [
					{
						reply_id: 'reply-1',
						favorite_count: 5
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await getUpdatedCounts(req, res)
		
		// Should only load replies, not posts
		assertEquals(
			undefined,
			req.results.topic_counts,
			"Should not load topic counts when has_posts is false."
		)
		assertEquals(
			1,
			req.results.reply_counts.length,
			"Should load reply counts when has_replies is true."
		)
	},

	testNoRepliesWhenHasRepliesFalse: async () => {
		// Setup mock request without has_replies flag
		const req = createMockRequest(
			{ 
				min_create_date_for_counts: '2024-01-10T00:00:00Z',
				min_counts_create_date: '2024-01-12T00:00:00Z',
				has_posts: true,
				has_replies: false
			},
			{ user_id: 'user-456' }
		)
		req.results = {}
		
		// Setup mock database response only for posts
		req.client.addQueryMock(
			'FROM posts t',
			{ 
				rows: [
					{
						post_id: 'topic-1',
						favorite_count: 10,
						poll_counts: '5,3',
						reply_count: 8
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await getUpdatedCounts(req, res)
		
		// Should only load posts, not replies
		assertEquals(
			1,
			req.results.topic_counts.length,
			"Should load topic counts when has_posts is true."
		)
		assertEquals(
			undefined,
			req.results.reply_counts,
			"Should not load reply counts when has_replies is false."
		)
	},

	testGuestUserAccess: async () => {
		// Test access without logged in user (uses 0 for user_id)
		const req = createMockRequest(
			{ 
				min_create_date_for_counts: '2024-01-10T00:00:00Z',
				min_counts_create_date: '2024-01-12T00:00:00Z',
				has_posts: true
			},
			{ user_id: undefined }
		)
		req.results = {}
		
		req.client.addQueryMock(
			'FROM posts t',
			{ 
				rows: [
					{
						post_id: 'public-topic-1',
						favorite_count: 5,
						poll_counts: null,
						reply_count: 2
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
			req.results.topic_counts[0].post_id,
			"Should return correct topic data for guest user."
		)
	},

	testEmptyResults: async () => {
		// Test when no updated counts are found
		const req = createMockRequest(
			{ 
				min_create_date_for_counts: '2024-01-10T00:00:00Z',
				min_counts_create_date: '2024-01-12T00:00:00Z',
				has_posts: true,
				has_replies: true
			},
			{ user_id: 'user-456' }
		)
		req.results = {}
		
		// Setup mock responses with no results
		req.client.addQueryMock(
			'FROM posts t',
			{ rows: [] }
		)
		req.client.addQueryMock(
			'FROM replies c',
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
			req.results.reply_counts.length,
			"Should handle empty reply counts gracefully."
		)
	},

	testDateFiltering: async () => {
		// Test that date filtering works correctly
		const req = createMockRequest(
			{ 
				min_create_date_for_counts: '2024-01-15T00:00:00Z',
				min_counts_create_date: '2024-01-16T00:00:00Z',
				has_posts: true,
				has_replies: true
			},
			{ user_id: 'user-456' }
		)
		req.results = {}
		
		// Setup mock responses with date-filtered results
		req.client.addQueryMock(
			'FROM posts t',
			{ 
				rows: [
					{
						post_id: 'recent-topic',
						favorite_count: 3,
						poll_counts: '2,1',
						reply_count: 1
					}
				]
			}
		)
		req.client.addQueryMock(
			'FROM replies c',
			{ 
				rows: [
					{
						reply_id: 'recent-reply',
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
			req.results.reply_counts.length,
			"Should return date-filtered reply counts."
		)
		assertEquals(
			'recent-topic',
			req.results.topic_counts[0].post_id,
			"Should return recent topic."
		)
		assertEquals(
			'recent-reply',
			req.results.reply_counts[0].reply_id,
			"Should return recent reply."
		)
	},

	testPostCountFields: async () => {
		// Test that all expected topic count fields are present
		const req = createMockRequest(
			{ 
				min_create_date_for_counts: '2024-01-10T00:00:00Z',
				min_counts_create_date: '2024-01-12T00:00:00Z',
				has_posts: true
			},
			{ user_id: 'user-456' }
		)
		req.results = {}
		
		req.client.addQueryMock(
			'FROM posts t',
			{ 
				rows: [
					{
						post_id: 'complete-topic',
						favorite_count: 25,
						poll_counts: '15,8,2',
						reply_count: 42
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		await getUpdatedCounts(req, res)
		
		const topicCount = req.results.topic_counts[0]
		
		// Verify all fields are present
		assertEquals('complete-topic', topicCount.post_id, "Should have post_id.")
		assertEquals(25, topicCount.favorite_count, "Should have favorite_count.")
		assertEquals('15,8,2', topicCount.poll_counts, "Should have poll_counts.")
		assertEquals(42, topicCount.reply_count, "Should have reply_count.")
	},

	testReplyCountFields: async () => {
		// Test that all expected reply count fields are present
		const req = createMockRequest(
			{ 
				min_create_date_for_counts: '2024-01-10T00:00:00Z',
				min_counts_create_date: '2024-01-12T00:00:00Z',
				has_replies: true
			},
			{ user_id: 'user-456' }
		)
		req.results = {}
		
		req.client.addQueryMock(
			'FROM replies c',
			{ 
				rows: [
					{
						reply_id: 'complete-reply',
						favorite_count: 18
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		await getUpdatedCounts(req, res)
		
		const replyCount = req.results.reply_counts[0]
		
		// Verify all fields are present
		assertEquals('complete-reply', replyCount.reply_id, "Should have reply_id.")
		assertEquals(18, replyCount.favorite_count, "Should have favorite_count.")
	}
}

runTests(path.basename(__filename), Object.values(tests))