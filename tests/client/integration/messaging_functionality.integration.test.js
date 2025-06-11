const { assertEquals, runTests } = require("../shared/testUtils.js")
const { setupIntegrationTestEnvironment } = require("../shared/integrationTestSetup.js")

async function testNavigateToMessagesViaMenu() {
	const window = await setupIntegrationTestEnvironment()
	const { $ } = window

	// Mock all necessary pages
	window.setMockFetchResponseForPaths({
		"/posts": {
			success: true,
			user_id: "123",
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
			user_id: "123",
			display_name: "Test User",
			email: "test@example.com",
			conversations: [{
				conversation_id: 123,
				create_date: "2024-01-01T09:00:00Z",
				participants: [
					{ user_id: "123", display_name: "Test User", display_name_index: 0 },
					{ user_id: "456", display_name: "Other User", display_name_index: 0 }
				],
				last_message_body: "Hello there",
				last_message_date: "2024-01-01T10:00:00Z",
				unread_count: 0
			}],
			posts: [],
			replies: [],
			activities: [],
			notifications: [],
			path: "/conversations"
		}
	})

	const $join_button = $(`a[href="/posts"][big]`)
	$join_button.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	const $hamburger = $("hamburger")
	$hamburger.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	assertEquals("menu", $("menu-wrapper menu").tagName.toLowerCase(), "Menu should open when hamburger is clicked")

	const $messages_link = $(`menu-wrapper a[href="/conversations"]`)
	$messages_link.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	assertEquals("conversations", $("conversations") ? "conversations" : "not-conversations", "Should navigate to conversations page")

	const $conversations_container = $("conversations")
	assertEquals("conversation", $conversations_container.$("conversation").tagName.toLowerCase(), "Should display conversations")
}

async function testNavigateToSpecificMessage() {
	const window = await setupIntegrationTestEnvironment()
	const { $ } = window

	window.setMockFetchResponseForPaths({
		"/posts": {
			success: true,
			user_id: "123",
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
			user_id: "123",
			display_name: "Test User",
			email: "test@example.com",
			conversations: [{
				conversation_id: 456,
				create_date: "2024-01-01T09:30:00Z",
				participants: [
					{ user_id: "123", display_name: "Test User", display_name_index: 0 },
					{ user_id: "789", display_name: "Chat User", display_name_index: 0 }
				],
				last_message_body: "Hey how are you?",
				last_message_date: "2024-01-01T10:00:00Z",
				unread_count: 1
			}],
			posts: [],
			replies: [],
			activities: [],
			notifications: [],
			path: "/conversations"
		},
		"/messages/456": {
			success: true,
			user_id: "123",
			display_name: "Test User",
			email: "test@example.com",
			messages: [],
			conversation: {
				conversation_id: 456,
				participants: [
					{ user_id: "123", display_name: "Test User", display_name_index: 0 },
					{ user_id: "789", display_name: "Chat User", display_name_index: 0 }
				]
			},
			posts: [],
			replies: [],
			activities: [],
			notifications: [],
			path: "/messages/456"
		}
	})

	// Navigate to posts then conversations
	const $join_button = $(`a[href="/posts"][big]`)
	$join_button.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	const $hamburger = $("hamburger")
	$hamburger.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	const $messages_link = $(`menu-wrapper a[href="/conversations"]`)
	$messages_link.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	// Click on the specific conversation
	const $conversations_container = $("conversations")
	const $conversation = $conversations_container.$("conversation")
	$conversation.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	// Verify we're now on the message thread page
	assertEquals("all-clear-wrapper", $("main-content-wrapper[active] all-clear-wrapper") ? "all-clear-wrapper" : "not-all-clear", "Should navigate to specific message thread")

	// Verify empty state is displayed (tests our replaceChildren fix)
	assertEquals("all-clear-wrapper", $("main-content-wrapper[active] all-clear-wrapper").tagName.toLowerCase(), "Empty state should be displayed for empty conversation")

	// Verify message interface exists
	assertEquals("textarea", $("main-content-wrapper[active] textarea").tagName.toLowerCase(), "Message input should exist")
	assertEquals("send-button", $("main-content-wrapper[active] send-button").tagName.toLowerCase(), "Send button should exist")
}

async function testMessageSendingFlow() {
	const window = await setupIntegrationTestEnvironment()
	const { $ } = window

	window.setMockFetchResponseForPaths({
		"/posts": {
			success: true,
			user_id: "123",
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
			user_id: "123",
			display_name: "Test User",
			email: "test@example.com",
			conversations: [{
				conversation_id: 101,
				create_date: "2024-01-01T08:00:00Z",
				participants: [
					{ user_id: "123", display_name: "Test User", display_name_index: 0 },
					{ user_id: "202", display_name: "Send User", display_name_index: 0 }
				],
				last_message_body: "Previous message",
				last_message_date: "2024-01-01T09:00:00Z",
				unread_count: 0
			}],
			posts: [],
			replies: [],
			activities: [],
			notifications: [],
			path: "/conversations"
		},
		"/messages/101": {
			success: true,
			user_id: "123",
			display_name: "Test User",
			email: "test@example.com",
			messages: [],
			conversation: {
				conversation_id: 101,
				participants: [
					{ user_id: "123", display_name: "Test User", display_name_index: 0 },
					{ user_id: "202", display_name: "Send User", display_name_index: 0 }
				]
			},
			posts: [],
			replies: [],
			activities: [],
			notifications: [],
			path: "/messages/101"
		}
	})

	// Mock message sending - this tests our pngs: [] fix
	window.addMockFetchMatcher({
		match: (url, options) => {
			if (url === "/session" && options?.method === "POST") {
				const body = JSON.parse(options.body)
				return body.action === "sendMessage" 
					   && body.conversation_id === 101
					   && body.pngs !== undefined
					   && Array.isArray(body.pngs)
			}
			return false
		},
		response: { success: true, user_id: "123", display_name: "Test User" }
	})

	window.addMockFetchMatcher({
		match: (url, options) => {
			if (url === "/session" && options?.method === "POST") {
				const body = JSON.parse(options.body)
				return body.path === "/messages/101" 
					   && body.min_message_create_date !== undefined
			}
			return false
		},
		response: {
			success: true,
			messages: [{
				message_id: 301,
				conversation_id: 101,
				sender_user_id: "123",
				body: "Hello world test message!",
				create_date: new Date().toISOString(),
				display_name: "Test User",
				display_name_index: 0,
				user_slug: "123",
				profile_picture_uuid: null,
				user_verified: false,
				edit: true
			}],
			conversation: {
				conversation_id: 101,
				participants: [
					{ user_id: "123", display_name: "Test User", display_name_index: 0 },
					{ user_id: "202", display_name: "Send User", display_name_index: 0 }
				]
			},
			path: "/messages/101"
		}
	})

	// Navigate to the message thread
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
	const $conversation = $conversations_container.$("conversation")
	$conversation.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	assertEquals("all-clear-wrapper", $("main-content-wrapper[active] all-clear-wrapper").tagName.toLowerCase(), "Empty state should be displayed initially")

	const $textarea = $("main-content-wrapper[active] textarea")
	$textarea.value = "Hello world test message!"

	const enterEvent = new window.KeyboardEvent("keydown", { key: "Enter" })
	$textarea.dispatchEvent(enterEvent)
	await new Promise(resolve => setTimeout(resolve, 0))

	assertEquals("", $textarea.value.trim(), "Message input should be cleared after sending")
}

runTests("messaging_functionality.integration.test.js", [
	testNavigateToMessagesViaMenu,
	testNavigateToSpecificMessage,
	testMessageSendingFlow
])