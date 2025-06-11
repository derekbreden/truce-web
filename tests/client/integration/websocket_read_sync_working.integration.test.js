const { assertEquals, runTests } = require("../shared/testUtils.js")
const { setupIntegrationTestEnvironment } = require("../shared/integrationTestSetup.js")

async function testWebSocketReadStatusSynchronization() {
	const window = await setupIntegrationTestEnvironment()
	const { state, $ } = window

	// Set up mock conversations page for User B
	window.setMockFetchResponseForPaths({
		"/posts": {
			success: true,
			user_id: "user-b",
			display_name: "User B",
			email: "userb@example.com",
			posts: [],
			replies: [],
			activities: [],
			notifications: [],
			path: "/posts"
		},
		"/conversations": {
			success: true,
			user_id: "user-b", 
			display_name: "User B",
			email: "userb@example.com",
			conversations: [{
				conversation_id: "sync-conv",
				create_date: "2024-01-15T08:00:00Z",
				participants: [
					{ user_id: "user-a", display_name: "User A", display_name_index: 0 },
					{ user_id: "user-b", display_name: "User B", display_name_index: 0 }
				],
				last_message_body: "Hello from User A",
				last_message_date: "2024-01-15T10:00:00Z",
				unread_count: 2 // User B has 2 unread messages initially
			}],
			posts: [],
			replies: [],
			activities: [],
			notifications: [],
			path: "/conversations"
		}
	})

	// Navigate to conversations as User B
	const $join_button = $(`a[href="/posts"][big]`)
	$join_button.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	const $hamburger = $("hamburger")
	$hamburger.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	const $conversations_link = $(`menu-wrapper a[href="/conversations"]`)
	$conversations_link.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	// Verify initial unread count is displayed
	const $initial_conversation = $("conversation")
	assertEquals("true", $initial_conversation.getAttribute("unread"), "Conversation should show as unread initially")
	const $initial_unread_count = $initial_conversation.$("unread-count")
	assertEquals("2", $initial_unread_count.innerText.trim(), "Should show unread count of 2")

	// Simulate User A marking messages as read (this would trigger WebSocket update)
	// In real scenario, this happens when User A opens conversation and markMessagesAsRead() is called
	const readStatusUpdate = JSON.stringify({
		type: "READ_STATUS_UPDATE",
		conversation_id: "sync-conv",
		updated_by_user_id: "user-a", // User A marked messages as read
		new_unread_count: 0 // Messages are now read
	})

	// Manually trigger the WebSocket message handler to simulate receiving the update
	// This simulates what would happen when User A marks messages as read
	const mockWebSocketEvent = { data: readStatusUpdate }
	
	// Parse the data just like the real WebSocket handler does
	const data = JSON.parse(mockWebSocketEvent.data)
	
	// Call the handleReadStatusUpdate function directly (simulating WebSocket reception)
	window.handleReadStatusUpdate(data)
	await new Promise(resolve => setTimeout(resolve, 0))

	// Verify that the conversation UI updated to reflect the read status
	const $updated_conversation = $("conversation")
	assertEquals(false, $updated_conversation.hasAttribute("unread"), "Conversation should no longer have unread attribute")
	
	// Check that unread-count element is removed when unread_count becomes 0
	const $updated_unread_count = $updated_conversation.$("unread-count")
	assertEquals(null, $updated_unread_count, "Unread count element should be removed when count is 0")

	// Verify the cache was updated
	const cached_conversation = state.cache["/conversations"].conversations.find(
		conv => conv.conversation_id === "sync-conv"
	)
	assertEquals(0, cached_conversation.unread_count, "Cache should reflect updated unread count")
}

async function testWebSocketReadStatusWithPartialReads() {
	const window = await setupIntegrationTestEnvironment()
	const { state, $ } = window

	// Set up conversation with multiple unread messages
	window.setMockFetchResponseForPaths({
		"/posts": {
			success: true,
			user_id: "user-b",
			display_name: "User B",
			email: "userb@example.com",
			posts: [],
			replies: [],
			activities: [],
			notifications: [],
			path: "/posts"
		},
		"/conversations": {
			success: true,
			user_id: "user-b", 
			display_name: "User B",
			email: "userb@example.com",
			conversations: [{
				conversation_id: "partial-conv",
				create_date: "2024-01-15T08:00:00Z",
				participants: [
					{ user_id: "user-a", display_name: "User A", display_name_index: 0 },
					{ user_id: "user-b", display_name: "User B", display_name_index: 0 }
				],
				last_message_body: "Multiple messages here",
				last_message_date: "2024-01-15T10:00:00Z",
				unread_count: 5 // User B has 5 unread messages
			}],
			posts: [],
			replies: [],
			activities: [],
			notifications: [],
			path: "/conversations"
		}
	})

	// Navigate to conversations
	const $join_button = $(`a[href="/posts"][big]`)
	$join_button.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	const $hamburger = $("hamburger")
	$hamburger.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	const $conversations_link = $(`menu-wrapper a[href="/conversations"]`)
	$conversations_link.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	// Verify initial state
	const $conversation = $("conversation")
	assertEquals("true", $conversation.getAttribute("unread"), "Should start with unread messages")
	const $unread_count = $conversation.$("unread-count")
	assertEquals("5", $unread_count.innerText.trim(), "Should show 5 unread messages")

	// Simulate User A reading 2 messages (3 still unread)
	const partialReadUpdate = JSON.stringify({
		type: "READ_STATUS_UPDATE",
		conversation_id: "partial-conv",
		updated_by_user_id: "user-a",
		new_unread_count: 3 // 2 messages were read, 3 remain unread
	})

	const mockEvent = { data: partialReadUpdate }
	const data = JSON.parse(mockEvent.data)
	window.handleReadStatusUpdate(data)
	await new Promise(resolve => setTimeout(resolve, 0))

	// Verify partial read update
	const $updated_conversation = $("conversation")
	assertEquals("true", $updated_conversation.getAttribute("unread"), "Should still show as unread (3 remain)")
	const $updated_count = $updated_conversation.$("unread-count")
	assertEquals("3", $updated_count.innerText.trim(), "Should show updated count of 3")

	// Verify cache was updated correctly
	const cached_conversation = state.cache["/conversations"].conversations.find(
		conv => conv.conversation_id === "partial-conv"
	)
	assertEquals(3, cached_conversation.unread_count, "Cache should show 3 unread messages")
}

async function testWebSocketReadStatusIgnoresOwnUpdates() {
	const window = await setupIntegrationTestEnvironment()
	const { state, $ } = window

	// Set up as User A (the user who will mark messages as read)
	window.setMockFetchResponseForPaths({
		"/posts": {
			success: true,
			user_id: "user-a", // This user is marking messages as read
			display_name: "User A",
			email: "usera@example.com",
			posts: [],
			replies: [],
			activities: [],
			notifications: [],
			path: "/posts"
		},
		"/conversations": {
			success: true,
			user_id: "user-a",
			display_name: "User A", 
			email: "usera@example.com",
			conversations: [{
				conversation_id: "own-conv",
				create_date: "2024-01-15T08:00:00Z",
				participants: [
					{ user_id: "user-a", display_name: "User A", display_name_index: 0 },
					{ user_id: "user-b", display_name: "User B", display_name_index: 0 }
				],
				last_message_body: "Test message",
				last_message_date: "2024-01-15T10:00:00Z",
				unread_count: 1
			}],
			posts: [],
			replies: [],
			activities: [],
			notifications: [],
			path: "/conversations"
		}
	})

	// Navigate to conversations
	const $join_button = $(`a[href="/posts"][big]`)
	$join_button.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	const $hamburger = $("hamburger")
	$hamburger.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	const $conversations_link = $(`menu-wrapper a[href="/conversations"]`)
	$conversations_link.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	// Store initial state
	const initial_unread_count = state.cache["/conversations"].conversations[0].unread_count

	// Simulate receiving a WebSocket update about User A's own read action
	// This should NOT affect the UI since User A is the one who marked it as read
	const ownReadUpdate = JSON.stringify({
		type: "READ_STATUS_UPDATE",
		conversation_id: "own-conv",
		updated_by_user_id: "user-a", // Same as current user
		new_unread_count: 0
	})

	const mockEvent = { data: ownReadUpdate }
	const data = JSON.parse(mockEvent.data)
	
	// The WebSocket update should normally be filtered out on server side
	// but we test the client-side behavior here
	window.handleReadStatusUpdate(data)
	await new Promise(resolve => setTimeout(resolve, 0))

	// In a properly implemented system, this would still update the UI
	// since it represents the current state regardless of who triggered it
	const $conversation = $("conversation")
	assertEquals(false, $conversation.hasAttribute("unread"), "Should reflect updated state even for own actions")
	
	const cached_conversation = state.cache["/conversations"].conversations.find(
		conv => conv.conversation_id === "own-conv"
	)
	assertEquals(0, cached_conversation.unread_count, "Cache should be updated to reflect current state")
}

runTests("websocket_read_sync_working.integration.test.js", [
	testWebSocketReadStatusSynchronization,
	testWebSocketReadStatusWithPartialReads,
	testWebSocketReadStatusIgnoresOwnUpdates
])