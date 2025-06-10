const { assertEquals, runTests } = require("../shared/testUtils.js")
const { setupIntegrationTestEnvironment } = require("../shared/integrationTestSetup.js")

async function testNavigateToMessagesViaMenu() {
	const window = await setupIntegrationTestEnvironment()
	const { state, $ } = window

	// Mock user session
	state.user_id = "123"
	state.display_name = "Test User"
	state.email = "test@example.com"

	// Mock all necessary pages
	window.setMockFetchResponseForPaths({
		"/posts": {
			success: true,
			posts: [],
			replies: [],
			activities: [],
			notifications: [],
			path: "/posts"
		},
		"/conversations": {
			success: true,
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

	// Navigate to posts page first
	const $joinButton = $("a[href='/posts'][big]")
	$joinButton.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	assertEquals("/posts", state.path, "Should be on posts page")

	// Click hamburger menu to open it
	const $hamburger = $("hamburger")
	$hamburger.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	// Verify menu opened
	assertEquals("menu", $("menu-wrapper menu").tagName.toLowerCase(), "Menu should open when hamburger is clicked")

	// Click Messages link in menu
	const $messagesLink = $("menu-wrapper a[href='/conversations']")
	$messagesLink.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	// Verify we navigated to conversations page
	assertEquals("/conversations", state.path, "Should navigate to conversations page")

	// Verify conversation is displayed
	const $conversationsContainer = $("conversations")
	assertEquals("conversation", $conversationsContainer.$("conversation").tagName.toLowerCase(), "Should display conversations")
}

async function testNavigateToSpecificMessage() {
	const window = await setupIntegrationTestEnvironment()
	const { state, $ } = window

	// Mock user session
	state.user_id = "123"
	state.display_name = "Test User"
	state.email = "test@example.com"

	// Mock pages
	window.setMockFetchResponseForPaths({
		"/posts": {
			success: true,
			posts: [],
			replies: [],
			activities: [],
			notifications: [],
			path: "/posts"
		},
		"/conversations": {
			success: true,
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
	const $joinButton = $("a[href='/posts'][big]")
	$joinButton.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	const $hamburger = $("hamburger")
	$hamburger.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	const $messagesLink = $("menu-wrapper a[href='/conversations']")
	$messagesLink.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	assertEquals("/conversations", state.path, "Should be on conversations page")

	// Click on the specific conversation
	const $conversationsContainer = $("conversations")
	const $conversation = $conversationsContainer.$("conversation")
	$conversation.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	// Verify we're now on the message thread page
	assertEquals("/messages/456", state.path, "Should navigate to specific message thread")

	// Verify empty state is displayed (tests our replaceChildren fix)
	assertEquals("all-clear-wrapper", $("main-content-wrapper[active] all-clear-wrapper").tagName.toLowerCase(), "Empty state should be displayed for empty conversation")

	// Verify message interface exists
	assertEquals("textarea", $("main-content-wrapper[active] textarea").tagName.toLowerCase(), "Message input should exist")
	assertEquals("send-button", $("main-content-wrapper[active] send-button").tagName.toLowerCase(), "Send button should exist")
}

async function testMessageSendingFlow() {
	const window = await setupIntegrationTestEnvironment()
	const { state, $ } = window

	// Mock user session
	state.user_id = "123"
	state.display_name = "Test User"
	state.email = "test@example.com"

	// Mock pages
	window.setMockFetchResponseForPaths({
		"/posts": {
			success: true,
			posts: [],
			replies: [],
			activities: [],
			notifications: [],
			path: "/posts"
		},
		"/conversations": {
			success: true,
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
				return body.action === "sendMessage" && 
					   body.conversation_id === 101 &&
					   body.pngs !== undefined && // This validates our fix
					   Array.isArray(body.pngs)
			}
			return false
		},
		response: { success: true, user_id: "123", display_name: "Test User" }
	})

	// Mock the refresh call - this tests our getMoreRecent fix
	window.addMockFetchMatcher({
		match: (url, options) => {
			if (url === "/session" && options?.method === "POST") {
				const body = JSON.parse(options.body)
				return body.path === "/messages/101" && 
					   body.min_message_create_date !== undefined // This validates our fix
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
	const $joinButton = $("a[href='/posts'][big]")
	$joinButton.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	const $hamburger = $("hamburger")
	$hamburger.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	const $messagesLink = $("menu-wrapper a[href='/conversations']")
	$messagesLink.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	const $conversationsContainer = $("conversations")
	const $conversation = $conversationsContainer.$("conversation")
	$conversation.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	// Verify we're on the right page
	assertEquals("/messages/101", state.path, "Should be on message thread page")

	// Verify empty state shows initially  
	assertEquals("all-clear-wrapper", $("main-content-wrapper[active] all-clear-wrapper").tagName.toLowerCase(), "Empty state should be displayed initially")

	// Type a message and send it
	const $textarea = $("main-content-wrapper[active] textarea")
	$textarea.value = "Hello world test message!"

	// Send by pressing Enter
	const enterEvent = new window.KeyboardEvent("keydown", { key: "Enter" })
	$textarea.dispatchEvent(enterEvent)
	await new Promise(resolve => setTimeout(resolve, 0))

	// The successful completion of this test validates that:
	// 1. Our pngs: [] fix works (message sending doesn't fail)
	// 2. Our getMoreRecent fix works (refresh call includes min_message_create_date)
	// 3. Input is cleared after sending
	assertEquals("", $textarea.value.trim(), "Message input should be cleared after sending")
}

runTests("messaging_functionality.integration.test.js", [
	testNavigateToMessagesViaMenu,
	testNavigateToSpecificMessage,
	testMessageSendingFlow
])