const { assertEquals, runTests } = require("../shared/testUtils.js")
const { setupIntegrationTestEnvironment } = require("../shared/integrationTestSetup.js")

async function testMessageDisplayWithContent() {
	const window = await setupIntegrationTestEnvironment()
	const { state, $ } = window

	window.setMockFetchResponseForPaths({
		"/posts": {
			success: true,
			user_id: "test-user-123",
			display_name: "Test User",
			email: "test@example.com",
			posts: [],
			replies: [],
			activities: [],
			notifications: [],
			path: "/posts"
		},
		"/conversations": {
			success: true,
			user_id: "test-user-123",
			display_name: "Test User",
			email: "test@example.com",
			conversations: [{
				conversation_id: "conv-with-messages",
				create_date: "2024-01-01T08:00:00Z",
				participants: [
					{ user_id: "test-user-123", display_name: "Test User", display_name_index: 0 },
					{ user_id: "chat-partner", display_name: "Chat Partner", display_name_index: 0 }
				],
				last_message_body: "Hey there!",
				last_message_date: "2024-01-01T10:00:00Z",
				unread_count: 1
			}],
			posts: [],
			replies: [],
			activities: [],
			notifications: [],
			path: "/conversations"
		},
		"/messages/conv-with-messages": {
			success: true,
			user_id: "test-user-123",
			display_name: "Test User",
			email: "test@example.com",
			messages: [
				{
					message_id: "msg-1",
					conversation_id: "conv-with-messages",
					sender_user_id: "chat-partner",
					body: "Hello there!",
					create_date: "2024-01-01T09:00:00Z",
					display_name: "Chat Partner",
					display_name_index: 0,
					user_slug: "chat-partner",
					profile_picture_uuid: null,
					user_verified: false,
					edit: false
				},
				{
					message_id: "msg-2",
					conversation_id: "conv-with-messages",
					sender_user_id: "test-user-123",
					body: "Hey there!",
					create_date: "2024-01-01T10:00:00Z",
					display_name: "Test User",
					display_name_index: 0,
					user_slug: "test-user-123",
					profile_picture_uuid: null,
					user_verified: false,
					edit: true
				}
			],
			conversation: {
				conversation_id: "conv-with-messages",
				participants: [
					{ user_id: "test-user-123", display_name: "Test User", display_name_index: 0 },
					{ user_id: "chat-partner", display_name: "Chat Partner", display_name_index: 0 }
				]
			},
			posts: [],
			replies: [],
			activities: [],
			notifications: [],
			path: "/messages/conv-with-messages"
		}
	})

	const $join_button = $(`a[href="/posts"][big]`)
	$join_button.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	const $hamburger = $("hamburger")
	$hamburger.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	const $messages_link = $(`menu-wrapper a[href="/conversations"]`)
	$messages_link.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	const $conversations_container = $("conversations")
	const $conversations = $conversations_container.querySelectorAll("conversation")
	const $conversation = $conversations[0]
	$conversation.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	assertEquals("messages", $("messages") ? "messages" : "not-messages", "Should be on message thread page")

	const $messages_container = $("messages")
	const $messages = $messages_container.querySelectorAll("message")
	assertEquals(2, $messages.length, "Should display two messages")

	const $first_message = $messages[0]
	assertEquals("false", $first_message.getAttribute("own"), "First message should not be own")

	assertEquals(true, $first_message.$("message-content span").innerText.includes("Hello there!"), "First message should have correct content")

	const $secondMessage = $messages[1]
	assertEquals("true", $secondMessage.getAttribute("own"), "Second message should be own")
	assertEquals(true, $secondMessage.$("message-content span").innerText.includes("Hey there!"), "Second message should have correct content")

	assertEquals(null, $messages_container.querySelector("empty-state"), "Empty state should not exist when messages are present")

	const $conversationHeader = $("conversation-header participants h2")
	assertEquals(true, $conversationHeader.innerText.includes("Chat Partner"), "Conversation header should show other participant")
}

async function testWebSocketMessageUpdates() {
	const window = await setupIntegrationTestEnvironment()
	const { state, $ } = window

	// Set up initial conversation with one message
	window.setMockFetchResponseForPaths({
		"/posts": {
			success: true,
			user_id: "test-user-123",
			display_name: "Test User",
			email: "test@example.com",
			posts: [],
			replies: [],
			activities: [],
			notifications: [],
			path: "/posts"
		},
		"/conversations": {
			success: true,
			conversations: [{
				conversation_id: "conv-websocket",
				create_date: "2024-01-01T08:00:00Z",
				participants: [
					{ user_id: "test-user-123", display_name: "Test User", display_name_index: 0 },
					{ user_id: "websocket-user", display_name: "WebSocket User", display_name_index: 0 }
				],
				last_message_body: "Initial message",
				last_message_date: "2024-01-01T09:00:00Z",
				unread_count: 0
			}],
			posts: [],
			replies: [],
			activities: [],
			notifications: [],
			path: "/conversations"
		},
		"/messages/conv-websocket": {
			success: true,
			messages: [{
				message_id: "msg-initial",
				conversation_id: "conv-websocket",
				sender_user_id: "test-user-123",
				body: "Initial message",
				create_date: "2024-01-01T09:00:00Z",
				display_name: "Test User",
				display_name_index: 0,
				user_slug: "test-user-123",
				profile_picture_uuid: null,
				user_verified: false,
				edit: true
			}],
			conversation: {
				conversation_id: "conv-websocket",
				participants: [
					{ user_id: "test-user-123", display_name: "Test User", display_name_index: 0 },
					{ user_id: "websocket-user", display_name: "WebSocket User", display_name_index: 0 }
				]
			},
			posts: [],
			replies: [],
			activities: [],
			notifications: [],
			path: "/messages/conv-websocket"
		}
	})

	// Navigate to the conversation
	const $join_button = $(`a[href="/posts"][big]`)
	$join_button.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	const $hamburger = $("hamburger")
	$hamburger.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	const $messages_link = $(`menu-wrapper a[href="/conversations"]`)
	$messages_link.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	const $conversations_container = $("conversations")
	const $conversations = $conversations_container.querySelectorAll("conversation")
	const $conversation = $conversations[0]
	$conversation.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	const $messages_container = $("messages")
	let $messages = $messages_container.querySelectorAll("message")
	assertEquals(1, $messages.length, "Should have one initial message")

	window.addMockFetchMatcher({
		match: (url, options) => {
			if (url === "/session" && options?.method === "POST") {
				const body = JSON.parse(options.body)
				return body.path === "/messages/conv-websocket" && body.min_message_create_date
			}
			return false
		},
		response: {
			success: true,
			messages: [{
				message_id: "msg-websocket-new",
				conversation_id: "conv-websocket",
				sender_user_id: "websocket-user",
				body: "New message via WebSocket!",
				create_date: "2024-01-01T09:30:00Z",
				display_name: "WebSocket User",
				display_name_index: 0,
				user_slug: "websocket-user",
				profile_picture_uuid: null,
				user_verified: false,
				edit: false
			}],
			conversation: {
				conversation_id: "conv-websocket",
				participants: [
					{ user_id: "test-user-123", display_name: "Test User", display_name_index: 0 },
					{ user_id: "websocket-user", display_name: "WebSocket User", display_name_index: 0 }
				]
			},
			posts: [],
			replies: [],
			activities: [],
			notifications: [],
			path: "/messages/conv-websocket"
		}
	})

	state.ws.triggerMessage("MESSAGE_UPDATE")
	await new Promise(resolve => setTimeout(resolve, 0))

	$messages = $messages_container.querySelectorAll("message")
	assertEquals(2, $messages.length, "Should have two messages after WebSocket update")

	const $newMessage = $messages[1]
	assertEquals("false", $newMessage.getAttribute("own"), "New message should not be own")
	assertEquals(true, $newMessage.$("message-content span").innerText.includes("New message via WebSocket!"), "New message should have correct content")
}

async function testConversationUpdateViaWebSocket() {
	const window = await setupIntegrationTestEnvironment()
	const { state, $ } = window

	// Set up initial conversations page
	window.setMockFetchResponseForPaths({
		"/posts": {
			success: true,
			user_id: "test-user-123",
			display_name: "Test User",
			email: "test@example.com",
			posts: [],
			replies: [],
			activities: [],
			notifications: [],
			path: "/posts"
		},
		"/conversations": {
			success: true,
			conversations: [{
				conversation_id: "conv-update-test",
				create_date: "2024-01-01T08:00:00Z",
				participants: [
					{ user_id: "test-user-123", display_name: "Test User", display_name_index: 0 },
					{ user_id: "update-user", display_name: "Update User", display_name_index: 0 }
				],
				last_message_body: "Old message",
				last_message_date: "2024-01-01T09:00:00Z",
				unread_count: 0
			}],
			posts: [],
			replies: [],
			activities: [],
			notifications: [],
			path: "/conversations"
		}
	})

	// Navigate to conversations page
	const $join_button = $(`a[href="/posts"][big]`)
	$join_button.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	const $hamburger = $("hamburger")
	$hamburger.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	const $messages_link = $(`menu-wrapper a[href="/conversations"]`)
	$messages_link.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	const $conversations_container = $("conversations")
	let $conversations = $conversations_container.querySelectorAll("conversation")
	assertEquals(1, $conversations.length, "Should have one initial conversation")

	window.addMockFetchMatcher({
		match: (url, options) => {
			if (url === "/session" && options?.method === "POST") {
				const body = JSON.parse(options.body)
				return body.path === "/conversations"
			}
			return false
		},
		response: {
			success: true,
			conversations: [
				{
					conversation_id: "conv-update-test",
					create_date: "2024-01-01T08:00:00Z",
					participants: [
						{ user_id: "test-user-123", display_name: "Test User", display_name_index: 0 },
						{ user_id: "update-user", display_name: "Update User", display_name_index: 0 }
					],
					last_message_body: "Updated message!",
					last_message_date: "2024-01-01T10:00:00Z",
					unread_count: 1
				},
				{
					conversation_id: "conv-new",
					create_date: "2024-01-01T09:30:00Z",
					participants: [
						{ user_id: "test-user-123", display_name: "Test User", display_name_index: 0 },
						{ user_id: "new-user", display_name: "New User", display_name_index: 0 }
					],
					last_message_body: "Brand new conversation",
					last_message_date: "2024-01-01T10:30:00Z",
					unread_count: 1
				}
			],
			posts: [],
			replies: [],
			activities: [],
			notifications: [],
			path: "/conversations"
		}
	})

	state.ws.triggerMessage("CONVERSATION_UPDATE")
	await new Promise(resolve => setTimeout(resolve, 0))

	$conversations = $conversations_container.querySelectorAll("conversation")
	assertEquals(2, $conversations.length, "Should have two conversations after WebSocket update")
}

runTests("messaging_complete_flow.integration.test.js", [
	testMessageDisplayWithContent,
	testWebSocketMessageUpdates,
	testConversationUpdateViaWebSocket
])