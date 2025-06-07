const path = require("path")
const {
	createMockRequest,
	createMockResponse,
	assertEquals,
	runTests
} = require("../shared/serverTestSetup.js")

// Import the handler we're testing
const createSessionIfNotExists = require("../../../server/session/createSessionIfNotExists.js")

const tests = {
	testCreateSessionWhenMissing: async () => {
		// Setup mock request without session_uuid
		const req = createMockRequest({}, { session_uuid: null })
		req.results = {}
		
		// Setup mock database responses
		req.client.addQueryMock(
			'INSERT INTO sessions',
			{ rows: [{ session_id: 'new-session-123' }] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await createSessionIfNotExists(req, res)
		
		// Verify session was created
		assertEquals(
			'string',
			typeof req.session.session_uuid,
			"Session UUID should be generated."
		)
		assertEquals(
			true,
			req.session.session_uuid.length > 0,
			"Session UUID should not be empty."
		)
		assertEquals(
			'new-session-123',
			req.session.session_id,
			"Session ID should be set from database result."
		)
		assertEquals(
			req.session.session_uuid,
			req.results.session_uuid,
			"Session UUID should be set in results."
		)
	},

	testCreateSessionOnLogout: async () => {
		// Setup mock request with logout flag (creates new session even if one exists)
		const req = createMockRequest({ logout: true }, { session_uuid: 'existing-uuid' })
		req.results = {}
		
		// Setup mock database responses
		req.client.addQueryMock(
			'INSERT INTO sessions',
			{ rows: [{ session_id: 'logout-session-456' }] }
		)
		
		const res = createMockResponse()
		
		// Store original UUID to verify it changes
		const originalUuid = req.session.session_uuid
		
		// Execute the handler
		await createSessionIfNotExists(req, res)
		
		// Verify new session was created despite existing one
		assertEquals(
			'string',
			typeof req.session.session_uuid,
			"New session UUID should be generated."
		)
		assertEquals(
			false,
			req.session.session_uuid === originalUuid,
			"Session UUID should be different from original."
		)
		assertEquals(
			'logout-session-456',
			req.session.session_id,
			"New session ID should be set."
		)
	},

	testNoActionWhenSessionExists: async () => {
		// Setup mock request with existing session (no logout)
		const req = createMockRequest({}, { session_uuid: 'existing-valid-uuid' })
		req.results = {}
		
		const res = createMockResponse()
		
		// Store original values
		const originalUuid = req.session.session_uuid
		const originalSessionId = req.session.session_id
		
		// Execute the handler
		await createSessionIfNotExists(req, res)
		
		// Verify session was not modified
		assertEquals(
			originalUuid,
			req.session.session_uuid,
			"Existing session UUID should not change."
		)
		assertEquals(
			originalSessionId,
			req.session.session_id,
			"Existing session ID should not change."
		)
		assertEquals(
			undefined,
			req.results.session_uuid,
			"Results should not be set when session exists."
		)
	},

	testNoActionWhenAlreadyEnded: async () => {
		// Setup mock request
		const req = createMockRequest({}, { session_uuid: null })
		req.results = {}
		
		const res = createMockResponse()
		// Simulate response already ended
		res.writableEnded = true
		
		// Execute the handler
		await createSessionIfNotExists(req, res)
		
		// Verify no action taken
		assertEquals(
			null,
			req.session.session_uuid,
			"Session UUID should not be created when response already ended."
		)
		assertEquals(
			undefined,
			req.results.session_uuid,
			"Results should not be set when response already ended."
		)
	},

	testSetCookieHeader: async () => {
		// Test that Set-Cookie header is properly set
		const req = createMockRequest({}, { session_uuid: null })
		req.results = {}
		
		req.client.addQueryMock(
			'INSERT INTO sessions',
			{ rows: [{ session_id: 'cookie-session-789' }] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await createSessionIfNotExists(req, res)
		
		// Verify Set-Cookie header
		const headers = res.getHeaders()
		assertEquals(
			true,
			headers['Set-Cookie'] !== undefined,
			"Set-Cookie header should be set."
		)
		assertEquals(
			true,
			headers['Set-Cookie'].includes(req.session.session_uuid),
			"Set-Cookie should contain the session UUID."
		)
		assertEquals(
			true,
			headers['Set-Cookie'].includes('HttpOnly'),
			"Set-Cookie should include HttpOnly flag."
		)
		assertEquals(
			true,
			headers['Set-Cookie'].includes('Secure'),
			"Set-Cookie should include Secure flag."
		)
		assertEquals(
			true,
			headers['Set-Cookie'].includes('Path=/session'),
			"Set-Cookie should include correct path."
		)
	},

	testUuidFormat: async () => {
		// Test that generated UUID follows proper format
		const req = createMockRequest({}, { session_uuid: null })
		req.results = {}
		
		req.client.addQueryMock(
			'INSERT INTO sessions',
			{ rows: [{ session_id: 'uuid-test-session' }] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await createSessionIfNotExists(req, res)
		
		// Verify UUID format (should be standard UUID v4 format)
		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
		assertEquals(
			true,
			uuidRegex.test(req.session.session_uuid),
			"Generated UUID should follow standard UUID v4 format."
		)
	},

	testMultipleSessionCreations: async () => {
		// Test that multiple calls generate different UUIDs
		const generatedUuids = []
		
		for (let i = 0; i < 3; i++) {
			const req = createMockRequest({}, { session_uuid: null })
			req.results = {}
			
			req.client.clearQueryMocks()
			req.client.addQueryMock(
				'INSERT INTO sessions',
				{ rows: [{ session_id: `multi-session-${i}` }] }
			)
			
			const res = createMockResponse()
			
			// Execute the handler
			await createSessionIfNotExists(req, res)
			
			generatedUuids.push(req.session.session_uuid)
		}
		
		// Verify all UUIDs are unique
		const uniqueUuids = new Set(generatedUuids)
		assertEquals(
			3,
			uniqueUuids.size,
			"All generated UUIDs should be unique."
		)
	},

	testLogoutWithVariousInputs: async () => {
		// Test logout behavior with different input values
		const logoutValues = [true, 'true', 1, 'logout']
		
		for (const logoutValue of logoutValues) {
			const req = createMockRequest(
				{ logout: logoutValue }, 
				{ session_uuid: 'existing-uuid-for-logout' }
			)
			req.results = {}
			
			req.client.clearQueryMocks()
			req.client.addQueryMock(
				'INSERT INTO sessions',
				{ rows: [{ session_id: `logout-test-${logoutValue}` }] }
			)
			
			const res = createMockResponse()
			
			// Execute the handler
			await createSessionIfNotExists(req, res)
			
			// Should create new session for any truthy logout value
			assertEquals(
				false,
				req.session.session_uuid === 'existing-uuid-for-logout',
				`Should create new session when logout=${logoutValue}.`
			)
		}
	},

	testDatabaseIntegration: async () => {
		// Test that the database insert works correctly
		const req = createMockRequest({}, { session_uuid: null })
		req.results = {}
		
		const testSessionId = 'db-integration-session-999'
		req.client.addQueryMock(
			'INSERT INTO sessions',
			{ rows: [{ session_id: testSessionId }] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await createSessionIfNotExists(req, res)
		
		// Verify database result is properly handled
		assertEquals(
			testSessionId,
			req.session.session_id,
			"Session ID should be extracted from database result."
		)
		assertEquals(
			'string',
			typeof req.session.session_uuid,
			"Session UUID should be a string."
		)
		assertEquals(
			36,
			req.session.session_uuid.length,
			"Session UUID should be 36 characters (standard UUID length)."
		)
	}
}

runTests(path.basename(__filename), Object.values(tests))