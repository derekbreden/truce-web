const { assertEquals, runTests } = require("../shared/testUtils.js")
const { setupIntegrationTestEnvironment } = require("../shared/integrationTestSetup.js")

async function testMessagesInfiniteScrollFlow() {
	const window = await setupIntegrationTestEnvironment()
	const { state, $ } = window

	// Set up initial messages page with some messages
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
				conversation_id: "scroll-conv",
				create_date: "2024-01-15T08:00:00Z",
				participants: [
					{ user_id: "test-user-123", display_name: "Test User", display_name_index: 0 },
					{ user_id: "other-user", display_name: "Other User", display_name_index: 0 }
				],
				last_message_body: "Initial message",
				last_message_date: "2024-01-15T10:00:00Z",
				unread_count: 0
			}],
			posts: [],
			replies: [],
			activities: [],
			notifications: [],
			path: "/conversations"
		},
		"/messages/scroll-conv": {
			success: true,
			user_id: "test-user-123",
			display_name: "Test User",
			email: "test@example.com",
			messages: [
				{
					message_id: "msg-1",
					conversation_id: "scroll-conv",
					sender_user_id: "test-user-123",
					body: "First message",
					create_date: "2024-01-15T09:00:00Z",
					display_name: "Test User",
					display_name_index: 0,
					user_slug: "test-user-123",
					profile_picture_uuid: null,
					user_verified: false,
					edit: true
				},
				{
					message_id: "msg-2",
					conversation_id: "scroll-conv",
					sender_user_id: "other-user",
					body: "Second message",
					create_date: "2024-01-15T10:00:00Z",
					display_name: "Other User",
					display_name_index: 0,
					user_slug: "other-user",
					profile_picture_uuid: null,
					user_verified: false,
					edit: false
				}
			],
			conversation: {
				conversation_id: "scroll-conv",
				participants: [
					{ user_id: "test-user-123", display_name: "Test User", display_name_index: 0 },
					{ user_id: "other-user", display_name: "Other User", display_name_index: 0 }
				]
			},
			posts: [],
			replies: [],
			activities: [],
			notifications: [],
			path: "/messages/scroll-conv"
		}
	})

	// Navigate to the conversation
	const $join_button = $(`a[href="/posts"][big]`)
	$join_button.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	const $hamburger = $("hamburger")
	$hamburger.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	const $conversations_link = $(`menu-wrapper a[href="/conversations"]`)
	$conversations_link.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	const $conversation = $("conversation")
	$conversation.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	// Verify initial messages loaded
	const $messages = $("message")
	assertEquals(2, $messages.length, "Should show initial 2 messages")

	// Verify cache setup and messages_finished flag is not set initially
	assertEquals(true, Boolean(state.cache["/messages/scroll-conv"]), "Should have cached messages")
	assertEquals(undefined, state.cache["/messages/scroll-conv"].messages_finished, "Should not be marked as finished initially")

	// Mock the infinite scroll API response (older messages)
	window.addMockFetchMatcher({
		match: (url, options) => {
			if (url === "/session" && options?.method === "POST") {
				const body = JSON.parse(options.body)
				return body.path === "/messages/scroll-conv" && body.max_message_create_date
			}
			return false
		},
		response: {
			success: true,
			user_id: "test-user-123",
			display_name: "Test User",
			email: "test@example.com",
			messages: [
				{
					message_id: "msg-0",
					conversation_id: "scroll-conv",
					sender_user_id: "other-user",
					body: "Older message loaded via infinite scroll",
					create_date: "2024-01-15T08:30:00Z",
					display_name: "Other User",
					display_name_index: 0,
					user_slug: "other-user", 
					profile_picture_uuid: null,
					user_verified: false,
					edit: false
				}
			],
			conversation: {
				conversation_id: "scroll-conv",
				participants: [
					{ user_id: "test-user-123", display_name: "Test User", display_name_index: 0 },
					{ user_id: "other-user", display_name: "Other User", display_name_index: 0 }
				]
			},
			posts: [],
			replies: [],
			activities: [],
			notifications: [],
			path: "/messages/scroll-conv"
		}
	})

	// Test infinite scroll trigger by setting scroll position near bottom
	const $main_content = $("main-content-wrapper[active]")
	
	// Set up scroll dimensions to trigger infinite scroll
	// From onScroll.js: threshold = scrollHeight - clientHeight * 3
	// We need scrollTop > threshold to trigger
	Object.defineProperty($main_content, 'scrollHeight', { value: 1000, configurable: true })
	Object.defineProperty($main_content, 'clientHeight', { value: 200, configurable: true })
	// threshold = 1000 - 200 * 3 = 400
	// Set scrollTop to 500 to trigger (500 > 400)
	$main_content.scrollTop = 500

	// Trigger scroll event manually since JSDOM doesn't auto-trigger
	const scrollEvent = new window.Event('scroll')
	$main_content.dispatchEvent(scrollEvent)
	await new Promise(resolve => setTimeout(resolve, 0))

	// Verify infinite scroll was triggered and new messages added
	const $updated_messages = $("message")
	assertEquals(3, $updated_messages.length, "Should show 3 messages after infinite scroll")

	// Verify cache was updated with new messages
	assertEquals(3, state.cache["/messages/scroll-conv"].messages.length, "Cache should contain 3 messages")

	// Check that the new message has the expected content
	const first_message = state.cache["/messages/scroll-conv"].messages[0]
	assertEquals("msg-0", first_message.message_id, "Should have loaded msg-0")
	assertEquals("2024-01-15T08:30:00Z", first_message.create_date, "Should have correct date")
	assertEquals(true, first_message.body.includes("infinite scroll"), "Should have expected content")
}

async function testMessagesInfiniteScrollFinished() {
	const window = await setupIntegrationTestEnvironment()
	const { state, $ } = window

	// Set up messages page
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
				conversation_id: "finished-conv",
				create_date: "2024-01-15T08:00:00Z",
				participants: [
					{ user_id: "test-user-123", display_name: "Test User", display_name_index: 0 },
					{ user_id: "finished-user", display_name: "Finished User", display_name_index: 0 }
				],
				last_message_body: "Only message",
				last_message_date: "2024-01-15T10:00:00Z",
				unread_count: 0
			}],
			posts: [],
			replies: [],
			activities: [],
			notifications: [],
			path: "/conversations"
		},
		"/messages/finished-conv": {
			success: true,
			user_id: "test-user-123",
			display_name: "Test User",
			email: "test@example.com",
			messages: [
				{
					message_id: "last-msg",
					conversation_id: "finished-conv",
					sender_user_id: "test-user-123",
					body: "Only message in conversation",
					create_date: "2024-01-15T10:00:00Z",
					display_name: "Test User",
					display_name_index: 0,
					user_slug: "test-user-123",
					profile_picture_uuid: null,
					user_verified: false,
					edit: true
				}
			],
			conversation: {
				conversation_id: "finished-conv",
				participants: [
					{ user_id: "test-user-123", display_name: "Test User", display_name_index: 0 },
					{ user_id: "finished-user", display_name: "Finished User", display_name_index: 0 }
				]
			},
			posts: [],
			replies: [],
			activities: [],
			notifications: [],
			path: "/messages/finished-conv"
		}
	})

	// Navigate to messages
	const $join_button = $(`a[href="/posts"][big]`)
	$join_button.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	const $hamburger = $("hamburger")
	$hamburger.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	const $conversations_link = $(`menu-wrapper a[href="/conversations"]`)
	$conversations_link.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	const $conversation = $("conversation")
	$conversation.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	// Mock empty response (no more messages to load)
	window.addMockFetchMatcher({
		match: (url, options) => {
			if (url === "/session" && options?.method === "POST") {
				const body = JSON.parse(options.body)
				return body.path === "/messages/finished-conv" && body.max_message_create_date
			}
			return false
		},
		response: {
			success: true,
			user_id: "test-user-123",
			display_name: "Test User",
			email: "test@example.com",
			messages: [], // Empty - no more to load
			conversation: {
				conversation_id: "finished-conv",
				participants: [
					{ user_id: "test-user-123", display_name: "Test User", display_name_index: 0 },
					{ user_id: "finished-user", display_name: "Finished User", display_name_index: 0 }
				]
			},
			posts: [],
			replies: [],
			activities: [],
			notifications: [],
			path: "/messages/finished-conv"
		}
	})

	// Trigger scroll
	const $main_content = $("main-content-wrapper[active]")
	Object.defineProperty($main_content, 'scrollHeight', { value: 1000, configurable: true })
	Object.defineProperty($main_content, 'clientHeight', { value: 200, configurable: true })
	$main_content.scrollTop = 500

	const scrollEvent = new window.Event('scroll')
	$main_content.dispatchEvent(scrollEvent)
	await new Promise(resolve => setTimeout(resolve, 0))

	// Verify messages_finished flag was set when empty results returned
	assertEquals(true, state.cache["/messages/finished-conv"].messages_finished, "Should mark messages as finished when no more results")

	// Try to scroll again - should not make another request since finished = true
	let secondRequestMade = false
	window.addMockFetchMatcher({
		match: () => {
			secondRequestMade = true
			return false
		},
		response: {}
	})

	$main_content.dispatchEvent(scrollEvent)
	await new Promise(resolve => setTimeout(resolve, 0))

	assertEquals(false, secondRequestMade, "Should not make second request when messages_finished = true")
}

runTests("messages_infinite_scroll.integration.test.js", [
	testMessagesInfiniteScrollFlow,
	testMessagesInfiniteScrollFinished
])