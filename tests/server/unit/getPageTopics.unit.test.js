const path = require("path")
const {
	createMockRequest,
	createMockResponse,
	assertEquals,
	runTests
} = require("../shared/serverTestSetup.js")

// Import the handler we're testing
const getPageTopics = require("../../../server/session/getPageTopics.js")

const tests = {
	testSuccessfulTopicsPageLoad: async () => {
		// Setup mock request for /topics page
		const req = createMockRequest(
			{ 
				path: '/topics'
			},
			{ 
				session_id: 'session-123',
				user_id: 'user-456',
				subscribed_to_users: 3
			}
		)
		
		// Initialize results object (normally done by server)
		req.results = { topics: [], comments: [] }
		
		// Setup mock database response
		req.client.addQueryMock(
			'SELECT\n          t.create_date,',
			{ 
				rows: [
					{
						create_date: '2024-01-15T10:30:00Z',
						topic_id: 'topic-1',
						title: 'First Topic',
						user_id: 'author-1',
						display_name: 'John Doe',
						display_name_index: 'johndoe',
						user_slug: 'john-doe',
						profile_picture_uuid: 'profile-uuid-1',
						user_verified: true,
						slug: 'first-topic',
						body: 'This is the first topic content...',
						poll_1: null,
						poll_2: null,
						poll_3: null,
						poll_4: null,
						poll_counts: null,
						poll_counts_estimated: null,
						note: null,
						favorite_count: 5,
						comment_count: 3,
						counts_max_create_date: '2024-01-15T11:00:00Z',
						edit: false,
						image_uuids: 'image-uuid-1,image-uuid-2',
						favorited: true,
						commented: false,
						voted: false,
						tags: 'general,technology'
					},
					{
						create_date: '2024-01-14T15:20:00Z',
						topic_id: 'topic-2',
						title: 'Poll Topic',
						user_id: 'user-456',
						display_name: 'Test User',
						display_name_index: 'testuser',
						user_slug: 'test-user',
						profile_picture_uuid: null,
						user_verified: false,
						slug: 'poll-topic',
						body: 'What do you think about this?',
						poll_1: 'Option A',
						poll_2: 'Option B',
						poll_3: 'Option C',
						poll_4: null,
						poll_counts: '10,5,3,0',
						poll_counts_estimated: '100,50,30,0',
						note: null,
						favorite_count: 2,
						comment_count: 8,
						counts_max_create_date: '2024-01-14T16:00:00Z',
						edit: true,
						image_uuids: null,
						favorited: false,
						commented: true,
						voted: true,
						tags: 'polls,asks'
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await getPageTopics(req, res)
		
		// Verify results are populated
		assertEquals(
			'/topics',
			req.results.path,
			"Should set results path."
		)
		assertEquals(
			2,
			req.results.topics.length,
			"Should add topics to results."
		)
		
		// Verify first topic data
		const firstTopic = req.results.topics[0]
		assertEquals(
			'topic-1',
			firstTopic.topic_id,
			"Should include topic ID."
		)
		assertEquals(
			'First Topic',
			firstTopic.title,
			"Should include topic title."
		)
		assertEquals(
			'author-1',
			firstTopic.user_id,
			"Should include author user ID."
		)
		assertEquals(
			'John Doe',
			firstTopic.display_name,
			"Should include author display name."
		)
		assertEquals(
			'first-topic',
			firstTopic.slug,
			"Should include topic slug."
		)
		assertEquals(
			5,
			firstTopic.favorite_count,
			"Should include favorite count."
		)
		assertEquals(
			3,
			firstTopic.comment_count,
			"Should include comment count."
		)
		assertEquals(
			true,
			firstTopic.favorited,
			"Should include favorited status."
		)
		assertEquals(
			false,
			firstTopic.commented,
			"Should include commented status."
		)
		assertEquals(
			false,
			firstTopic.edit,
			"Should include edit permission (false for other users)."
		)
		assertEquals(
			'general,technology',
			firstTopic.tags,
			"Should include topic tags."
		)
		
		// Verify second topic (poll) data
		const secondTopic = req.results.topics[1]
		assertEquals(
			'Poll Topic',
			secondTopic.title,
			"Should include poll topic title."
		)
		assertEquals(
			'Option A',
			secondTopic.poll_1,
			"Should include poll option A."
		)
		assertEquals(
			'Option B',
			secondTopic.poll_2,
			"Should include poll option B."
		)
		assertEquals(
			'Option C',
			secondTopic.poll_3,
			"Should include poll option C."
		)
		assertEquals(
			'10,5,3,0',
			secondTopic.poll_counts,
			"Should include poll vote counts."
		)
		assertEquals(
			true,
			secondTopic.edit,
			"Should include edit permission (true for own topics)."
		)
		assertEquals(
			true,
			secondTopic.voted,
			"Should include voted status."
		)
		
		// Verify response is not ended (handler doesn't end response)
		assertEquals(
			false,
			res.isEnded(),
			"Handler should not end response."
		)
	},

	testTopicsAllPageLoad: async () => {
		// Setup mock request for /topics/all page
		const req = createMockRequest(
			{ 
				path: '/topics/all'
			},
			{ 
				session_id: 'session-all',
				user_id: 'user-all'
			}
		)
		
		req.results = { topics: [], comments: [] }
		
		// Setup mock database response
		req.client.addQueryMock(
			'SELECT\n          t.create_date,',
			{ 
				rows: [
					{
						create_date: '2024-01-15T10:30:00Z',
						topic_id: 'topic-all-1',
						title: 'All Topics Test',
						user_id: 'author-all',
						display_name: 'All Author',
						display_name_index: 'allauthor',
						user_slug: 'all-author',
						profile_picture_uuid: null,
						user_verified: false,
						slug: 'all-topics-test',
						body: 'This is in all topics...',
						poll_1: null,
						poll_2: null,
						poll_3: null,
						poll_4: null,
						poll_counts: null,
						poll_counts_estimated: null,
						note: null,
						favorite_count: 1,
						comment_count: 0,
						counts_max_create_date: '2024-01-15T10:35:00Z',
						edit: false,
						image_uuids: null,
						favorited: false,
						commented: false,
						voted: false,
						tags: 'general'
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await getPageTopics(req, res)
		
		// Verify results
		assertEquals(
			'/topics/all',
			req.results.path,
			"Should set correct path for all topics."
		)
		assertEquals(
			1,
			req.results.topics.length,
			"Should add topics to results."
		)
		assertEquals(
			'All Topics Test',
			req.results.topics[0].title,
			"Should include topic from all topics query."
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
		
		req.results = { topics: [], comments: [] }
		
		// Setup mock database response
		req.client.addQueryMock(
			'SELECT\n          t.create_date,',
			{ 
				rows: [
					{
						create_date: '2024-01-15T09:00:00Z',
						topic_id: 'topic-tech-1',
						title: 'Technology Topic',
						user_id: 'tech-author',
						display_name: 'Tech Expert',
						display_name_index: 'techexpert',
						user_slug: 'tech-expert',
						profile_picture_uuid: 'tech-profile',
						user_verified: true,
						slug: 'technology-topic',
						body: 'This is about technology...',
						poll_1: null,
						poll_2: null,
						poll_3: null,
						poll_4: null,
						poll_counts: null,
						poll_counts_estimated: null,
						note: null,
						favorite_count: 10,
						comment_count: 5,
						counts_max_create_date: '2024-01-15T09:30:00Z',
						edit: false,
						image_uuids: 'tech-image-1',
						favorited: false,
						commented: false,
						voted: false,
						tags: 'technology,science'
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await getPageTopics(req, res)
		
		// Verify results
		assertEquals(
			'/tag/technology',
			req.results.path,
			"Should set correct path for tag page."
		)
		assertEquals(
			1,
			req.results.topics.length,
			"Should add topics to results."
		)
		assertEquals(
			'Technology Topic',
			req.results.topics[0].title,
			"Should include topic from tag query."
		)
		assertEquals(
			'technology,science',
			req.results.topics[0].tags,
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
		
		req.results = { topics: [], comments: [] }
		
		// Setup mock database response
		req.client.addQueryMock(
			'SELECT\n          t.create_date,',
			{ 
				rows: [
					{
						create_date: '2024-01-14T14:00:00Z',
						topic_id: 'user-topic-1',
						title: 'User Topic',
						user_id: '123',
						display_name: 'User 123',
						display_name_index: 'user123',
						user_slug: 'user-123',
						profile_picture_uuid: null,
						user_verified: false,
						slug: 'user-topic',
						body: 'This is from user 123...',
						poll_1: null,
						poll_2: null,
						poll_3: null,
						poll_4: null,
						poll_counts: null,
						poll_counts_estimated: null,
						note: null,
						favorite_count: 2,
						comment_count: 1,
						counts_max_create_date: '2024-01-14T14:15:00Z',
						edit: false,
						image_uuids: null,
						favorited: false,
						commented: false,
						voted: false,
						tags: 'general'
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await getPageTopics(req, res)
		
		// Verify results
		assertEquals(
			'/user/123',
			req.results.path,
			"Should set correct path for user page."
		)
		assertEquals(
			1,
			req.results.topics.length,
			"Should add topics to results."
		)
		assertEquals(
			'User Topic',
			req.results.topics[0].title,
			"Should include topic from user query."
		)
		assertEquals(
			'123',
			req.results.topics[0].user_id,
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
		
		req.results = { topics: [], comments: [] }
		
		// Setup mock database response
		req.client.addQueryMock(
			'SELECT\n          t.create_date,',
			{ 
				rows: [
					{
						create_date: '2024-01-13T12:00:00Z',
						topic_id: 'slug-topic-1',
						title: 'Slug User Topic',
						user_id: 'slug-user-456',
						display_name: 'John Doe',
						display_name_index: 'johndoe',
						user_slug: 'john-doe',
						profile_picture_uuid: 'john-profile',
						user_verified: true,
						slug: 'slug-user-topic',
						body: 'This is from john-doe slug...',
						poll_1: null,
						poll_2: null,
						poll_3: null,
						poll_4: null,
						poll_counts: null,
						poll_counts_estimated: null,
						note: null,
						favorite_count: 7,
						comment_count: 4,
						counts_max_create_date: '2024-01-13T12:30:00Z',
						edit: false,
						image_uuids: 'john-image-1,john-image-2',
						favorited: true,
						commented: false,
						voted: false,
						tags: 'general,personal'
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await getPageTopics(req, res)
		
		// Verify results
		assertEquals(
			'/user/john-doe',
			req.results.path,
			"Should set correct path for user slug page."
		)
		assertEquals(
			1,
			req.results.topics.length,
			"Should add topics to results."
		)
		assertEquals(
			'Slug User Topic',
			req.results.topics[0].title,
			"Should include topic from user slug query."
		)
		assertEquals(
			'john-doe',
			req.results.topics[0].user_slug,
			"Should include correct user slug."
		)
	},

	testWithDateFilters: async () => {
		// Setup mock request with date filters
		const req = createMockRequest(
			{ 
				path: '/topics/all',
				min_topic_create_date: '2024-01-01T00:00:00Z',
				max_topic_create_date: '2024-01-31T23:59:59Z'
			},
			{ 
				session_id: 'session-dates',
				user_id: 'user-dates'
			}
		)
		
		req.results = { topics: [], comments: [] }
		
		// Setup mock database response
		req.client.addQueryMock(
			'SELECT\n          t.create_date,',
			{ 
				rows: [
					{
						create_date: '2024-01-15T10:00:00Z',
						topic_id: 'date-topic-1',
						title: 'Date Filtered Topic',
						user_id: 'date-author',
						display_name: 'Date Author',
						display_name_index: 'dateauthor',
						user_slug: 'date-author',
						profile_picture_uuid: null,
						user_verified: false,
						slug: 'date-filtered-topic',
						body: 'This topic is within date range...',
						poll_1: null,
						poll_2: null,
						poll_3: null,
						poll_4: null,
						poll_counts: null,
						poll_counts_estimated: null,
						note: null,
						favorite_count: 3,
						comment_count: 2,
						counts_max_create_date: '2024-01-15T10:15:00Z',
						edit: false,
						image_uuids: null,
						favorited: false,
						commented: false,
						voted: false,
						tags: 'general'
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await getPageTopics(req, res)
		
		// Verify results
		assertEquals(
			'/topics/all',
			req.results.path,
			"Should set correct path with date filters."
		)
		assertEquals(
			1,
			req.results.topics.length,
			"Should add topics to results with date filtering."
		)
		assertEquals(
			'Date Filtered Topic',
			req.results.topics[0].title,
			"Should include topic within date range."
		)
	},

	testNoActionWhenMaxCommentCreateDate: async () => {
		// Setup mock request with max_comment_create_date (disables topic loading)
		const req = createMockRequest(
			{ 
				path: '/topics',
				max_comment_create_date: '2024-01-15T10:00:00Z'
			},
			{ 
				session_id: 'session-maxcomment',
				user_id: 'user-maxcomment'
			}
		)
		
		req.results = { topics: [], comments: [] }
		
		const res = createMockResponse()
		
		// Execute the handler
		await getPageTopics(req, res)
		
		// Verify no topics query was made
		assertEquals(
			0,
			req.results.topics.length,
			"Should not load topics when max_comment_create_date is set."
		)
		assertEquals(
			undefined,
			req.results.path,
			"Should not set path when max_comment_create_date is set."
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
		
		req.results = { topics: [], comments: [] }
		
		const res = createMockResponse()
		
		// Execute the handler
		await getPageTopics(req, res)
		
		// Verify no action taken
		assertEquals(
			0,
			req.results.topics.length,
			"Should not load topics with wrong path."
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
				path: '/topics'
			},
			{ 
				session_id: 'session-ended',
				user_id: 'user-ended'
			}
		)
		
		req.results = { topics: [], comments: [] }
		
		const res = createMockResponse()
		// Simulate response already ended
		res.writableEnded = true
		
		// Execute the handler
		await getPageTopics(req, res)
		
		// Verify no action taken
		assertEquals(
			0,
			req.results.topics.length,
			"Should not load topics when response already ended."
		)
		assertEquals(
			undefined,
			req.results.path,
			"Should not set path when response already ended."
		)
	}
}

runTests(path.basename(__filename), Object.values(tests))
