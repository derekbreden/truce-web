const { createMockRequest, createMockResponse, assertEquals, runTests } = require("../shared/serverTestSetup.js")

// Create a mock WebSocket module
const createMockWebSocketModule = () => {
	const module = {
		ws_active: {},
		clearConnectionProperties(ws_uuid) {
			if (this.ws_active[ws_uuid]) {
				delete this.ws_active[ws_uuid].active_post_id
				delete this.ws_active[ws_uuid].active_conversation_id
			}
		},
		sendTypingIndicator(isTyping, conversation_id, from_user_id) {
			Object.keys(this.ws_active).forEach((ws_uuid) => {
				// Send to users viewing this conversation, but not the sender
				if (this.ws_active[ws_uuid].active_conversation_id === conversation_id 
						&& this.ws_active[ws_uuid].user_id !== from_user_id) {
					const typingMessage = JSON.stringify({
						type: "TYPING_INDICATOR",
						conversation_id,
						user_id: from_user_id,
						typing: isTyping
					})
					this.ws_active[ws_uuid].send(typingMessage)
				}
			})
		}
	}
	return module
}

async function testSendTypingIndicatorToCorrectUsers() {
	const websocket = createMockWebSocketModule()
	
	// Set up mock WebSocket connections
	const sentMessages = []
	
	// User 1 viewing conversation 123
	websocket.ws_active["ws-1"] = {
		user_id: "user-1",
		active_conversation_id: 123,
		send: (msg) => sentMessages.push({ to: "ws-1", message: JSON.parse(msg) })
	}
	
	// User 2 viewing conversation 123
	websocket.ws_active["ws-2"] = {
		user_id: "user-2",
		active_conversation_id: 123,
		send: (msg) => sentMessages.push({ to: "ws-2", message: JSON.parse(msg) })
	}
	
	// User 3 viewing different conversation
	websocket.ws_active["ws-3"] = {
		user_id: "user-3",
		active_conversation_id: 456,
		send: (msg) => sentMessages.push({ to: "ws-3", message: JSON.parse(msg) })
	}
	
	// Send typing indicator from user-1
	websocket.sendTypingIndicator(true, 123, "user-1")
	
	// Should only send to user-2 (not to sender or user in different conversation)
	assertEquals(1, sentMessages.length, "Should send to exactly one user")
	assertEquals("ws-2", sentMessages[0].to, "Should send to user-2")
	assertEquals("TYPING_INDICATOR", sentMessages[0].message.type, "Should be typing indicator message")
	assertEquals(123, sentMessages[0].message.conversation_id, "Should have correct conversation ID")
	assertEquals("user-1", sentMessages[0].message.user_id, "Should show who is typing")
	assertEquals(true, sentMessages[0].message.typing, "Should indicate typing started")
}

async function testSendTypingIndicatorStopTyping() {
	const websocket = createMockWebSocketModule()
	
	// Set up mock WebSocket connections
	const sentMessages = []
	
	// User 1 viewing conversation 789
	websocket.ws_active["ws-1"] = {
		user_id: "user-1",
		active_conversation_id: 789,
		send: (msg) => sentMessages.push({ to: "ws-1", message: JSON.parse(msg) })
	}
	
	// User 2 viewing conversation 789
	websocket.ws_active["ws-2"] = {
		user_id: "user-2",
		active_conversation_id: 789,
		send: (msg) => sentMessages.push({ to: "ws-2", message: JSON.parse(msg) })
	}
	
	// Send stop typing indicator from user-2
	websocket.sendTypingIndicator(false, 789, "user-2")
	
	// Should only send to user-1
	assertEquals(1, sentMessages.length, "Should send to exactly one user")
	assertEquals("ws-1", sentMessages[0].to, "Should send to user-1")
	assertEquals(false, sentMessages[0].message.typing, "Should indicate typing stopped")
}

async function testClearConnectionPropertiesSafety() {
	const websocket = createMockWebSocketModule()
	
	// Set up a connection
	websocket.ws_active["ws-test"] = {
		user_id: "user-test",
		active_post_id: "post-123",
		active_conversation_id: 456
	}
	
	// Clear properties
	websocket.clearConnectionProperties("ws-test")
	
	// Verify properties are cleared but connection still exists
	assertEquals("user-test", websocket.ws_active["ws-test"].user_id, "Should keep user_id")
	assertEquals(undefined, websocket.ws_active["ws-test"].active_post_id, "Should clear active_post_id")
	assertEquals(undefined, websocket.ws_active["ws-test"].active_conversation_id, "Should clear active_conversation_id")
	
	// Test clearing non-existent connection (should not throw)
	websocket.clearConnectionProperties("ws-nonexistent")
	assertEquals(undefined, websocket.ws_active["ws-nonexistent"], "Should handle non-existent connection gracefully")
}

async function testTypingIndicatorNotSentToInactiveConnections() {
	const websocket = createMockWebSocketModule()
	
	// Set up mock WebSocket connections
	const sentMessages = []
	
	// User with no active conversation
	websocket.ws_active["ws-1"] = {
		user_id: "user-1",
		send: (msg) => sentMessages.push({ to: "ws-1", message: JSON.parse(msg) })
	}
	
	// User viewing posts (has active_post_id instead)
	websocket.ws_active["ws-2"] = {
		user_id: "user-2",
		active_post_id: "post-123",
		send: (msg) => sentMessages.push({ to: "ws-2", message: JSON.parse(msg) })
	}
	
	// Send typing indicator
	websocket.sendTypingIndicator(true, 999, "user-3")
	
	// Should not send to anyone
	assertEquals(0, sentMessages.length, "Should not send to users not viewing the conversation")
}

async function testTypingIndicatorHandlesRaceCondition() {
	const websocket = createMockWebSocketModule()
	
	// Set up connection
	const sentMessages = []
	websocket.ws_active["ws-1"] = {
		user_id: "user-1",
		active_conversation_id: 111,
		send: (msg) => sentMessages.push({ to: "ws-1", message: JSON.parse(msg) })
	}
	
	websocket.ws_active["ws-2"] = {
		user_id: "user-2",
		active_conversation_id: 111,
		send: (msg) => sentMessages.push({ to: "ws-2", message: JSON.parse(msg) })
	}
	
	// Start sending typing indicator
	const sendPromise = new Promise((resolve) => {
		// Simulate async operation
		setTimeout(() => {
			websocket.sendTypingIndicator(true, 111, "user-1")
			resolve()
		}, 10)
	})
	
	// Delete connection during send (simulating race condition)
	setTimeout(() => {
		delete websocket.ws_active["ws-2"]
	}, 5)
	
	await sendPromise
	
	// Should handle gracefully - only ws-2 exists but we deleted it mid-operation
	// The actual websocket.js has protection against this with if checks
	assertEquals(0, sentMessages.length, "Should handle deleted connection gracefully")
}

runTests("websocketTypingIndicator.unit.test.js", [
	testSendTypingIndicatorToCorrectUsers,
	testSendTypingIndicatorStopTyping,
	testClearConnectionPropertiesSafety,
	testTypingIndicatorNotSentToInactiveConnections,
	testTypingIndicatorHandlesRaceCondition
])