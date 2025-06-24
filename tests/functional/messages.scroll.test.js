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
		assertEquals(20, initial_message_count, "Should load 20 messages initially")
		
		// Verify messages are in correct order (oldest to newest)
		const first_message = $("messages message:first-child message-content").textContent.trim()
		const last_message = $("messages message:last-child message-content").textContent.trim()
		assertEquals("Message 60 from User A", last_message, "Last message should be the most recent")
		assertEquals("Message 41 from User B", first_message, "First message should be message 41 (20 messages from end)")
		
		// Store initial scroll position
		const messages_container = $("messages")
		const initial_scroll_height = messages_container.scrollHeight
		
		// Messages should be scrolled to bottom initially
		assertEquals(messages_container.scrollHeight - messages_container.clientHeight, messages_container.scrollTop, "Messages should be scrolled to bottom initially")

		// Now we need to scroll UP to load older messages
		// Target the correct scrolling element - the messages container, not main-content-wrapper
		const messages_element = $("messages")
		assertEquals("MESSAGES", messages_element.tagName, "Should be targeting messages element for scrolling")
		
		// Mock scroll properties for the messages container (smaller inner scroll area)
		messages_element.scrollHeight = 1000
		messages_element.clientHeight = 400
		messages_element.scrollTop = 200 // Near top (threshold will be max(400 * 0.5, 300) = 300, so 200 < 300 = true)
		
		// Trigger scroll on the messages element
		messages_element.dispatchEvent(new window.Event("scroll"))
		await new Promise(resolve => setTimeout(resolve, 100))

		// Check if more messages were loaded
		const after_scroll_count = $("messages message").length
		
		// Note: Scroll position preservation is implemented for the messages element
		// JSDOM can't test actual scroll behavior, but the logic preserves position when prepending messages
		
		// Verify we loaded more messages
		assertEquals(40, after_scroll_count, "Should have 40 messages after first scroll")
		assertEquals("Message 21 from User B", $("messages message:first-child message-content").textContent.trim(), "First message should now be Message 21")
		
		// Test continuing to scroll up (closer to top)
		messages_element.scrollTop = 100 // Even closer to top
		messages_element.dispatchEvent(new window.Event("scroll"))
		await new Promise(resolve => setTimeout(resolve, 100))
		
		const final_count = $("messages message").length
		assertEquals(60, final_count, "Should have all 60 messages after scrolling to top")
		
		// Verify all messages loaded and in correct order
		assertEquals("Message 1 from User B", $("messages message:first-child message-content").textContent.trim(), "First message should be Message 1")
		assertEquals("Message 60 from User A", $("messages message:last-child message-content").textContent.trim(), "Last message should still be Message 60")
	},
}

runTests(path.basename(__filename), Object.values(tests))