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
		}
	},
	loaded: true,
	id: awsS3Path
}

// Mock AI module (internal dependency - use real one but control responses)
let aiGenerateCalls = []
const mockAI = {
	generateImage: async (prompt, model) => {
		aiGenerateCalls.push({ type: 'image', prompt, model })
		return 'data:image/png;base64,mockGeneratedImageData'
	},
	generateSpeech: async (prompt, model) => {
		aiGenerateCalls.push({ type: 'speech', prompt, model })
		return Buffer.from('mock-mp3-data')
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

// Mock crypto.randomUUID by replacing the global crypto
let mockUuidResult = 'test-mp3-uuid-123'
const originalCrypto = require('crypto')

// Override the global crypto for testing
global.crypto = {
	...originalCrypto,
	randomUUID: () => mockUuidResult
}

// Also mock the node:crypto module
const mockCrypto = {
	...originalCrypto,
	randomUUID: () => mockUuidResult
}

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
const getAdminImagePath = require.resolve("../../../server/session/getAdminImage.js")
delete require.cache[getAdminImagePath]

// Import the handler we're testing (after mocking everything)
const getAdminImage = require("../../../server/session/getAdminImage.js")

const tests = {
	testSuccessfulImageGeneration: async () => {
		// Reset all calls
		s3SendCalls = []
		aiGenerateCalls = []
		
		// Setup mock request for image generation
		const req = createMockRequest(
			{ 
				path: '/image',
				prompt: 'A beautiful sunset over mountains',
				model: 'dall-e-3'
			},
			{ 
				session_id: 'session-123',
				user_id: 'user-456',
				admin: true
			}
		)
		
		// Initialize results object (normally done by server)
		req.results = { posts: [], replies: [] }
		
		const res = createMockResponse()
		
		// Execute the handler
		await getAdminImage(req, res)
		
		// Verify AI image generation was called
		assertEquals(
			1,
			aiGenerateCalls.length,
			"Should call AI for image generation."
		)
		
		const imageCall = aiGenerateCalls[0]
		assertEquals(
			'image',
			imageCall.type,
			"Should call image generation."
		)
		assertEquals(
			'A beautiful sunset over mountains',
			imageCall.prompt,
			"Should use provided prompt."
		)
		assertEquals(
			'dall-e-3',
			imageCall.model,
			"Should use specified model."
		)
		
		// Verify no S3 operations for image generation
		assertEquals(
			0,
			s3SendCalls.length,
			"Should not perform S3 operations for image generation."
		)
		
		// Verify results are populated
		assertEquals(
			'/image',
			req.results.path,
			"Should set results path."
		)
		assertEquals(
			'data:image/png;base64,mockGeneratedImageData',
			req.results.image,
			"Should set generated image in results."
		)
		
		// Verify response is not ended (handler doesn't end response)
		assertEquals(
			false,
			res.isEnded(),
			"Handler should not end response."
		)
	},

	testSuccessfulSpeechGeneration: async () => {
		// Reset all calls
		s3SendCalls = []
		aiGenerateCalls = []
		
		// Setup mock request for speech generation
		const req = createMockRequest(
			{ 
				path: '/image',
				prompt: 'Hello, this is a test speech message.',
				model: 'tts-1'
			},
			{ 
				session_id: 'session-speech',
				user_id: 'user-speech',
				admin: true
			}
		)
		
		req.results = { posts: [], replies: [] }
		
		const res = createMockResponse()
		
		// Execute the handler
		await getAdminImage(req, res)
		
		// Verify AI speech generation was called
		assertEquals(
			1,
			aiGenerateCalls.length,
			"Should call AI for speech generation."
		)
		
		const speechCall = aiGenerateCalls[0]
		assertEquals(
			'speech',
			speechCall.type,
			"Should call speech generation."
		)
		assertEquals(
			'Hello, this is a test speech message.',
			speechCall.prompt,
			"Should use provided prompt."
		)
		assertEquals(
			'tts-1',
			speechCall.model,
			"Should use specified model."
		)
		
		// Verify S3 upload for MP3 file
		assertEquals(
			1,
			s3SendCalls.length,
			"Should upload MP3 to S3."
		)
		
		const s3Command = s3SendCalls[0]
		assertEquals(
			'PutObject',
			s3Command.commandType,
			"Should be PUT operation."
		)
		assertEquals(
			'truce.net',
			s3Command.input.Bucket,
			"Should target correct bucket."
		)
		assertEquals(
			true,
			s3Command.input.Key.endsWith('.mp3'),
			"Should use .mp3 extension for filename."
		)
		assertEquals(
			true,
			s3Command.input.Key.length > 10,
			"Should use UUID-style filename."
		)
		assertEquals(
			true,
			Buffer.isBuffer(s3Command.input.Body),
			"Should upload buffer data."
		)
		
		// Verify results are populated
		assertEquals(
			'/image',
			req.results.path,
			"Should set results path."
		)
		assertEquals(
			true,
			req.results.mp3.startsWith('/mp3/'),
			"Should set MP3 URL with correct prefix."
		)
		assertEquals(
			true,
			req.results.mp3.length > 10,
			"Should set MP3 URL with UUID."
		)
		assertEquals(
			undefined,
			req.results.image,
			"Should not set image for speech generation."
		)
	},

	testDallE2ImageGeneration: async () => {
		// Reset all calls
		s3SendCalls = []
		aiGenerateCalls = []
		
		// Setup mock request for DALL-E 2
		const req = createMockRequest(
			{ 
				path: '/image',
				prompt: 'A cat wearing a hat',
				model: 'dall-e-2'
			},
			{ 
				session_id: 'session-dalle2',
				user_id: 'user-dalle2',
				admin: true
			}
		)
		
		req.results = { posts: [], replies: [] }
		
		const res = createMockResponse()
		
		// Execute the handler
		await getAdminImage(req, res)
		
		// Verify correct model was used
		assertEquals(
			1,
			aiGenerateCalls.length,
			"Should call AI for image generation."
		)
		assertEquals(
			'dall-e-2',
			aiGenerateCalls[0].model,
			"Should use DALL-E 2 model."
		)
		
		// Verify results
		assertEquals(
			'data:image/png;base64,mockGeneratedImageData',
			req.results.image,
			"Should generate image with DALL-E 2."
		)
	},

	testTTS1HDSpeechGeneration: async () => {
		// Reset all calls
		s3SendCalls = []
		aiGenerateCalls = []
		
		// Setup mock request for TTS-1-HD
		const req = createMockRequest(
			{ 
				path: '/image',
				prompt: 'High quality speech test',
				model: 'tts-1-hd'
			},
			{ 
				session_id: 'session-ttshd',
				user_id: 'user-ttshd',
				admin: true
			}
		)
		
		req.results = { posts: [], replies: [] }
		
		const res = createMockResponse()
		
		// Execute the handler
		await getAdminImage(req, res)
		
		// Verify correct model was used
		assertEquals(
			1,
			aiGenerateCalls.length,
			"Should call AI for speech generation."
		)
		assertEquals(
			'tts-1-hd',
			aiGenerateCalls[0].model,
			"Should use TTS-1-HD model."
		)
		
		// Verify S3 upload occurred
		assertEquals(
			1,
			s3SendCalls.length,
			"Should upload HD speech to S3."
		)
	},

	testNoActionWhenNotAdmin: async () => {
		// Reset all calls
		s3SendCalls = []
		aiGenerateCalls = []
		
		// Setup mock request without admin privileges
		const req = createMockRequest(
			{ 
				path: '/image',
				prompt: 'Unauthorized request',
				model: 'dall-e-3'
			},
			{ 
				session_id: 'session-nonadmin',
				user_id: 'user-nonadmin',
				admin: false // Not admin
			}
		)
		
		req.results = { posts: [], replies: [] }
		
		const res = createMockResponse()
		
		// Execute the handler
		await getAdminImage(req, res)
		
		// Verify no AI calls
		assertEquals(
			0,
			aiGenerateCalls.length,
			"Should not call AI when not admin."
		)
		assertEquals(
			0,
			s3SendCalls.length,
			"Should not perform S3 operations when not admin."
		)
		
		// Verify results are not modified
		assertEquals(
			undefined,
			req.results.path,
			"Should not set path when not admin."
		)
		assertEquals(
			undefined,
			req.results.image,
			"Should not set image when not admin."
		)
	},

	testNoActionWhenWrongPath: async () => {
		// Reset all calls
		s3SendCalls = []
		aiGenerateCalls = []
		
		// Setup mock request with wrong path
		const req = createMockRequest(
			{ 
				path: '/wrong-path',
				prompt: 'Test prompt',
				model: 'dall-e-3'
			},
			{ 
				session_id: 'session-wrongpath',
				user_id: 'user-wrongpath',
				admin: true
			}
		)
		
		req.results = { posts: [], replies: [] }
		
		const res = createMockResponse()
		
		// Execute the handler
		await getAdminImage(req, res)
		
		// Verify no operations
		assertEquals(
			0,
			aiGenerateCalls.length,
			"Should not call AI with wrong path."
		)
		assertEquals(
			undefined,
			req.results.path,
			"Should not set path with wrong path."
		)
	},

	testNoActionWhenMissingPrompt: async () => {
		// Reset all calls
		s3SendCalls = []
		aiGenerateCalls = []
		
		// Setup mock request without prompt
		const req = createMockRequest(
			{ 
				path: '/image',
				// prompt missing
				model: 'dall-e-3'
			},
			{ 
				session_id: 'session-noprompt',
				user_id: 'user-noprompt',
				admin: true
			}
		)
		
		req.results = { posts: [], replies: [] }
		
		const res = createMockResponse()
		
		// Execute the handler
		await getAdminImage(req, res)
		
		// Verify path is set but no generation occurs
		assertEquals(
			'/image',
			req.results.path,
			"Should set path even without prompt."
		)
		assertEquals(
			0,
			aiGenerateCalls.length,
			"Should not call AI without prompt."
		)
		assertEquals(
			undefined,
			req.results.image,
			"Should not set image without prompt."
		)
	},

	testNoActionWhenInvalidModel: async () => {
		// Reset all calls
		s3SendCalls = []
		aiGenerateCalls = []
		
		// Setup mock request with invalid model
		const req = createMockRequest(
			{ 
				path: '/image',
				prompt: 'Test prompt',
				model: 'invalid-model'
			},
			{ 
				session_id: 'session-invalidmodel',
				user_id: 'user-invalidmodel',
				admin: true
			}
		)
		
		req.results = { posts: [], replies: [] }
		
		const res = createMockResponse()
		
		// Execute the handler
		await getAdminImage(req, res)
		
		// Verify path is set but no generation occurs
		assertEquals(
			'/image',
			req.results.path,
			"Should set path even with invalid model."
		)
		assertEquals(
			0,
			aiGenerateCalls.length,
			"Should not call AI with invalid model."
		)
		assertEquals(
			undefined,
			req.results.image,
			"Should not set image with invalid model."
		)
		assertEquals(
			undefined,
			req.results.mp3,
			"Should not set mp3 with invalid model."
		)
	},

	testNoActionWhenAlreadyEnded: async () => {
		// Reset all calls
		s3SendCalls = []
		aiGenerateCalls = []
		
		// Setup mock request
		const req = createMockRequest(
			{ 
				path: '/image',
				prompt: 'Test prompt',
				model: 'dall-e-3'
			},
			{ 
				session_id: 'session-ended',
				user_id: 'user-ended',
				admin: true
			}
		)
		
		req.results = { posts: [], replies: [] }
		
		const res = createMockResponse()
		// Simulate response already ended
		res.writableEnded = true
		
		// Execute the handler
		await getAdminImage(req, res)
		
		// Verify no operations
		assertEquals(
			0,
			aiGenerateCalls.length,
			"Should not call AI when response already ended."
		)
		assertEquals(
			undefined,
			req.results.path,
			"Should not set path when response already ended."
		)
	},

	testNoActionWhenMissingUserId: async () => {
		// Reset all calls
		s3SendCalls = []
		aiGenerateCalls = []
		
		// Setup mock request without user_id
		const req = createMockRequest(
			{ 
				path: '/image',
				prompt: 'Test prompt',
				model: 'dall-e-3'
			},
			{ 
				session_id: 'session-nouser',
				user_id: undefined, // No user_id
				admin: true
			}
		)
		
		req.results = { posts: [], replies: [] }
		
		const res = createMockResponse()
		
		// Execute the handler
		await getAdminImage(req, res)
		
		// Verify no operations
		assertEquals(
			0,
			aiGenerateCalls.length,
			"Should not call AI without user_id."
		)
		assertEquals(
			undefined,
			req.results.path,
			"Should not set path without user_id."
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
	delete require.cache[getAdminImagePath]
	
	// Restore original crypto
	global.crypto = originalCrypto
}

runTests(path.basename(__filename), Object.values(tests))
cleanup()