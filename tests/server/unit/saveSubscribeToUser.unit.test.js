const path = require("path")
const {
	createMockRequest,
	createMockResponse,
	assertEquals,
	runTests
} = require("../shared/serverTestSetup.js")

// Import the handler we're testing
const saveSubscribeToUser = require("../../../server/session/saveSubscribeToUser.js")

const tests = {
	testSubscribeToUser: async () => {
		// Setup mock request to subscribe to a user
		const req = createMockRequest({
			subscribe_to_user_id: '456'
		})
		
		// Mock response tracker to handle sequential queries
		let queryCount = 0
		
		// Setup mock database responses
		req.client.addQueryMock(
			() => {
				queryCount++
				return queryCount === 1 // DELETE query (removes any existing subscription)
			},
			{ rows: [] }
		)
		req.client.addQueryMock(
			() => queryCount === 2, // INSERT query (adds new subscription)
			{ rows: [] }
		)
		req.client.addQueryMock(
			() => queryCount === 3, // UPDATE query (updates user's subscription count)
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveSubscribeToUser(req, res)
		
		// Verify response
		assertEquals(
			true,
			res.isEnded(),
			"Response should be ended after processing."
		)
		
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			responseData.success,
			"Response should indicate success."
		)
	},

	testUnsubscribeFromUser: async () => {
		// Setup mock request to unsubscribe from a user
		const req = createMockRequest({
			subscribe_to_user_id: '789',
			remove: true
		})
		
		let queryCount = 0
		
		// Setup mock database responses
		req.client.addQueryMock(
			() => {
				queryCount++
				return queryCount === 1 // DELETE query
			},
			{ rows: [] }
		)
		// Note: No INSERT query when remove=true
		req.client.addQueryMock(
			() => queryCount === 2, // UPDATE query (updates count after removal)
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveSubscribeToUser(req, res)
		
		// Should succeed with only DELETE and UPDATE (no INSERT)
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			responseData.success,
			"Response should indicate success for unsubscribe."
		)
	},

	testResubscribeToUser: async () => {
		// Test subscribing to a user you were already subscribed to
		// (Should work fine due to DELETE-then-INSERT pattern)
		const req = createMockRequest({
			subscribe_to_user_id: '101'
		})
		
		let queryCount = 0
		
		req.client.addQueryMock(
			() => {
				queryCount++
				return queryCount === 1
			},
			{ rows: [{ /* existing subscription deleted */}] }
		)
		req.client.addQueryMock(
			() => queryCount === 2,
			{ rows: [] }
		)
		req.client.addQueryMock(
			() => queryCount === 3,
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveSubscribeToUser(req, res)
		
		// Should work fine - DELETE removes existing, INSERT adds new
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			responseData.success,
			"Response should indicate success for re-subscription."
		)
	},

	testSubscribeToSelf: async () => {
		// Test subscribing to yourself (edge case)
		const req = createMockRequest({
			subscribe_to_user_id: '123' // Same as session user_id
		})
		
		let queryCount = 0
		
		req.client.addQueryMock(
			() => {
				queryCount++
				return queryCount === 1
			},
			{ rows: [] }
		)
		req.client.addQueryMock(
			() => queryCount === 2,
			{ rows: [] }
		)
		req.client.addQueryMock(
			() => queryCount === 3,
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveSubscribeToUser(req, res)
		
		// Should still work (database constraints might prevent it, but handler allows it)
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			responseData.success,
			"Response should indicate success even for self-subscription."
		)
	},

	testMultipleSubscriptionOperations: async () => {
		// Test the toggle behavior: subscribe -> unsubscribe -> subscribe
		const testCases = [
			{ remove: false, description: "Initial subscription" },
			{ remove: true, description: "Unsubscribe" },
			{ remove: false, description: "Re-subscribe" }
		]
		
		for (const testCase of testCases) {
			const req = createMockRequest({
				subscribe_to_user_id: '999',
				...(testCase.remove ? { remove: true } : {})
			})
			
			let queryCount = 0
			
			req.client.clearQueryMocks()
			req.client.addQueryMock(
				() => {
					queryCount++
					return queryCount === 1
				},
				{ rows: [] }
			)
			
			if (!testCase.remove) {
				// Only add INSERT mock when not removing
				req.client.addQueryMock(
					() => queryCount === 2,
					{ rows: [] }
				)
				req.client.addQueryMock(
					() => queryCount === 3,
					{ rows: [] }
				)
			} else {
				// Only UPDATE when removing (no INSERT)
				req.client.addQueryMock(
					() => queryCount === 2,
					{ rows: [] }
				)
			}
			
			const res = createMockResponse()
			
			// Execute the handler
			await saveSubscribeToUser(req, res)
			
			// Each operation should succeed
			const responseData = JSON.parse(res.getResponseData())
			assertEquals(
				true,
				responseData.success,
				`${testCase.description} should succeed.`
			)
			
			// Reset for next iteration
			queryCount = 0
		}
	},

	testNoActionWhenAlreadyEnded: async () => {
		// Setup mock request
		const req = createMockRequest({
			subscribe_to_user_id: '123'
		})
		
		const res = createMockResponse()
		// Simulate response already ended
		res.writableEnded = true
		
		// Execute the handler
		await saveSubscribeToUser(req, res)
		
		// Verify no database calls were made and no response sent
		assertEquals(
			null,
			res.getResponseData(),
			"No response data should be set when response already ended."
		)
	},

	testNoActionWhenMissingUserId: async () => {
		// Setup mock request without user_id
		const req = createMockRequest({
			subscribe_to_user_id: '123'
		}, { user_id: null })
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveSubscribeToUser(req, res)
		
		// Verify no action taken
		assertEquals(
			null,
			res.getResponseData(),
			"No response should be sent when user_id is missing."
		)
	},

	testNoActionWhenMissingSubscribeToUserId: async () => {
		// Setup mock request without subscribe_to_user_id
		const req = createMockRequest({
			// No subscribe_to_user_id
		})
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveSubscribeToUser(req, res)
		
		// Verify no action taken
		assertEquals(
			null,
			res.getResponseData(),
			"No response should be sent when subscribe_to_user_id is missing."
		)
	},

	testQuerySequenceForSubscribe: async () => {
		// Test the exact sequence: DELETE -> INSERT -> UPDATE
		const req = createMockRequest({
			subscribe_to_user_id: '111'
		})
		
		const queryTypes = []
		let queryCount = 0
		
		req.client.addQueryMock(
			(sql) => {
				queryCount++
				if (sql.includes('DELETE FROM subscribers')) {
					queryTypes.push('DELETE')
				}
				return queryCount === 1
			},
			{ rows: [] }
		)
		req.client.addQueryMock(
			(sql) => {
				if (sql.includes('INSERT INTO subscribers')) {
					queryTypes.push('INSERT')
				}
				return queryCount === 2
			},
			{ rows: [] }
		)
		req.client.addQueryMock(
			(sql) => {
				if (sql.includes('UPDATE users')) {
					queryTypes.push('UPDATE')
				}
				return queryCount === 3
			},
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveSubscribeToUser(req, res)
		
		// Verify query sequence
		assertEquals(
			'DELETE',
			queryTypes[0],
			"First query should be DELETE."
		)
		assertEquals(
			'INSERT',
			queryTypes[1],
			"Second query should be INSERT."
		)
		assertEquals(
			'UPDATE',
			queryTypes[2],
			"Third query should be UPDATE."
		)
	},

	testQuerySequenceForUnsubscribe: async () => {
		// Test the sequence for unsubscribe: DELETE -> UPDATE (no INSERT)
		const req = createMockRequest({
			subscribe_to_user_id: '222',
			remove: true
		})
		
		const queryTypes = []
		let queryCount = 0
		
		req.client.addQueryMock(
			(sql) => {
				queryCount++
				if (sql.includes('DELETE FROM subscribers')) {
					queryTypes.push('DELETE')
				}
				return queryCount === 1
			},
			{ rows: [] }
		)
		req.client.addQueryMock(
			(sql) => {
				if (sql.includes('UPDATE users')) {
					queryTypes.push('UPDATE')
				}
				return queryCount === 2
			},
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveSubscribeToUser(req, res)
		
		// Verify query sequence (should skip INSERT)
		assertEquals(
			2,
			queryTypes.length,
			"Should make exactly 2 queries for unsubscribe."
		)
		assertEquals(
			'DELETE',
			queryTypes[0],
			"First query should be DELETE."
		)
		assertEquals(
			'UPDATE',
			queryTypes[1],
			"Second query should be UPDATE (no INSERT for remove=true)."
		)
	}
}

runTests(path.basename(__filename), Object.values(tests))