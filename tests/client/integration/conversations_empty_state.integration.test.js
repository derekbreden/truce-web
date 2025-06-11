const { assertEquals, runTests } = require("../shared/testUtils.js")
const { setupIntegrationTestEnvironment } = require("../shared/integrationTestSetup.js")

async function testEmptyConversationsListDisplay() {
	const window = await setupIntegrationTestEnvironment()
	const { $ } = window

	// Mock API responses with empty conversations array
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
			conversations: [], // Empty conversations array
			posts: [],
			replies: [],
			activities: [],
			notifications: [],
			path: "/conversations"
		}
	})

	// Navigate to posts first to get past welcome screen
	const $join_button = $(`a[href="/posts"][big]`)
	$join_button.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	// Use footer navigation to go to conversations
	const $conversations_link = $(`footer a[href="/conversations"]`)
	$conversations_link.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	// Check for empty state container
	const $empty_container = $("post[conversations-empty]")
	assertEquals("post", $empty_container.tagName.toLowerCase(), "Should display post element for empty conversations")
	
	// Check header with title and icon
	const $header = $empty_container.$("h2[conversations-empty]")
	assertEquals("h2", $header.tagName.toLowerCase(), "Should have h2 header")
	assertEquals("Messages", $header.$("span").innerText.trim(), "Header should say 'Messages'")
	
	// Check that mail icon is present
	const $icon = $header.$("icon svg")
	assertEquals("svg", $icon.tagName.toLowerCase(), "Should have mail icon in header")
	
	// Check instructional text structure
	const $instructions = $empty_container.$("p[conversations-empty]")
	assertEquals("p", $instructions.tagName.toLowerCase(), "Should have p[conversations-empty] element")
	
	// Get all spans - Flint returns NodeList when multiple elements found
	const $allSpans = $instructions.$("span")
	assertEquals(2, $allSpans.length, "Should have two text spans")
	
	// Check first span
	assertEquals("Click the", $allSpans[0].innerText.trim(), "First span should say 'Click the'")
	
	// Check second span
	assertEquals("on a user's profile to start a conversation with them.", $allSpans[1].innerText.trim(), "Second span should have instructions")
	
	// Check that mail icon is present in the instructions
	const $instructionIcon = $instructions.$("svg")
	assertEquals("svg", $instructionIcon.tagName.toLowerCase(), "Should have mail icon in instructions")
}

runTests("conversations_empty_state.integration.test.js", [
	testEmptyConversationsListDisplay
])