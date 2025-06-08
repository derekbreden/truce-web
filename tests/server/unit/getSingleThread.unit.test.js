const path = require("path")
const {
	createMockRequest,
	createMockResponse,
	assertEquals,
	runTests
} = require("../shared/serverTestSetup.js")

// Import the handler we're testing
const getSingleThread = require("../../../server/session/getSingleThread.js")

const tests = {
	testGetSingleThreadWithComments: async () => {
		// Setup mock request for comment thread path
		const req = createMockRequest(
			{ path: "/reply/comment-123" },
			{ user_id: 'user-456' }
		)
		req.results = { comments: [] }
		
		// Setup mock database responses
		req.client.addQueryMock(
			'WITH root_comment',
			{ 
				rows: [
					{
						create_date: '2024-01-15T10:00:00Z',
						comment_id: 'comment-123',
						body: 'This is the root comment',
						note: 'Root comment note',
						favorite_count: 5,
						parent_comment_id: null,
						user_id: 'user-789',
						display_name: 'Root Author',
						display_name_index: 0,
						user_slug: 'root-author',
						profile_picture_uuid: 'pic-uuid-1',
						user_verified: true,
						edit: false,
						image_uuids: 'img-uuid-1,img-uuid-2',
						favorited: false
					},
					{
						create_date: '2024-01-15T10:05:00Z',
						comment_id: 'comment-124',
						body: 'This is a reply comment',
						note: 'Reply note',
						favorite_count: 2,
						parent_comment_id: 'comment-123',
						user_id: 'user-456',
						display_name: 'Reply Author',
						display_name_index: 1,
						user_slug: 'reply-author',
						profile_picture_uuid: null,
						user_verified: false,
						edit: true,
						image_uuids: null,
						favorited: true
					}
				]
			}
		)
		req.client.addQueryMock(
			'SELECT t.title, t.slug',
			{ 
				rows: [
					{
						title: 'Parent Topic Title',
						slug: 'parent-topic-slug'
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await getSingleThread(req, res)
		
		// Verify thread was loaded
		assertEquals(
			"/reply/comment-123",
			req.results.path,
			"Path should be set in results."
		)
		assertEquals(
			2,
			req.results.comments.length,
			"Should return comment thread."
		)
		assertEquals(
			'comment-123',
			req.results.comments[0].comment_id,
			"First comment should be the root comment."
		)
		assertEquals(
			'This is the root comment',
			req.results.comments[0].body,
			"Should include comment body."
		)
		assertEquals(
			'comment-124',
			req.results.comments[1].comment_id,
			"Second comment should be the reply."
		)
		assertEquals(
			'comment-123',
			req.results.comments[1].parent_comment_id,
			"Reply should reference parent comment."
		)
		
		// Verify parent topic was loaded
		assertEquals(
			'Parent Topic Title',
			req.results.parent_topic.title,
			"Should include parent topic title."
		)
		assertEquals(
			'parent-topic-slug',
			req.results.parent_topic.slug,
			"Should include parent topic slug."
		)
	},

	testGetSingleThreadNoComments: async () => {
		// Setup mock request for comment that doesn't exist or has no accessible comments
		const req = createMockRequest(
			{ path: "/comment/nonexistent-comment" },
			{ user_id: 'user-456' }
		)
		req.results = { comments: [] }
		
		// Setup mock database response with no results
		req.client.addQueryMock(
			'WITH root_comment',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await getSingleThread(req, res)
		
		// Verify no results but path not set (only set when comments exist)
		assertEquals(
			undefined,
			req.results.path,
			"Path should not be set when no comments found."
		)
		assertEquals(
			0,
			req.results.comments.length,
			"Should have empty comments array."
		)
		assertEquals(
			undefined,
			req.results.parent_topic,
			"Should not set parent_topic when no comments."
		)
	},

	testWithMinCommentCreateDate: async () => {
		// Setup mock request with date filtering
		const req = createMockRequest(
			{ 
				path: "/reply/comment-123",
				min_comment_create_date: '2024-01-15T09:00:00Z'
			},
			{ user_id: 'user-456' }
		)
		req.results = { comments: [] }
		
		// Setup mock database response
		req.client.addQueryMock(
			'WITH root_comment',
			{ 
				rows: [
					{
						create_date: '2024-01-15T10:00:00Z',
						comment_id: 'comment-123',
						body: 'Filtered comment',
						user_id: 'user-789',
						display_name: 'Author'
					}
				]
			}
		)
		req.client.addQueryMock(
			'SELECT t.title, t.slug',
			{ 
				rows: [
					{
						title: 'Topic Title',
						slug: 'topic-slug'
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		await getSingleThread(req, res)
		
		// Should handle date filtering
		assertEquals(
			"/reply/comment-123",
			req.results.path,
			"Should set path with date filtering."
		)
		assertEquals(
			1,
			req.results.comments.length,
			"Should return filtered comments."
		)
	},

	testPathSetWithMinDateEvenNoComments: async () => {
		// Test that path is set when min_comment_create_date is provided, even if no comments
		const req = createMockRequest(
			{ 
				path: "/reply/comment-123",
				min_comment_create_date: '2024-01-15T09:00:00Z'
			},
			{ user_id: 'user-456' }
		)
		req.results = { comments: [] }
		
		// Setup mock database response with no results
		req.client.addQueryMock(
			'WITH root_comment',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		await getSingleThread(req, res)
		
		// Path should be set even when no comments due to min_comment_create_date
		assertEquals(
			"/reply/comment-123",
			req.results.path,
			"Path should be set when min_comment_create_date provided."
		)
		assertEquals(
			0,
			req.results.comments.length,
			"Should have empty comments array."
		)
	},

	testNoActionWhenWrongPath: async () => {
		// Setup mock request with wrong path format
		const req = createMockRequest(
			{ path: "/topic/123" },
			{ user_id: 'user-456' }
		)
		req.results = { comments: [] }
		
		const res = createMockResponse()
		
		// Execute the handler
		await getSingleThread(req, res)
		
		// Verify no action taken
		assertEquals(
			undefined,
			req.results.path,
			"Should not set results for wrong path format."
		)
		assertEquals(
			0,
			req.results.comments.length,
			"Should not load comments for wrong path."
		)
	},

	testNoActionWhenNoPath: async () => {
		// Setup mock request without path
		const req = createMockRequest(
			{}, // no path
			{ user_id: 'user-456' }
		)
		req.results = { comments: [] }
		
		const res = createMockResponse()
		
		// Execute the handler
		await getSingleThread(req, res)
		
		// Verify no action taken
		assertEquals(
			undefined,
			req.results.path,
			"Should not set results when path is missing."
		)
	},

	testNoActionWhenAlreadyEnded: async () => {
		// Setup mock request
		const req = createMockRequest(
			{ path: "/reply/comment-123" },
			{ user_id: 'user-456' }
		)
		req.results = { comments: [] }
		
		const res = createMockResponse()
		// Simulate response already ended
		res.writableEnded = true
		
		// Execute the handler
		await getSingleThread(req, res)
		
		// Verify no action taken
		assertEquals(
			undefined,
			req.results.path,
			"Should not set results when response already ended."
		)
	},

	testCommentIdExtraction: async () => {
		// Test various comment ID formats
		const testCases = [
			{ path: "/comment/123", expectedId: "123" },
			{ path: "/comment/comment-abc-def", expectedId: "comment-abc-def" },
			{ path: "/comment/uuid-style-123-456", expectedId: "uuid-style-123-456" }
		]
		
		for (const testCase of testCases) {
			const req = createMockRequest(
				{ path: testCase.path },
				{ user_id: 'user-456' }
			)
			req.results = { comments: [] }
			
			req.client.clearQueryMocks()
			req.client.addQueryMock(
				'WITH root_comment',
				{ 
					rows: [
						{
							comment_id: testCase.expectedId,
							body: 'Test comment',
							user_id: 'user-789',
							display_name: 'Author'
						}
					]
				}
			)
			req.client.addQueryMock(
				'SELECT t.title, t.slug',
				{ 
					rows: [{ title: 'Topic', slug: 'topic' }]
				}
			)
			
			const res = createMockResponse()
			
			await getSingleThread(req, res)
			
			assertEquals(
				testCase.expectedId,
				req.results.comments[0].comment_id,
				`Should extract comment ID correctly from path: ${testCase.path}.`
			)
		}
	},

	testUserPermissions: async () => {
		// Test edit permissions and favorited status
		const req = createMockRequest(
			{ path: "/reply/comment-123" },
			{ user_id: 'user-456' }
		)
		req.results = { comments: [] }
		
		req.client.addQueryMock(
			'WITH root_comment',
			{ 
				rows: [
					{
						comment_id: 'comment-own',
						body: 'Own comment',
						user_id: 'user-456', // Same as requesting user
						display_name: 'Current User',
						edit: true,
						favorited: false
					},
					{
						comment_id: 'comment-other',
						body: 'Other comment',
						user_id: 'user-789', // Different user
						display_name: 'Other User',
						edit: false,
						favorited: true
					}
				]
			}
		)
		req.client.addQueryMock(
			'SELECT t.title, t.slug',
			{ rows: [{ title: 'Topic', slug: 'topic' }] }
		)
		
		const res = createMockResponse()
		
		await getSingleThread(req, res)
		
		// Verify permissions
		assertEquals(
			true,
			req.results.comments[0].edit,
			"User should be able to edit their own comment."
		)
		assertEquals(
			false,
			req.results.comments[1].edit,
			"User should not be able to edit other's comment."
		)
		assertEquals(
			false,
			req.results.comments[0].favorited,
			"Own comment should not be favorited."
		)
		assertEquals(
			true,
			req.results.comments[1].favorited,
			"Other comment should be favorited."
		)
	},

	testGuestUserAccess: async () => {
		// Test access without logged in user
		const req = createMockRequest(
			{ path: "/reply/comment-123" },
			{ user_id: undefined }
		)
		req.results = { comments: [] }
		
		req.client.addQueryMock(
			'WITH root_comment',
			{ 
				rows: [
					{
						comment_id: 'comment-123',
						body: 'Public comment',
						user_id: 'user-789',
						display_name: 'Author',
						edit: false,
						favorited: false
					}
				]
			}
		)
		req.client.addQueryMock(
			'SELECT t.title, t.slug',
			{ rows: [{ title: 'Topic', slug: 'topic' }] }
		)
		
		const res = createMockResponse()
		
		await getSingleThread(req, res)
		
		// Guest user should be able to view comments
		assertEquals(
			1,
			req.results.comments.length,
			"Guest user should be able to view comments."
		)
		assertEquals(
			false,
			req.results.comments[0].edit,
			"Guest user should not have edit permissions."
		)
		assertEquals(
			false,
			req.results.comments[0].favorited,
			"Guest user should not have favorited status."
		)
	},

	testCommentFields: async () => {
		// Test that all expected comment fields are present
		const req = createMockRequest(
			{ path: "/reply/comment-123" },
			{ user_id: 'user-456' }
		)
		req.results = { comments: [] }
		
		req.client.addQueryMock(
			'WITH root_comment',
			{ 
				rows: [
					{
						create_date: '2024-01-15T10:00:00Z',
						comment_id: 'comment-123',
						body: 'Complete comment body',
						note: 'Comment note',
						favorite_count: 7,
						parent_comment_id: null,
						user_id: 'user-789',
						display_name: 'Complete User',
						display_name_index: 2,
						user_slug: 'complete-user',
						profile_picture_uuid: 'pic-uuid',
						user_verified: true,
						edit: false,
						image_uuids: 'img1,img2',
						favorited: true
					}
				]
			}
		)
		req.client.addQueryMock(
			'SELECT t.title, t.slug',
			{ rows: [{ title: 'Topic', slug: 'topic' }] }
		)
		
		const res = createMockResponse()
		
		await getSingleThread(req, res)
		
		const comment = req.results.comments[0]
		
		// Verify all fields are present
		assertEquals('2024-01-15T10:00:00Z', comment.create_date, "Should have create_date.")
		assertEquals('comment-123', comment.comment_id, "Should have comment_id.")
		assertEquals('Complete comment body', comment.body, "Should have body.")
		assertEquals('Comment note', comment.note, "Should have note.")
		assertEquals(7, comment.favorite_count, "Should have favorite_count.")
		assertEquals(null, comment.parent_comment_id, "Should have parent_comment_id.")
		assertEquals('user-789', comment.user_id, "Should have user_id.")
		assertEquals('Complete User', comment.display_name, "Should have display_name.")
		assertEquals(2, comment.display_name_index, "Should have display_name_index.")
		assertEquals('complete-user', comment.user_slug, "Should have user_slug.")
		assertEquals('pic-uuid', comment.profile_picture_uuid, "Should have profile_picture_uuid.")
		assertEquals(true, comment.user_verified, "Should have user_verified.")
		assertEquals(false, comment.edit, "Should have edit permission.")
		assertEquals('img1,img2', comment.image_uuids, "Should have image_uuids.")
		assertEquals(true, comment.favorited, "Should have favorited status.")
	},

	testEmptyCommentPath: async () => {
		// Test edge case with empty comment ID
		const req = createMockRequest(
			{ path: "/comment/" },
			{ user_id: 'user-456' }
		)
		req.results = { comments: [] }
		
		req.client.addQueryMock(
			'WITH root_comment',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		await getSingleThread(req, res)
		
		// Should handle empty comment ID gracefully
		assertEquals(
			undefined,
			req.results.path,
			"Should not set path for empty comment ID."
		)
		assertEquals(
			0,
			req.results.comments.length,
			"Should return empty results for empty comment ID."
		)
	}
}

runTests(path.basename(__filename), Object.values(tests))