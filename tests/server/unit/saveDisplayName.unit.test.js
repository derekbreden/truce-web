// Mock AI module (internal dependency - use real one but control responses)
let aiAskCalls = []
const mockAI = {
	ask: async (messages, type, format) => {
		aiAskCalls.push({ messages, type, format })
		// Default to OK
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

// Track updateDisplayName calls by monitoring for its specific database query
let updateDisplayNameCalls = []

const path = require("path")
const {
	createMockRequest,
	createMockResponse,
	assertEquals,
	runTests
} = require("../shared/serverTestSetup.js")

// Clear the handler cache and import it after setting up mocks
const saveDisplayNamePath = require.resolve("../../../server/session/saveDisplayName.js")
delete require.cache[saveDisplayNamePath]

// Import the handler we're testing (after mocking everything)
const saveDisplayName = require("../../../server/session/saveDisplayName.js")

// Import prompts for verification
const prompts = require("../../../server/prompts.js")

const tests = {
	testSuccessfulDisplayNameSave: async () => {
		// Reset all calls
		aiAskCalls = []
		updateDisplayNameCalls = []
		
		// Setup mock request
		const req = createMockRequest(
			{ 
				display_name: 'John Doe'
			},
			{ 
				session_id: 'session-123',
				user_id: 'user-456',
				display_name: 'Old Name',
				user_slug: 'john-doe-slug',
				display_name_index: 'johndoe'
			}
		)
		
		// Track updateDisplayName calls by monitoring for its specific database query
		const originalQuery = req.client.query
		req.client.query = async (sql, params) => {
			// Check if this is the updateDisplayName query
			if (sql.includes('UPDATE users') && sql.includes('display_name = $1')) {
				updateDisplayNameCalls.push({ display_name: params[0], user_id: params[1] })
			}
			return await originalQuery.call(req.client, sql, params)
		}
		
		// Setup database mocks for updateDisplayName
		req.client.addQueryMock('UPDATE users', { rows: [] })
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveDisplayName(req, res)
		
		// Verify AI validation was called
		assertEquals(
			1,
			aiAskCalls.length,
			"Should call AI for display name validation."
		)
		
		const aiCall = aiAskCalls[0]
		assertEquals(
			'display_name',
			aiCall.type,
			"Should use display_name type for validation."
		)
		assertEquals(
			prompts.display_name_response_format,
			aiCall.format,
			"Should use display name response format."
		)
		assertEquals(
			1,
			aiCall.messages.length,
			"Should send one message for validation."
		)
		assertEquals(
			'John Doe',
			aiCall.messages[0].content,
			"Should validate sanitized display name."
		)
		
		// Verify updateDisplayName was called
		assertEquals(
			1,
			updateDisplayNameCalls.length,
			"Should call updateDisplayName."
		)
		assertEquals(
			'John Doe',
			updateDisplayNameCalls[0].display_name,
			"Should update with sanitized display name."
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
			'user-456',
			responseData.user_id,
			"Should return user ID."
		)
		assertEquals(
			'Old Name',
			responseData.display_name,
			"Should return session display name."
		)
		assertEquals(
			'johndoe',
			responseData.display_name_index,
			"Should return display name index."
		)
		assertEquals(
			'john-doe-slug',
			responseData.user_slug,
			"Should return user slug."
		)
	},

	testDisplayNameSanitization: async () => {
		// Reset all calls
		aiAskCalls = []
		updateDisplayNameCalls = []
		
		// Setup mock request with special characters
		const req = createMockRequest(
			{ 
				display_name: 'John123@#$%^&*()Doe!!!'
			},
			{ 
				session_id: 'session-sanitize',
				user_id: 'user-sanitize',
				user_slug: 'some-slug'
			}
		)
		
		const originalQuery = req.client.query
		req.client.query = async (sql, params) => {
			if (sql.includes('UPDATE users') && sql.includes('display_name = $1')) {
				updateDisplayNameCalls.push({ display_name: params[0], user_id: params[1] })
			}
			return await originalQuery.call(req.client, sql, params)
		}
		
		req.client.addQueryMock('UPDATE users', { rows: [] })
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveDisplayName(req, res)
		
		// Verify display name was sanitized
		assertEquals(
			1,
			aiAskCalls.length,
			"Should call AI for validation."
		)
		assertEquals(
			'John Doe',
			aiAskCalls[0].messages[0].content,
			"Should sanitize display name by removing non-letters and extra spaces."
		)
		
		// Verify updateDisplayName was called with sanitized name
		assertEquals(
			1,
			updateDisplayNameCalls.length,
			"Should call updateDisplayName with sanitized name."
		)
		assertEquals(
			'John Doe',
			updateDisplayNameCalls[0].display_name,
			"Should update with sanitized display name."
		)
	},

	testEmptyDisplayNameAfterSanitization: async () => {
		// Reset all calls
		aiAskCalls = []
		updateDisplayNameCalls = []
		
		// Setup mock request with only special characters
		const req = createMockRequest(
			{ 
				display_name: '123@#$%^&*()'
			},
			{ 
				session_id: 'session-empty',
				user_id: 'user-empty'
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveDisplayName(req, res)
		
		// Verify no AI call since name becomes empty
		assertEquals(
			0,
			aiAskCalls.length,
			"Should not call AI for empty display name."
		)
		assertEquals(
			0,
			updateDisplayNameCalls.length,
			"Should not call updateDisplayName for empty display name."
		)
		
		// Verify error response
		assertEquals(
			true,
			res.isEnded(),
			"Response should be ended."
		)
		
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			"Empty",
			responseData.error,
			"Should return empty error."
		)
		assertEquals(
			undefined,
			responseData.success,
			"Should not return success for empty name."
		)
	},

	testRejectedDisplayName: async () => {
		// Reset all calls
		aiAskCalls = []
		updateDisplayNameCalls = []
		
		// Mock AI to reject display name
		mockAI.ask = async (messages, type, format) => {
			aiAskCalls.push({ messages, type, format })
			return JSON.stringify({ 
				keyword: "Inappropriate",
				note: "Contains inappropriate content"
			})
		}
		
		// Setup mock request
		const req = createMockRequest(
			{ 
				display_name: 'BadName'
			},
			{ 
				session_id: 'session-bad',
				user_id: 'user-bad'
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveDisplayName(req, res)
		
		// Verify AI was called
		assertEquals(
			1,
			aiAskCalls.length,
			"Should call AI for validation."
		)
		
		// Verify updateDisplayName was not called
		assertEquals(
			0,
			updateDisplayNameCalls.length,
			"Should not call updateDisplayName for rejected name."
		)
		
		// Verify error response
		assertEquals(
			true,
			res.isEnded(),
			"Response should be ended."
		)
		
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			"Inappropriate",
			responseData.error,
			"Should return AI rejection reason."
		)
		assertEquals(
			undefined,
			responseData.success,
			"Should not return success for rejected name."
		)
		
		// Reset AI mock for other tests
		mockAI.ask = async (messages, type, format) => {
			aiAskCalls.push({ messages, type, format })
			return JSON.stringify({ keyword: "OK" })
		}
	},

	testDisplayNameNotChanged: async () => {
		// Reset all calls
		aiAskCalls = []
		updateDisplayNameCalls = []
		
		// Setup mock request
		const req = createMockRequest(
			{ 
				display_name: 'Valid Name'
			},
			{ 
				session_id: 'session-nochange',
				user_id: 'user-nochange',
				user_slug: null // No user_slug indicates name wasn't changed
			}
		)
		
		const originalQuery = req.client.query
		req.client.query = async (sql, params) => {
			if (sql.includes('UPDATE users') && sql.includes('display_name = $1')) {
				updateDisplayNameCalls.push({ display_name: params[0], user_id: params[1] })
			}
			return await originalQuery.call(req.client, sql, params)
		}
		
		req.client.addQueryMock('UPDATE users', { rows: [] })
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveDisplayName(req, res)
		
		// Verify AI was called
		assertEquals(
			1,
			aiAskCalls.length,
			"Should call AI for validation."
		)
		
		// Verify updateDisplayName was called
		assertEquals(
			1,
			updateDisplayNameCalls.length,
			"Should call updateDisplayName."
		)
		
		// Verify error response due to no user_slug
		assertEquals(
			true,
			res.isEnded(),
			"Response should be ended."
		)
		
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			"Display name was not changed",
			responseData.error,
			"Should return not changed error when user_slug is missing."
		)
		assertEquals(
			undefined,
			responseData.success,
			"Should not return success when display name wasn't changed."
		)
	},

	testWhitespaceHandling: async () => {
		// Reset all calls
		aiAskCalls = []
		updateDisplayNameCalls = []
		
		// Setup mock request with extra whitespace
		const req = createMockRequest(
			{ 
				display_name: '   John    Doe   Smith   '
			},
			{ 
				session_id: 'session-whitespace',
				user_id: 'user-whitespace',
				user_slug: 'john-doe-smith'
			}
		)
		
		const originalQuery = req.client.query
		req.client.query = async (sql, params) => {
			if (sql.includes('UPDATE users') && sql.includes('display_name = $1')) {
				updateDisplayNameCalls.push({ display_name: params[0], user_id: params[1] })
			}
			return await originalQuery.call(req.client, sql, params)
		}
		
		req.client.addQueryMock('UPDATE users', { rows: [] })
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveDisplayName(req, res)
		
		// Verify whitespace was normalized
		assertEquals(
			1,
			aiAskCalls.length,
			"Should call AI for validation."
		)
		assertEquals(
			'John Doe Smith',
			aiAskCalls[0].messages[0].content,
			"Should normalize whitespace to single spaces and trim."
		)
		
		// Verify updateDisplayName was called with normalized name
		assertEquals(
			1,
			updateDisplayNameCalls.length,
			"Should call updateDisplayName."
		)
		assertEquals(
			'John Doe Smith',
			updateDisplayNameCalls[0].display_name,
			"Should update with normalized display name."
		)
	},

	testNoActionWhenMissingDisplayName: async () => {
		// Reset all calls
		aiAskCalls = []
		updateDisplayNameCalls = []
		
		// Setup mock request without display_name
		const req = createMockRequest(
			{
				// display_name missing
			},
			{ 
				session_id: 'session-missing',
				user_id: 'user-missing'
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveDisplayName(req, res)
		
		// Verify no action taken
		assertEquals(
			false,
			res.isEnded(),
			"Should not end response when display_name missing."
		)
		assertEquals(
			0,
			aiAskCalls.length,
			"Should not call AI when display_name missing."
		)
		assertEquals(
			0,
			updateDisplayNameCalls.length,
			"Should not call updateDisplayName when display_name missing."
		)
	},

	testNoActionWhenMissingUserId: async () => {
		// Reset all calls
		aiAskCalls = []
		updateDisplayNameCalls = []
		
		// Setup mock request without user_id
		const req = createMockRequest(
			{ 
				display_name: 'Test Name'
			},
			{ 
				session_id: 'session-nouser',
				user_id: undefined // No user_id
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveDisplayName(req, res)
		
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
	},

	testNoActionWhenAlreadyEnded: async () => {
		// Reset all calls
		aiAskCalls = []
		updateDisplayNameCalls = []
		
		// Setup mock request
		const req = createMockRequest(
			{ 
				display_name: 'Test Name'
			},
			{ 
				session_id: 'session-ended',
				user_id: 'user-ended'
			}
		)
		
		const res = createMockResponse()
		// Simulate response already ended
		res.writableEnded = true
		
		// Execute the handler
		await saveDisplayName(req, res)
		
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
	}
}

// Restore original functions after tests
const cleanup = () => {
	// Restore original modules
	delete require.cache[aiPath]
	delete require.cache[saveDisplayNamePath]
}

runTests(path.basename(__filename), Object.values(tests))
cleanup()