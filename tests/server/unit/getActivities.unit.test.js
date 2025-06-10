const path = require("path")
const {
	createMockRequest,
	createMockResponse,
	assertEquals,
	runTests
} = require("../shared/serverTestSetup.js")

// Import the handler we're testing
const getActivities = require("../../../server/session/getActivities.js")

const tests = {
	testGetFavoritesActivities: async () => {
		// Setup mock request for favorites path
		const req = createMockRequest(
			{ path: "/favorites" },
			{ user_id: '123' }
		)
		req.results = { activities: [] }
		
		// Setup mock database response with mixed activities
		req.client.addQueryMock(
			'WITH combined',
			{ 
				rows: [
					{
						id: 1,
						type: 'post',
						title: 'Favorite Post',
						body: 'This is a favorite post',
						favorited: true,
						favorite_create_date: '2024-01-15T10:00:00Z',
						user_id: '456',
						display_name: 'Post Author',
						topics: 'technology,science'
					},
					{
						id: 'reply-1',
						type: 'reply',
						body: 'This is a favorite reply',
						favorited: true,
						favorite_create_date: '2024-01-14T09:00:00Z',
						user_id: '789',
						display_name: 'Reply Author',
						parent_post_title: 'Parent Post'
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await getActivities(req, res)
		
		// Verify favorites were loaded
		assertEquals(
			"/favorites",
			req.results.path,
			"Path should be set in results."
		)
		assertEquals(
			2,
			req.results.activities.length,
			"Should return array of favorite activities."
		)
		assertEquals(
			'post',
			req.results.activities[0].type,
			"First activity should be a post."
		)
		assertEquals(
			'Favorite Post',
			req.results.activities[0].title,
			"Should include post title."
		)
		assertEquals(
			true,
			req.results.activities[0].favorited,
			"Activity should be marked as favorited."
		)
	},

	testGetUserReplies: async () => {
		// Setup mock request for user replies path
		const req = createMockRequest(
			{ path: "/user/user-456/replies" },
			{ user_id: '123' }
		)
		req.results = { activities: [] }
		
		// Setup mock database response
		req.client.addQueryMock(
			'WITH combined',
			{ 
				rows: [
					{
						id: 'reply-1',
						type: 'reply',
						body: 'User reply 1',
						create_date: '2024-01-15T10:00:00Z',
						user_id: '456',
						display_name: 'The User',
						favorited: false,
						parent_post_title: 'Discussion Post',
						parent_post_slug: 'discussion-post'
					},
					{
						id: 'reply-2',
						type: 'reply',
						body: 'User reply 2',
						create_date: '2024-01-14T09:00:00Z',
						user_id: '456',
						display_name: 'The User',
						favorited: true
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await getActivities(req, res)
		
		// Verify user replies were loaded
		assertEquals(
			"/user/user-456/replies",
			req.results.path,
			"Path should be set in results."
		)
		assertEquals(
			2,
			req.results.activities.length,
			"Should return user replies."
		)
		assertEquals(
			'reply',
			req.results.activities[0].type,
			"All activities should be replies."
		)
		assertEquals(
			'456',
			req.results.activities[0].user_id,
			"Should return replies from specified user."
		)
	},

	testGetUserRepliesBySlug: async () => {
		// Setup mock request for user replies by slug
		const req = createMockRequest(
			{ path: "/user/johndoe/replies" },
			{ user_id: '123' }
		)
		req.results = { activities: [] }
		
		req.client.addQueryMock(
			'WITH combined',
			{ 
				rows: [
					{
						id: 'reply-slug-1',
						type: 'reply',
						body: 'Reply by slug user',
						user_id: '789',
						display_name: 'John Doe'
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		await getActivities(req, res)
		
		// Should handle slug-based user lookup
		assertEquals(
			"/user/johndoe/replies",
			req.results.path,
			"Should handle slug-based user paths."
		)
		assertEquals(
			1,
			req.results.activities.length,
			"Should return activities for slug-based user."
		)
	},

	testNoActionWhenNoUserForFavorites: async () => {
		// Setup mock request for favorites without user_id
		const req = createMockRequest(
			{ path: "/favorites" },
			{ user_id: undefined }
		)
		req.results = { activities: [] }
		
		const res = createMockResponse()
		
		// Execute the handler
		await getActivities(req, res)
		
		// Verify no action taken
		assertEquals(
			undefined,
			req.results.path,
			"Should not set results when no user for favorites."
		)
		assertEquals(
			0,
			req.results.activities.length,
			"Should not load activities without user."
		)
	},

	testNoActionWhenWrongPath: async () => {
		// Setup mock request with wrong path
		const req = createMockRequest(
			{ path: "/posts" },
			{ user_id: '123' }
		)
		req.results = { activities: [] }
		
		const res = createMockResponse()
		
		// Execute the handler
		await getActivities(req, res)
		
		// Verify no action taken
		assertEquals(
			undefined,
			req.results.path,
			"Should not set results for wrong path."
		)
		assertEquals(
			0,
			req.results.activities.length,
			"Should not load activities for wrong path."
		)
	},

	testNoActionWhenAlreadyEnded: async () => {
		// Setup mock request
		const req = createMockRequest(
			{ path: "/favorites" },
			{ user_id: '123' }
		)
		req.results = { activities: [] }
		
		const res = createMockResponse()
		// Simulate response already ended
		res.writableEnded = true
		
		// Execute the handler
		await getActivities(req, res)
		
		// Verify no action taken
		assertEquals(
			undefined,
			req.results.path,
			"Should not set results when response already ended."
		)
	},

	testWithDateFilters: async () => {
		// Test favorites with date filtering
		const req = createMockRequest(
			{ 
				path: "/favorites",
				max_create_date: '2024-01-15T12:00:00Z',
				min_create_date: '2024-01-10T00:00:00Z'
			},
			{ user_id: '123' }
		)
		req.results = { activities: [] }
		
		req.client.addQueryMock(
			'WITH combined',
			{ 
				rows: [
					{
						id: 2,
						type: 'post',
						title: 'Filtered Post',
						favorited: true,
						favorite_create_date: '2024-01-12T10:00:00Z'
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		await getActivities(req, res)
		
		// Should handle date filtering
		assertEquals(
			1,
			req.results.activities.length,
			"Should return filtered activities."
		)
		assertEquals(
			'Filtered Post',
			req.results.activities[0].title,
			"Should return activities within date range."
		)
	},

	testActivityFields: async () => {
		// Test that all expected activity fields are present
		const req = createMockRequest(
			{ path: "/favorites" },
			{ user_id: '123' }
		)
		req.results = { activities: [] }
		
		req.client.addQueryMock(
			'WITH combined',
			{ 
				rows: [
					{
						id: 'field-test-post',
						type: 'post',
						title: 'Field Test Post',
						body: 'Post body content',
						poll_1: 'Option A',
						poll_2: 'Option B',
						poll_counts: '10,5',
						slug: 'field-test-post',
						favorite_count: 25,
						reply_count: 12,
						favorited: true,
						edit: false,
						replyed: true,
						voted: false,
						image_uuids: 'uuid1,uuid2',
						user_id: '123',
						display_name: 'Post Author',
						display_name_index: 0,
						user_slug: 'post-author',
						profile_picture_uuid: 'profile-uuid',
						user_verified: true,
						topics: 'topic1,topic2'
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		await getActivities(req, res)
		
		const activity = req.results.activities[0]
		
		// Verify key fields are present
		assertEquals('post', activity.type, "Should have type field.")
		assertEquals('Field Test Post', activity.title, "Should have title field.")
		assertEquals('Post body content', activity.body, "Should have body field.")
		assertEquals('Option A', activity.poll_1, "Should have poll fields.")
		assertEquals(25, activity.favorite_count, "Should have favorite_count.")
		assertEquals(12, activity.reply_count, "Should have reply_count.")
		assertEquals(true, activity.favorited, "Should have favorited status.")
		assertEquals(false, activity.edit, "Should have edit permission.")
		assertEquals('123', activity.user_id, "Should have user_id.")
		assertEquals('Post Author', activity.display_name, "Should have display_name.")
		assertEquals('topic1,topic2', activity.topics, "Should have topics.")
	},

	testEmptyResults: async () => {
		// Test when no activities are found
		const req = createMockRequest(
			{ path: "/favorites" },
			{ user_id: '123' }
		)
		req.results = { activities: [] }
		
		req.client.addQueryMock(
			'WITH combined',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		await getActivities(req, res)
		
		// Should handle empty results gracefully
		assertEquals(
			"/favorites",
			req.results.path,
			"Path should still be set."
		)
		assertEquals(
			0,
			req.results.activities.length,
			"Should handle empty results gracefully."
		)
	},

	testUserRepliesPathValidation: async () => {
		// Test various user replies path formats
		const validPaths = [
			"/user/123/replies",
			"/user/johndoe/replies",
			"/user/user-with-dashes/replies"
		]
		
		for (const testPath of validPaths) {
			const req = createMockRequest(
				{ path: testPath },
				{ user_id: '123' }
			)
			req.results = { activities: [] }
			
			req.client.clearQueryMocks()
			req.client.addQueryMock(
				'WITH combined',
				{ rows: [{ id: 'test-reply', type: 'reply', body: 'Test' }] }
			)
			
			const res = createMockResponse()
			
			await getActivities(req, res)
			
			assertEquals(
				testPath,
				req.results.path,
				`Should handle valid user replies path: ${testPath}.`
			)
		}
	},

	testInvalidUserRepliesPath: async () => {
		// Test invalid user path formats
		const invalidPaths = [
			"/user/123/posts", // not replies
			"/user/123", // missing replies
			"/users/123/replies" // wrong prefix
		]
		
		for (const testPath of invalidPaths) {
			const req = createMockRequest(
				{ path: testPath },
				{ user_id: '123' }
			)
			req.results = { activities: [] }
			
			const res = createMockResponse()
			
			await getActivities(req, res)
			
			assertEquals(
				undefined,
				req.results.path,
				`Should not handle invalid path: ${testPath}.`
			)
		}
	},

	testEmptyUserInPath: async () => {
		// Test that empty user in path is handled (current implementation allows it)
		const req = createMockRequest(
			{ path: "/user//replies" },
			{ user_id: '123' }
		)
		req.results = { activities: [] }
		
		req.client.addQueryMock(
			'SELECT',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		await getActivities(req, res)
		
		// Current implementation allows empty user path
		assertEquals(
			"/user//replies",
			req.results.path,
			"Current implementation handles empty user in path."
		)
	}
}

runTests(path.basename(__filename), Object.values(tests))