const { assertEquals, runTests } = require("../shared/testUtils.js")
const { setupIntegrationTestEnvironment } = require("../shared/integrationTestSetup.js")

async function debugConversationRendering() {
	const window = await setupIntegrationTestEnvironment()
	const { $ } = window

	// Mock pages with simple conversation data
	window.setMockFetchResponseForPaths({
		"/posts": {
			success: true,
			posts: [],
			replies: [],
			activities: [],
			notifications: [],
			user_id: "test-user-123",
			display_name: "Test User",
			email: "test@example.com",
			path: "/posts"
		},
		"/conversations": {
			success: true,
			conversations: [{
				conversation_id: "debug-conv",
				create_date: "2024-01-01T09:00:00Z",
				participants: [
					{ user_id: "test-user-123", display_name: "Test User", display_name_index: 0 },
					{ user_id: "debug-user", display_name: "Debug User", display_name_index: 0 }
				],
				last_message_body: "Debug message",
				last_message_date: "2024-01-01T10:00:00Z",
				unread_count: 0
			}],
			posts: [],
			replies: [],
			activities: [],
			notifications: [],
			user_id: "test-user-123",
			display_name: "Test User",
			email: "test@example.com",
			path: "/conversations"
		}
	})

	// Navigate to posts then conversations
	const $join_button = $(`a[href="/posts"][big]`)
	$join_button.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	// Open menu and click conversations
	const $hamburger = $("hamburger")
	$hamburger.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	const $menu = $("menu-wrapper")
	assertEquals("menu-wrapper", $menu.tagName.toLowerCase(), "Menu should open")

	const $conversations_link = $(`menu-wrapper a[href="/conversations"]`)
	assertEquals("/conversations", $conversations_link.getAttribute("href"), "Conversations link should exist in menu")
	$conversations_link.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	assertEquals("conversations", $("conversations") ? "conversations" : "not-conversations", "Should navigate to conversations")
}

runTests("debug_conversations.integration.test.js", [
	debugConversationRendering
])