const { assertEquals, runTests } = require("../shared/testUtils.js")
const { setupIntegrationTestEnvironment } = require("../shared/integrationTestSetup.js")

async function debugConversationRendering() {
	const window = await setupIntegrationTestEnvironment()
	const { state, $ } = window

	// Mock user session
	state.user_id = "test-user-123"
	state.display_name = "Test User"
	state.email = "test@example.com"

	// Mock pages with simple conversation data
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
			path: "/conversations"
		}
	})

	// Navigate to posts then conversations
	const $joinButton = $("a[href='/posts'][big]")
	$joinButton.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	assertEquals("/posts", state.path, "Should be on posts page")

	// Open menu and click conversations
	const $hamburger = $("hamburger")
	$hamburger.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	const $menu = $("menu-wrapper")
	assertEquals("menu-wrapper", $menu.tagName.toLowerCase(), "Menu should open")

	const $conversationsLink = $("menu-wrapper a[href='/conversations']")
	assertEquals("/conversations", $conversationsLink.getAttribute("href"), "Conversations link should exist in menu")
	$conversationsLink.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	assertEquals("/conversations", state.path, "Should navigate to conversations")
}

runTests("debug_conversations.integration.test.js", [
	debugConversationRendering
])