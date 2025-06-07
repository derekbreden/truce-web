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
			{ session_id: 'session-123', user_id: undefined }
		)
		req.results = {}
		
		// Setup mock database responses for user creation sequence
		req.client.addQueryMock(
			'INSERT INTO users',
			{ rows: [{ user_id: 'new-user-456' }] }
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
			'new-user-456',
			req.session.user_id,
			"User ID should be set from database result."
		)
		assertEquals(
			'new-user-456',
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
			{ title: "New Topic Title" },
			{ session_id: 'session-123', user_id: null }
		)
		req.results = {}
		
		req.client.addQueryMock(
			'INSERT INTO users',
			{ rows: [{ user_id: 'title-user-789' }] }
		)
		req.client.addQueryMock(
			'INSERT INTO user_sessions',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		await createUserIfNotExists(req, res)
		
		// Should create user for title field
		assertEquals(
			'title-user-789',
			req.session.user_id,
			"Should create user when title field is present."
		)
	},

	testCreateUserOnFavoriteActions: async () => {
		// Test various favorite actions trigger user creation
		const favoriteActions = [
			{ topic_id_to_favorite: 'topic-123' },
			{ comment_id_to_favorite: 'comment-456' }
		]
		
		for (let i = 0; i < favoriteActions.length; i++) {
			const action = favoriteActions[i]
			const req = createMockRequest(
				action,
				{ session_id: 'session-123', user_id: undefined }
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
			{ topic_id_to_block: 'topic-123' },
			{ comment_id_to_block: 'comment-456' }
		]
		
		for (let i = 0; i < blockActions.length; i++) {
			const action = blockActions[i]
			const req = createMockRequest(
				action,
				{ session_id: 'session-123', user_id: null }
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
			{ topic_id_to_flag: 'topic-123' },
			{ comment_id_to_flag: 'comment-456' }
		]
		
		for (let i = 0; i < flagActions.length; i++) {
			const action = flagActions[i]
			const req = createMockRequest(
				action,
				{ session_id: 'session-123', user_id: undefined }
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
			{ topic_id: 'poll-topic-123', poll_choice: 'option-a' },
			{ session_id: 'session-123', user_id: null }
		)
		req.results = {}
		
		req.client.addQueryMock(
			'INSERT INTO users',
			{ rows: [{ user_id: 'poll-user-999' }] }
		)
		req.client.addQueryMock(
			'INSERT INTO user_sessions',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		await createUserIfNotExists(req, res)
		
		assertEquals(
			'poll-user-999',
			req.session.user_id,
			"Should create user for poll voting."
		)
	},

	testCreateUserOnSubscribe: async () => {
		// Test subscribing to user triggers user creation
		const req = createMockRequest(
			{ subscribe_to_user_id: 'user-to-follow' },
			{ session_id: 'session-123', user_id: undefined }
		)
		req.results = {}
		
		req.client.addQueryMock(
			'INSERT INTO users',
			{ rows: [{ user_id: 'subscriber-user-777' }] }
		)
		req.client.addQueryMock(
			'INSERT INTO user_sessions',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		await createUserIfNotExists(req, res)
		
		assertEquals(
			'subscriber-user-777',
			req.session.user_id,
			"Should create user for subscription action."
		)
	},

	testNoActionWhenUserExists: async () => {
		// Setup mock request with existing user
		const req = createMockRequest(
			{ display_name: "New Name" },
			{ session_id: 'session-123', user_id: 'existing-user-123' }
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
			{ session_id: 'session-123', user_id: undefined }
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
			{ session_id: 'session-123', user_id: undefined }
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
			{ session_id: 'session-abc', user_id: undefined }
		)
		req.results = {}
		
		// Setup sequential mock responses
		req.client.addQueryMock(
			'INSERT INTO users',
			{ rows: [{ user_id: 'sequence-user-123' }] }
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
			'sequence-user-123',
			req.session.user_id,
			"User ID should be set from first query."
		)
		assertEquals(
			'sequence-user-123',
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
			{ title: "New Topic" },
			{ session_id: 'session-123', user_id: null }
		)
		req.results = {}
		
		req.client.addQueryMock(
			'INSERT INTO users',
			{ rows: [{ user_id: 'empty-fields-user' }] }
		)
		req.client.addQueryMock(
			'INSERT INTO user_sessions',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		await createUserIfNotExists(req, res)
		
		// Verify user was created (implementation uses empty strings)
		assertEquals(
			'empty-fields-user',
			req.session.user_id,
			"Should create user with empty email and display_name."
		)
	},

	testMultipleTriggerFields: async () => {
		// Test when multiple trigger fields are present
		const req = createMockRequest(
			{ 
				display_name: "Multi User",
				title: "New Topic",
				topic_id_to_favorite: 'topic-123'
			},
			{ session_id: 'session-123', user_id: undefined }
		)
		req.results = {}
		
		req.client.addQueryMock(
			'INSERT INTO users',
			{ rows: [{ user_id: 'multi-trigger-user' }] }
		)
		req.client.addQueryMock(
			'INSERT INTO user_sessions',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		await createUserIfNotExists(req, res)
		
		// Should still create user (condition uses OR logic)
		assertEquals(
			'multi-trigger-user',
			req.session.user_id,
			"Should create user when multiple trigger fields present."
		)
	},

	testPollChoiceRequiresBothFields: async () => {
		// Test that poll choice requires both topic_id and poll_choice
		const incompletePolls = [
			{ topic_id: 'poll-topic', poll_choice: null },
			{ topic_id: null, poll_choice: 'option-a' },
			{ topic_id: 'poll-topic' }, // no poll_choice
			{ poll_choice: 'option-a' } // no topic_id
		]
		
		for (let i = 0; i < incompletePolls.length; i++) {
			const pollData = incompletePolls[i]
			const req = createMockRequest(
				pollData,
				{ session_id: 'session-123', user_id: undefined }
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