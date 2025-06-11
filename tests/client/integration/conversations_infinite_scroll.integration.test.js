const { assertEquals, runTests } = require("../shared/testUtils.js")
const { setupIntegrationTestEnvironment } = require("../shared/integrationTestSetup.js")

async function testConversationsInfiniteScrollFlow() {
	const window = await setupIntegrationTestEnvironment()
	const { state, $ } = window

	// Set up initial conversations page with some conversations
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
			conversations: [
				{
					conversation_id: "conv-1",
					create_date: "2024-01-15T10:00:00Z",
					last_message_date: "2024-01-15T10:00:00Z",
					participants: [
						{ user_id: "test-user-123", display_name: "Test User", display_name_index: 0 },
						{ user_id: "user-1", display_name: "User One", display_name_index: 0 }
					],
					last_message_body: "First conversation message",
					unread_count: 1
				},
				{
					conversation_id: "conv-2",
					create_date: "2024-01-15T09:00:00Z", 
					last_message_date: "2024-01-15T09:00:00Z",
					participants: [
						{ user_id: "test-user-123", display_name: "Test User", display_name_index: 0 },
						{ user_id: "user-2", display_name: "User Two", display_name_index: 0 }
					],
					last_message_body: "Second conversation message",
					unread_count: 0
				}
			],
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

	const $conversations_link = $(`menu-wrapper a[href="/conversations"]`)
	$conversations_link.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	// Verify initial conversations loaded
	const $conversations = $("conversation")
	assertEquals(2, $conversations.length, "Should show initial 2 conversations")

	// Verify cache setup and finished flag is not set initially
	assertEquals(true, Boolean(state.cache["/conversations"]), "Should have cached conversations")
	assertEquals(undefined, state.cache["/conversations"].finished, "Should not be marked as finished initially")

	// Mock the infinite scroll API response (older conversations)
	window.addMockFetchMatcher({
		match: (url, options) => {
			if (url === "/session" && options?.method === "POST") {
				const body = JSON.parse(options.body)
				return body.path === "/conversations" && body.max_conversation_create_date
			}
			return false
		},
		response: {
			success: true,
			user_id: "test-user-123",
			display_name: "Test User",
			email: "test@example.com",
			conversations: [
				{
					conversation_id: "conv-3",
					create_date: "2024-01-15T08:00:00Z",
					last_message_date: "2024-01-15T08:00:00Z", 
					participants: [
						{ user_id: "test-user-123", display_name: "Test User", display_name_index: 0 },
						{ user_id: "user-3", display_name: "User Three", display_name_index: 0 }
					],
					last_message_body: "Third conversation - loaded via infinite scroll",
					unread_count: 0
				}
			],
			posts: [],
			replies: [],
			activities: [],
			notifications: [],
			path: "/conversations"
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

	// Verify infinite scroll was triggered and new conversations added
	const $updated_conversations = $("conversation")
	assertEquals(3, $updated_conversations.length, "Should show 3 conversations after infinite scroll")

	// Verify cache was updated with new conversations
	assertEquals(3, state.cache["/conversations"].conversations.length, "Cache should contain 3 conversations")

	// Check that the new conversation has the expected content
	const last_conversation = state.cache["/conversations"].conversations[2]
	assertEquals("conv-3", last_conversation.conversation_id, "Should have loaded conv-3")
	assertEquals("2024-01-15T08:00:00Z", last_conversation.create_date, "Should have correct date")
}

async function testConversationsInfiniteScrollFinished() {
	const window = await setupIntegrationTestEnvironment()
	const { state, $ } = window

	// Set up conversations page
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
			conversations: [
				{
					conversation_id: "last-conv",
					create_date: "2024-01-15T10:00:00Z",
					last_message_date: "2024-01-15T10:00:00Z",
					participants: [
						{ user_id: "test-user-123", display_name: "Test User", display_name_index: 0 },
						{ user_id: "last-user", display_name: "Last User", display_name_index: 0 }
					],
					last_message_body: "Last conversation",
					unread_count: 0
				}
			],
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

	// Mock empty response (no more conversations to load)
	window.addMockFetchMatcher({
		match: (url, options) => {
			if (url === "/session" && options?.method === "POST") {
				const body = JSON.parse(options.body)
				return body.path === "/conversations" && body.max_conversation_create_date
			}
			return false
		},
		response: {
			success: true,
			user_id: "test-user-123",
			display_name: "Test User",
			email: "test@example.com",
			conversations: [], // Empty - no more to load
			posts: [],
			replies: [],
			activities: [],
			notifications: [],
			path: "/conversations"
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

	// Verify finished flag was set when empty results returned
	assertEquals(true, state.cache["/conversations"].finished, "Should mark conversations as finished when no more results")

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

	assertEquals(false, secondRequestMade, "Should not make second request when finished = true")
}

runTests("conversations_infinite_scroll.integration.test.js", [
	testConversationsInfiniteScrollFlow,
	testConversationsInfiniteScrollFinished
])