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
			{ user_id: 'user-123' }
		)
		req.results = { activities: [] }
		
		// Setup mock database response with mixed activities
		req.client.addQueryMock(
			'WITH combined',
			{ 
				rows: [
					{
						id: 'topic-1',
						type: 'topic',
						title: 'Favorite Topic',
						body: 'This is a favorite topic',
						favorited: true,
						favorite_create_date: '2024-01-15T10:00:00Z',
						user_id: 'user-456',
						display_name: 'Topic Author',
						tags: 'technology,science'
					},
					{
						id: 'comment-1',
						type: 'comment',
						body: 'This is a favorite comment',
						favorited: true,
						favorite_create_date: '2024-01-14T09:00:00Z',
						user_id: 'user-789',
						display_name: 'Comment Author',
						parent_topic_title: 'Parent Topic'
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
			'topic',
			req.results.activities[0].type,
			"First activity should be a topic."
		)
		assertEquals(
			'Favorite Topic',
			req.results.activities[0].title,
			"Should include topic title."
		)
		assertEquals(
			true,
			req.results.activities[0].favorited,
			"Activity should be marked as favorited."
		)
	},

	testGetUserComments: async () => {
		// Setup mock request for user comments path
		const req = createMockRequest(
			{ path: "/user/user-456/comments" },
			{ user_id: 'user-123' }
		)
		req.results = { activities: [] }
		
		// Setup mock database response
		req.client.addQueryMock(
			'WITH combined',
			{ 
				rows: [
					{
						id: 'comment-1',
						type: 'comment',
						body: 'User comment 1',
						create_date: '2024-01-15T10:00:00Z',
						user_id: 'user-456',
						display_name: 'The User',
						favorited: false,
						parent_topic_title: 'Discussion Topic',
						parent_topic_slug: 'discussion-topic'
					},
					{
						id: 'comment-2',
						type: 'comment',
						body: 'User comment 2',
						create_date: '2024-01-14T09:00:00Z',
						user_id: 'user-456',
						display_name: 'The User',
						favorited: true
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await getActivities(req, res)
		
		// Verify user comments were loaded
		assertEquals(
			"/user/user-456/comments",
			req.results.path,
			"Path should be set in results."
		)
		assertEquals(
			2,
			req.results.activities.length,
			"Should return user comments."
		)
		assertEquals(
			'comment',
			req.results.activities[0].type,
			"All activities should be comments."
		)
		assertEquals(
			'user-456',
			req.results.activities[0].user_id,
			"Should return comments from specified user."
		)
	},

	testGetUserCommentsBySlug: async () => {
		// Setup mock request for user comments by slug
		const req = createMockRequest(
			{ path: "/user/johndoe/comments" },
			{ user_id: 'user-123' }
		)
		req.results = { activities: [] }
		
		req.client.addQueryMock(
			'WITH combined',
			{ 
				rows: [
					{
						id: 'comment-slug-1',
						type: 'comment',
						body: 'Comment by slug user',
						user_id: 'user-slug-789',
						display_name: 'John Doe'
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		await getActivities(req, res)
		
		// Should handle slug-based user lookup
		assertEquals(
			"/user/johndoe/comments",
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
			{ path: "/topics" },
			{ user_id: 'user-123' }
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
			{ user_id: 'user-123' }
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
			{ user_id: 'user-123' }
		)
		req.results = { activities: [] }
		
		req.client.addQueryMock(
			'WITH combined',
			{ 
				rows: [
					{
						id: 'filtered-topic-1',
						type: 'topic',
						title: 'Filtered Topic',
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
			'Filtered Topic',
			req.results.activities[0].title,
			"Should return activities within date range."
		)
	},

	testActivityFields: async () => {
		// Test that all expected activity fields are present
		const req = createMockRequest(
			{ path: "/favorites" },
			{ user_id: 'user-123' }
		)
		req.results = { activities: [] }
		
		req.client.addQueryMock(
			'WITH combined',
			{ 
				rows: [
					{
						id: 'field-test-topic',
						type: 'topic',
						title: 'Field Test Topic',
						body: 'Topic body content',
						poll_1: 'Option A',
						poll_2: 'Option B',
						poll_counts: '10,5',
						slug: 'field-test-topic',
						favorite_count: 25,
						comment_count: 12,
						favorited: true,
						edit: false,
						commented: true,
						voted: false,
						image_uuids: 'uuid1,uuid2',
						user_id: 'author-123',
						display_name: 'Topic Author',
						display_name_index: 0,
						user_slug: 'topic-author',
						profile_picture_uuid: 'profile-uuid',
						user_verified: true,
						tags: 'tag1,tag2'
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		await getActivities(req, res)
		
		const activity = req.results.activities[0]
		
		// Verify key fields are present
		assertEquals('topic', activity.type, "Should have type field.")
		assertEquals('Field Test Topic', activity.title, "Should have title field.")
		assertEquals('Topic body content', activity.body, "Should have body field.")
		assertEquals('Option A', activity.poll_1, "Should have poll fields.")
		assertEquals(25, activity.favorite_count, "Should have favorite_count.")
		assertEquals(12, activity.comment_count, "Should have comment_count.")
		assertEquals(true, activity.favorited, "Should have favorited status.")
		assertEquals(false, activity.edit, "Should have edit permission.")
		assertEquals('author-123', activity.user_id, "Should have user_id.")
		assertEquals('Topic Author', activity.display_name, "Should have display_name.")
		assertEquals('tag1,tag2', activity.tags, "Should have tags.")
	},

	testEmptyResults: async () => {
		// Test when no activities are found
		const req = createMockRequest(
			{ path: "/favorites" },
			{ user_id: 'user-123' }
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

	testUserCommentsPathValidation: async () => {
		// Test various user comments path formats
		const validPaths = [
			"/user/123/comments",
			"/user/johndoe/comments",
			"/user/user-with-dashes/comments"
		]
		
		for (const testPath of validPaths) {
			const req = createMockRequest(
				{ path: testPath },
				{ user_id: 'user-123' }
			)
			req.results = { activities: [] }
			
			req.client.clearQueryMocks()
			req.client.addQueryMock(
				'WITH combined',
				{ rows: [{ id: 'test-comment', type: 'comment', body: 'Test' }] }
			)
			
			const res = createMockResponse()
			
			await getActivities(req, res)
			
			assertEquals(
				testPath,
				req.results.path,
				`Should handle valid user comments path: ${testPath}.`
			)
		}
	},

	testInvalidUserCommentsPath: async () => {
		// Test invalid user path formats
		const invalidPaths = [
			"/user/123/topics", // not comments
			"/user/123", // missing comments
			"/users/123/comments" // wrong prefix
		]
		
		for (const testPath of invalidPaths) {
			const req = createMockRequest(
				{ path: testPath },
				{ user_id: 'user-123' }
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
			{ path: "/user//comments" },
			{ user_id: 'user-123' }
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
			"/user//comments",
			req.results.path,
			"Current implementation handles empty user in path."
		)
	}
}

runTests(path.basename(__filename), Object.values(tests))