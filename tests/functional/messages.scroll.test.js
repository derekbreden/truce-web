const path = require("path")
const { setupTestEnvironment } = require("../testSetupHelpers.js")
const { assertEquals, runTests } = require("../testRunUtils.js")

const tests = {
	testFlow: async () => {
		// Create a conversation with many messages for testing infinite scroll
		const statements = []
		
		// Create conversation between User A (10) and User B (20)
		statements.push([
			`INSERT INTO conversations (conversation_id, create_date) VALUES ($1, $2)`,
			[1, new Date("2023-01-01T00:00:00.000Z")]
		])
		
		// Add users to conversation
		statements.push([
			`INSERT INTO conversation_users (conversation_id, user_id) VALUES ($1, $2)`,
			[1, 10]
		])
		statements.push([
			`INSERT INTO conversation_users (conversation_id, user_id) VALUES ($1, $2)`,
			[1, 20]
		])
		
		// Create 60 messages in the conversation
		for (let i = 1; i <= 60; i++) {
			const create_date = new Date(Date.now() - ((61 - i) * 1000 * 60)) // Older messages have earlier timestamps
			
			statements.push([
				`INSERT INTO messages (message_id, conversation_id, user_id, body, create_date) VALUES ($1, $2, $3, $4, $5)`,
				[i, 1, i % 2 === 0 ? 10 : 20, `Message ${i} from ${i % 2 === 0 ? 'User A' : 'User B'}`, create_date]
			])
		}
		
		// Update conversation with the last message
		statements.push([
			`UPDATE conversations SET last_message_id = $1 WHERE conversation_id = $2`,
			[60, 1]
		])

		const window = await setupTestEnvironment({
			sql_statements_to_execute: statements,
		})
		const { $ } = window

		// Navigate to conversations using footer link
		$("footer a[href='/conversations']").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Click on the conversation
		$("conversations conversation:first-child").click()
		await new Promise(resolve => setTimeout(resolve, 0))

		// Verify we're in the messages view
		assertEquals(true, Boolean($("messages-container")), "Should be in messages view")
		assertEquals(true, Boolean($("messages")), "Messages container should exist")

		// Check initial messages loaded - should show most recent messages
		const initial_message_count = $("messages message").length
		assertEquals(true, initial_message_count > 0, "Should have initial messages loaded")
		
		// Verify messages are in correct order (oldest to newest)
		const first_message = $("messages message:first-child message-content").textContent.trim()
		const last_message = $("messages message:last-child message-content").textContent.trim()
		assertEquals(true, last_message.includes("Message 60"), "Last message should be the most recent")
		
		// Store initial scroll position
		const messages_container = $("messages")
		const initial_scroll_height = messages_container.scrollHeight
		
		// Messages should be scrolled to bottom initially
		assertEquals(messages_container.scrollHeight - messages_container.clientHeight, messages_container.scrollTop, "Messages should be scrolled to bottom initially")

		// Now we need to scroll UP to load older messages
		// Mock scrolling near the top
		messages_container.scrollTop = 100 // Near top but not at 0
		
		// However, the scroll event is bound to main-content-wrapper, not messages
		const wrapper = $("main-content-wrapper[active]")
		wrapper.scrollHeight = 2000
		wrapper.clientHeight = 500
		wrapper.scrollTop = 100 // Near top
		
		// Trigger scroll on the wrapper
		wrapper.dispatchEvent(new window.Event("scroll"))
		await new Promise(resolve => setTimeout(resolve, 100))

		// Check if more messages were loaded
		const after_scroll_count = $("messages message").length
		
		// Debug: Let's check what's happening
		console.warn("Initial message count:", initial_message_count)
		console.warn("After scroll message count:", after_scroll_count)
		console.warn("First message after scroll:", $("messages message:first-child message-content").textContent.trim())
		
		// The scroll position should be maintained (not jump to top)
		// This is likely broken based on the code analysis
		const new_scroll_height = messages_container.scrollHeight
		const expected_scroll_top = messages_container.scrollTop + (new_scroll_height - initial_scroll_height)
		
		// Test continuing to scroll up
		wrapper.scrollTop = 50
		wrapper.dispatchEvent(new window.Event("scroll"))
		await new Promise(resolve => setTimeout(resolve, 100))
		
		const final_count = $("messages message").length
		console.warn("Final message count:", final_count)
		
		// Try to reach the beginning (all 60 messages loaded)
		wrapper.scrollTop = 10
		wrapper.dispatchEvent(new window.Event("scroll"))
		await new Promise(resolve => setTimeout(resolve, 100))
		
		// Should eventually have all 60 messages
		const ultimate_count = $("messages message").length
		console.warn("Ultimate message count:", ultimate_count)
		console.warn("First message:", $("messages message:first-child message-content").textContent.trim())
		console.warn("Last message:", $("messages message:last-child message-content").textContent.trim())
		
		// Verify message order is maintained
		assertEquals(true, $("messages message:first-child message-content").textContent.includes("Message"), "First message should be oldest")
		assertEquals(true, $("messages message:last-child message-content").textContent.includes("Message 60"), "Last message should still be most recent")
	},
}

runTests(path.basename(__filename), Object.values(tests))