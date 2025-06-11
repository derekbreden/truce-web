const path = require("path")
const {
	createMockRequest,
	createMockResponse,
	assertEquals,
	runTests
} = require("../shared/serverTestSetup.js")

// Import the handler we're testing
const saveSubscription = require("../../../server/session/saveSubscription.js")

const tests = {
	testAddNewSubscription: async () => {
		// Setup mock request with subscription data
		const req = createMockRequest({
			subscription: { endpoint: "https://fcm.googleapis.com/fcm/send/test123", keys: { p256dh: "key1", auth: "key2" } }
		})
		
		// Setup mock database responses
		// Check for existing subscription (none found)
		req.client.addQueryMock(
			"SELECT subscription_id FROM subscriptions",
			{ rows: [] }
		)
		// Insert new subscription
		req.client.addQueryMock(
			"INSERT INTO subscriptions (user_id, subscription_json)",
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveSubscription(req, res)
		
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

	testSkipExistingSubscription: async () => {
		// Setup mock request with subscription data
		const req = createMockRequest({
			subscription: { endpoint: "https://fcm.googleapis.com/fcm/send/existing", keys: { p256dh: "key1", auth: "key2" } }
		})
		
		// Setup mock database responses
		// Check for existing subscription (found)
		req.client.addQueryMock(
			"SELECT subscription_id FROM subscriptions",
			{ rows: [{ subscription_id: 123 }] }
		)
		// No INSERT should happen
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveSubscription(req, res)
		
		// Should succeed without inserting duplicate
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			responseData.success,
			"Response should indicate success for existing subscription."
		)
	},

	testRemoveSubscription: async () => {
		// Setup mock request with remove flag
		const req = createMockRequest({
			subscription: { endpoint: "https://fcm.googleapis.com/fcm/send/remove", keys: { p256dh: "key1", auth: "key2" } },
			remove: true
		})
		
		// Setup mock database responses
		// Delete subscription
		req.client.addQueryMock(
			"DELETE FROM subscriptions",
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveSubscription(req, res)
		
		// Should succeed
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			responseData.success,
			"Response should indicate success for subscription removal."
		)
	},

	testAddNewFcmSubscription: async () => {
		// Setup mock request with FCM subscription data
		const req = createMockRequest({
			fcm_subscription: "fcm-token-12345"
		})
		
		// Setup mock database responses
		// Check for existing FCM subscription (none found)
		req.client.addQueryMock(
			"SELECT",
			{ rows: [] }
		)
		// Insert new FCM subscription
		req.client.addQueryMock(
			"INSERT INTO subscriptions (user_id, fcm_token)",
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveSubscription(req, res)
		
		// Verify response
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			responseData.success,
			"Response should indicate success for new FCM subscription."
		)
	},

	testExistingActiveFcmSubscription: async () => {
		// Setup mock request with FCM subscription data
		const req = createMockRequest({
			fcm_subscription: "fcm-token-active"
		})
		
		// Setup mock database responses
		// Check for existing FCM subscription (found and active)
		req.client.addQueryMock(
			"SELECT",
			{ rows: [{ subscription_id: 123, active: true }] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveSubscription(req, res)
		
		// Should return success with deactivated: false
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			responseData.success,
			"Response should indicate success."
		)
		assertEquals(
			false,
			responseData.deactivated,
			"Should indicate subscription is not deactivated."
		)
	},

	testExistingInactiveFcmSubscription: async () => {
		// Setup mock request with FCM subscription data
		const req = createMockRequest({
			fcm_subscription: "fcm-token-inactive"
		})
		
		// Setup mock database responses
		// Check for existing FCM subscription (found but inactive)
		req.client.addQueryMock(
			"SELECT",
			{ rows: [{ subscription_id: 456, active: false }] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveSubscription(req, res)
		
		// Should return success with deactivated: true
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			responseData.success,
			"Response should indicate success."
		)
		assertEquals(
			true,
			responseData.deactivated,
			"Should indicate subscription is deactivated."
		)
	},

	testDeactivateFcmSubscription: async () => {
		// Setup mock request with deactivate flag
		const req = createMockRequest({
			fcm_subscription: "fcm-token-deactivate",
			deactivate: true
		})
		
		// Setup mock database responses
		// Update existing subscription to inactive (found)
		req.client.addQueryMock(
			"UPDATE subscriptions",
			{ rows: [{ subscription_id: 789 }] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveSubscription(req, res)
		
		// Should succeed
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			responseData.success,
			"Response should indicate success for FCM deactivation."
		)
	},

	testDeactivateNonexistentFcmSubscription: async () => {
		// Setup mock request with deactivate flag
		const req = createMockRequest({
			fcm_subscription: "fcm-token-nonexistent",
			deactivate: true
		})
		
		// Setup mock database responses
		// Update finds no existing subscription
		req.client.addQueryMock(
			"UPDATE subscriptions",
			{ rows: [] }
		)
		// Insert new inactive subscription
		req.client.addQueryMock(
			"INSERT INTO subscriptions (user_id, fcm_token, active)",
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveSubscription(req, res)
		
		// Should succeed and create new inactive subscription
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			responseData.success,
			"Response should indicate success for deactivating nonexistent FCM subscription."
		)
	},

	testReactivateFcmSubscription: async () => {
		// Setup mock request with reactivate flag
		const req = createMockRequest({
			fcm_subscription: "fcm-token-reactivate",
			reactivate: true
		})
		
		// Setup mock database responses
		// Update existing subscription to active (found)
		req.client.addQueryMock(
			"UPDATE subscriptions",
			{ rows: [{ subscription_id: 999 }] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveSubscription(req, res)
		
		// Should succeed
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			responseData.success,
			"Response should indicate success for FCM reactivation."
		)
	},

	testReactivateNonexistentFcmSubscription: async () => {
		// Setup mock request with reactivate flag
		const req = createMockRequest({
			fcm_subscription: "fcm-token-new-reactivate",
			reactivate: true
		})
		
		// Setup mock database responses
		// Update finds no existing subscription
		req.client.addQueryMock(
			"UPDATE subscriptions",
			{ rows: [] }
		)
		// Insert new active subscription
		req.client.addQueryMock(
			"INSERT INTO subscriptions (user_id, fcm_token, active)",
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveSubscription(req, res)
		
		// Should succeed and create new active subscription
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			responseData.success,
			"Response should indicate success for reactivating nonexistent FCM subscription."
		)
	},

	testNoActionWhenAlreadyEnded: async () => {
		// Setup mock request
		const req = createMockRequest({
			subscription: { endpoint: "test", keys: {} }
		})
		
		const res = createMockResponse()
		// Simulate response already ended
		res.writableEnded = true
		
		// Execute the handler
		await saveSubscription(req, res)
		
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
			subscription: { endpoint: "test", keys: {} }
		}, { user_id: null })
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveSubscription(req, res)
		
		// Verify no action taken
		assertEquals(
			null,
			res.getResponseData(),
			"No response should be sent when user_id is missing."
		)
	},

	testNoActionWhenMissingSubscriptionData: async () => {
		// Setup mock request without subscription or fcm_subscription
		const req = createMockRequest({
			// No subscription data
		})
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveSubscription(req, res)
		
		// Verify no action taken
		assertEquals(
			null,
			res.getResponseData(),
			"No response should be sent when subscription data is missing."
		)
	},

	testJsonSerialization: async () => {
		// Test that complex subscription objects are properly serialized
		const complexSubscription = {
			endpoint: "https://fcm.googleapis.com/fcm/send/complex",
			keys: {
				p256dh: "BMhgQIgwJ0nLx3qAR5dV8BYhZ8E9QHdGLj4vLJwvP5y7QK7N8c3rR2I9sD3a3Z1z",
				auth: "authkey123456"
			},
			expirationTime: null
		}
		
		const req = createMockRequest({
			subscription: complexSubscription
		})
		
		// Setup mock database responses
		req.client.addQueryMock(
			"SELECT subscription_id FROM subscriptions",
			{ rows: [] }
		)
		req.client.addQueryMock(
			"INSERT INTO subscriptions (user_id, subscription_json)",
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await saveSubscription(req, res)
		
		// Should handle complex object serialization correctly
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			true,
			responseData.success,
			"Response should indicate success with complex subscription object."
		)
	}
}

runTests(path.basename(__filename), Object.values(tests))