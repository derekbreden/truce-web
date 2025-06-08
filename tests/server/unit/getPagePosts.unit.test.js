const path = require("path")
const {
	createMockRequest,
	createMockResponse,
	assertEquals,
	runTests
} = require("../shared/serverTestSetup.js")

// Import the handler we're testing
const getPagePosts = require("../../../server/session/getPagePosts.js")

const tests = {
	testSuccessfulPostsPageLoad: async () => {
		// Setup mock request for /posts page
		const req = createMockRequest(
			{ 
				path: '/posts'
			},
			{ 
				session_id: 'session-123',
				user_id: 'user-456',
				subscribed_to_users: 3
			}
		)
		
		// Initialize results object (normally done by server)
		req.results = { posts: [], replies: [] }
		
		// Setup mock database response
		req.client.addQueryMock(
			'SELECT\n          p.create_date,',
			{ 
				rows: [
					{
						create_date: '2024-01-15T10:30:00Z',
						post_id: 'post-1',
						title: 'First Post',
						user_id: 'author-1',
						display_name: 'John Doe',
						display_name_index: 'johndoe',
						user_slug: 'john-doe',
						profile_picture_uuid: 'profile-uuid-1',
						user_verified: true,
						slug: 'first-post',
						body: 'This is the first post content...',
						poll_1: null,
						poll_2: null,
						poll_3: null,
						poll_4: null,
						poll_counts: null,
						poll_counts_estimated: null,
						note: null,
						favorite_count: 5,
						reply_count: 3,
						counts_max_create_date: '2024-01-15T11:00:00Z',
						edit: false,
						image_uuids: 'image-uuid-1,image-uuid-2',
						favorited: true,
						replyed: false,
						voted: false,
						tags: 'general,technology'
					},
					{
						create_date: '2024-01-14T15:20:00Z',
						post_id: 'post-2',
						title: 'Poll Post',
						user_id: 'user-456',
						display_name: 'Test User',
						display_name_index: 'testuser',
						user_slug: 'test-user',
						profile_picture_uuid: null,
						user_verified: false,
						slug: 'poll-post',
						body: 'What do you think about this?',
						poll_1: 'Option A',
						poll_2: 'Option B',
						poll_3: 'Option C',
						poll_4: null,
						poll_counts: '10,5,3,0',
						poll_counts_estimated: '100,50,30,0',
						note: null,
						favorite_count: 2,
						reply_count: 8,
						counts_max_create_date: '2024-01-14T16:00:00Z',
						edit: true,
						image_uuids: null,
						favorited: false,
						replyed: true,
						voted: true,
						tags: 'polls,asks'
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await getPagePosts(req, res)
		
		// Verify results are populated
		assertEquals(
			'/posts',
			req.results.path,
			"Should set results path."
		)
		assertEquals(
			2,
			req.results.posts.length,
			"Should add posts to results."
		)
		
		// Verify first post data
		const firstPost = req.results.posts[0]
		assertEquals(
			'post-1',
			firstPost.post_id,
			"Should include post ID."
		)
		assertEquals(
			'First Post',
			firstPost.title,
			"Should include post title."
		)
		assertEquals(
			'author-1',
			firstPost.user_id,
			"Should include author user ID."
		)
		assertEquals(
			'John Doe',
			firstPost.display_name,
			"Should include author display name."
		)
		assertEquals(
			'first-post',
			firstPost.slug,
			"Should include post slug."
		)
		assertEquals(
			5,
			firstPost.favorite_count,
			"Should include favorite count."
		)
		assertEquals(
			3,
			firstPost.reply_count,
			"Should include reply count."
		)
		assertEquals(
			true,
			firstPost.favorited,
			"Should include favorited status."
		)
		assertEquals(
			false,
			firstPost.replyed,
			"Should include replyed status."
		)
		assertEquals(
			false,
			firstPost.edit,
			"Should include edit permission (false for other users)."
		)
		assertEquals(
			'general,technology',
			firstPost.tags,
			"Should include post tags."
		)
		
		// Verify second post (poll) data
		const secondPost = req.results.posts[1]
		assertEquals(
			'Poll Post',
			secondPost.title,
			"Should include poll post title."
		)
		assertEquals(
			'Option A',
			secondPost.poll_1,
			"Should include poll option A."
		)
		assertEquals(
			'Option B',
			secondPost.poll_2,
			"Should include poll option B."
		)
		assertEquals(
			'Option C',
			secondPost.poll_3,
			"Should include poll option C."
		)
		assertEquals(
			'10,5,3,0',
			secondPost.poll_counts,
			"Should include poll vote counts."
		)
		assertEquals(
			true,
			secondPost.edit,
			"Should include edit permission (true for own posts)."
		)
		assertEquals(
			true,
			secondPost.voted,
			"Should include voted status."
		)
		
		// Verify response is not ended (handler doesn't end response)
		assertEquals(
			false,
			res.isEnded(),
			"Handler should not end response."
		)
	},

	testPostsAllPageLoad: async () => {
		// Setup mock request for /posts/all page
		const req = createMockRequest(
			{ 
				path: '/posts/all'
			},
			{ 
				session_id: 'session-all',
				user_id: 'user-all'
			}
		)
		
		req.results = { posts: [], replies: [] }
		
		// Setup mock database response
		req.client.addQueryMock(
			'SELECT\n          p.create_date,',
			{ 
				rows: [
					{
						create_date: '2024-01-15T10:30:00Z',
						post_id: 'post-all-1',
						title: 'All Posts Test',
						user_id: 'author-all',
						display_name: 'All Author',
						display_name_index: 'allauthor',
						user_slug: 'all-author',
						profile_picture_uuid: null,
						user_verified: false,
						slug: 'all-posts-test',
						body: 'This is in all posts...',
						poll_1: null,
						poll_2: null,
						poll_3: null,
						poll_4: null,
						poll_counts: null,
						poll_counts_estimated: null,
						note: null,
						favorite_count: 1,
						reply_count: 0,
						counts_max_create_date: '2024-01-15T10:35:00Z',
						edit: false,
						image_uuids: null,
						favorited: false,
						replyed: false,
						voted: false,
						tags: 'general'
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await getPagePosts(req, res)
		
		// Verify results
		assertEquals(
			'/posts/all',
			req.results.path,
			"Should set correct path for all posts."
		)
		assertEquals(
			1,
			req.results.posts.length,
			"Should add posts to results."
		)
		assertEquals(
			'All Posts Test',
			req.results.posts[0].title,
			"Should include post from all posts query."
		)
	},

	testTagPageLoad: async () => {
		// Setup mock request for tag page
		const req = createMockRequest(
			{ 
				path: '/tag/technology'
			},
			{ 
				session_id: 'session-tag',
				user_id: 'user-tag'
			}
		)
		
		req.results = { posts: [], replies: [] }
		
		// Setup mock database response
		req.client.addQueryMock(
			'SELECT\n          p.create_date,',
			{ 
				rows: [
					{
						create_date: '2024-01-15T09:00:00Z',
						post_id: 'post-tech-1',
						title: 'Technology Post',
						user_id: 'tech-author',
						display_name: 'Tech Expert',
						display_name_index: 'techexpert',
						user_slug: 'tech-expert',
						profile_picture_uuid: 'tech-profile',
						user_verified: true,
						slug: 'technology-post',
						body: 'This is about technology...',
						poll_1: null,
						poll_2: null,
						poll_3: null,
						poll_4: null,
						poll_counts: null,
						poll_counts_estimated: null,
						note: null,
						favorite_count: 10,
						reply_count: 5,
						counts_max_create_date: '2024-01-15T09:30:00Z',
						edit: false,
						image_uuids: 'tech-image-1',
						favorited: false,
						replyed: false,
						voted: false,
						tags: 'technology,science'
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await getPagePosts(req, res)
		
		// Verify results
		assertEquals(
			'/tag/technology',
			req.results.path,
			"Should set correct path for tag page."
		)
		assertEquals(
			1,
			req.results.posts.length,
			"Should add posts to results."
		)
		assertEquals(
			'Technology Post',
			req.results.posts[0].title,
			"Should include post from tag query."
		)
		assertEquals(
			'technology,science',
			req.results.posts[0].tags,
			"Should include technology tag."
		)
	},

	testUserPageLoadWithUserId: async () => {
		// Setup mock request for user page with numeric user ID
		const req = createMockRequest(
			{ 
				path: '/user/123'
			},
			{ 
				session_id: 'session-userid',
				user_id: 'user-userid'
			}
		)
		
		req.results = { posts: [], replies: [] }
		
		// Setup mock database response
		req.client.addQueryMock(
			'SELECT\n          p.create_date,',
			{ 
				rows: [
					{
						create_date: '2024-01-14T14:00:00Z',
						post_id: 'user-post-1',
						title: 'User Post',
						user_id: '123',
						display_name: 'User 123',
						display_name_index: 'user123',
						user_slug: 'user-123',
						profile_picture_uuid: null,
						user_verified: false,
						slug: 'user-post',
						body: 'This is from user 123...',
						poll_1: null,
						poll_2: null,
						poll_3: null,
						poll_4: null,
						poll_counts: null,
						poll_counts_estimated: null,
						note: null,
						favorite_count: 2,
						reply_count: 1,
						counts_max_create_date: '2024-01-14T14:15:00Z',
						edit: false,
						image_uuids: null,
						favorited: false,
						replyed: false,
						voted: false,
						tags: 'general'
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await getPagePosts(req, res)
		
		// Verify results
		assertEquals(
			'/user/123',
			req.results.path,
			"Should set correct path for user page."
		)
		assertEquals(
			1,
			req.results.posts.length,
			"Should add posts to results."
		)
		assertEquals(
			'User Post',
			req.results.posts[0].title,
			"Should include post from user query."
		)
		assertEquals(
			'123',
			req.results.posts[0].user_id,
			"Should include correct user ID."
		)
	},

	testUserPageLoadWithSlug: async () => {
		// Setup mock request for user page with slug
		const req = createMockRequest(
			{ 
				path: '/user/john-doe'
			},
			{ 
				session_id: 'session-userslug',
				user_id: 'user-userslug'
			}
		)
		
		req.results = { posts: [], replies: [] }
		
		// Setup mock database response
		req.client.addQueryMock(
			'SELECT\n          p.create_date,',
			{ 
				rows: [
					{
						create_date: '2024-01-13T12:00:00Z',
						post_id: 'slug-post-1',
						title: 'Slug User Post',
						user_id: 'slug-user-456',
						display_name: 'John Doe',
						display_name_index: 'johndoe',
						user_slug: 'john-doe',
						profile_picture_uuid: 'john-profile',
						user_verified: true,
						slug: 'slug-user-post',
						body: 'This is from john-doe slug...',
						poll_1: null,
						poll_2: null,
						poll_3: null,
						poll_4: null,
						poll_counts: null,
						poll_counts_estimated: null,
						note: null,
						favorite_count: 7,
						reply_count: 4,
						counts_max_create_date: '2024-01-13T12:30:00Z',
						edit: false,
						image_uuids: 'john-image-1,john-image-2',
						favorited: true,
						replyed: false,
						voted: false,
						tags: 'general,personal'
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await getPagePosts(req, res)
		
		// Verify results
		assertEquals(
			'/user/john-doe',
			req.results.path,
			"Should set correct path for user slug page."
		)
		assertEquals(
			1,
			req.results.posts.length,
			"Should add posts to results."
		)
		assertEquals(
			'Slug User Post',
			req.results.posts[0].title,
			"Should include post from user slug query."
		)
		assertEquals(
			'john-doe',
			req.results.posts[0].user_slug,
			"Should include correct user slug."
		)
	},

	testWithDateFilters: async () => {
		// Setup mock request with date filters
		const req = createMockRequest(
			{ 
				path: '/posts/all',
				min_post_create_date: '2024-01-01T00:00:00Z',
				max_post_create_date: '2024-01-31T23:59:59Z'
			},
			{ 
				session_id: 'session-dates',
				user_id: 'user-dates'
			}
		)
		
		req.results = { posts: [], replies: [] }
		
		// Setup mock database response
		req.client.addQueryMock(
			'SELECT\n          p.create_date,',
			{ 
				rows: [
					{
						create_date: '2024-01-15T10:00:00Z',
						post_id: 'date-post-1',
						title: 'Date Filtered Post',
						user_id: 'date-author',
						display_name: 'Date Author',
						display_name_index: 'dateauthor',
						user_slug: 'date-author',
						profile_picture_uuid: null,
						user_verified: false,
						slug: 'date-filtered-post',
						body: 'This post is within date range...',
						poll_1: null,
						poll_2: null,
						poll_3: null,
						poll_4: null,
						poll_counts: null,
						poll_counts_estimated: null,
						note: null,
						favorite_count: 3,
						reply_count: 2,
						counts_max_create_date: '2024-01-15T10:15:00Z',
						edit: false,
						image_uuids: null,
						favorited: false,
						replyed: false,
						voted: false,
						tags: 'general'
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await getPagePosts(req, res)
		
		// Verify results
		assertEquals(
			'/posts/all',
			req.results.path,
			"Should set correct path with date filters."
		)
		assertEquals(
			1,
			req.results.posts.length,
			"Should add posts to results with date filtering."
		)
		assertEquals(
			'Date Filtered Post',
			req.results.posts[0].title,
			"Should include post within date range."
		)
	},

	testNoActionWhenMaxReplyCreateDate: async () => {
		// Setup mock request with max_reply_create_date (disables post loading)
		const req = createMockRequest(
			{ 
				path: '/posts',
				max_reply_create_date: '2024-01-15T10:00:00Z'
			},
			{ 
				session_id: 'session-maxreply',
				user_id: 'user-maxreply'
			}
		)
		
		req.results = { posts: [], replies: [] }
		
		const res = createMockResponse()
		
		// Execute the handler
		await getPagePosts(req, res)
		
		// Verify no posts query was made
		assertEquals(
			0,
			req.results.posts.length,
			"Should not load posts when max_reply_create_date is set."
		)
		assertEquals(
			undefined,
			req.results.path,
			"Should not set path when max_reply_create_date is set."
		)
	},

	testNoActionWhenWrongPath: async () => {
		// Setup mock request with wrong path
		const req = createMockRequest(
			{ 
				path: '/wrong-path'
			},
			{ 
				session_id: 'session-wrong',
				user_id: 'user-wrong'
			}
		)
		
		req.results = { posts: [], replies: [] }
		
		const res = createMockResponse()
		
		// Execute the handler
		await getPagePosts(req, res)
		
		// Verify no action taken
		assertEquals(
			0,
			req.results.posts.length,
			"Should not load posts with wrong path."
		)
		assertEquals(
			undefined,
			req.results.path,
			"Should not set path with wrong path."
		)
	},

	testNoActionWhenAlreadyEnded: async () => {
		// Setup mock request
		const req = createMockRequest(
			{ 
				path: '/posts'
			},
			{ 
				session_id: 'session-ended',
				user_id: 'user-ended'
			}
		)
		
		req.results = { posts: [], replies: [] }
		
		const res = createMockResponse()
		// Simulate response already ended
		res.writableEnded = true
		
		// Execute the handler
		await getPagePosts(req, res)
		
		// Verify no action taken
		assertEquals(
			0,
			req.results.posts.length,
			"Should not load posts when response already ended."
		)
		assertEquals(
			undefined,
			req.results.path,
			"Should not set path when response already ended."
		)
	}
}

runTests(path.basename(__filename), Object.values(tests))
