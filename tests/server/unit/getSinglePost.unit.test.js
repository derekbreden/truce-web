const path = require("path")
const {
	createMockRequest,
	createMockResponse,
	assertEquals,
	runTests
} = require("../shared/serverTestSetup.js")

// Import the handler we are testing
const getSinglePost = require("../../../server/session/getSinglePost.js")

const tests = {
	testGetSinglePostWithReplies: async () => {
		// Setup mock request for post path
		const req = createMockRequest(
			{ path: "/post/sample-post-slug" },
			{ user_id: "user-456" }
		)
		req.results = { posts: [], replies: [] }
		
		// Setup mock database responses for complete post load
		req.client.addQueryMock(
			"FROM posts p",
			{ 
				rows: [
					{
						create_date: "2024-01-15T10:00:00Z",
						post_id: "post-123",
						title: "Sample Post Title",
						user_id: "user-789",
						display_name: "Post Author",
						display_name_index: 0,
						user_slug: "post-author",
						profile_picture_uuid: "pic-uuid-1",
						user_verified: true,
						slug: "sample-post-slug",
						body: "This is the post body content",
						poll_1: "Option A",
						poll_2: "Option B",
						poll_3: null,
						poll_4: null,
						poll_counts: "5,3",
						poll_counts_estimated: false,
						note: "Post note",
						favorite_count: 10,
						reply_count: 5,
						counts_max_create_date: "2024-01-15T11:00:00Z",
						edit: false,
						image_uuids: "img1,img2",
						favorited: true,
						replyed: false,
						voted: false,
						topics: "technology,science"
					}
				]
			}
		)
		// Mock for root replies
		req.client.addQueryMock(
			"r.parent_reply_id IS NULL",
			{ 
				rows: [
					{
						create_date: "2024-01-15T10:30:00Z",
						reply_id: "reply-1",
						body: "First root reply",
						note: "Reply note",
						parent_reply_id: null,
						favorite_count: 2,
						counts_max_create_date: "2024-01-15T10:35:00Z",
						user_id: "user-456",
						display_name: "Replyer 1",
						display_name_index: 0,
						user_slug: "replyer1",
						profile_picture_uuid: null,
						user_verified: false,
						edit: true,
						image_uuids: null,
						favorited: false
					}
				]
			}
		)
		// Mock for reply replies
		req.client.addQueryMock(
			"r.parent_reply_id IS NOT NULL",
			{ 
				rows: [
					{
						create_date: "2024-01-15T10:45:00Z",
						reply_id: "reply-2",
						body: "Reply to first reply",
						note: "",
						parent_reply_id: "reply-1",
						favorite_count: 1,
						user_id: "user-999",
						display_name: "Replier",
						display_name_index: 1,
						user_slug: "replier",
						edit: false,
						favorited: true
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await getSinglePost(req, res)
		
		// Verify post was loaded
		assertEquals(
			"/post/sample-post-slug",
			req.results.path,
			"Path should be set in results."
		)
		assertEquals(
			1,
			req.results.posts.length,
			"Should return single post."
		)
		assertEquals(
			"Sample Post Title",
			req.results.posts[0].title,
			"Should include post title."
		)
		assertEquals(
			"This is the post body content",
			req.results.posts[0].body,
			"Should include post body."
		)
		assertEquals(
			"technology,science",
			req.results.posts[0].topics,
			"Should include post topics."
		)
		
		// Verify replies were loaded
		assertEquals(
			2,
			req.results.replies.length,
			"Should load root and reply replies."
		)
		assertEquals(
			"reply-1",
			req.results.replies[0].reply_id,
			"First reply should be root reply."
		)
		assertEquals(
			null,
			req.results.replies[0].parent_reply_id,
			"Root reply should have null parent."
		)
		assertEquals(
			"reply-2",
			req.results.replies[1].reply_id,
			"Second reply should be reply."
		)
		assertEquals(
			"reply-1",
			req.results.replies[1].parent_reply_id,
			"Reply should reference parent reply."
		)
	},

	testGetPostOnlyWithMaxReplyDate: async () => {
		// Test when max_reply_create_date is provided (skips post loading)
		const req = createMockRequest(
			{ 
				path: "/post/sample-post-slug",
				max_reply_create_date: "2024-01-15T12:00:00Z"
			},
			{ user_id: "user-456" }
		)
		req.results = { posts: [], replies: [] }
		
		// Setup mocks for post_id lookup only
		req.client.addQueryMock(
			"SELECT p.post_id as post_id",
			{ 
				rows: [{ post_id: "post-123" }]
			}
		)
		req.client.addQueryMock(
			"r.parent_reply_id IS NULL",
			{ rows: [] }
		)
		req.client.addQueryMock(
			"reply_ancestors",
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		await getSinglePost(req, res)
		
		// Should set path but not load post details
		assertEquals(
			"/post/sample-post-slug",
			req.results.path,
			"Path should be set."
		)
		assertEquals(
			0,
			req.results.posts.length,
			"Should not load post when max_reply_create_date provided."
		)
		assertEquals(
			0,
			req.results.replies.length,
			"Should load replies (empty in this test)."
		)
	},

	testPostNotFound: async () => {
		// Test when post does not exist or is blocked/flagged
		const req = createMockRequest(
			{ path: "/post/nonexistent-post" },
			{ user_id: "user-456" }
		)
		req.results = { posts: [], replies: [] }
		
		// Setup mock responses for no results
		req.client.addQueryMock(
			"FROM posts p",
			{ rows: [] }
		)
		req.client.addQueryMock(
			"SELECT p.post_id as post_id",
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		await getSinglePost(req, res)
		
		// Verify no results
		assertEquals(
			undefined,
			req.results.path,
			"Path should not be set when post not found."
		)
		assertEquals(
			0,
			req.results.posts.length,
			"Should return empty posts array."
		)
		assertEquals(
			0,
			req.results.replies.length,
			"Should return empty replies array."
		)
	},

	testNoActionWhenWrongPath: async () => {
		// Setup mock request with wrong path format
		const req = createMockRequest(
			{ path: "/reply/123" },
			{ user_id: "user-456" }
		)
		req.results = { posts: [], replies: [] }
		
		const res = createMockResponse()
		
		// Execute the handler
		await getSinglePost(req, res)
		
		// Verify no action taken
		assertEquals(
			undefined,
			req.results.path,
			"Should not set results for wrong path format."
		)
		assertEquals(
			0,
			req.results.posts.length,
			"Should not load post for wrong path."
		)
	},

	testNoActionWhenAlreadyEnded: async () => {
		// Setup mock request
		const req = createMockRequest(
			{ path: "/post/sample-post" },
			{ user_id: "user-456" }
		)
		req.results = { posts: [], replies: [] }
		
		const res = createMockResponse()
		// Simulate response already ended
		res.writableEnded = true
		
		// Execute the handler
		await getSinglePost(req, res)
		
		// Verify no action taken
		assertEquals(
			undefined,
			req.results.path,
			"Should not set results when response already ended."
		)
	},

	testSlugExtraction: async () => {
		// Test various post slug formats
		const test_cases = [
			{ path: "/post/simple", expectedSlug: "simple" },
			{ path: "/post/post-with-dashes", expectedSlug: "post-with-dashes" },
			{ path: "/post/123-numeric-slug", expectedSlug: "123-numeric-slug" }
		]
		
		for (const test_case of test_cases) {
			const req = createMockRequest(
				{ path: test_case.path },
				{ user_id: "user-456" }
			)
			req.results = { posts: [], replies: [] }
			
			req.client.clearQueryMocks()
			req.client.addQueryMock(
				"FROM posts p",
				{ 
					rows: [
						{
							post_id: "post-test",
							title: "Test Post",
							slug: test_case.expectedSlug,
							user_id: "user-789",
							display_name: "Author"
						}
					]
				}
			)
			req.client.addQueryMock(
				"r.parent_reply_id IS NULL",
				{ rows: [] }
			)
			req.client.addQueryMock(
				"reply_ancestors",
				{ rows: [] }
			)
			
			const res = createMockResponse()
			
			await getSinglePost(req, res)
			
			assertEquals(
				test_case.expectedSlug,
				req.results.posts[0].slug,
				`Should extract slug correctly from path: ${test_case.path}.`
			)
		}
	},

	testPollData: async () => {
		// Test poll data handling
		const req = createMockRequest(
			{ path: "/post/poll-post" },
			{ user_id: "user-456" }
		)
		req.results = { posts: [], replies: [] }
		
		req.client.addQueryMock(
			"FROM posts p",
			{ 
				rows: [
					{
						post_id: "poll-post-123",
						title: "Poll Post",
						slug: "poll-post",
						poll_1: "Yes",
						poll_2: "No",
						poll_3: "Maybe",
						poll_4: null,
						poll_counts: "10,5,2",
						poll_counts_estimated: false,
						voted: true,
						user_id: "user-789",
						display_name: "Poll Creator"
					}
				]
			}
		)
		req.client.addQueryMock(
			"r.parent_reply_id IS NULL",
			{ rows: [] }
		)
		req.client.addQueryMock(
			"reply_ancestors",
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		await getSinglePost(req, res)
		
		const post = req.results.posts[0]
		
		// Verify poll data
		assertEquals("Yes", post.poll_1, "Should include poll option 1.")
		assertEquals("No", post.poll_2, "Should include poll option 2.")
		assertEquals("Maybe", post.poll_3, "Should include poll option 3.")
		assertEquals(null, post.poll_4, "Should handle null poll option 4.")
		assertEquals("10,5,2", post.poll_counts, "Should include poll counts.")
		assertEquals(false, post.poll_counts_estimated, "Should include poll estimation status.")
		assertEquals(true, post.voted, "Should indicate if user voted.")
	},

	testUserPermissions: async () => {
		// Test edit permissions and user status
		const req = createMockRequest(
			{ path: "/post/user-post" },
			{ user_id: "user-456" }
		)
		req.results = { posts: [], replies: [] }
		
		req.client.addQueryMock(
			"FROM posts p",
			{ 
				rows: [
					{
						post_id: "user-post-123",
						title: "User Post",
						user_id: "user-456", // Same as requesting user
						display_name: "Current User",
						edit: true,
						favorited: false,
						replyed: true,
						voted: false
					}
				]
			}
		)
		req.client.addQueryMock(
			"r.parent_reply_id IS NULL",
			{ rows: [] }
		)
		req.client.addQueryMock(
			"reply_ancestors",
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		await getSinglePost(req, res)
		
		const post = req.results.posts[0]
		
		// Verify user permissions and status
		assertEquals(true, post.edit, "User should be able to edit their own post.")
		assertEquals(false, post.favorited, "Should show favorited status.")
		assertEquals(true, post.replyed, "Should show if user replyed.")
		assertEquals(false, post.voted, "Should show if user voted.")
	},

	testGuestUserAccess: async () => {
		// Test access without logged in user
		const req = createMockRequest(
			{ path: "/post/public-post" },
			{ user_id: undefined }
		)
		req.results = { posts: [], replies: [] }
		
		req.client.addQueryMock(
			"FROM posts p",
			{ 
				rows: [
					{
						post_id: "public-post-123",
						title: "Public Post",
						user_id: "user-789",
						display_name: "Author",
						edit: false,
						favorited: false,
						replyed: false,
						voted: false
					}
				]
			}
		)
		req.client.addQueryMock(
			"r.parent_reply_id IS NULL",
			{ rows: [] }
		)
		req.client.addQueryMock(
			"reply_ancestors",
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		await getSinglePost(req, res)
		
		// Guest user should be able to view post
		assertEquals(
			1,
			req.results.posts.length,
			"Guest user should be able to view post."
		)
		assertEquals(
			false,
			req.results.posts[0].edit,
			"Guest user should not have edit permissions."
		)
	},

	testWithDateFilters: async () => {
		// Test with date filtering for post and replies
		const req = createMockRequest(
			{ 
				path: "/post/filtered-post",
				min_post_create_date: "2024-01-10T00:00:00Z",
				min_reply_create_date: "2024-01-12T00:00:00Z"
				// max_reply_create_date removed so post will be loaded
			},
			{ user_id: "user-456" }
		)
		req.results = { posts: [], replies: [] }
		
		req.client.addQueryMock(
			"FROM posts p",
			{ 
				rows: [
					{
						post_id: "filtered-post-123",
						title: "Filtered Post",
						create_date: "2024-01-15T10:00:00Z",
						user_id: "user-789",
						display_name: "Author"
					}
				]
			}
		)
		req.client.addQueryMock(
			"r.parent_reply_id IS NULL",
			{ 
				rows: [
					{
						reply_id: "filtered-reply-1",
						body: "Filtered reply",
						create_date: "2024-01-14T10:00:00Z",
						user_id: "user-456",
						display_name: "Replyer"
					}
				]
			}
		)
		req.client.addQueryMock(
			"reply_ancestors",
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		await getSinglePost(req, res)
		
		// Should handle date filtering (post date 2024-01-15 > min date 2024-01-10)
		assertEquals(
			1,
			req.results.posts.length,
			"Should return filtered post."
		)
		assertEquals(
			1,
			req.results.replies.length,
			"Should return filtered replies."
		)
	},

	testPostFields: async () => {
		// Test that all expected post fields are present
		const req = createMockRequest(
			{ path: "/post/complete-post" },
			{ user_id: "user-456" }
		)
		req.results = { posts: [], replies: [] }
		
		req.client.addQueryMock(
			"FROM posts p",
			{ 
				rows: [
					{
						create_date: "2024-01-15T10:00:00Z",
						post_id: "complete-post-123",
						title: "Complete Post Title",
						user_id: "user-789",
						display_name: "Complete Author",
						display_name_index: 2,
						user_slug: "complete-author",
						profile_picture_uuid: "pic-uuid",
						user_verified: true,
						slug: "complete-post",
						body: "Complete post body",
						poll_1: "Poll Option 1",
						poll_2: "Poll Option 2",
						poll_3: null,
						poll_4: null,
						poll_counts: "8,3",
						poll_counts_estimated: true,
						note: "Post note",
						favorite_count: 15,
						reply_count: 8,
						counts_max_create_date: "2024-01-15T11:00:00Z",
						edit: false,
						image_uuids: "img1,img2,img3",
						favorited: true,
						replyed: true,
						voted: false,
						topics: "technology,science,innovation"
					}
				]
			}
		)
		req.client.addQueryMock(
			"r.parent_reply_id IS NULL",
			{ rows: [] }
		)
		req.client.addQueryMock(
			"reply_ancestors",
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		await getSinglePost(req, res)
		
		const post = req.results.posts[0]
		
		// Verify all fields are present
		assertEquals("2024-01-15T10:00:00Z", post.create_date, "Should have create_date.")
		assertEquals("complete-post-123", post.post_id, "Should have post_id.")
		assertEquals("Complete Post Title", post.title, "Should have title.")
		assertEquals("user-789", post.user_id, "Should have user_id.")
		assertEquals("Complete Author", post.display_name, "Should have display_name.")
		assertEquals(2, post.display_name_index, "Should have display_name_index.")
		assertEquals("complete-author", post.user_slug, "Should have user_slug.")
		assertEquals("pic-uuid", post.profile_picture_uuid, "Should have profile_picture_uuid.")
		assertEquals(true, post.user_verified, "Should have user_verified.")
		assertEquals("complete-post", post.slug, "Should have slug.")
		assertEquals("Complete post body", post.body, "Should have body.")
		assertEquals("Poll Option 1", post.poll_1, "Should have poll_1.")
		assertEquals("Poll Option 2", post.poll_2, "Should have poll_2.")
		assertEquals("8,3", post.poll_counts, "Should have poll_counts.")
		assertEquals(true, post.poll_counts_estimated, "Should have poll_counts_estimated.")
		assertEquals("Post note", post.note, "Should have note.")
		assertEquals(15, post.favorite_count, "Should have favorite_count.")
		assertEquals(8, post.reply_count, "Should have reply_count.")
		assertEquals("2024-01-15T11:00:00Z", post.counts_max_create_date, "Should have counts_max_create_date.")
		assertEquals(false, post.edit, "Should have edit permission.")
		assertEquals("img1,img2,img3", post.image_uuids, "Should have image_uuids.")
		assertEquals(true, post.favorited, "Should have favorited status.")
		assertEquals(true, post.replyed, "Should have replyed status.")
		assertEquals(false, post.voted, "Should have voted status.")
		assertEquals("technology,science,innovation", post.topics, "Should have topics.")
	},

	testEmptyPostSlug: async () => {
		// Test edge case with empty post slug
		const req = createMockRequest(
			{ path: "/post/" },
			{ user_id: "user-456" }
		)
		req.results = { posts: [], replies: [] }
		
		req.client.addQueryMock(
			"FROM posts p",
			{ rows: [] }
		)
		req.client.addQueryMock(
			"SELECT p.post_id as post_id",
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		await getSinglePost(req, res)
		
		// Should handle empty slug gracefully
		assertEquals(
			undefined,
			req.results.path,
			"Should not set path for empty post slug."
		)
		assertEquals(
			0,
			req.results.posts.length,
			"Should return empty results for empty slug."
		)
	}
}

runTests(path.basename(__filename), Object.values(tests))