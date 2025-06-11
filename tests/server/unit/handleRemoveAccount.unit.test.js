// Mock S3 client (external dependency)
let s3_send_calls = []
const mockS3Client = {
	send: async (command) => {
		s3_send_calls.push(command)
		// Simulate successful S3 operations
		return { $metadata: { httpStatusCode: 200 } }
	}
}

// Replace AWS S3 client in require cache
const awsS3Path = require.resolve("@aws-sdk/client-s3")
delete require.cache[awsS3Path]
require.cache[awsS3Path] = {
	exports: {
		S3Client: function() { return mockS3Client },
		DeleteObjectCommand: function(params) {
			this.input = params
			this.commandType = "Delete"
		}
	},
	loaded: true,
	id: awsS3Path
}

// Mock crypto.randomUUID by replacing the node:crypto module
let mock_uuid_result = "test-session-uuid-123"
const mockCrypto = {
	randomUUID: () => mock_uuid_result
}

// Clear and replace node:crypto in require cache
const nodeCryptoPath = "node:crypto"
const cryptoPath = require.resolve("crypto")
delete require.cache[nodeCryptoPath]
delete require.cache[cryptoPath]
require.cache[nodeCryptoPath] = {
	exports: mockCrypto,
	loaded: true,
	id: nodeCryptoPath
}
require.cache[cryptoPath] = {
	exports: mockCrypto,
	loaded: true,
	id: cryptoPath
}

const path = require("path")
const {
	createMockRequest,
	createMockResponse,
	assertEquals,
	runTests
} = require("../shared/serverTestSetup.js")

// Clear the handler cache and import it after setting up mocks
const handleRemoveAccountPath = require.resolve("../../../server/session/handleRemoveAccount.js")
delete require.cache[handleRemoveAccountPath]

// Import the handler we're testing (after mocking everything)
const handleRemoveAccount = require("../../../server/session/handleRemoveAccount.js")

const tests = {
	testSuccessfulAccountRemoval: async () => {
		// Reset all calls
		s3_send_calls = []
		
		// Setup mock request
		const req = createMockRequest(
			{ 
				remove_account: true
			},
			{ 
				session_id: "session-123",
				user_id: "user-456"
			}
		)
		
		// Setup mock database responses for images deletion
		req.client.addQueryMock(
			"SELECT image_uuids",
			{ 
				rows: [
					{
						image_uuids: "image1-uuid,image2-uuid,image3-uuid"
					},
					{
						image_uuids: "image4-uuid"
					}
				]
			}
		)
		req.client.addQueryMock(
			"SELECT profile_picture_uuid",
			{ 
				rows: [
					{
						profile_picture_uuid: "profile-uuid-789"
					}
				]
			}
		)
		
		// Setup mocks for all deletion operations
		req.client.addQueryMock("DELETE FROM reply_ancestors", { rows: [] })
		req.client.addQueryMock("DELETE FROM favorite_posts", { rows: [] })
		req.client.addQueryMock("DELETE FROM favorite_replies", { rows: [] })
		req.client.addQueryMock("DELETE FROM blocked_users", { rows: [] })
		req.client.addQueryMock("DELETE FROM post_poll_votes", { rows: [] })
		req.client.addQueryMock("DELETE FROM subscribers", { rows: [] })
		req.client.addQueryMock("DELETE FROM sessions", { rows: [] })
		req.client.addQueryMock("DELETE FROM user_sessions", { rows: [] })
		req.client.addQueryMock("DELETE FROM replies", { rows: [] })
		req.client.addQueryMock("DELETE FROM posts", { rows: [] })
		req.client.addQueryMock("DELETE FROM users", { rows: [] })
		
		// Setup mocks for count updates
		req.client.addQueryMock("UPDATE replies", { rows: [] })
		req.client.addQueryMock("UPDATE posts", { rows: [] })
		
		// Setup mock for new session creation
		req.client.addQueryMock(
			"INSERT INTO sessions",
			{ 
				rows: [
					{
						session_id: "new-session-999"
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await handleRemoveAccount(req, res)
		
		// Verify S3 image deletions
		assertEquals(
			5,
			s3_send_calls.length,
			"Should delete 5 images (4 from content + 1 profile picture)."
		)
		
		// Verify all S3 commands are delete operations
		s3_send_calls.forEach((command, index) => {
			assertEquals(
				"Delete",
				command.commandType,
				`S3 command ${index} should be delete operation.`
			)
			assertEquals(
				"truce.net",
				command.input.Bucket,
				`S3 command ${index} should target correct bucket.`
			)
		})
		
		// Verify specific image deletions
		const expectedImages = [
			"image1-uuid.png",
			"image2-uuid.png", 
			"image3-uuid.png",
			"image4-uuid.png",
			"profile-uuid-789.png"
		]
		expectedImages.forEach((expectedImage, index) => {
			assertEquals(
				expectedImage,
				s3_send_calls[index].input.Key,
				`Should delete image ${expectedImage}.`
			)
		})
		
		// Verify session was updated
		assertEquals(
			true,
			req.session.session_uuid.length === 36,
			"Should update session UUID to proper format."
		)
		assertEquals(
			"new-session-999",
			req.session.session_id,
			"Should update session ID."
		)
		
		// Verify successful response
		assertEquals(
			true,
			res.isEnded(),
			"Response should be ended."
		)
		
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			responseData.success,
			"Should return success."
		)
		assertEquals(
			true,
			responseData.session_uuid.length === 36,
			"Should return new session UUID in proper format."
		)
		
		// Verify Set-Cookie header
		const headers = res.getHeaders()
		assertEquals(
			true,
			headers["Set-Cookie"].includes(`session_uuid=${req.session.session_uuid}`),
			"Should set session cookie."
		)
		assertEquals(
			true,
			headers["Set-Cookie"].includes("HttpOnly"),
			"Cookie should be HttpOnly."
		)
		assertEquals(
			true,
			headers["Set-Cookie"].includes("Secure"),
			"Cookie should be Secure."
		)
	},

	testAccountRemovalWithNoImages: async () => {
		// Reset all calls
		s3_send_calls = []
		
		// Setup mock request
		const req = createMockRequest(
			{ 
				remove_account: true
			},
			{ 
				session_id: "session-no-images",
				user_id: "user-no-images"
			}
		)
		
		// Setup mock database responses with no images
		req.client.addQueryMock(
			"SELECT image_uuids",
			{ rows: [] } // No content images
		)
		req.client.addQueryMock(
			"SELECT profile_picture_uuid",
			{ 
				rows: [
					{
						profile_picture_uuid: null // No profile picture
					}
				]
			}
		)
		
		// Setup mocks for all deletion operations
		req.client.addQueryMock("DELETE FROM reply_ancestors", { rows: [] })
		req.client.addQueryMock("DELETE FROM favorite_posts", { rows: [] })
		req.client.addQueryMock("DELETE FROM favorite_replies", { rows: [] })
		req.client.addQueryMock("DELETE FROM blocked_users", { rows: [] })
		req.client.addQueryMock("DELETE FROM post_poll_votes", { rows: [] })
		req.client.addQueryMock("DELETE FROM subscribers", { rows: [] })
		req.client.addQueryMock("DELETE FROM sessions", { rows: [] })
		req.client.addQueryMock("DELETE FROM user_sessions", { rows: [] })
		req.client.addQueryMock("DELETE FROM replies", { rows: [] })
		req.client.addQueryMock("DELETE FROM posts", { rows: [] })
		req.client.addQueryMock("DELETE FROM users", { rows: [] })
		req.client.addQueryMock("UPDATE replies", { rows: [] })
		req.client.addQueryMock("UPDATE posts", { rows: [] })
		
		req.client.addQueryMock(
			"INSERT INTO sessions",
			{ 
				rows: [
					{
						session_id: "new-session-no-images"
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await handleRemoveAccount(req, res)
		
		// Verify no S3 operations when no images
		assertEquals(
			0,
			s3_send_calls.length,
			"Should not perform S3 operations when no images."
		)
		
		// Verify successful response
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			responseData.success,
			"Should succeed even with no images."
		)
	},

	testAccountRemovalWithProfilePictureOnly: async () => {
		// Reset all calls
		s3_send_calls = []
		
		// Setup mock request
		const req = createMockRequest(
			{ 
				remove_account: true
			},
			{ 
				session_id: "session-profile-only",
				user_id: "user-profile-only"
			}
		)
		
		// Setup mock database responses
		req.client.addQueryMock(
			"SELECT image_uuids",
			{ rows: [] } // No content images
		)
		req.client.addQueryMock(
			"SELECT profile_picture_uuid",
			{ 
				rows: [
					{
						profile_picture_uuid: "only-profile-uuid"
					}
				]
			}
		)
		
		// Setup mocks for deletion operations
		req.client.addQueryMock("DELETE FROM reply_ancestors", { rows: [] })
		req.client.addQueryMock("DELETE FROM favorite_posts", { rows: [] })
		req.client.addQueryMock("DELETE FROM favorite_replies", { rows: [] })
		req.client.addQueryMock("DELETE FROM blocked_users", { rows: [] })
		req.client.addQueryMock("DELETE FROM post_poll_votes", { rows: [] })
		req.client.addQueryMock("DELETE FROM subscribers", { rows: [] })
		req.client.addQueryMock("DELETE FROM sessions", { rows: [] })
		req.client.addQueryMock("DELETE FROM user_sessions", { rows: [] })
		req.client.addQueryMock("DELETE FROM replies", { rows: [] })
		req.client.addQueryMock("DELETE FROM posts", { rows: [] })
		req.client.addQueryMock("DELETE FROM users", { rows: [] })
		req.client.addQueryMock("UPDATE replies", { rows: [] })
		req.client.addQueryMock("UPDATE posts", { rows: [] })
		
		req.client.addQueryMock(
			"INSERT INTO sessions",
			{ 
				rows: [
					{
						session_id: "new-session-profile-only"
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await handleRemoveAccount(req, res)
		
		// Verify only profile picture deletion
		assertEquals(
			1,
			s3_send_calls.length,
			"Should delete only profile picture."
		)
		assertEquals(
			"only-profile-uuid.png",
			s3_send_calls[0].input.Key,
			"Should delete profile picture."
		)
		
		// Verify successful response
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			responseData.success,
			"Should succeed with profile picture only."
		)
	},

	testImageProcessingWithEmptyUuids: async () => {
		// Reset all calls
		s3_send_calls = []
		
		// Setup mock request
		const req = createMockRequest(
			{ 
				remove_account: true
			},
			{ 
				session_id: "session-empty-uuids",
				user_id: "user-empty-uuids"
			}
		)
		
		// Setup mock database responses with empty image_uuids strings
		req.client.addQueryMock(
			"SELECT image_uuids",
			{ 
				rows: [
					{
						image_uuids: "" // Empty string
					},
					{
						image_uuids: "valid-uuid"
					}
				]
			}
		)
		req.client.addQueryMock(
			"SELECT profile_picture_uuid",
			{ 
				rows: [
					{
						profile_picture_uuid: null
					}
				]
			}
		)
		
		// Setup mocks for deletion operations
		req.client.addQueryMock("DELETE FROM reply_ancestors", { rows: [] })
		req.client.addQueryMock("DELETE FROM favorite_posts", { rows: [] })
		req.client.addQueryMock("DELETE FROM favorite_replies", { rows: [] })
		req.client.addQueryMock("DELETE FROM blocked_users", { rows: [] })
		req.client.addQueryMock("DELETE FROM post_poll_votes", { rows: [] })
		req.client.addQueryMock("DELETE FROM subscribers", { rows: [] })
		req.client.addQueryMock("DELETE FROM sessions", { rows: [] })
		req.client.addQueryMock("DELETE FROM user_sessions", { rows: [] })
		req.client.addQueryMock("DELETE FROM replies", { rows: [] })
		req.client.addQueryMock("DELETE FROM posts", { rows: [] })
		req.client.addQueryMock("DELETE FROM users", { rows: [] })
		req.client.addQueryMock("UPDATE replies", { rows: [] })
		req.client.addQueryMock("UPDATE posts", { rows: [] })
		
		req.client.addQueryMock(
			"INSERT INTO sessions",
			{ 
				rows: [
					{
						session_id: "new-session-empty-uuids"
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await handleRemoveAccount(req, res)
		
		// Should delete both: empty string becomes ".png" and valid UUID becomes "valid-uuid.png"
		assertEquals(
			2,
			s3_send_calls.length,
			"Should attempt to delete both empty and valid UUID images."
		)
		assertEquals(
			".png",
			s3_send_calls[0].input.Key,
			"Should attempt to delete empty string as .png."
		)
		assertEquals(
			"valid-uuid.png",
			s3_send_calls[1].input.Key,
			"Should delete the valid UUID."
		)
	},

	testDatabaseDeletionSequence: async () => {
		// Reset all calls
		s3_send_calls = []
		
		// Setup mock request
		const req = createMockRequest(
			{ 
				remove_account: true
			},
			{ 
				session_id: "session-db-sequence",
				user_id: "user-db-sequence"
			}
		)
		
		// Track database operations in order by intercepting the original client
		let dbOperations = []
		const original_query = req.client.query
		req.client.query = async (sql, params) => {
			// Track the type of operation
			if (sql.includes("SELECT image_uuids")) {
				dbOperations.push("SELECT_IMAGES")
			} else if (sql.includes("SELECT profile_picture_uuid")) {
				dbOperations.push("SELECT_PROFILE")
			} else if (sql.includes("DELETE FROM reply_ancestors")) {
				dbOperations.push("DELETE_REPLY_ANCESTORS")
			} else if (sql.includes("DELETE FROM favorite_posts")) {
				dbOperations.push("DELETE_FAVORITE_POSTS")
			} else if (sql.includes("DELETE FROM favorite_replies")) {
				dbOperations.push("DELETE_FAVORITE_REPLIES")
			} else if (sql.includes("DELETE FROM blocked_users")) {
				dbOperations.push("DELETE_BLOCKED_USERS")
			} else if (sql.includes("DELETE FROM post_poll_votes") && sql.includes("post_id IN")) {
				dbOperations.push("DELETE_POLL_VOTES_BY_TOPIC")
			} else if (sql.includes("DELETE FROM post_poll_votes") && sql.includes("user_id = $1")) {
				dbOperations.push("DELETE_POLL_VOTES_BY_USER")
			} else if (sql.includes("DELETE FROM subscribers")) {
				dbOperations.push("DELETE_SUBSCRIBERS")
			} else if (sql.includes("DELETE FROM sessions")) {
				dbOperations.push("DELETE_SESSIONS")
			} else if (sql.includes("DELETE FROM user_sessions")) {
				dbOperations.push("DELETE_USER_SESSIONS")
			} else if (sql.includes("DELETE FROM replies")) {
				dbOperations.push("DELETE_REPLIES")
			} else if (sql.includes("DELETE FROM posts")) {
				dbOperations.push("DELETE_POSTS")
			} else if (sql.includes("DELETE FROM users")) {
				dbOperations.push("DELETE_USERS")
			} else if (sql.includes("UPDATE replies")) {
				dbOperations.push("UPDATE_REPLIES")
			} else if (sql.includes("UPDATE posts") && sql.includes("favorite_count")) {
				dbOperations.push("UPDATE_POSTS_FAVORITES")
			} else if (sql.includes("UPDATE posts") && sql.includes("reply_count")) {
				dbOperations.push("UPDATE_POSTS_COMMENTS")
			} else if (sql.includes("INSERT INTO sessions")) {
				dbOperations.push("INSERT_SESSION")
			}
			
			// Call the original query method
			return await original_query.call(req.client, sql, params)
		}
		
		// Setup mock database responses
		req.client.addQueryMock("SELECT image_uuids", { rows: [] })
		req.client.addQueryMock("SELECT profile_picture_uuid", { rows: [{ profile_picture_uuid: null }] })
		req.client.addQueryMock("DELETE FROM reply_ancestors", { rows: [] })
		req.client.addQueryMock("DELETE FROM favorite_posts", { rows: [] })
		req.client.addQueryMock("DELETE FROM favorite_replies", { rows: [] })
		req.client.addQueryMock("DELETE FROM blocked_users", { rows: [] })
		req.client.addQueryMock("DELETE FROM post_poll_votes", { rows: [] })
		req.client.addQueryMock("DELETE FROM subscribers", { rows: [] })
		req.client.addQueryMock("DELETE FROM sessions", { rows: [] })
		req.client.addQueryMock("DELETE FROM user_sessions", { rows: [] })
		req.client.addQueryMock("DELETE FROM replies", { rows: [] })
		req.client.addQueryMock("DELETE FROM posts", { rows: [] })
		req.client.addQueryMock("DELETE FROM users", { rows: [] })
		req.client.addQueryMock("UPDATE replies", { rows: [] })
		req.client.addQueryMock("UPDATE posts", { rows: [] })
		req.client.addQueryMock("INSERT INTO sessions", { rows: [{ session_id: "new-session" }] })
		
		const res = createMockResponse()
		
		// Execute the handler
		await handleRemoveAccount(req, res)
		
		// Verify operation sequence follows logical order
		const expectedSequence = [
			"SELECT_IMAGES",
			"SELECT_PROFILE",
			"DELETE_REPLY_ANCESTORS",
			"DELETE_FAVORITE_POSTS",
			"DELETE_FAVORITE_REPLIES",
			"DELETE_BLOCKED_USERS",
			"DELETE_POLL_VOTES_BY_TOPIC",
			"DELETE_POLL_VOTES_BY_USER",
			"DELETE_SUBSCRIBERS",
			"DELETE_SESSIONS",
			"DELETE_USER_SESSIONS",
			"DELETE_REPLIES",
			"DELETE_POSTS",
			"DELETE_USERS",
			"UPDATE_REPLIES",
			"UPDATE_POSTS_FAVORITES",
			"UPDATE_POSTS_COMMENTS",
			"INSERT_SESSION"
		]
		
		assertEquals(
			expectedSequence.length,
			dbOperations.length,
			"Should execute all expected database operations."
		)
		
		expectedSequence.forEach((expectedOp, index) => {
			assertEquals(
				expectedOp,
				dbOperations[index],
				`Database operation ${index} should be ${expectedOp}.`
			)
		})
		
		// Verify successful completion
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			responseData.success,
			"Should complete database sequence successfully."
		)
	},

	testNoActionWhenMissingRemoveAccount: async () => {
		// Reset all calls
		s3_send_calls = []
		
		// Setup mock request without remove_account flag
		const req = createMockRequest(
			{}, // No remove_account
			{ 
				session_id: "session-123",
				user_id: "user-456"
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await handleRemoveAccount(req, res)
		
		// Verify no action taken
		assertEquals(
			false,
			res.isEnded(),
			"Should not end response when remove_account missing."
		)
		assertEquals(
			0,
			s3_send_calls.length,
			"Should not perform S3 operations when remove_account missing."
		)
	},

	testNoActionWhenMissingUserId: async () => {
		// Reset all calls
		s3_send_calls = []
		
		// Setup mock request without user_id
		const req = createMockRequest(
			{ 
				remove_account: true
			},
			{ 
				session_id: "session-123",
				user_id: undefined // No user_id
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await handleRemoveAccount(req, res)
		
		// Verify no action taken
		assertEquals(
			false,
			res.isEnded(),
			"Should not end response when user_id missing."
		)
		assertEquals(
			0,
			s3_send_calls.length,
			"Should not perform S3 operations when user_id missing."
		)
	},

	testNoActionWhenAlreadyEnded: async () => {
		// Reset all calls
		s3_send_calls = []
		
		// Setup mock request
		const req = createMockRequest(
			{ 
				remove_account: true
			},
			{ 
				session_id: "session-123",
				user_id: "user-456"
			}
		)
		
		const res = createMockResponse()
		// Simulate response already ended
		res.writableEnded = true
		
		// Execute the handler
		await handleRemoveAccount(req, res)
		
		// Verify no action taken
		assertEquals(
			true,
			res.writableEnded,
			"Response should remain ended."
		)
		assertEquals(
			0,
			s3_send_calls.length,
			"Should not perform S3 operations when response already ended."
		)
	},

	testSessionCreationAndCookie: async () => {
		// Reset all calls
		s3_send_calls = []
		
		// Setup mock request
		const req = createMockRequest(
			{ 
				remove_account: true
			},
			{ 
				session_id: "old-session-123",
				user_id: "user-session-test"
			}
		)
		
		// Setup minimal mocks
		req.client.addQueryMock("SELECT image_uuids", { rows: [] })
		req.client.addQueryMock("SELECT profile_picture_uuid", { rows: [{ profile_picture_uuid: null }] })
		req.client.addQueryMock("DELETE FROM reply_ancestors", { rows: [] })
		req.client.addQueryMock("DELETE FROM favorite_posts", { rows: [] })
		req.client.addQueryMock("DELETE FROM favorite_replies", { rows: [] })
		req.client.addQueryMock("DELETE FROM blocked_users", { rows: [] })
		req.client.addQueryMock("DELETE FROM post_poll_votes", { rows: [] })
		req.client.addQueryMock("DELETE FROM subscribers", { rows: [] })
		req.client.addQueryMock("DELETE FROM sessions", { rows: [] })
		req.client.addQueryMock("DELETE FROM user_sessions", { rows: [] })
		req.client.addQueryMock("DELETE FROM replies", { rows: [] })
		req.client.addQueryMock("DELETE FROM posts", { rows: [] })
		req.client.addQueryMock("DELETE FROM users", { rows: [] })
		req.client.addQueryMock("UPDATE replies", { rows: [] })
		req.client.addQueryMock("UPDATE posts", { rows: [] })
		req.client.addQueryMock(
			"INSERT INTO sessions",
			{ 
				rows: [
					{
						session_id: "generated-session-456"
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await handleRemoveAccount(req, res)
		
		// Verify session was properly updated
		assertEquals(
			true,
			req.session.session_uuid.length === 36,
			"Should use generated UUID for session."
		)
		assertEquals(
			"generated-session-456",
			req.session.session_id,
			"Should use database-generated session ID."
		)
		
		// Verify cookie header format
		const headers = res.getHeaders()
		const cookie = headers["Set-Cookie"]
		assertEquals(
			true,
			cookie.includes(`session_uuid=${req.session.session_uuid}`),
			"Cookie should contain correct session UUID."
		)
		assertEquals(
			true,
			cookie.includes("HttpOnly"),
			"Cookie should be HttpOnly."
		)
		assertEquals(
			true,
			cookie.includes("Secure"),
			"Cookie should be Secure."
		)
		assertEquals(
			true,
			cookie.includes("Path=/session"),
			"Cookie should have correct path."
		)
		assertEquals(
			true,
			cookie.includes("Max-Age=315360000"),
			"Cookie should have 10-year max age."
		)
		
		// Verify response contains session UUID
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			responseData.session_uuid.length === 36,
			"Response should return new session UUID."
		)
	}
}

// Restore original functions after tests
const cleanup = () => {
	// Restore original modules
	delete require.cache[awsS3Path]
	delete require.cache[nodeCryptoPath]
	delete require.cache[cryptoPath]
	delete require.cache[handleRemoveAccountPath]
}

runTests(path.basename(__filename), Object.values(tests))
cleanup()