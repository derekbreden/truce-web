const { assertEquals, runTests } = require("../../client/shared/testUtils.js")

// Mock database client for server unit tests
function createMockDatabaseClient() {
	const queryMocks = []
	
	const mockClient = {
		query: async (sql, params) => {
			// Find matching mock
			for (const mock of queryMocks) {
				if (mock.match(sql, params)) {
					return mock.response
				}
			}
			
			// Default response if no mock matched
			console.warn(`Unmocked database query: ${sql}`)
			return { rows: [] }
		},
		
		// Helper to add query mocks
		addQueryMock: (matcher, response) => {
			queryMocks.push({
				match: typeof matcher === 'string' 
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
function createMockRequest(body = {}, session = {}) {
	const mockClient = createMockDatabaseClient()
	
	return {
		body,
		session: {
			user_id: 'test-user-123',
			display_name: 'Test User',
			user_slug: 'test-user',
			display_name_index: 0,
			...session
		},
		client: mockClient
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