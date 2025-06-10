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
		PutObjectCommand: function(params) {
			this.input = params
			this.commandType = "PutObject"
		},
		DeleteObjectCommand: function(params) {
			this.input = params
			this.commandType = "Delete"
		}
	},
	loaded: true,
	id: awsS3Path
}

// Mock AI module (internal dependency - use real one but control responses)
let ai_ask_calls = []
const mockAI = {
	ask: async (messages, type, format) => {
		ai_ask_calls.push({ messages, type, format })
		
		// Default responses based on type
		if (type === "topics") {
			return JSON.stringify({ topics: ["general", "technology"] }) // Match the topics in testSuccessfulPostCreation
		} else if (type === "poll_estimate") {
			return JSON.stringify({ 
				response_rate: 0.5, 
				choice_a: 0.4, 
				choice_b: 0.3, 
				choice_c: 0.2, 
				choice_d: 0.1 
			})
		} else {
			// Default to OK for content moderation
			return JSON.stringify({ keyword: "OK" })
		}
	}
}

// Replace AI module in require cache
const aiPath = require.resolve("../../../server/ai")
delete require.cache[aiPath]
require.cache[aiPath] = {
	exports: mockAI,
	loaded: true,
	id: aiPath
}

// Mock crypto.randomUUID by replacing the node:crypto module
let mock_uuid_result = "test-uuid-123"
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
const savePostPath = require.resolve("../../../server/session/savePost.js")
delete require.cache[savePostPath]

// Import the handler we're testing (after mocking everything)
const savePost = require("../../../server/session/savePost.js")

// Import prompts for verification
const prompts = require("../../../server/prompts.js")

const tests = {
	testSuccessfulPostCreation: async () => {
		// Reset all calls
		s3_send_calls = []
		ai_ask_calls = []
		
		// Setup mock request for new post
		const req = createMockRequest(
			{ 
				title: "Test Post Title",
				body: "This is a test post body with some content.",
				path: "/posts",
				pngs: [
					{ url: "data:image/png;base64,image1data" },
					{ url: "data:image/png;base64,image2data" }
				]
			},
			{ 
				session_id: "session-123",
				user_id: "user-456",
				display_name: "Test User"
			}
		)
		
		// Mock websocket functionality
		req.sendWsMessage = (type, postId) => {
			req.wsMessages = req.wsMessages || []
			req.wsMessages.push({ type, postId })
		}
		
		// Setup mock database responses
		req.client.addQueryMock(
			"SELECT slug FROM posts WHERE slug",
			{ rows: [] } // Slug doesn't exist
		)
		req.client.addQueryMock(
			"INSERT INTO posts",
			{ 
				rows: [
					{
						post_id: "new-post-789"
					}
				]
			}
		)
		req.client.addQueryMock(
			"UPDATE posts",
			{ rows: [] }
		)
		req.client.addQueryMock(
			"SELECT topic_id, topic_name FROM topics",
			{ 
				rows: [
					{ topic_id: "topic-1", topic_name: "general" },
					{ topic_id: "topic-2", topic_name: "technology" },
					{ topic_id: "topic-3", topic_name: "science" }
				]
			}
		)
		req.client.addQueryMock(
			"DELETE FROM post_topics",
			{ rows: [] }
		)
		req.client.addQueryMock(
			"INSERT INTO post_topics",
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await savePost(req, res)
		
		// Verify AI calls were made
		assertEquals(
			2,
			ai_ask_calls.length,
			"Should call AI twice: content moderation and topics."
		)
		
		// Verify content moderation call
		const moderation_call = ai_ask_calls[0]
		assertEquals(
			"common",
			moderation_call.type,
			"First AI call should be for content moderation."
		)
		assertEquals(
			prompts.common_response_format,
			moderation_call.format,
			"Should use common response format."
		)
		assertEquals(
			1,
			moderation_call.messages.length,
			"Should send one message for moderation."
		)
		assertEquals(
			"estser",
			moderation_call.messages[0].name,
			"Should sanitize display name (removes uppercase and spaces)."
		)
		assertEquals(
			"Test Post Title\n\nThis is a test post body with some content.",
			moderation_call.messages[0].content[0].text,
			"Should combine title and body for moderation."
		)
		assertEquals(
			2,
			moderation_call.messages[0].content.length - 1, // -1 for text content
			"Should include images in moderation."
		)
		
		// Verify topics call
		const topics_call = ai_ask_calls[1]
		assertEquals(
			"topics",
			topics_call.type,
			"Second AI call should be for topics."
		)
		assertEquals(
			prompts.topics_response_format,
			topics_call.format,
			"Should use topics response format."
		)
		
		// Verify S3 operations
		assertEquals(
			2,
			s3_send_calls.length,
			"Should upload 2 images to S3."
		)
		
		s3_send_calls.forEach((command, index) => {
			assertEquals(
				"PutObject",
				command.commandType,
				`S3 command ${index} should be upload.`
			)
			assertEquals(
				"truce.net",
				command.input.Bucket,
				`S3 command ${index} should target correct bucket.`
			)
			assertEquals(
				true,
				command.input.Key.endsWith('.png'),
				`S3 command ${index} should have .png extension.`
			)
		})
		
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
			"Test_Post_Title",
			responseData.slug,
			"Should return generated slug."
		)
		assertEquals(
			"user-456",
			responseData.user_id,
			"Should return user ID."
		)
		
		// Verify websocket message
		assertEquals(
			1,
			req.wsMessages.length,
			"Should send websocket update."
		)
		assertEquals(
			"UPDATE",
			req.wsMessages[0].type,
			"Should send UPDATE message."
		)
		assertEquals(
			"new-post-789",
			req.wsMessages[0].postId,
			"Should send correct post ID."
		)
	},

	testPostCreationWithPoll: async () => {
		// Reset all calls
		s3_send_calls = []
		ai_ask_calls = []
		
		// Mock AI to return empty topics (no topics database in this test)
		mockAI.ask = async (messages, type, format) => {
			ai_ask_calls.push({ messages, type, format })
			if (type === "topics") {
				return JSON.stringify({ topics: [] })
			} else if (type === "poll_estimate") {
				return JSON.stringify({ response_rate: 0.5, choice_a: 0.4, choice_b: 0.3, choice_c: 0.2, choice_d: 0.1 })
			} else {
				return JSON.stringify({ keyword: "OK" })
			}
		}
		
		// Setup mock request for poll post
		const req = createMockRequest(
			{ 
				title: "Poll Post",
				body: "What do you think?",
				path: "/posts",
				pngs: [],
				poll_1: "Option A",
				poll_2: "Option B",
				poll_3: "Option C"
			},
			{ 
				session_id: "session-poll",
				user_id: "user-poll",
				display_name: "Poll User"
			}
		)
		
		req.sendWsMessage = () => {}
		
		// Setup mock database responses
		req.client.addQueryMock("SELECT slug FROM posts WHERE slug", { rows: [] })
		req.client.addQueryMock("INSERT INTO posts", { rows: [{ post_id: "poll-post-123" }] })
		req.client.addQueryMock("UPDATE posts", { rows: [] })
		req.client.addQueryMock("SELECT topic_id, topic_name FROM topics", { rows: [] })
		req.client.addQueryMock("DELETE FROM post_topics", { rows: [] })
		
		const res = createMockResponse()
		
		// Execute the handler
		await savePost(req, res)
		
		// Verify AI calls include poll estimation
		assertEquals(
			3,
			ai_ask_calls.length,
			"Should call AI three times: content moderation, topics, and poll estimation."
		)
		
		// Verify poll moderation includes poll options
		const moderation_call = ai_ask_calls[0]
		assertEquals(
			"poll",
			moderation_call.type,
			"Should use poll type for moderation."
		)
		assertEquals(
			prompts.poll_response_format,
			moderation_call.format,
			"Should use poll response format."
		)
		assertEquals(
			true,
			moderation_call.messages[0].content[0].text.includes('A) Option A'),
			"Should include poll option A."
		)
		assertEquals(
			true,
			moderation_call.messages[0].content[0].text.includes('B) Option B'),
			"Should include poll option B."
		)
		assertEquals(
			true,
			moderation_call.messages[0].content[0].text.includes('C) Option C'),
			"Should include poll option C."
		)
		
		// Verify poll estimation call
		const poll_estimate_call = ai_ask_calls[2]
		assertEquals(
			"poll_estimate",
			poll_estimate_call.type,
			"Third AI call should be for poll estimation."
		)
		assertEquals(
			prompts.poll_estimate_response_format,
			poll_estimate_call.format,
			"Should use poll estimate format."
		)
		
		// Verify successful response
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			responseData.success,
			"Should succeed with poll creation."
		)
	},

	testPostUpdate: async () => {
		// Reset all calls
		s3_send_calls = []
		ai_ask_calls = []
		
		// Mock AI to return empty topics (no topics database in this test)
		mockAI.ask = async (messages, type, format) => {
			ai_ask_calls.push({ messages, type, format })
			if (type === "topics") {
				return JSON.stringify({ topics: [] })
			} else if (type === "poll_estimate") {
				return JSON.stringify({ response_rate: 0.5, choice_a: 0.4, choice_b: 0.3, choice_c: 0.2, choice_d: 0.1 })
			} else {
				return JSON.stringify({ keyword: "OK" })
			}
		}
		
		// Setup mock request for post update
		const req = createMockRequest(
			{ 
				title: "Updated Post Title",
				body: "Updated body content.",
				path: "/posts",
				pngs: [
					{ url: "data:image/png;base64,newimage" }
				],
				post_id: "existing-post-456"
			},
			{ 
				session_id: "session-update",
				user_id: "user-update",
				display_name: "Update User"
			}
		)
		
		req.sendWsMessage = () => {}
		
		// Setup mock database responses
		req.client.addQueryMock("SELECT slug FROM posts WHERE slug", { rows: [] })
		req.client.addQueryMock("UPDATE posts", { rows: [] })
		req.client.addQueryMock(
			"SELECT image_uuids",
			{ 
				rows: [
					{
						image_uuids: "old-image1,old-image2"
					}
				]
			}
		)
		req.client.addQueryMock("SELECT topic_id, topic_name FROM topics", { rows: [] })
		req.client.addQueryMock("DELETE FROM post_topics", { rows: [] })
		
		const res = createMockResponse()
		
		// Execute the handler
		await savePost(req, res)
		
		// Verify old images were deleted from S3
		assertEquals(
			3,
			s3_send_calls.length,
			"Should perform 3 S3 operations: delete 2 old + upload 1 new."
		)
		assertEquals(
			"Delete",
			s3_send_calls[0].commandType,
			"First operation should delete old image."
		)
		assertEquals(
			"old-image1.png",
			s3_send_calls[0].input.Key,
			"Should delete first old image."
		)
		assertEquals(
			"Delete",
			s3_send_calls[1].commandType,
			"Second operation should delete old image."
		)
		assertEquals(
			"old-image2.png",
			s3_send_calls[1].input.Key,
			"Should delete second old image."
		)
		assertEquals(
			"PutObject",
			s3_send_calls[2].commandType,
			"Third operation should upload new image."
		)
		
		// Verify successful response
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			responseData.success,
			"Should succeed with post update."
		)
	},

	testSpamPostRejected: async () => {
		// Reset all calls
		s3_send_calls = []
		ai_ask_calls = []
		
		// Mock AI to return Spam
		mockAI.ask = async (messages, type, format) => {
			ai_ask_calls.push({ messages, type, format })
			if (type === "common" || type === "poll") {
				return JSON.stringify({ 
					keyword: "Spam",
					note: "This appears to be spam content"
				})
			}
			return JSON.stringify({ topics: [] })
		}
		
		// Setup mock request
		const req = createMockRequest(
			{ 
				title: "Spam Title",
				body: "Spam content here",
				path: "/posts",
				pngs: []
			},
			{ 
				session_id: "session-spam",
				user_id: "user-spam",
				display_name: "Spam User"
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await savePost(req, res)
		
		// Verify AI was called for moderation
		assertEquals(
			1,
			ai_ask_calls.length,
			"Should call AI for moderation only."
		)
		
		// Verify no S3 operations for spam
		assertEquals(
			0,
			s3_send_calls.length,
			"Should not perform S3 operations for spam."
		)
		
		// Verify error response
		assertEquals(
			true,
			res.isEnded(),
			"Response should be ended."
		)
		
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			"Spam This appears to be spam content",
			responseData.error,
			"Should return spam error."
		)
		assertEquals(
			undefined,
			responseData.success,
			"Should not return success for spam."
		)
		
		// Reset AI mock for other tests
		mockAI.ask = async (messages, type, format) => {
			ai_ask_calls.push({ messages, type, format })
			if (type === "topics") {
				return JSON.stringify({ topics: ['general'] })
			} else if (type === "poll_estimate") {
				return JSON.stringify({ response_rate: 0.5, choice_a: 0.5, choice_b: 0.5, choice_c: 0, choice_d: 0 })
			} else {
				return JSON.stringify({ keyword: "OK" })
			}
		}
	},

	testSlugGeneration: async () => {
		// Reset all calls
		s3_send_calls = []
		ai_ask_calls = []
		
		// Mock AI to return empty topics (no topics database in this test)
		mockAI.ask = async (messages, type, format) => {
			ai_ask_calls.push({ messages, type, format })
			if (type === "topics") {
				return JSON.stringify({ topics: [] })
			} else if (type === "poll_estimate") {
				return JSON.stringify({ response_rate: 0.5, choice_a: 0.4, choice_b: 0.3, choice_c: 0.2, choice_d: 0.1 })
			} else {
				return JSON.stringify({ keyword: "OK" })
			}
		}
		
		// Setup mock request with title needing slug processing
		const req = createMockRequest(
			{ 
				title: "Test Post With Special Characters! @#$%",
				body: "Body content",
				path: "/posts",
				pngs: []
			},
			{ 
				session_id: "session-slug",
				user_id: "user-slug",
				display_name: "Slug User"
			}
		)
		
		req.sendWsMessage = () => {}
		
		// Setup mock database responses
		req.client.addQueryMock("SELECT slug FROM posts WHERE slug", { rows: [] })
		req.client.addQueryMock("INSERT INTO posts", { rows: [{ post_id: "slug-post" }] })
		req.client.addQueryMock("UPDATE posts", { rows: [] })
		req.client.addQueryMock("SELECT topic_id, topic_name FROM topics", { rows: [] })
		req.client.addQueryMock("DELETE FROM post_topics", { rows: [] })
		
		const res = createMockResponse()
		
		// Execute the handler
		await savePost(req, res)
		
		// Verify slug generation
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			"Test_Post_With_Special_Characters_",
			responseData.slug,
			"Should generate clean slug from title."
		)
	},

	testSlugCollisionHandling: async () => {
		// Reset all calls
		s3_send_calls = []
		ai_ask_calls = []
		
		// Mock AI to return empty topics (no topics database in this test)
		mockAI.ask = async (messages, type, format) => {
			ai_ask_calls.push({ messages, type, format })
			if (type === "topics") {
				return JSON.stringify({ topics: [] })
			} else if (type === "poll_estimate") {
				return JSON.stringify({ response_rate: 0.5, choice_a: 0.4, choice_b: 0.3, choice_c: 0.2, choice_d: 0.1 })
			} else {
				return JSON.stringify({ keyword: "OK" })
			}
		}
		
		// Setup mock request
		const req = createMockRequest(
			{ 
				title: "Duplicate Title",
				body: "Body content",
				path: "/posts",
				pngs: []
			},
			{ 
				session_id: "session-collision",
				user_id: "user-collision",
				display_name: "Collision User"
			}
		)
		
		req.sendWsMessage = () => {}
		
		// Setup mock database responses - slug exists
		req.client.addQueryMock(
			"SELECT slug FROM posts WHERE slug",
			{ 
				rows: [
					{ slug: "Duplicate_Title" }
				]
			}
		)
		req.client.addQueryMock("INSERT INTO posts", { rows: [{ post_id: "collision-post" }] })
		req.client.addQueryMock("UPDATE posts", { rows: [] })
		req.client.addQueryMock("SELECT topic_id, topic_name FROM topics", { rows: [] })
		req.client.addQueryMock("DELETE FROM post_topics", { rows: [] })
		
		const res = createMockResponse()
		
		// Execute the handler
		await savePost(req, res)
		
		// Verify slug collision handling
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			responseData.slug.startsWith('Duplicate_Title_'),
			"Should append UUID to duplicate slug."
		)
		assertEquals(
			true,
			responseData.slug.length > 'Duplicate_Title_'.length,
			"Should have UUID appended to slug."
		)
	},

	testTopicProcessing: async () => {
		// Reset all calls
		s3_send_calls = []
		ai_ask_calls = []
		
		// Mock AI to return specific topics
		mockAI.ask = async (messages, type, format) => {
			ai_ask_calls.push({ messages, type, format })
			if (type === "topics") {
				return JSON.stringify({ topics: ["technology", "science", "unknown-topic"] })
			}
			return JSON.stringify({ keyword: "OK" })
		}
		
		// Setup mock request
		const req = createMockRequest(
			{ 
				title: "Tech Post",
				body: "Technology content",
				path: "/posts",
				pngs: []
			},
			{ 
				session_id: "session-topics",
				user_id: "user-topics",
				display_name: "Topic User"
			}
		)
		
		req.sendWsMessage = () => {}
		
		// Setup mock database responses
		req.client.addQueryMock("SELECT slug FROM posts WHERE slug", { rows: [] })
		req.client.addQueryMock("INSERT INTO posts", { rows: [{ post_id: "topic-post" }] })
		req.client.addQueryMock("UPDATE posts", { rows: [] })
		req.client.addQueryMock(
			"SELECT topic_id, topic_name FROM topics",
			{ 
				rows: [
					{ topic_id: "topic-tech", topic_name: "technology" },
					{ topic_id: "topic-sci", topic_name: "science" },
					{ topic_id: "topic-gen", topic_name: "general" }
					// Note: "unknown-topic" is not in the database
				]
			}
		)
		req.client.addQueryMock("DELETE FROM post_topics", { rows: [] })
		req.client.addQueryMock("INSERT INTO post_topics", { rows: [] })
		
		const res = createMockResponse()
		
		// Execute the handler
		await savePost(req, res)
		
		// Verify topics AI call
		const topics_call = ai_ask_calls.find(call => call.type === "topics")
		assertEquals(
			true,
			topics_call !== undefined,
			"Should call AI for topics."
		)
		
		// Verify successful response (unknown topics are skipped)
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			responseData.success,
			"Should succeed even with unknown topics."
		)
		
		// Reset AI mock
		mockAI.ask = async (messages, type, format) => {
			ai_ask_calls.push({ messages, type, format })
			if (type === "topics") {
				return JSON.stringify({ topics: [] })
			} else if (type === "poll_estimate") {
				return JSON.stringify({ response_rate: 0.5, choice_a: 0.5, choice_b: 0.5, choice_c: 0, choice_d: 0 })
			} else {
				return JSON.stringify({ keyword: "OK" })
			}
		}
	},

	testPollsTopicsFiltering: async () => {
		// Reset all calls
		s3_send_calls = []
		ai_ask_calls = []
		
		// Mock AI to return polls and asks topics
		mockAI.ask = async (messages, type, format) => {
			ai_ask_calls.push({ messages, type, format })
			if (type === "topics") {
				return JSON.stringify({ topics: ["polls", "asks", "technology"] })
			}
			return JSON.stringify({ keyword: "OK" })
		}
		
		// Setup mock request for poll
		const req = createMockRequest(
			{ 
				title: "Poll Post",
				body: "Poll question",
				path: "/posts",
				pngs: [],
				poll_1: "Yes",
				poll_2: "No"
			},
			{ 
				session_id: "session-poll-topics",
				user_id: "user-poll-topics",
				display_name: "Poll User"
			}
		)
		
		req.sendWsMessage = () => {}
		
		// Setup mock database responses
		req.client.addQueryMock("SELECT slug FROM posts WHERE slug", { rows: [] })
		req.client.addQueryMock("INSERT INTO posts", { rows: [{ post_id: "poll-filter-post" }] })
		req.client.addQueryMock("UPDATE posts", { rows: [] })
		req.client.addQueryMock(
			"SELECT topic_id, topic_name FROM topics",
			{ 
				rows: [
					{ topic_id: "topic-polls", topic_name: "polls" },
					{ topic_id: "topic-asks", topic_name: "asks" },
					{ topic_id: "topic-tech", topic_name: "technology" }
				]
			}
		)
		req.client.addQueryMock("DELETE FROM post_topics", { rows: [] })
		req.client.addQueryMock("INSERT INTO post_topics", { rows: [] })
		
		const res = createMockResponse()
		
		// Execute the handler
		await savePost(req, res)
		
		// Verify successful response (asks topic should be filtered out when polls topic exists)
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			responseData.success,
			"Should succeed with polls topic filtering."
		)
		
		// Reset AI mock
		mockAI.ask = async (messages, type, format) => {
			ai_ask_calls.push({ messages, type, format })
			if (type === "topics") {
				return JSON.stringify({ topics: [] })
			} else if (type === "poll_estimate") {
				return JSON.stringify({ response_rate: 0.5, choice_a: 0.5, choice_b: 0.5, choice_c: 0, choice_d: 0 })
			} else {
				return JSON.stringify({ keyword: "OK" })
			}
		}
	},

	testNoActionWhenMissingTitle: async () => {
		// Reset all calls
		s3_send_calls = []
		ai_ask_calls = []
		
		// Setup mock request without title
		const req = createMockRequest(
			{ 
				body: "Body content",
				path: "/posts",
				pngs: []
			},
			{ 
				session_id: "session-123",
				user_id: "user-456"
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await savePost(req, res)
		
		// Verify no action taken
		assertEquals(
			false,
			res.isEnded(),
			"Should not end response when title missing."
		)
		assertEquals(
			0,
			ai_ask_calls.length,
			"Should not call AI when title missing."
		)
		assertEquals(
			0,
			s3_send_calls.length,
			"Should not perform S3 operations when title missing."
		)
	},

	testNoActionWhenMissingUserId: async () => {
		// Reset all calls
		s3_send_calls = []
		ai_ask_calls = []
		
		// Setup mock request without user_id
		const req = createMockRequest(
			{ 
				title: "Test Title",
				body: "Body content",
				path: "/posts",
				pngs: []
			},
			{ 
				session_id: "session-123",
				user_id: undefined
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await savePost(req, res)
		
		// Verify no action taken
		assertEquals(
			false,
			res.isEnded(),
			"Should not end response when user_id missing."
		)
		assertEquals(
			0,
			ai_ask_calls.length,
			"Should not call AI when user_id missing."
		)
	},

	testNoActionWhenAlreadyEnded: async () => {
		// Reset all calls
		s3_send_calls = []
		ai_ask_calls = []
		
		// Setup mock request
		const req = createMockRequest(
			{ 
				title: "Test Title",
				body: "Body content",
				path: "/posts",
				pngs: []
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
		await savePost(req, res)
		
		// Verify no action taken
		assertEquals(
			true,
			res.writableEnded,
			"Response should remain ended."
		)
		assertEquals(
			0,
			ai_ask_calls.length,
			"Should not call AI when response already ended."
		)
	},

	testPollVotesCleanupOnUpdate: async () => {
		// Reset all calls
		s3_send_calls = []
		ai_ask_calls = []
		
		// Mock AI to return empty topics (no topics database in this test)
		mockAI.ask = async (messages, type, format) => {
			ai_ask_calls.push({ messages, type, format })
			if (type === "topics") {
				return JSON.stringify({ topics: [] })
			} else if (type === "poll_estimate") {
				return JSON.stringify({ response_rate: 0.5, choice_a: 0.4, choice_b: 0.3, choice_c: 0.2, choice_d: 0.1 })
			} else {
				return JSON.stringify({ keyword: "OK" })
			}
		}
		
		// Setup mock request for poll post update
		const req = createMockRequest(
			{ 
				title: "Updated Poll",
				body: "Updated poll question",
				path: "/posts",
				pngs: [],
				poll_1: "New Option A",
				poll_2: "New Option B",
				post_id: "existing-poll-post"
			},
			{ 
				session_id: "session-poll-update",
				user_id: "user-poll-update",
				display_name: "Poll Update User"
			}
		)
		
		req.sendWsMessage = () => {}
		
		// Setup mock database responses
		req.client.addQueryMock("SELECT slug FROM posts WHERE slug", { rows: [] })
		req.client.addQueryMock("UPDATE posts", { rows: [] })
		req.client.addQueryMock("SELECT image_uuids", { rows: [{ image_uuids: "" }] })
		req.client.addQueryMock("DELETE FROM post_poll_votes", { rows: [] })
		req.client.addQueryMock("SELECT topic_id, topic_name FROM topics", { rows: [] })
		req.client.addQueryMock("DELETE FROM post_topics", { rows: [] })
		
		const res = createMockResponse()
		
		// Execute the handler
		await savePost(req, res)
		
		// Verify AI was called for poll estimation
		assertEquals(
			3,
			ai_ask_calls.length,
			"Should call AI for moderation, topics, and poll estimation."
		)
		
		const poll_estimate_call = ai_ask_calls.find(call => call.type === "poll_estimate")
		assertEquals(
			true,
			poll_estimate_call !== undefined,
			"Should call AI for poll estimation on poll update."
		)
		
		// Verify successful response
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			responseData.success,
			"Should succeed with poll update."
		)
	}
}

// Restore original functions after tests
const cleanup = () => {
	// Restore original modules
	delete require.cache[awsS3Path]
	delete require.cache[aiPath]
	delete require.cache[nodeCryptoPath]
	delete require.cache[cryptoPath]
	delete require.cache[savePostPath]
}

runTests(path.basename(__filename), Object.values(tests))
cleanup()