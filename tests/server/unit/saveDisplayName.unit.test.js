// Mock AI module (internal dependency - use real one but control responses)
let ai_ask_calls = []
const mock_ai = {
	ask: async (messages, type, format) => {
		ai_ask_calls.push({ messages, type, format })
		// Default to OK
		return JSON.stringify({ keyword: "OK" })
	}
}

// Replace AI module in require cache
const ai_path = require.resolve("../../../server/ai")
delete require.cache[ai_path]
require.cache[ai_path] = {
	exports: mock_ai,
	loaded: true,
	id: ai_path
}

// Track updateDisplayName calls by monitoring for its specific database query
let update_display_name_calls = []

const path = require("path")
const {
	createMockRequest,
	createMockResponse,
	assertEquals,
	runTests
} = require("../shared/serverTestSetup.js")

// Clear the handler cache and import it after setting up mocks
const save_display_name_path = require.resolve("../../../server/session/saveDisplayName.js")
delete require.cache[save_display_name_path]

// Import the handler we're testing (after mocking everything)
const saveDisplayName = require("../../../server/session/saveDisplayName.js")

// Import prompts for verification
const prompts = require("../../../server/prompts.js")

const tests = {
	testSuccessfulDisplayNameSave: async () => {
		// Reset all calls
		ai_ask_calls = []
		update_display_name_calls = []
		
		// Setup mock request
		const req = createMockRequest(
			{ 
				display_name: "John Doe"
			},
			{ 
				session_id: "session-123",
				user_id: "user-456",
				display_name: "Old Name",
				user_slug: "john-doe-slug",
				display_name_index: "johndoe"
			}
		)
		
		// Track updateDisplayName calls by monitoring for its specific database query
		const original_query = req.client.query
		req.client.query = async (sql, params) => {
			// Check if this is the updateDisplayName query
			if (sql.includes("UPDATE users") && sql.includes("display_name = $1")) {
				update_display_name_calls.push({ display_name: params[0], user_id: params[1] })
			}
			return await original_query.call(req.client, sql, params)
		}
		
		// Setup database mocks for updateDisplayName
		req.client.addQueryMock("UPDATE users", { rows: [] })
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveDisplayName(req, res)
		
		// Verify AI validation was called
		assertEquals(
			1,
			ai_ask_calls.length,
			"Should call AI for display name validation."
		)
		
		const aiCall = ai_ask_calls[0]
		assertEquals(
			"display_name",
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
			"John Doe",
			aiCall.messages[0].content,
			"Should validate sanitized display name."
		)
		
		// Verify updateDisplayName was called
		assertEquals(
			1,
			update_display_name_calls.length,
			"Should call updateDisplayName."
		)
		assertEquals(
			"John Doe",
			update_display_name_calls[0].display_name,
			"Should update with sanitized display name."
		)
		
		// Verify successful response
		assertEquals(
			true,
			res.isEnded(),
			"Response should be ended."
		)
		
		const response_data = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			response_data.success,
			"Should return success."
		)
		assertEquals(
			"user-456",
			response_data.user_id,
			"Should return user ID."
		)
		assertEquals(
			"Old Name",
			response_data.display_name,
			"Should return session display name."
		)
		assertEquals(
			"johndoe",
			response_data.display_name_index,
			"Should return display name index."
		)
		assertEquals(
			"john-doe-slug",
			response_data.user_slug,
			"Should return user slug."
		)
	},

	testDisplayNameSanitization: async () => {
		// Reset all calls
		ai_ask_calls = []
		update_display_name_calls = []
		
		// Setup mock request with special characters
		const req = createMockRequest(
			{ 
				display_name: "John123@#$%^&*()Doe!!!"
			},
			{ 
				session_id: "session-sanitize",
				user_id: "user-sanitize",
				user_slug: "some-slug"
			}
		)
		
		const original_query = req.client.query
		req.client.query = async (sql, params) => {
			if (sql.includes("UPDATE users") && sql.includes("display_name = $1")) {
				update_display_name_calls.push({ display_name: params[0], user_id: params[1] })
			}
			return await original_query.call(req.client, sql, params)
		}
		
		req.client.addQueryMock("UPDATE users", { rows: [] })
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveDisplayName(req, res)
		
		// Verify display name was sanitized
		assertEquals(
			1,
			ai_ask_calls.length,
			"Should call AI for validation."
		)
		assertEquals(
			"John Doe",
			ai_ask_calls[0].messages[0].content,
			"Should sanitize display name by removing non-letters and extra spaces."
		)
		
		// Verify updateDisplayName was called with sanitized name
		assertEquals(
			1,
			update_display_name_calls.length,
			"Should call updateDisplayName with sanitized name."
		)
		assertEquals(
			"John Doe",
			update_display_name_calls[0].display_name,
			"Should update with sanitized display name."
		)
	},

	testEmptyDisplayNameAfterSanitization: async () => {
		// Reset all calls
		ai_ask_calls = []
		update_display_name_calls = []
		
		// Setup mock request with only special characters
		const req = createMockRequest(
			{ 
				display_name: "123@#$%^&*()"
			},
			{ 
				session_id: "session-empty",
				user_id: "user-empty"
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveDisplayName(req, res)
		
		// Verify no AI call since name becomes empty
		assertEquals(
			0,
			ai_ask_calls.length,
			"Should not call AI for empty display name."
		)
		assertEquals(
			0,
			update_display_name_calls.length,
			"Should not call updateDisplayName for empty display name."
		)
		
		// Verify error response
		assertEquals(
			true,
			res.isEnded(),
			"Response should be ended."
		)
		
		const response_data = JSON.parse(res.getResponseData())
		assertEquals(
			"Empty",
			response_data.error,
			"Should return empty error."
		)
		assertEquals(
			undefined,
			response_data.success,
			"Should not return success for empty name."
		)
	},

	testRejectedDisplayName: async () => {
		// Reset all calls
		ai_ask_calls = []
		update_display_name_calls = []
		
		// Mock AI to reject display name
		mock_ai.ask = async (messages, type, format) => {
			ai_ask_calls.push({ messages, type, format })
			return JSON.stringify({ 
				keyword: "Inappropriate",
				note: "Contains inappropriate content"
			})
		}
		
		// Setup mock request
		const req = createMockRequest(
			{ 
				display_name: "BadName"
			},
			{ 
				session_id: "session-bad",
				user_id: "user-bad"
			}
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveDisplayName(req, res)
		
		// Verify AI was called
		assertEquals(
			1,
			ai_ask_calls.length,
			"Should call AI for validation."
		)
		
		// Verify updateDisplayName was not called
		assertEquals(
			0,
			update_display_name_calls.length,
			"Should not call updateDisplayName for rejected name."
		)
		
		// Verify error response
		assertEquals(
			true,
			res.isEnded(),
			"Response should be ended."
		)
		
		const response_data = JSON.parse(res.getResponseData())
		assertEquals(
			"Inappropriate",
			response_data.error,
			"Should return AI rejection reason."
		)
		assertEquals(
			undefined,
			response_data.success,
			"Should not return success for rejected name."
		)
		
		// Reset AI mock for other tests
		mock_ai.ask = async (messages, type, format) => {
			ai_ask_calls.push({ messages, type, format })
			return JSON.stringify({ keyword: "OK" })
		}
	},

	testDisplayNameNotChanged: async () => {
		// Reset all calls
		ai_ask_calls = []
		update_display_name_calls = []
		
		// Setup mock request
		const req = createMockRequest(
			{ 
				display_name: "Valid Name"
			},
			{ 
				session_id: "session-nochange",
				user_id: "user-nochange",
				user_slug: null // No user_slug indicates name wasn't changed
			}
		)
		
		const original_query = req.client.query
		req.client.query = async (sql, params) => {
			if (sql.includes("UPDATE users") && sql.includes("display_name = $1")) {
				update_display_name_calls.push({ display_name: params[0], user_id: params[1] })
			}
			return await original_query.call(req.client, sql, params)
		}
		
		req.client.addQueryMock("UPDATE users", { rows: [] })
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveDisplayName(req, res)
		
		// Verify AI was called
		assertEquals(
			1,
			ai_ask_calls.length,
			"Should call AI for validation."
		)
		
		// Verify updateDisplayName was called
		assertEquals(
			1,
			update_display_name_calls.length,
			"Should call updateDisplayName."
		)
		
		// Verify error response due to no user_slug
		assertEquals(
			true,
			res.isEnded(),
			"Response should be ended."
		)
		
		const response_data = JSON.parse(res.getResponseData())
		assertEquals(
			"Display name was not changed",
			response_data.error,
			"Should return not changed error when user_slug is missing."
		)
		assertEquals(
			undefined,
			response_data.success,
			"Should not return success when display name wasn't changed."
		)
	},

	testWhitespaceHandling: async () => {
		// Reset all calls
		ai_ask_calls = []
		update_display_name_calls = []
		
		// Setup mock request with extra whitespace
		const req = createMockRequest(
			{ 
				display_name: "   John    Doe   Smith   "
			},
			{ 
				session_id: "session-whitespace",
				user_id: "user-whitespace",
				user_slug: "john-doe-smith"
			}
		)
		
		const original_query = req.client.query
		req.client.query = async (sql, params) => {
			if (sql.includes("UPDATE users") && sql.includes("display_name = $1")) {
				update_display_name_calls.push({ display_name: params[0], user_id: params[1] })
			}
			return await original_query.call(req.client, sql, params)
		}
		
		req.client.addQueryMock("UPDATE users", { rows: [] })
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveDisplayName(req, res)
		
		// Verify whitespace was normalized
		assertEquals(
			1,
			ai_ask_calls.length,
			"Should call AI for validation."
		)
		assertEquals(
			"John Doe Smith",
			ai_ask_calls[0].messages[0].content,
			"Should normalize whitespace to single spaces and trim."
		)
		
		// Verify updateDisplayName was called with normalized name
		assertEquals(
			1,
			update_display_name_calls.length,
			"Should call updateDisplayName."
		)
		assertEquals(
			"John Doe Smith",
			update_display_name_calls[0].display_name,
			"Should update with normalized display name."
		)
	},

	testNoActionWhenMissingDisplayName: async () => {
		// Reset all calls
		ai_ask_calls = []
		update_display_name_calls = []
		
		// Setup mock request without display_name
		const req = createMockRequest(
			{
				// display_name missing
			},
			{ 
				session_id: "session-missing",
				user_id: "user-missing"
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
			ai_ask_calls.length,
			"Should not call AI when display_name missing."
		)
		assertEquals(
			0,
			update_display_name_calls.length,
			"Should not call updateDisplayName when display_name missing."
		)
	},

	testNoActionWhenMissingUserId: async () => {
		// Reset all calls
		ai_ask_calls = []
		update_display_name_calls = []
		
		// Setup mock request without user_id
		const req = createMockRequest(
			{ 
				display_name: "Test Name"
			},
			{ 
				session_id: "session-nouser",
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
			ai_ask_calls.length,
			"Should not call AI when user_id missing."
		)
	},

	testNoActionWhenAlreadyEnded: async () => {
		// Reset all calls
		ai_ask_calls = []
		update_display_name_calls = []
		
		// Setup mock request
		const req = createMockRequest(
			{ 
				display_name: "Test Name"
			},
			{ 
				session_id: "session-ended",
				user_id: "user-ended"
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
			ai_ask_calls.length,
			"Should not call AI when response already ended."
		)
	}
}

// Restore original functions after tests
const cleanup = () => {
	// Restore original modules
	delete require.cache[ai_path]
	delete require.cache[save_display_name_path]
}

runTests(path.basename(__filename), Object.values(tests))
cleanup()