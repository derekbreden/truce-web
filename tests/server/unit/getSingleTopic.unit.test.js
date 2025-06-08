const path = require("path")
const {
	createMockRequest,
	createMockResponse,
	assertEquals,
	runTests
} = require("../shared/serverTestSetup.js")

// Import the handler we're testing
const getSingleTopic = require("../../../server/session/getSingleTopic.js")

const tests = {
	testGetSingleTopicWithComments: async () => {
		// Setup mock request for topic path
		const req = createMockRequest(
			{ path: "/post/sample-topic-slug" },
			{ user_id: 'user-456' }
		)
		req.results = { topics: [], comments: [] }
		
		// Setup mock database responses for complete topic load
		req.client.addQueryMock(
			'FROM posts p',
			{ 
				rows: [
					{
						create_date: '2024-01-15T10:00:00Z',
						topic_id: 'topic-123',
						title: 'Sample Topic Title',
						user_id: 'user-789',
						display_name: 'Topic Author',
						display_name_index: 0,
						user_slug: 'topic-author',
						profile_picture_uuid: 'pic-uuid-1',
						user_verified: true,
						slug: 'sample-topic-slug',
						body: 'This is the topic body content',
						poll_1: 'Option A',
						poll_2: 'Option B',
						poll_3: null,
						poll_4: null,
						poll_counts: '5,3',
						poll_counts_estimated: false,
						note: 'Topic note',
						favorite_count: 10,
						comment_count: 5,
						counts_max_create_date: '2024-01-15T11:00:00Z',
						edit: false,
						image_uuids: 'img1,img2',
						favorited: true,
						commented: false,
						voted: false,
						tags: 'technology,science'
					}
				]
			}
		)
		// Mock for root comments
		req.client.addQueryMock(
			'r.parent_reply_id IS NULL',
			{ 
				rows: [
					{
						create_date: '2024-01-15T10:30:00Z',
						comment_id: 'comment-1',
						body: 'First root comment',
						note: 'Comment note',
						parent_comment_id: null,
						favorite_count: 2,
						counts_max_create_date: '2024-01-15T10:35:00Z',
						user_id: 'user-456',
						display_name: 'Commenter 1',
						display_name_index: 0,
						user_slug: 'commenter1',
						profile_picture_uuid: null,
						user_verified: false,
						edit: true,
						image_uuids: null,
						favorited: false
					}
				]
			}
		)
		// Mock for reply comments
		req.client.addQueryMock(
			'r.parent_reply_id IS NOT NULL',
			{ 
				rows: [
					{
						create_date: '2024-01-15T10:45:00Z',
						comment_id: 'comment-2',
						body: 'Reply to first comment',
						note: '',
						parent_comment_id: 'comment-1',
						favorite_count: 1,
						user_id: 'user-999',
						display_name: 'Replier',
						display_name_index: 1,
						user_slug: 'replier',
						edit: false,
						favorited: true
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await getSingleTopic(req, res)
		
		// Verify topic was loaded
		assertEquals(
			"/post/sample-topic-slug",
			req.results.path,
			"Path should be set in results."
		)
		assertEquals(
			1,
			req.results.topics.length,
			"Should return single topic."
		)
		assertEquals(
			'Sample Topic Title',
			req.results.topics[0].title,
			"Should include topic title."
		)
		assertEquals(
			'This is the topic body content',
			req.results.topics[0].body,
			"Should include topic body."
		)
		assertEquals(
			'technology,science',
			req.results.topics[0].tags,
			"Should include topic tags."
		)
		
		// Verify comments were loaded
		assertEquals(
			2,
			req.results.comments.length,
			"Should load root and reply comments."
		)
		assertEquals(
			'comment-1',
			req.results.comments[0].comment_id,
			"First comment should be root comment."
		)
		assertEquals(
			null,
			req.results.comments[0].parent_comment_id,
			"Root comment should have null parent."
		)
		assertEquals(
			'comment-2',
			req.results.comments[1].comment_id,
			"Second comment should be reply."
		)
		assertEquals(
			'comment-1',
			req.results.comments[1].parent_comment_id,
			"Reply should reference parent comment."
		)
	},

	testGetTopicOnlyWithMaxCommentDate: async () => {
		// Test when max_comment_create_date is provided (skips topic loading)
		const req = createMockRequest(
			{ 
				path: "/post/sample-topic-slug",
				max_comment_create_date: '2024-01-15T12:00:00Z'
			},
			{ user_id: 'user-456' }
		)
		req.results = { topics: [], comments: [] }
		
		// Setup mocks for topic_id lookup only
		req.client.addQueryMock(
			'SELECT p.post_id as topic_id',
			{ 
				rows: [{ topic_id: 'topic-123' }]
			}
		)
		req.client.addQueryMock(
			'r.parent_reply_id IS NULL',
			{ rows: [] }
		)
		req.client.addQueryMock(
			'reply_ancestors',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		await getSingleTopic(req, res)
		
		// Should set path but not load topic details
		assertEquals(
			"/post/sample-topic-slug",
			req.results.path,
			"Path should be set."
		)
		assertEquals(
			0,
			req.results.topics.length,
			"Should not load topic when max_comment_create_date provided."
		)
		assertEquals(
			0,
			req.results.comments.length,
			"Should load comments (empty in this test)."
		)
	},

	testTopicNotFound: async () => {
		// Test when topic doesn't exist or is blocked/flagged
		const req = createMockRequest(
			{ path: "/topic/nonexistent-topic" },
			{ user_id: 'user-456' }
		)
		req.results = { topics: [], comments: [] }
		
		// Setup mock responses for no results
		req.client.addQueryMock(
			'FROM posts p',
			{ rows: [] }
		)
		req.client.addQueryMock(
			'SELECT p.post_id as topic_id',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		await getSingleTopic(req, res)
		
		// Verify no results
		assertEquals(
			undefined,
			req.results.path,
			"Path should not be set when topic not found."
		)
		assertEquals(
			0,
			req.results.topics.length,
			"Should return empty topics array."
		)
		assertEquals(
			0,
			req.results.comments.length,
			"Should return empty comments array."
		)
	},

	testNoActionWhenWrongPath: async () => {
		// Setup mock request with wrong path format
		const req = createMockRequest(
			{ path: "/comment/123" },
			{ user_id: 'user-456' }
		)
		req.results = { topics: [], comments: [] }
		
		const res = createMockResponse()
		
		// Execute the handler
		await getSingleTopic(req, res)
		
		// Verify no action taken
		assertEquals(
			undefined,
			req.results.path,
			"Should not set results for wrong path format."
		)
		assertEquals(
			0,
			req.results.topics.length,
			"Should not load topic for wrong path."
		)
	},

	testNoActionWhenAlreadyEnded: async () => {
		// Setup mock request
		const req = createMockRequest(
			{ path: "/topic/sample-topic" },
			{ user_id: 'user-456' }
		)
		req.results = { topics: [], comments: [] }
		
		const res = createMockResponse()
		// Simulate response already ended
		res.writableEnded = true
		
		// Execute the handler
		await getSingleTopic(req, res)
		
		// Verify no action taken
		assertEquals(
			undefined,
			req.results.path,
			"Should not set results when response already ended."
		)
	},

	testSlugExtraction: async () => {
		// Test various topic slug formats
		const testCases = [
			{ path: "/topic/simple", expectedSlug: "simple" },
			{ path: "/topic/topic-with-dashes", expectedSlug: "topic-with-dashes" },
			{ path: "/topic/123-numeric-slug", expectedSlug: "123-numeric-slug" }
		]
		
		for (const testCase of testCases) {
			const req = createMockRequest(
				{ path: testCase.path },
				{ user_id: 'user-456' }
			)
			req.results = { topics: [], comments: [] }
			
			req.client.clearQueryMocks()
			req.client.addQueryMock(
				'FROM posts p',
				{ 
					rows: [
						{
							topic_id: 'topic-test',
							title: 'Test Topic',
							slug: testCase.expectedSlug,
							user_id: 'user-789',
							display_name: 'Author'
						}
					]
				}
			)
			req.client.addQueryMock(
				'r.parent_reply_id IS NULL',
				{ rows: [] }
			)
			req.client.addQueryMock(
				'reply_ancestors',
				{ rows: [] }
			)
			
			const res = createMockResponse()
			
			await getSingleTopic(req, res)
			
			assertEquals(
				testCase.expectedSlug,
				req.results.topics[0].slug,
				`Should extract slug correctly from path: ${testCase.path}.`
			)
		}
	},

	testPollData: async () => {
		// Test poll data handling
		const req = createMockRequest(
			{ path: "/topic/poll-topic" },
			{ user_id: 'user-456' }
		)
		req.results = { topics: [], comments: [] }
		
		req.client.addQueryMock(
			'FROM posts p',
			{ 
				rows: [
					{
						topic_id: 'poll-topic-123',
						title: 'Poll Topic',
						slug: 'poll-topic',
						poll_1: 'Yes',
						poll_2: 'No',
						poll_3: 'Maybe',
						poll_4: null,
						poll_counts: '10,5,2',
						poll_counts_estimated: false,
						voted: true,
						user_id: 'user-789',
						display_name: 'Poll Creator'
					}
				]
			}
		)
		req.client.addQueryMock(
			'r.parent_reply_id IS NULL',
			{ rows: [] }
		)
		req.client.addQueryMock(
			'reply_ancestors',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		await getSingleTopic(req, res)
		
		const topic = req.results.topics[0]
		
		// Verify poll data
		assertEquals('Yes', topic.poll_1, "Should include poll option 1.")
		assertEquals('No', topic.poll_2, "Should include poll option 2.")
		assertEquals('Maybe', topic.poll_3, "Should include poll option 3.")
		assertEquals(null, topic.poll_4, "Should handle null poll option 4.")
		assertEquals('10,5,2', topic.poll_counts, "Should include poll counts.")
		assertEquals(false, topic.poll_counts_estimated, "Should include poll estimation status.")
		assertEquals(true, topic.voted, "Should indicate if user voted.")
	},

	testUserPermissions: async () => {
		// Test edit permissions and user status
		const req = createMockRequest(
			{ path: "/topic/user-topic" },
			{ user_id: 'user-456' }
		)
		req.results = { topics: [], comments: [] }
		
		req.client.addQueryMock(
			'FROM posts p',
			{ 
				rows: [
					{
						topic_id: 'user-topic-123',
						title: 'User Topic',
						user_id: 'user-456', // Same as requesting user
						display_name: 'Current User',
						edit: true,
						favorited: false,
						commented: true,
						voted: false
					}
				]
			}
		)
		req.client.addQueryMock(
			'r.parent_reply_id IS NULL',
			{ rows: [] }
		)
		req.client.addQueryMock(
			'reply_ancestors',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		await getSingleTopic(req, res)
		
		const topic = req.results.topics[0]
		
		// Verify user permissions and status
		assertEquals(true, topic.edit, "User should be able to edit their own topic.")
		assertEquals(false, topic.favorited, "Should show favorited status.")
		assertEquals(true, topic.commented, "Should show if user commented.")
		assertEquals(false, topic.voted, "Should show if user voted.")
	},

	testGuestUserAccess: async () => {
		// Test access without logged in user
		const req = createMockRequest(
			{ path: "/topic/public-topic" },
			{ user_id: undefined }
		)
		req.results = { topics: [], comments: [] }
		
		req.client.addQueryMock(
			'FROM posts p',
			{ 
				rows: [
					{
						topic_id: 'public-topic-123',
						title: 'Public Topic',
						user_id: 'user-789',
						display_name: 'Author',
						edit: false,
						favorited: false,
						commented: false,
						voted: false
					}
				]
			}
		)
		req.client.addQueryMock(
			'r.parent_reply_id IS NULL',
			{ rows: [] }
		)
		req.client.addQueryMock(
			'reply_ancestors',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		await getSingleTopic(req, res)
		
		// Guest user should be able to view topic
		assertEquals(
			1,
			req.results.topics.length,
			"Guest user should be able to view topic."
		)
		assertEquals(
			false,
			req.results.topics[0].edit,
			"Guest user should not have edit permissions."
		)
	},

	testWithDateFilters: async () => {
		// Test with date filtering for topic and comments
		const req = createMockRequest(
			{ 
				path: "/topic/filtered-topic",
				min_topic_create_date: '2024-01-10T00:00:00Z',
				min_comment_create_date: '2024-01-12T00:00:00Z'
				// max_comment_create_date removed so topic will be loaded
			},
			{ user_id: 'user-456' }
		)
		req.results = { topics: [], comments: [] }
		
		req.client.addQueryMock(
			'FROM posts p',
			{ 
				rows: [
					{
						topic_id: 'filtered-topic-123',
						title: 'Filtered Topic',
						create_date: '2024-01-15T10:00:00Z',
						user_id: 'user-789',
						display_name: 'Author'
					}
				]
			}
		)
		req.client.addQueryMock(
			'r.parent_reply_id IS NULL',
			{ 
				rows: [
					{
						comment_id: 'filtered-comment-1',
						body: 'Filtered comment',
						create_date: '2024-01-14T10:00:00Z',
						user_id: 'user-456',
						display_name: 'Commenter'
					}
				]
			}
		)
		req.client.addQueryMock(
			'reply_ancestors',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		await getSingleTopic(req, res)
		
		// Should handle date filtering (topic date 2024-01-15 > min date 2024-01-10)
		assertEquals(
			1,
			req.results.topics.length,
			"Should return filtered topic."
		)
		assertEquals(
			1,
			req.results.comments.length,
			"Should return filtered comments."
		)
	},

	testTopicFields: async () => {
		// Test that all expected topic fields are present
		const req = createMockRequest(
			{ path: "/topic/complete-topic" },
			{ user_id: 'user-456' }
		)
		req.results = { topics: [], comments: [] }
		
		req.client.addQueryMock(
			'FROM posts p',
			{ 
				rows: [
					{
						create_date: '2024-01-15T10:00:00Z',
						topic_id: 'complete-topic-123',
						title: 'Complete Topic Title',
						user_id: 'user-789',
						display_name: 'Complete Author',
						display_name_index: 2,
						user_slug: 'complete-author',
						profile_picture_uuid: 'pic-uuid',
						user_verified: true,
						slug: 'complete-topic',
						body: 'Complete topic body',
						poll_1: 'Poll Option 1',
						poll_2: 'Poll Option 2',
						poll_3: null,
						poll_4: null,
						poll_counts: '8,3',
						poll_counts_estimated: true,
						note: 'Topic note',
						favorite_count: 15,
						comment_count: 8,
						counts_max_create_date: '2024-01-15T11:00:00Z',
						edit: false,
						image_uuids: 'img1,img2,img3',
						favorited: true,
						commented: true,
						voted: false,
						tags: 'technology,science,innovation'
					}
				]
			}
		)
		req.client.addQueryMock(
			'r.parent_reply_id IS NULL',
			{ rows: [] }
		)
		req.client.addQueryMock(
			'reply_ancestors',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		await getSingleTopic(req, res)
		
		const topic = req.results.topics[0]
		
		// Verify all fields are present
		assertEquals('2024-01-15T10:00:00Z', topic.create_date, "Should have create_date.")
		assertEquals('complete-topic-123', topic.topic_id, "Should have topic_id.")
		assertEquals('Complete Topic Title', topic.title, "Should have title.")
		assertEquals('user-789', topic.user_id, "Should have user_id.")
		assertEquals('Complete Author', topic.display_name, "Should have display_name.")
		assertEquals(2, topic.display_name_index, "Should have display_name_index.")
		assertEquals('complete-author', topic.user_slug, "Should have user_slug.")
		assertEquals('pic-uuid', topic.profile_picture_uuid, "Should have profile_picture_uuid.")
		assertEquals(true, topic.user_verified, "Should have user_verified.")
		assertEquals('complete-topic', topic.slug, "Should have slug.")
		assertEquals('Complete topic body', topic.body, "Should have body.")
		assertEquals('Poll Option 1', topic.poll_1, "Should have poll_1.")
		assertEquals('Poll Option 2', topic.poll_2, "Should have poll_2.")
		assertEquals('8,3', topic.poll_counts, "Should have poll_counts.")
		assertEquals(true, topic.poll_counts_estimated, "Should have poll_counts_estimated.")
		assertEquals('Topic note', topic.note, "Should have note.")
		assertEquals(15, topic.favorite_count, "Should have favorite_count.")
		assertEquals(8, topic.comment_count, "Should have comment_count.")
		assertEquals('2024-01-15T11:00:00Z', topic.counts_max_create_date, "Should have counts_max_create_date.")
		assertEquals(false, topic.edit, "Should have edit permission.")
		assertEquals('img1,img2,img3', topic.image_uuids, "Should have image_uuids.")
		assertEquals(true, topic.favorited, "Should have favorited status.")
		assertEquals(true, topic.commented, "Should have commented status.")
		assertEquals(false, topic.voted, "Should have voted status.")
		assertEquals('technology,science,innovation', topic.tags, "Should have tags.")
	},

	testEmptyTopicSlug: async () => {
		// Test edge case with empty topic slug
		const req = createMockRequest(
			{ path: "/topic/" },
			{ user_id: 'user-456' }
		)
		req.results = { topics: [], comments: [] }
		
		req.client.addQueryMock(
			'FROM posts p',
			{ rows: [] }
		)
		req.client.addQueryMock(
			'SELECT p.post_id as topic_id',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		await getSingleTopic(req, res)
		
		// Should handle empty slug gracefully
		assertEquals(
			undefined,
			req.results.path,
			"Should not set path for empty topic slug."
		)
		assertEquals(
			0,
			req.results.topics.length,
			"Should return empty results for empty slug."
		)
	}
}

runTests(path.basename(__filename), Object.values(tests))