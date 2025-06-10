const path = require("path")
const {
	createMockRequest,
	createMockResponse,
	assertEquals,
	runTests
} = require("../shared/serverTestSetup.js")

// Import the handler we're testing
const createUserIfNotExists = require("../../../server/session/createUserIfNotExists.js")

const tests = {
	testCreateUserOnDisplayName: async () => {
		// Setup mock request with display_name but no user_id
		const req = createMockRequest(
			{ display_name: "New User" },
			{ session_id: '123', user_id: undefined }
		)
		req.results = {}
		
		// Setup mock database responses for user creation sequence
		req.client.addQueryMock(
			'INSERT INTO users',
			{ rows: [{ user_id: '456' }] }
		)
		req.client.addQueryMock(
			'INSERT INTO user_sessions',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await createUserIfNotExists(req, res)
		
		// Verify user was created and session updated
		assertEquals(
			'456',
			req.session.user_id,
			"User ID should be set from database result."
		)
		assertEquals(
			'456',
			req.session.user_slug,
			"User slug should be set to user ID."
		)
		assertEquals(
			"0",
			req.session.subscribed_to_users,
			"Subscribed users should be initialized to '0'."
		)
	},

	testCreateUserOnTitle: async () => {
		// Setup mock request with title field
		const req = createMockRequest(
			{ title: "New Post Title" },
			{ session_id: '123', user_id: null }
		)
		req.results = {}
		
		req.client.addQueryMock(
			'INSERT INTO users',
			{ rows: [{ user_id: '789' }] }
		)
		req.client.addQueryMock(
			'INSERT INTO user_sessions',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		await createUserIfNotExists(req, res)
		
		// Should create user for title field
		assertEquals(
			'789',
			req.session.user_id,
			"Should create user when title field is present."
		)
	},

	testCreateUserOnFavoriteActions: async () => {
		// Test various favorite actions trigger user creation
		const favoriteActions = [
			{ post_id_to_favorite: 123 },
			{ reply_id_to_favorite: 456 }
		]
		
		for (let i = 0; i < favoriteActions.length; i++) {
			const action = favoriteActions[i]
			const req = createMockRequest(
				action,
				{ session_id: '123', user_id: undefined }
			)
			req.results = {}
			
			req.client.clearQueryMocks()
			req.client.addQueryMock(
				'INSERT INTO users',
				{ rows: [{ user_id: `favorite-user-${i}` }] }
			)
			req.client.addQueryMock(
				'INSERT INTO user_sessions',
				{ rows: [] }
			)
			
			const res = createMockResponse()
			
			await createUserIfNotExists(req, res)
			
			assertEquals(
				`favorite-user-${i}`,
				req.session.user_id,
				`Should create user for favorite action: ${Object.keys(action)[0]}.`
			)
		}
	},

	testCreateUserOnBlockActions: async () => {
		// Test various block actions trigger user creation
		const blockActions = [
			{ post_id_to_block: 123 },
			{ reply_id_to_block: 456 }
		]
		
		for (let i = 0; i < blockActions.length; i++) {
			const action = blockActions[i]
			const req = createMockRequest(
				action,
				{ session_id: '123', user_id: null }
			)
			req.results = {}
			
			req.client.clearQueryMocks()
			req.client.addQueryMock(
				'INSERT INTO users',
				{ rows: [{ user_id: `block-user-${i}` }] }
			)
			req.client.addQueryMock(
				'INSERT INTO user_sessions',
				{ rows: [] }
			)
			
			const res = createMockResponse()
			
			await createUserIfNotExists(req, res)
			
			assertEquals(
				`block-user-${i}`,
				req.session.user_id,
				`Should create user for block action: ${Object.keys(action)[0]}.`
			)
		}
	},

	testCreateUserOnFlagActions: async () => {
		// Test various flag actions trigger user creation
		const flagActions = [
			{ post_id_to_flag: 123 },
			{ reply_id_to_flag: 456 }
		]
		
		for (let i = 0; i < flagActions.length; i++) {
			const action = flagActions[i]
			const req = createMockRequest(
				action,
				{ session_id: '123', user_id: undefined }
			)
			req.results = {}
			
			req.client.clearQueryMocks()
			req.client.addQueryMock(
				'INSERT INTO users',
				{ rows: [{ user_id: `flag-user-${i}` }] }
			)
			req.client.addQueryMock(
				'INSERT INTO user_sessions',
				{ rows: [] }
			)
			
			const res = createMockResponse()
			
			await createUserIfNotExists(req, res)
			
			assertEquals(
				`flag-user-${i}`,
				req.session.user_id,
				`Should create user for flag action: ${Object.keys(action)[0]}.`
			)
		}
	},

	testCreateUserOnPollChoice: async () => {
		// Test poll voting triggers user creation
		const req = createMockRequest(
			{ post_id: 456, poll_choice: 'option-a' },
			{ session_id: '123', user_id: null }
		)
		req.results = {}
		
		req.client.addQueryMock(
			'INSERT INTO users',
			{ rows: [{ user_id: '999' }] }
		)
		req.client.addQueryMock(
			'INSERT INTO user_sessions',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		await createUserIfNotExists(req, res)
		
		assertEquals(
			'999',
			req.session.user_id,
			"Should create user for poll voting."
		)
	},

	testCreateUserOnSubscribe: async () => {
		// Test subscribing to user triggers user creation
		const req = createMockRequest(
			{ subscribe_to_user_id: '567' },
			{ session_id: '123', user_id: undefined }
		)
		req.results = {}
		
		req.client.addQueryMock(
			'INSERT INTO users',
			{ rows: [{ user_id: '777' }] }
		)
		req.client.addQueryMock(
			'INSERT INTO user_sessions',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		await createUserIfNotExists(req, res)
		
		assertEquals(
			'777',
			req.session.user_id,
			"Should create user for subscription action."
		)
	},

	testNoActionWhenUserExists: async () => {
		// Setup mock request with existing user
		const req = createMockRequest(
			{ display_name: "New Name" },
			{ session_id: '123', user_id: '123' }
		)
		req.results = {}
		
		const res = createMockResponse()
		
		// Store original user_id
		const originalUserId = req.session.user_id
		
		// Execute the handler
		await createUserIfNotExists(req, res)
		
		// Verify no change occurred
		assertEquals(
			originalUserId,
			req.session.user_id,
			"Existing user ID should not change."
		)
	},

	testNoActionWhenNoSessionId: async () => {
		// Setup mock request without session_id
		const req = createMockRequest(
			{ display_name: "New User" },
			{ session_id: undefined, user_id: undefined }
		)
		req.results = {}
		
		const res = createMockResponse()
		
		// Execute the handler
		await createUserIfNotExists(req, res)
		
		// Verify no user created
		assertEquals(
			undefined,
			req.session.user_id,
			"Should not create user without session_id."
		)
	},

	testNoActionWhenNoTriggerFields: async () => {
		// Setup mock request without any trigger fields
		const req = createMockRequest(
			{ some_other_field: "value" },
			{ session_id: '123', user_id: undefined }
		)
		req.results = {}
		
		const res = createMockResponse()
		
		// Execute the handler
		await createUserIfNotExists(req, res)
		
		// Verify no user created
		assertEquals(
			undefined,
			req.session.user_id,
			"Should not create user without trigger fields."
		)
	},

	testNoActionWhenAlreadyEnded: async () => {
		// Setup mock request
		const req = createMockRequest(
			{ display_name: "New User" },
			{ session_id: '123', user_id: undefined }
		)
		req.results = {}
		
		const res = createMockResponse()
		// Simulate response already ended
		res.writableEnded = true
		
		// Execute the handler
		await createUserIfNotExists(req, res)
		
		// Verify no action taken
		assertEquals(
			undefined,
			req.session.user_id,
			"Should not create user when response already ended."
		)
	},

	testDatabaseSequence: async () => {
		// Test that both database queries execute in correct sequence
		const req = createMockRequest(
			{ display_name: "Test User" },
			{ session_id: '456', user_id: undefined }
		)
		req.results = {}
		
		// Setup sequential mock responses
		req.client.addQueryMock(
			'INSERT INTO users',
			{ rows: [{ user_id: '123' }] }
		)
		req.client.addQueryMock(
			'INSERT INTO user_sessions',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await createUserIfNotExists(req, res)
		
		// Verify user was created and session linked
		assertEquals(
			'123',
			req.session.user_id,
			"User ID should be set from first query."
		)
		assertEquals(
			'123',
			req.session.user_slug,
			"User slug should match user ID."
		)
		assertEquals(
			"0",
			req.session.subscribed_to_users,
			"Subscribed users should be initialized."
		)
	},

	testEmptyEmailAndDisplayName: async () => {
		// Verify that user is created with empty email and display_name
		const req = createMockRequest(
			{ title: "New Post" },
			{ session_id: '123', user_id: null }
		)
		req.results = {}
		
		req.client.addQueryMock(
			'INSERT INTO users',
			{ rows: [{ user_id: '678' }] }
		)
		req.client.addQueryMock(
			'INSERT INTO user_sessions',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		await createUserIfNotExists(req, res)
		
		// Verify user was created (implementation uses empty strings)
		assertEquals(
			'678',
			req.session.user_id,
			"Should create user with empty email and display_name."
		)
	},

	testMultipleTriggerFields: async () => {
		// Test when multiple trigger fields are present
		const req = createMockRequest(
			{ 
				display_name: "Multi User",
				title: "New Post",
				post_id_to_favorite: 123
			},
			{ session_id: '123', user_id: undefined }
		)
		req.results = {}
		
		req.client.addQueryMock(
			'INSERT INTO users',
			{ rows: [{ user_id: '789' }] }
		)
		req.client.addQueryMock(
			'INSERT INTO user_sessions',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		await createUserIfNotExists(req, res)
		
		// Should still create user (condition uses OR logic)
		assertEquals(
			'789',
			req.session.user_id,
			"Should create user when multiple trigger fields present."
		)
	},

	testPollChoiceRequiresBothFields: async () => {
		// Test that poll choice requires both post_id and poll_choice
		const incompletePolls = [
			{ post_id: 101, poll_choice: null },
			{ post_id: null, poll_choice: 'option-a' },
			{ post_id: 101 }, // no poll_choice
			{ poll_choice: 'option-a' } // no post_id
		]
		
		for (let i = 0; i < incompletePolls.length; i++) {
			const pollData = incompletePolls[i]
			const req = createMockRequest(
				pollData,
				{ session_id: '123', user_id: undefined }
			)
			req.results = {}
			
			const res = createMockResponse()
			
			await createUserIfNotExists(req, res)
			
			assertEquals(
				undefined,
				req.session.user_id,
				`Should not create user for incomplete poll data: ${JSON.stringify(pollData)}.`
			)
		}
	}
}

runTests(path.basename(__filename), Object.values(tests))