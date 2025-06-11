const { assertEquals, runTests } = require("../../client/shared/testUtils.js")

// Mock database client for server unit tests
function createMockDatabaseClient(options = {}) {
	const queryMocks = []
	const { verbose = false } = options
	
	const mockClient = {
		query: async (sql, params) => {
			// Find matching mock
			for (const mock of queryMocks) {
				if (mock.match(sql, params)) {
					return mock.response
				}
			}
			
			// Only log unmocked queries if verbose mode is enabled
			if (verbose) {
				console.warn(`Unmocked database query: ${sql}`)
			}
			return { rows: [] }
		},
		
		// Helper to add query mocks
		addQueryMock: (matcher, response) => {
			queryMocks.push({
				match: typeof matcher === "string" 
					? (sql) => sql.includes(matcher)
					: matcher,
				response: response
			})
		},
		
		// Helper to clear all mocks
		clearQueryMocks: () => {
			queryMocks.length = 0
		}
	}
	
	return mockClient
}

// Mock request/response objects for server unit tests
// Pass { verbose: true } in options to enable logging of unmocked database queries
function createMockRequest(body = {}, session = {}, options = {}) {
	const mockClient = createMockDatabaseClient(options)
	
	return {
		body,
		session: {
			user_id: "123",
			display_name: "Test User",
			user_slug: "test-user",
			display_name_index: 0,
			...session
		},
		results: {
			posts: [],
			replies: [],
			activities: [],
			notifications: [],
			conversations: [],
			messages: [],
			path: body.path,
		},
		client: mockClient,
		sendWsMessage: (type, id) => {
			// Mock WebSocket message sending
		},
		sendWsMessageToConversation: (type, conversation_id) => {
			// Mock WebSocket message sending to conversation
		},
		sendWsMessageToUser: (type, user_id) => {
			// Mock WebSocket message sending to user
		},
		sendWsMessageToUsers: (type, user_ids) => {
			// Mock WebSocket message sending to users
		}
	}
}

function createMockResponse() {
	let ended = false
	let responseData = null
	const headers = {}
	
	return {
		writableEnded: ended,
		end: (data) => {
			ended = true
			responseData = data
		},
		setHeader: (name, value) => {
			headers[name] = value
		},
		getResponseData: () => responseData,
		isEnded: () => ended,
		getHeaders: () => headers
	}
}

module.exports = {
	createMockDatabaseClient,
	createMockRequest,
	createMockResponse,
	assertEquals,
	runTests
}