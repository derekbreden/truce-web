// Mock S3 client (external dependency)
let s3SendCalls = []
const mockS3Client = {
	send: async (command) => {
		s3SendCalls.push(command)
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
			this.commandType = 'PutObject'
		},
		DeleteObjectCommand: function(params) {
			this.input = params
			this.commandType = 'Delete'
		}
	},
	loaded: true,
	id: awsS3Path
}

// Mock AI module (internal dependency - use real one)
let aiAskCalls = []
const mockAI = {
	ask: async (messages, type, format) => {
		aiAskCalls.push({ messages, type, format })
		// Return OK by default, can be overridden per test
		return JSON.stringify({ keyword: "OK" })
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
let mockUuidResult = 'test-uuid-123'
const mockCrypto = {
	randomUUID: () => mockUuidResult
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
const saveProfilePicturePath = require.resolve("../../../server/session/saveProfilePicture.js")
delete require.cache[saveProfilePicturePath]

// Import the handler we're testing (after mocking everything)
const saveProfilePicture = require("../../../server/session/saveProfilePicture.js")

// Import prompts for verification
const prompts = require("../../../server/prompts.js")

const tests = {
	testSuccessfulProfilePictureUpload: async () => {
		// Reset all calls
		s3SendCalls = []
		aiAskCalls = []
		
		// Reset AI mock to return OK
		mockAI.ask = async (messages, type, format) => {
			aiAskCalls.push({ messages, type, format })
			return JSON.stringify({ keyword: "OK" })
		}
		
		// Setup mock request
		const req = createMockRequest(
			{ 
				profile_picture: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
			},
			{ 
				session_id: 'session-123',
				user_id: 'user-456',
				display_name: 'Test User'
			}
		)
		
		// Setup mock database responses
		req.client.addQueryMock(
			'SELECT profile_picture_uuid',
			{ 
				rows: [
					{
						profile_picture_uuid: 'old-picture-uuid'
					}
				]
			}
		)
		req.client.addQueryMock(
			'UPDATE users',
			{ rows: [] }
		)
		
		// Set specific UUID for this test
		mockUuidResult = 'new-picture-uuid-789'
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveProfilePicture(req, res)
		
		// Verify AI was called with correct parameters
		assertEquals(
			1,
			aiAskCalls.length,
			"Should call AI once for moderation."
		)
		
		const aiCall = aiAskCalls[0]
		assertEquals(
			'profile_picture',
			aiCall.type,
			"Should use profile_picture AI type."
		)
		assertEquals(
			prompts.profile_picture_response_format,
			aiCall.format,
			"Should use correct prompt format."
		)
		assertEquals(
			1,
			aiCall.messages.length,
			"Should send one message to AI."
		)
		assertEquals(
			'TestUser',
			aiCall.messages[0].name,
			"Should sanitize display name for AI."
		)
		assertEquals(
			'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
			aiCall.messages[0].content[0].image_url.url,
			"Should pass profile picture to AI."
		)
		
		// Verify S3 operations
		assertEquals(
			2,
			s3SendCalls.length,
			"Should perform 2 S3 operations: upload new, delete old."
		)
		
		// Check upload command
		const uploadCommand = s3SendCalls[0]
		assertEquals(
			'PutObject',
			uploadCommand.commandType,
			"First command should be upload."
		)
		assertEquals(
			'truce.net',
			uploadCommand.input.Bucket,
			"Should upload to correct bucket."
		)
		assertEquals(
			true,
			uploadCommand.input.Key.endsWith('.png'),
			"Should use .png extension for upload key."
		)
		assertEquals(
			true,
			uploadCommand.input.Key.length === 40, // UUID (36) + '.png' (4)
			"Should use UUID format for upload key."
		)
		assertEquals(
			'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
			uploadCommand.input.Body,
			"Should upload the profile picture data."
		)
		
		// Check delete command
		const deleteCommand = s3SendCalls[1]
		assertEquals(
			'Delete',
			deleteCommand.commandType,
			"Second command should be delete."
		)
		assertEquals(
			'truce.net',
			deleteCommand.input.Bucket,
			"Should delete from correct bucket."
		)
		assertEquals(
			'old-picture-uuid.png',
			deleteCommand.input.Key,
			"Should delete old picture."
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
			responseData.profile_picture_uuid.length === 36,
			"Should return UUID format for profile picture."
		)
	},

	testSpamProfilePictureRejected: async () => {
		// Reset all calls
		s3SendCalls = []
		aiAskCalls = []
		
		// Mock AI to return Spam
		mockAI.ask = async (messages, type, format) => {
			aiAskCalls.push({ messages, type, format })
			return JSON.stringify({ 
				keyword: "Spam",
				note: "This appears to be spam content"
			})
		}
		
		// Setup mock request
		const req = createMockRequest(
			{ 
				profile_picture: 'data:image/png;base64,spamimage'
			},
			{ 
				session_id: 'session-spam',
				user_id: 'user-spam',
				display_name: 'Spam User'
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveProfilePicture(req, res)
		
		// Verify AI was called
		assertEquals(
			1,
			aiAskCalls.length,
			"Should call AI for moderation."
		)
		
		// Verify no S3 operations were performed
		assertEquals(
			0,
			s3SendCalls.length,
			"Should not perform any S3 operations for spam."
		)
		
		// Verify error response
		assertEquals(
			true,
			res.isEnded(),
			"Response should be ended."
		)
		
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			"Spam",
			responseData.error,
			"Should return spam error."
		)
		assertEquals(
			undefined,
			responseData.success,
			"Should not return success for spam."
		)
	},

	testViolentProfilePictureRejected: async () => {
		// Reset all calls
		s3SendCalls = []
		aiAskCalls = []
		
		// Mock AI to return Violent
		mockAI.ask = async (messages, type, format) => {
			aiAskCalls.push({ messages, type, format })
			return JSON.stringify({ 
				keyword: "Violent",
				note: "This contains violent content"
			})
		}
		
		// Setup mock request
		const req = createMockRequest(
			{ 
				profile_picture: 'data:image/png;base64,violentimage'
			},
			{ 
				session_id: 'session-violent',
				user_id: 'user-violent',
				display_name: 'Test User'
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveProfilePicture(req, res)
		
		// Verify no S3 operations
		assertEquals(
			0,
			s3SendCalls.length,
			"Should not perform S3 operations for violent content."
		)
		
		// Verify error response
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			"Violent",
			responseData.error,
			"Should return violent error."
		)
	},

	testHatefulProfilePictureRejected: async () => {
		// Reset all calls
		s3SendCalls = []
		aiAskCalls = []
		
		// Mock AI to return Hateful
		mockAI.ask = async (messages, type, format) => {
			aiAskCalls.push({ messages, type, format })
			return JSON.stringify({ 
				keyword: "Hateful",
				note: "This contains hateful content"
			})
		}
		
		// Setup mock request
		const req = createMockRequest(
			{ 
				profile_picture: 'data:image/png;base64,hatefulimage'
			},
			{ 
				session_id: 'session-hateful',
				user_id: 'user-hateful',
				display_name: 'Test User'
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveProfilePicture(req, res)
		
		// Verify error response
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			"Hateful",
			responseData.error,
			"Should return hateful error."
		)
	},

	testSexualProfilePictureRejected: async () => {
		// Reset all calls
		s3SendCalls = []
		aiAskCalls = []
		
		// Mock AI to return Sexual
		mockAI.ask = async (messages, type, format) => {
			aiAskCalls.push({ messages, type, format })
			return JSON.stringify({ 
				keyword: "Sexual",
				note: "This contains sexual content"
			})
		}
		
		// Setup mock request
		const req = createMockRequest(
			{ 
				profile_picture: 'data:image/png;base64,sexualimage'
			},
			{ 
				session_id: 'session-sexual',
				user_id: 'user-sexual',
				display_name: 'Test User'
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveProfilePicture(req, res)
		
		// Verify error response
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			"Sexual",
			responseData.error,
			"Should return sexual error."
		)
	},

	testNoExistingProfilePicture: async () => {
		// Reset all calls
		s3SendCalls = []
		aiAskCalls = []
		
		// Reset AI mock to return OK
		mockAI.ask = async (messages, type, format) => {
			aiAskCalls.push({ messages, type, format })
			return JSON.stringify({ keyword: "OK" })
		}
		
		// Setup mock request
		const req = createMockRequest(
			{ 
				profile_picture: 'data:image/png;base64,newpicture'
			},
			{ 
				session_id: 'session-new',
				user_id: 'user-new',
				display_name: 'New User'
			}
		)
		
		// Setup mock database response with no existing picture
		req.client.addQueryMock(
			'SELECT profile_picture_uuid',
			{ 
				rows: [
					{
						profile_picture_uuid: null // No existing picture
					}
				]
			}
		)
		req.client.addQueryMock(
			'UPDATE users',
			{ rows: [] }
		)
		
		mockUuidResult = 'first-picture-uuid'
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveProfilePicture(req, res)
		
		// Should only upload, not delete
		assertEquals(
			1,
			s3SendCalls.length,
			"Should only perform upload operation when no existing picture."
		)
		
		const uploadCommand = s3SendCalls[0]
		assertEquals(
			'PutObject',
			uploadCommand.commandType,
			"Should be upload command."
		)
		assertEquals(
			true,
			uploadCommand.input.Key.endsWith('.png'),
			"Should use .png extension for upload."
		)
		assertEquals(
			true,
			uploadCommand.input.Key.length === 40, // UUID (36) + '.png' (4)
			"Should use UUID format for upload."
		)
		
		// Verify successful response
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			responseData.success,
			"Should return success."
		)
		assertEquals(
			true,
			responseData.profile_picture_uuid.length === 36,
			"Should return UUID format."
		)
	},


	testDisplayNameSanitization: async () => {
		// Reset all calls
		s3SendCalls = []
		aiAskCalls = []
		
		// Reset AI mock to return OK
		mockAI.ask = async (messages, type, format) => {
			aiAskCalls.push({ messages, type, format })
			return JSON.stringify({ keyword: "OK" })
		}
		
		// Setup mock request with special characters in display name
		const req = createMockRequest(
			{ 
				profile_picture: 'data:image/png;base64,sanitizetest'
			},
			{ 
				session_id: 'session-sanitize',
				user_id: 'user-sanitize',
				display_name: 'User@#$%^&*()!Name123' // Contains special characters
			}
		)
		
		// Setup mock database responses
		req.client.addQueryMock(
			'SELECT profile_picture_uuid',
			{ 
				rows: [
					{
						profile_picture_uuid: null
					}
				]
			}
		)
		req.client.addQueryMock(
			'UPDATE users',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveProfilePicture(req, res)
		
		// Verify display name was sanitized in AI call
		assertEquals(
			1,
			aiAskCalls.length,
			"Should call AI once."
		)
		assertEquals(
			'UserName123',
			aiAskCalls[0].messages[0].name,
			"Should sanitize display name removing special characters."
		)
	},

	testAnonymousDisplayName: async () => {
		// Reset all calls
		s3SendCalls = []
		aiAskCalls = []
		
		// Reset AI mock to return OK
		mockAI.ask = async (messages, type, format) => {
			aiAskCalls.push({ messages, type, format })
			return JSON.stringify({ keyword: "OK" })
		}
		
		// Setup mock request with no display name
		const req = createMockRequest(
			{ 
				profile_picture: 'data:image/png;base64,anontest'
			},
			{ 
				session_id: 'session-anon',
				user_id: 'user-anon',
				display_name: null // No display name
			}
		)
		
		// Setup mock database responses
		req.client.addQueryMock(
			'SELECT profile_picture_uuid',
			{ 
				rows: [
					{
						profile_picture_uuid: null
					}
				]
			}
		)
		req.client.addQueryMock(
			'UPDATE users',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveProfilePicture(req, res)
		
		// Verify "Anonymous" was used as fallback
		assertEquals(
			'Anonymous',
			aiAskCalls[0].messages[0].name,
			"Should use 'Anonymous' when no display name."
		)
	},

	testNoActionWhenMissingProfilePicture: async () => {
		// Reset all calls
		s3SendCalls = []
		aiAskCalls = []
		
		// Setup mock request without profile_picture
		const req = createMockRequest(
			{}, // No profile_picture
			{ 
				session_id: 'session-123',
				user_id: 'user-456',
				display_name: 'Test User'
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveProfilePicture(req, res)
		
		// Verify no action taken
		assertEquals(
			false,
			res.isEnded(),
			"Should not end response when profile_picture missing."
		)
		assertEquals(
			0,
			aiAskCalls.length,
			"Should not call AI when profile_picture missing."
		)
		assertEquals(
			0,
			s3SendCalls.length,
			"Should not call S3 when profile_picture missing."
		)
	},

	testNoActionWhenMissingUserId: async () => {
		// Reset all calls
		s3SendCalls = []
		aiAskCalls = []
		
		// Setup mock request without user_id
		const req = createMockRequest(
			{ 
				profile_picture: 'data:image/png;base64,test'
			},
			{ 
				session_id: 'session-123',
				user_id: undefined, // No user_id
				display_name: 'Test User'
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveProfilePicture(req, res)
		
		// Verify no action taken
		assertEquals(
			false,
			res.isEnded(),
			"Should not end response when user_id missing."
		)
		assertEquals(
			0,
			aiAskCalls.length,
			"Should not call AI when user_id missing."
		)
		assertEquals(
			0,
			s3SendCalls.length,
			"Should not call S3 when user_id missing."
		)
	},

	testNoActionWhenAlreadyEnded: async () => {
		// Reset all calls
		s3SendCalls = []
		aiAskCalls = []
		
		// Setup mock request
		const req = createMockRequest(
			{ 
				profile_picture: 'data:image/png;base64,test'
			},
			{ 
				session_id: 'session-123',
				user_id: 'user-456',
				display_name: 'Test User'
			}
		)
		
		const res = createMockResponse()
		// Simulate response already ended
		res.writableEnded = true
		
		// Execute the handler
		await saveProfilePicture(req, res)
		
		// Verify no action taken
		assertEquals(
			true,
			res.writableEnded,
			"Response should remain ended."
		)
		assertEquals(
			0,
			aiAskCalls.length,
			"Should not call AI when response already ended."
		)
		assertEquals(
			0,
			s3SendCalls.length,
			"Should not call S3 when response already ended."
		)
	},

	testUuidGeneration: async () => {
		// Reset all calls
		s3SendCalls = []
		aiAskCalls = []
		
		// Reset AI mock to return OK
		mockAI.ask = async (messages, type, format) => {
			aiAskCalls.push({ messages, type, format })
			return JSON.stringify({ keyword: "OK" })
		}
		
		// Test multiple requests to verify UUIDs are generated
		for (let i = 0; i < 3; i++) {
			const req = createMockRequest(
				{ 
					profile_picture: `data:image/png;base64,uuid-test-${i}`
				},
				{ 
					session_id: `session-uuid-${i}`,
					user_id: `user-uuid-${i}`,
					display_name: `UUID User ${i}`
				}
			)
			
			req.client.clearQueryMocks()
			req.client.addQueryMock(
				'SELECT profile_picture_uuid',
				{ 
					rows: [
						{
							profile_picture_uuid: null
						}
					]
				}
			)
			req.client.addQueryMock(
				'UPDATE users',
				{ rows: [] }
			)
			
			const res = createMockResponse()
			
			await saveProfilePicture(req, res)
			
			// Verify UUID was used in S3 key
			const lastUploadCommand = s3SendCalls[s3SendCalls.length - 1]
			assertEquals(
				true,
				lastUploadCommand.input.Key.endsWith('.png'),
				`Should use .png extension for iteration ${i}.`
			)
			assertEquals(
				true,
				lastUploadCommand.input.Key.length === 40,
				`Should use UUID format for iteration ${i}.`
			)
			
			// Verify UUID was returned in response
			const responseData = JSON.parse(res.getResponseData())
			assertEquals(
				true,
				responseData.profile_picture_uuid.length === 36,
				`Should return UUID format for iteration ${i}.`
			)
		}
		
		// Verify all uploads were performed
		assertEquals(
			3,
			s3SendCalls.length,
			"Should perform 3 uploads."
		)
	},

	testDatabaseSequence: async () => {
		// Reset all calls
		s3SendCalls = []
		aiAskCalls = []
		
		// Reset AI mock to return OK
		mockAI.ask = async (messages, type, format) => {
			aiAskCalls.push({ messages, type, format })
			return JSON.stringify({ keyword: "OK" })
		}
		
		// Test that database queries execute in correct sequence
		const req = createMockRequest(
			{ 
				profile_picture: 'data:image/png;base64,sequencetest'
			},
			{ 
				session_id: 'session-sequence',
				user_id: 'user-sequence',
				display_name: 'Sequence User'
			}
		)
		
		// Setup sequential mock responses
		req.client.addQueryMock(
			'SELECT profile_picture_uuid',
			{ 
				rows: [
					{
						profile_picture_uuid: 'old-sequence-uuid'
					}
				]
			}
		)
		req.client.addQueryMock(
			'UPDATE users',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveProfilePicture(req, res)
		
		// Verify successful sequence completion
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			responseData.success,
			"Should complete database and S3 sequence successfully."
		)
		assertEquals(
			true,
			responseData.profile_picture_uuid.length === 36,
			"Should return UUID format after successful sequence."
		)
		
		// Verify S3 operations were performed in correct order
		assertEquals(
			2,
			s3SendCalls.length,
			"Should perform upload then delete sequence."
		)
		assertEquals(
			'PutObject',
			s3SendCalls[0].commandType,
			"First operation should be upload."
		)
		assertEquals(
			'Delete',
			s3SendCalls[1].commandType,
			"Second operation should be delete."
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
	delete require.cache[saveProfilePicturePath]
}

runTests(path.basename(__filename), Object.values(tests))
cleanup()