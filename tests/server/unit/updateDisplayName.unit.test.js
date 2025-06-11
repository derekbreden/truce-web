const path = require("path")
const {
	createMockRequest,
	createMockResponse,
	assertEquals,
	runTests
} = require("../shared/serverTestSetup.js")

// Import the handler we're testing
const updateDisplayName = require("../../../server/session/updateDisplayName.js")

const tests = {
	testUpdateDisplayNameFirstTime: async () => {
		// Setup mock request with new display name
		const req = createMockRequest({
			display_name: "John Doe"
		})
		
		// Mock response tracker to handle sequential queries
		let queryCount = 0
		
		// Setup mock database responses
		req.client.addQueryMock(
			() => {
				queryCount++
				return queryCount === 1 // First UPDATE query
			},
			{ rows: [{ user_id: "test-user-123" }] } // Name was changed
		)
		req.client.addQueryMock(
			() => queryCount === 2, // Second UPDATE query (set index)
			{ rows: [{ display_name_index: 0 }] } // First user with this name
		)
		req.client.addQueryMock(
			() => queryCount === 3, // Third UPDATE query (set slug)
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await updateDisplayName(req, res)
		
		// Verify session was updated
		assertEquals(
			"John Doe",
			req.session.display_name,
			"Session display_name should be updated."
		)
		assertEquals(
			0,
			req.session.display_name_index,
			"Session display_name_index should be set to 0 for first occurrence."
		)
		assertEquals(
			"john_doe",
			req.session.user_slug,
			"Session user_slug should be generated from display name."
		)
	},

	testUpdateDisplayNameWithIndex: async () => {
		// Setup mock request with display name that already exists
		const req = createMockRequest({
			display_name: "Popular Name"
		})
		
		let queryCount = 0
		
		req.client.addQueryMock(
			() => {
				queryCount++
				return queryCount === 1
			},
			{ rows: [{ user_id: "test-user-123" }] }
		)
		req.client.addQueryMock(
			() => queryCount === 2,
			{ rows: [{ display_name_index: 3 }] } // 4th user with this name (index 3)
		)
		req.client.addQueryMock(
			() => queryCount === 3,
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await updateDisplayName(req, res)
		
		// Verify session with index
		assertEquals(
			"Popular Name",
			req.session.display_name,
			"Session display_name should be updated."
		)
		assertEquals(
			3,
			req.session.display_name_index,
			"Session display_name_index should reflect duplicate count."
		)
		assertEquals(
			"popular_name_3",
			req.session.user_slug,
			"Session user_slug should include index when display_name_index > 0."
		)
	},

	testUpdateDisplayNameWithSpacesAndCaps: async () => {
		// Test slug generation with various formatting
		const req = createMockRequest({
			display_name: "Multiple Word Name"
		})
		
		let queryCount = 0
		
		req.client.addQueryMock(
			() => {
				queryCount++
				return queryCount === 1
			},
			{ rows: [{ user_id: "test-user-123" }] }
		)
		req.client.addQueryMock(
			() => queryCount === 2,
			{ rows: [{ display_name_index: 0 }] }
		)
		req.client.addQueryMock(
			() => queryCount === 3,
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await updateDisplayName(req, res)
		
		// Verify slug generation
		assertEquals(
			"multiple_word_name",
			req.session.user_slug,
			"Should convert spaces to underscores and lowercase."
		)
	},

	testUpdateDisplayNameNoChange: async () => {
		// Test when display name hasn't actually changed
		const req = createMockRequest({
			display_name: "Same Name"
		})
		
		// Setup mock database responses
		req.client.addQueryMock(
			"UPDATE users",
			{ rows: [] } // No rows returned = name wasn't changed
		)
		
		const res = createMockResponse()
		
		// Store original session values
		const originalDisplayName = req.session.display_name
		const originalIndex = req.session.display_name_index
		const originalSlug = req.session.user_slug
		
		// Execute the handler
		await updateDisplayName(req, res)
		
		// Verify session wasn't modified when no change occurred
		assertEquals(
			originalDisplayName,
			req.session.display_name,
			"Session display_name should not change when DB update returns no rows."
		)
		assertEquals(
			originalIndex,
			req.session.display_name_index,
			"Session display_name_index should not change when no update."
		)
		assertEquals(
			originalSlug,
			req.session.user_slug,
			"Session user_slug should not change when no update."
		)
	},

	testSlugGenerationEdgeCases: async () => {
		// Test various slug generation scenarios
		const testCases = [
			{ 
				name: "Single Word", 
				expected: "single_word",
				index: 0
			},
			{ 
				name: "UPPERCASE NAME", 
				expected: "uppercase_name",
				index: 0
			},
			{ 
				name: "Name With Lots Of Spaces", 
				expected: "name_with_lots_of_spaces",
				index: 0
			},
			{ 
				name: "Indexed Name", 
				expected: "indexed_name_2",
				index: 2
			}
		]
		
		for (const testCase of testCases) {
			const req = createMockRequest({
				display_name: testCase.name
			})
			
			let queryCount = 0
			
			req.client.clearQueryMocks()
			req.client.addQueryMock(
				() => {
					queryCount++
					return queryCount === 1
				},
				{ rows: [{ user_id: "test-user-123" }] }
			)
			req.client.addQueryMock(
				() => queryCount === 2,
				{ rows: [{ display_name_index: testCase.index }] }
			)
			req.client.addQueryMock(
				() => queryCount === 3,
				{ rows: [] }
			)
			
			const res = createMockResponse()
			
			// Execute the handler
			await updateDisplayName(req, res)
			
			// Verify slug generation
			assertEquals(
				testCase.expected,
				req.session.user_slug,
				`Display name "${testCase.name}" should generate slug "${testCase.expected}".`
			)
			
			// Reset for next iteration
			queryCount = 0
		}
	},

	testSessionUpdateFlow: async () => {
		// Test the complete session update flow
		const req = createMockRequest({
			display_name: "Session Test User"
		})
		
		let queryCount = 0
		
		req.client.addQueryMock(
			() => {
				queryCount++
				return queryCount === 1
			},
			{ rows: [{ user_id: "test-user-123" }] }
		)
		req.client.addQueryMock(
			() => queryCount === 2,
			{ rows: [{ display_name_index: 1 }] }
		)
		req.client.addQueryMock(
			() => queryCount === 3,
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Verify initial session state
		assertEquals(
			"Test User",
			req.session.display_name,
			"Initial session display_name should be from mock."
		)
		
		// Execute the handler
		await updateDisplayName(req, res)
		
		// Verify all session fields were updated
		assertEquals(
			"Session Test User",
			req.session.display_name,
			"Session display_name should be updated to new value."
		)
		assertEquals(
			1,
			req.session.display_name_index,
			"Session display_name_index should be set from database result."
		)
		assertEquals(
			"session_test_user_1",
			req.session.user_slug,
			"Session user_slug should be generated with index."
		)
	},

	testDatabaseQuerySequence: async () => {
		// Test that all required session fields are updated
		const req = createMockRequest({
			display_name: "Query Test"
		})
		
		let queryCount = 0
		
		req.client.addQueryMock(
			() => {
				queryCount++
				return queryCount === 1
			},
			{ rows: [{ user_id: "test-user-123" }] }
		)
		req.client.addQueryMock(
			() => queryCount === 2,
			{ rows: [{ display_name_index: 0 }] }
		)
		req.client.addQueryMock(
			() => queryCount === 3,
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await updateDisplayName(req, res)
		
		// Verify all session updates occurred (indicating all queries ran)
		assertEquals(
			"Query Test",
			req.session.display_name,
			"Session display_name should be updated."
		)
		assertEquals(
			0,
			req.session.display_name_index,
			"Session display_name_index should be set."
		)
		assertEquals(
			"query_test",
			req.session.user_slug,
			"Session user_slug should be generated."
		)
	}
}

runTests(path.basename(__filename), Object.values(tests))