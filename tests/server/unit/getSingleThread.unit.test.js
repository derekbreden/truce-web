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
	testGetSingleThreadWithReplies: async () => {
		// Setup mock request for reply thread path
		const req = createMockRequest(
			{ path: "/reply/reply-123" },
			{ user_id: 'user-456' }
		)
		req.results = { replies: [] }
		
		// Setup mock database responses
		req.client.addQueryMock(
			'WITH root_reply',
			{ 
				rows: [
					{
						create_date: '2024-01-15T10:00:00Z',
						reply_id: 'reply-123',
						body: 'This is the root reply',
						note: 'Root reply note',
						favorite_count: 5,
						parent_reply_id: null,
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
						reply_id: 'reply-124',
						body: 'This is a reply reply',
						note: 'Reply note',
						favorite_count: 2,
						parent_reply_id: 'reply-123',
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
						title: 'Parent Post Title',
						slug: 'parent-post-slug'
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await getSingleThread(req, res)
		
		// Verify thread was loaded
		assertEquals(
			"/reply/reply-123",
			req.results.path,
			"Path should be set in results."
		)
		assertEquals(
			2,
			req.results.replies.length,
			"Should return reply thread."
		)
		assertEquals(
			'reply-123',
			req.results.replies[0].reply_id,
			"First reply should be the root reply."
		)
		assertEquals(
			'This is the root reply',
			req.results.replies[0].body,
			"Should include reply body."
		)
		assertEquals(
			'reply-124',
			req.results.replies[1].reply_id,
			"Second reply should be the reply."
		)
		assertEquals(
			'reply-123',
			req.results.replies[1].parent_reply_id,
			"Reply should reference parent reply."
		)
		
		// Verify parent post was loaded
		assertEquals(
			'Parent Post Title',
			req.results.parent_post.title,
			"Should include parent post title."
		)
		assertEquals(
			'parent-post-slug',
			req.results.parent_post.slug,
			"Should include parent post slug."
		)
	},

	testGetSingleThreadNoReplies: async () => {
		// Setup mock request for reply that doesn't exist or has no accessible replies
		const req = createMockRequest(
			{ path: "/reply/nonexistent-reply" },
			{ user_id: 'user-456' }
		)
		req.results = { replies: [] }
		
		// Setup mock database response with no results
		req.client.addQueryMock(
			'WITH root_reply',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await getSingleThread(req, res)
		
		// Verify no results but path not set (only set when replies exist)
		assertEquals(
			undefined,
			req.results.path,
			"Path should not be set when no replies found."
		)
		assertEquals(
			0,
			req.results.replies.length,
			"Should have empty replies array."
		)
		assertEquals(
			undefined,
			req.results.parent_post,
			"Should not set parent_post when no replies."
		)
	},

	testWithMinReplyCreateDate: async () => {
		// Setup mock request with date filtering
		const req = createMockRequest(
			{ 
				path: "/reply/reply-123",
				min_reply_create_date: '2024-01-15T09:00:00Z'
			},
			{ user_id: 'user-456' }
		)
		req.results = { replies: [] }
		
		// Setup mock database response
		req.client.addQueryMock(
			'WITH root_reply',
			{ 
				rows: [
					{
						create_date: '2024-01-15T10:00:00Z',
						reply_id: 'reply-123',
						body: 'Filtered reply',
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
						title: 'Post Title',
						slug: 'post-slug'
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		await getSingleThread(req, res)
		
		// Should handle date filtering
		assertEquals(
			"/reply/reply-123",
			req.results.path,
			"Should set path with date filtering."
		)
		assertEquals(
			1,
			req.results.replies.length,
			"Should return filtered replies."
		)
	},

	testPathSetWithMinDateEvenNoReplies: async () => {
		// Test that path is set when min_reply_create_date is provided, even if no replies
		const req = createMockRequest(
			{ 
				path: "/reply/reply-123",
				min_reply_create_date: '2024-01-15T09:00:00Z'
			},
			{ user_id: 'user-456' }
		)
		req.results = { replies: [] }
		
		// Setup mock database response with no results
		req.client.addQueryMock(
			'WITH root_reply',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		await getSingleThread(req, res)
		
		// Path should be set even when no replies due to min_reply_create_date
		assertEquals(
			"/reply/reply-123",
			req.results.path,
			"Path should be set when min_reply_create_date provided."
		)
		assertEquals(
			0,
			req.results.replies.length,
			"Should have empty replies array."
		)
	},

	testNoActionWhenWrongPath: async () => {
		// Setup mock request with wrong path format
		const req = createMockRequest(
			{ path: "/post/123" },
			{ user_id: 'user-456' }
		)
		req.results = { replies: [] }
		
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
			req.results.replies.length,
			"Should not load replies for wrong path."
		)
	},

	testNoActionWhenNoPath: async () => {
		// Setup mock request without path
		const req = createMockRequest(
			{}, // no path
			{ user_id: 'user-456' }
		)
		req.results = { replies: [] }
		
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
			{ path: "/reply/reply-123" },
			{ user_id: 'user-456' }
		)
		req.results = { replies: [] }
		
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

	testReplyIdExtraction: async () => {
		// Test various reply ID formats
		const testCases = [
			{ path: "/reply/123", expectedId: "123" },
			{ path: "/reply/reply-abc-def", expectedId: "reply-abc-def" },
			{ path: "/reply/uuid-style-123-456", expectedId: "uuid-style-123-456" }
		]
		
		for (const testCase of testCases) {
			const req = createMockRequest(
				{ path: testCase.path },
				{ user_id: 'user-456' }
			)
			req.results = { replies: [] }
			
			req.client.clearQueryMocks()
			req.client.addQueryMock(
				'WITH root_reply',
				{ 
					rows: [
						{
							reply_id: testCase.expectedId,
							body: 'Test reply',
							user_id: 'user-789',
							display_name: 'Author'
						}
					]
				}
			)
			req.client.addQueryMock(
				'SELECT t.title, t.slug',
				{ 
					rows: [{ title: 'Post', slug: 'post' }]
				}
			)
			
			const res = createMockResponse()
			
			await getSingleThread(req, res)
			
			assertEquals(
				testCase.expectedId,
				req.results.replies[0].reply_id,
				`Should extract reply ID correctly from path: ${testCase.path}.`
			)
		}
	},

	testUserPermissions: async () => {
		// Test edit permissions and favorited status
		const req = createMockRequest(
			{ path: "/reply/reply-123" },
			{ user_id: 'user-456' }
		)
		req.results = { replies: [] }
		
		req.client.addQueryMock(
			'WITH root_reply',
			{ 
				rows: [
					{
						reply_id: 'reply-own',
						body: 'Own reply',
						user_id: 'user-456', // Same as requesting user
						display_name: 'Current User',
						edit: true,
						favorited: false
					},
					{
						reply_id: 'reply-other',
						body: 'Other reply',
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
			{ rows: [{ title: 'Post', slug: 'post' }] }
		)
		
		const res = createMockResponse()
		
		await getSingleThread(req, res)
		
		// Verify permissions
		assertEquals(
			true,
			req.results.replies[0].edit,
			"User should be able to edit their own reply."
		)
		assertEquals(
			false,
			req.results.replies[1].edit,
			"User should not be able to edit other's reply."
		)
		assertEquals(
			false,
			req.results.replies[0].favorited,
			"Own reply should not be favorited."
		)
		assertEquals(
			true,
			req.results.replies[1].favorited,
			"Other reply should be favorited."
		)
	},

	testGuestUserAccess: async () => {
		// Test access without logged in user
		const req = createMockRequest(
			{ path: "/reply/reply-123" },
			{ user_id: undefined }
		)
		req.results = { replies: [] }
		
		req.client.addQueryMock(
			'WITH root_reply',
			{ 
				rows: [
					{
						reply_id: 'reply-123',
						body: 'Public reply',
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
			{ rows: [{ title: 'Post', slug: 'post' }] }
		)
		
		const res = createMockResponse()
		
		await getSingleThread(req, res)
		
		// Guest user should be able to view replies
		assertEquals(
			1,
			req.results.replies.length,
			"Guest user should be able to view replies."
		)
		assertEquals(
			false,
			req.results.replies[0].edit,
			"Guest user should not have edit permissions."
		)
		assertEquals(
			false,
			req.results.replies[0].favorited,
			"Guest user should not have favorited status."
		)
	},

	testReplyFields: async () => {
		// Test that all expected reply fields are present
		const req = createMockRequest(
			{ path: "/reply/reply-123" },
			{ user_id: 'user-456' }
		)
		req.results = { replies: [] }
		
		req.client.addQueryMock(
			'WITH root_reply',
			{ 
				rows: [
					{
						create_date: '2024-01-15T10:00:00Z',
						reply_id: 'reply-123',
						body: 'Complete reply body',
						note: 'Reply note',
						favorite_count: 7,
						parent_reply_id: null,
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
			{ rows: [{ title: 'Post', slug: 'post' }] }
		)
		
		const res = createMockResponse()
		
		await getSingleThread(req, res)
		
		const reply = req.results.replies[0]
		
		// Verify all fields are present
		assertEquals('2024-01-15T10:00:00Z', reply.create_date, "Should have create_date.")
		assertEquals('reply-123', reply.reply_id, "Should have reply_id.")
		assertEquals('Complete reply body', reply.body, "Should have body.")
		assertEquals('Reply note', reply.note, "Should have note.")
		assertEquals(7, reply.favorite_count, "Should have favorite_count.")
		assertEquals(null, reply.parent_reply_id, "Should have parent_reply_id.")
		assertEquals('user-789', reply.user_id, "Should have user_id.")
		assertEquals('Complete User', reply.display_name, "Should have display_name.")
		assertEquals(2, reply.display_name_index, "Should have display_name_index.")
		assertEquals('complete-user', reply.user_slug, "Should have user_slug.")
		assertEquals('pic-uuid', reply.profile_picture_uuid, "Should have profile_picture_uuid.")
		assertEquals(true, reply.user_verified, "Should have user_verified.")
		assertEquals(false, reply.edit, "Should have edit permission.")
		assertEquals('img1,img2', reply.image_uuids, "Should have image_uuids.")
		assertEquals(true, reply.favorited, "Should have favorited status.")
	},

	testEmptyReplyPath: async () => {
		// Test edge case with empty reply ID
		const req = createMockRequest(
			{ path: "/reply/" },
			{ user_id: 'user-456' }
		)
		req.results = { replies: [] }
		
		req.client.addQueryMock(
			'WITH root_reply',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		await getSingleThread(req, res)
		
		// Should handle empty reply ID gracefully
		assertEquals(
			undefined,
			req.results.path,
			"Should not set path for empty reply ID."
		)
		assertEquals(
			0,
			req.results.replies.length,
			"Should return empty results for empty reply ID."
		)
	}
}

runTests(path.basename(__filename), Object.values(tests))