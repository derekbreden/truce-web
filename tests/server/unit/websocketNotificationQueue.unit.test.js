const { createMockRequest, createMockResponse, assertEquals, runTests } = require("../shared/serverTestSetup.js")
const websocket = require("../../../server/websocket.js")

async function testQueuePushNotificationBasic() {
	// Clear any existing queue state
	websocket.pending_push_notifications = {}
	
	const user_id = "test-user-123"
	const notification_data = {
		title: "Test Message",
		body: "Hello world",
		conversation_id: "conv-456"
	}
	
	// Queue a notification
	websocket.queuePushNotification(user_id, notification_data)
	
	// Verify notification was queued
	assertEquals(true, Boolean(websocket.pending_push_notifications[user_id]), "Should create queue for user")
	assertEquals(1, websocket.pending_push_notifications[user_id].length, "Should have 1 queued notification")
	
	const queued = websocket.pending_push_notifications[user_id][0]
	assertEquals("Test Message", queued.title, "Should preserve notification title")
	assertEquals("Hello world", queued.body, "Should preserve notification body")
	assertEquals("conv-456", queued.conversation_id, "Should preserve conversation_id")
	assertEquals(true, Boolean(queued.timestamp), "Should add timestamp")
}

async function testQueueMultipleNotifications() {
	// Clear any existing queue state
	websocket.pending_push_notifications = {}
	
	const user_id = "multi-user"
	
	// Queue multiple notifications
	websocket.queuePushNotification(user_id, { title: "First", body: "Message 1" })
	websocket.queuePushNotification(user_id, { title: "Second", body: "Message 2" })
	websocket.queuePushNotification(user_id, { title: "Third", body: "Message 3" })
	
	// Verify all notifications were queued
	assertEquals(3, websocket.pending_push_notifications[user_id].length, "Should queue all 3 notifications")
	assertEquals("First", websocket.pending_push_notifications[user_id][0].title, "Should preserve order")
	assertEquals("Second", websocket.pending_push_notifications[user_id][1].title, "Should preserve order")
	assertEquals("Third", websocket.pending_push_notifications[user_id][2].title, "Should preserve order")
}

async function testQueueDifferentUsers() {
	// Clear any existing queue state
	websocket.pending_push_notifications = {}
	
	const user_a = "user-a"
	const user_b = "user-b"
	
	// Queue notifications for different users
	websocket.queuePushNotification(user_a, { title: "For A", body: "Message A" })
	websocket.queuePushNotification(user_b, { title: "For B", body: "Message B" })
	websocket.queuePushNotification(user_a, { title: "For A Again", body: "Message A2" })
	
	// Verify users have separate queues
	assertEquals(2, websocket.pending_push_notifications[user_a].length, "User A should have 2 notifications")
	assertEquals(1, websocket.pending_push_notifications[user_b].length, "User B should have 1 notification")
	assertEquals("For A", websocket.pending_push_notifications[user_a][0].title, "User A first notification")
	assertEquals("For B", websocket.pending_push_notifications[user_b][0].title, "User B notification")
}

async function testFlushPendingNotificationsWithQueue() {
	// Clear any existing queue state
	websocket.pending_push_notifications = {}
	
	const user_id = "flush-user"
	
	// Queue some notifications
	websocket.queuePushNotification(user_id, { title: "Queued 1", body: "First" })
	websocket.queuePushNotification(user_id, { title: "Queued 2", body: "Second" })
	
	// Flush the queue
	const flushed = websocket.flushPendingPushNotifications(user_id)
	
	// Verify flushed notifications
	assertEquals(2, flushed.length, "Should return 2 flushed notifications")
	assertEquals("Queued 1", flushed[0].title, "Should return first notification")
	assertEquals("Queued 2", flushed[1].title, "Should return second notification")
	
	// Verify queue was cleared
	assertEquals(undefined, websocket.pending_push_notifications[user_id], "Queue should be cleared after flush")
}

async function testFlushPendingNotificationsEmptyQueue() {
	// Clear any existing queue state
	websocket.pending_push_notifications = {}
	
	const user_id = "empty-user"
	
	// Try to flush non-existent queue
	const flushed = websocket.flushPendingPushNotifications(user_id)
	
	// Verify empty result
	assertEquals(0, flushed.length, "Should return empty array for non-existent queue")
}

async function testFlushPendingNotificationsAfterAlreadyFlushed() {
	// Clear any existing queue state
	websocket.pending_push_notifications = {}
	
	const user_id = "double-flush-user"
	
	// Queue and flush once
	websocket.queuePushNotification(user_id, { title: "Test", body: "Message" })
	const first_flush = websocket.flushPendingPushNotifications(user_id)
	assertEquals(1, first_flush.length, "First flush should return 1 notification")
	
	// Try to flush again
	const second_flush = websocket.flushPendingPushNotifications(user_id)
	assertEquals(0, second_flush.length, "Second flush should return empty array")
}

async function testIsUserActivelyViewingWithActiveUser() {
	// Clear any existing WebSocket state
	websocket.ws_active = {}
	
	// Mock an active WebSocket connection
	const ws_uuid = "test-ws-123"
	websocket.ws_active[ws_uuid] = {
		user_id: "active-user-456",
		active_conversation_id: 789
	}
	
	// Test user actively viewing the conversation
	const is_viewing = websocket.isUserActivelyViewing("active-user-456", "789")
	assertEquals(true, is_viewing, "Should detect user actively viewing conversation")
	
	// Test user viewing different conversation
	const is_viewing_other = websocket.isUserActivelyViewing("active-user-456", "999")
	assertEquals(false, is_viewing_other, "Should not detect user viewing different conversation")
	
	// Test different user
	const is_other_user = websocket.isUserActivelyViewing("other-user-111", "789")
	assertEquals(false, is_other_user, "Should not detect different user")
}

async function testIsUserActivelyViewingWithNoActiveUsers() {
	// Clear any existing WebSocket state
	websocket.ws_active = {}
	
	// Test with no active connections
	const is_viewing = websocket.isUserActivelyViewing("any-user", "any-conversation")
	assertEquals(false, is_viewing, "Should return false when no active connections")
}

async function testIsUserActivelyViewingWithMultipleConnections() {
	// Clear any existing WebSocket state
	websocket.ws_active = {}
	
	// Mock multiple WebSocket connections
	websocket.ws_active["ws-1"] = {
		user_id: "user-a",
		active_conversation_id: 100
	}
	websocket.ws_active["ws-2"] = {
		user_id: "user-b", 
		active_conversation_id: 200
	}
	websocket.ws_active["ws-3"] = {
		user_id: "user-a", // Same user, different connection
		active_conversation_id: 300
	}
	
	// Test finding user-a viewing conversation 100
	assertEquals(true, websocket.isUserActivelyViewing("user-a", "100"), "Should find user-a viewing conv 100")
	
	// Test finding user-a viewing conversation 300  
	assertEquals(true, websocket.isUserActivelyViewing("user-a", "300"), "Should find user-a viewing conv 300")
	
	// Test user-a NOT viewing conversation 200
	assertEquals(false, websocket.isUserActivelyViewing("user-a", "200"), "Should not find user-a viewing conv 200")
	
	// Test user-b viewing conversation 200
	assertEquals(true, websocket.isUserActivelyViewing("user-b", "200"), "Should find user-b viewing conv 200")
}

async function testSendInstantAlert() {
	// Clear any existing WebSocket state and queue
	websocket.ws_active = {}
	websocket.pending_push_notifications = {}
	
	// Mock WebSocket connections with send tracking
	const sent_messages = []
	const mockSend = (message) => sent_messages.push(message)
	
	websocket.ws_active["ws-1"] = {
		user_id: "target-user",
		send: mockSend
	}
	websocket.ws_active["ws-2"] = {
		user_id: "other-user",
		send: mockSend  
	}
	websocket.ws_active["ws-3"] = {
		user_id: "target-user", // Same user, different connection
		send: mockSend
	}
	
	// Send instant alert with notification data
	const notification_data = {
		title: "Test Notification",
		body: "Test message",
		topic: "conversation:123"
	}
	const alert_sent = websocket.sendInstantAlert("target-user", "You have a new message!", notification_data)
	
	// Verify messages were sent to target user only (2 connections)
	assertEquals(2, sent_messages.length, "Should send to both connections for target user")
	assertEquals(true, alert_sent, "Should return true when alert was sent successfully")
	
	// Verify message content includes notification_id
	const parsed_message_1 = JSON.parse(sent_messages[0])
	assertEquals("INSTANT_ALERT", parsed_message_1.type, "Should have correct message type")
	assertEquals("You have a new message!", parsed_message_1.message, "Should have correct alert message")
	assertEquals(true, Boolean(parsed_message_1.notification_id), "Should include notification_id")
	
	const parsed_message_2 = JSON.parse(sent_messages[1])
	assertEquals("INSTANT_ALERT", parsed_message_2.type, "Should have correct message type for second connection")
	assertEquals("You have a new message!", parsed_message_2.message, "Should have correct alert message for second connection")
	assertEquals(true, Boolean(parsed_message_2.notification_id), "Should include notification_id for second connection")
	
	// Verify notification was queued
	assertEquals(true, Boolean(websocket.pending_push_notifications["target-user"]), "Should queue notification for target user")
	assertEquals(1, websocket.pending_push_notifications["target-user"].length, "Should have 1 queued notification")
}

async function testAcknowledgeNotification() {
	// Clear any existing state
	websocket.pending_push_notifications = {}
	
	// Queue a notification
	websocket.queuePushNotification("test-user", {
		notification_id: "test-123",
		title: "Test",
		body: "Message"
	})
	
	// Verify it's queued
	assertEquals(1, websocket.pending_push_notifications["test-user"].length, "Should have 1 queued notification")
	
	// Acknowledge it
	const ack_result = websocket.acknowledgeNotification("test-user", "test-123")
	assertEquals(true, ack_result, "Should return true for successful acknowledgment")
	
	// Verify it's removed from queue
	assertEquals(undefined, websocket.pending_push_notifications["test-user"], "Queue should be cleared after acknowledgment")
}

async function testAcknowledgeNotificationNotFound() {
	// Clear any existing state
	websocket.pending_push_notifications = {}
	
	// Try to acknowledge non-existent notification
	const ack_result = websocket.acknowledgeNotification("test-user", "non-existent")
	assertEquals(false, ack_result, "Should return false for non-existent notification")
}

async function testHasActiveWebSocketConnection() {
	// Clear any existing WebSocket state
	websocket.ws_active = {}
	
	// Test with no connections
	assertEquals(false, websocket.hasActiveWebSocketConnection("any-user"), "Should return false with no connections")
	
	// Add some connections
	websocket.ws_active["ws-1"] = { user_id: "user-a" }
	websocket.ws_active["ws-2"] = { user_id: "user-b" }
	websocket.ws_active["ws-3"] = { user_id: "user-a" } // Same user, different connection
	
	// Test active users
	assertEquals(true, websocket.hasActiveWebSocketConnection("user-a"), "Should detect user-a has active connection")
	assertEquals(true, websocket.hasActiveWebSocketConnection("user-b"), "Should detect user-b has active connection")
	
	// Test inactive user
	assertEquals(false, websocket.hasActiveWebSocketConnection("user-c"), "Should not detect user-c (no connection)")
}

async function testSendInstantAlertWithConversationSuppression() {
	// Clear any existing state
	websocket.ws_active = {}
	websocket.pending_push_notifications = {}
	
	// Mock WebSocket connection viewing specific conversation
	const sent_messages = []
	const mockSend = (message) => sent_messages.push(message)
	
	websocket.ws_active["ws-1"] = {
		user_id: "viewing-user",
		active_conversation_id: 123,
		send: mockSend
	}
	
	// Send alert for the same conversation user is viewing
	const notification_data = { title: "Test", body: "Message" }
	websocket.sendInstantAlert("viewing-user", "New message!", notification_data, "123")
	
	// Verify message sent with suppression flag
	assertEquals(1, sent_messages.length, "Should send message")
	const parsed_message = JSON.parse(sent_messages[0])
	assertEquals(true, parsed_message.suppress_ui, "Should suppress UI when viewing same conversation")
}

runTests("websocketNotificationQueue.unit.test.js", [
	testQueuePushNotificationBasic,
	testQueueMultipleNotifications,
	testQueueDifferentUsers,
	testFlushPendingNotificationsWithQueue,
	testFlushPendingNotificationsEmptyQueue,
	testFlushPendingNotificationsAfterAlreadyFlushed,
	testIsUserActivelyViewingWithActiveUser,
	testIsUserActivelyViewingWithNoActiveUsers,
	testIsUserActivelyViewingWithMultipleConnections,
	testSendInstantAlert,
	testAcknowledgeNotification,
	testAcknowledgeNotificationNotFound,
	testHasActiveWebSocketConnection,
	testSendInstantAlertWithConversationSuppression
])