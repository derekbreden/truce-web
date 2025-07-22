const path = require("path")
const { setupTestEnvironment } = require("../testSetupHelpers.js")
const { assertEquals, runTests } = require("../testRunUtils.js")
const { TEST_BASE_TIMESTAMP } = require("../testSqliteSetup.js")

const tests = {
	testFlow: async () => {
		// Create many conversations for testing infinite scroll
		const statements = []
		
		// No need to create another user - we'll use existing User A (10) and User B (20)
		
		// Create 55 conversations between User A (10) and User B (20)
		for (let i = 1; i <= 55; i++) {
			const conversation_id = i
			const create_date = new Date(new Date(TEST_BASE_TIMESTAMP) - (i * 1000 * 60 * 60)) // Each conversation is 1 hour older
			
			// Create conversation (without last_message_id initially due to foreign key constraint)
			statements.push([
				`INSERT INTO conversations (conversation_id, create_date) VALUES ($1, $2)`,
				[conversation_id, create_date]
			])
			
			// Add User A to conversation
			statements.push([
				`INSERT INTO conversation_users (conversation_id, user_id) VALUES ($1, $2)`,
				[conversation_id, 10]
			])
			
			// Add User B to conversation
			statements.push([
				`INSERT INTO conversation_users (conversation_id, user_id) VALUES ($1, $2)`,
				[conversation_id, 20]
			])
			
			// Create a message for this conversation
			statements.push([
				`INSERT INTO messages (message_id, conversation_id, user_id, body, create_date) VALUES ($1, $2, $3, $4, $5)`,
				[i, conversation_id, i % 2 === 0 ? 10 : 20, `Message ${i} content`, create_date]
			])
			
			// Update conversation with last_message_id
			statements.push([
				`UPDATE conversations SET last_message_id = $1 WHERE conversation_id = $2`,
				[i, conversation_id]
			])
			
			// Create unread notification for some messages (every 3rd message)
			if (i % 3 === 0) {
				statements.push([
					`INSERT INTO message_notifications (notification_id, message_id, user_id, read, seen) VALUES ($1, $2, $3, $4, $5)`,
					[i * 1000, i, 10, false, false]
				])
			}
		}

		const window = await setupTestEnvironment({
			sql_statements_to_execute: statements,
		})
		const { $old } = window

		// Navigate to conversations using footer link
		$old("footer a[href='/conversations']").click()
		await new Promise(resolve => setTimeout(resolve, 0))

		// Count initial conversations loaded
		const initial_conversation_count = $old("conversations conversation").length
		assertEquals(true, initial_conversation_count > 0, "Should have initial conversations loaded")
		assertEquals(true, initial_conversation_count <= 50, "Should not load more than 50 conversations initially")

		// Check that conversations are ordered by most recent activity
		const first_conversation_preview = $old("conversations conversation:first-child message-preview").textContent
		assertEquals("Message 1 content", first_conversation_preview, "First conversation should have most recent message")

		// Check unread count display
		const unread_conversations = $old("conversations conversation[unread=true]")
		// Note: unread_conversations might be a NodeList or null
		if (unread_conversations && unread_conversations.length > 0) {
			// Get the first unread conversation and check its unread count
			const first_unread = unread_conversations.length === undefined ? unread_conversations : unread_conversations[0]
			const unread_count_element = first_unread.$("unread-count")
			if (unread_count_element) {
				assertEquals("1", unread_count_element.textContent, "Unread count should be displayed")
			}
		}

		// Mock scroll near bottom
		const wrapper = $old("main-content-wrapper[active]")
		wrapper.scrollHeight = 2000
		wrapper.clientHeight = 500
		wrapper.scrollTop = 1100

		// Trigger scroll
		wrapper.dispatchEvent(new window.Event("scroll"))
		await new Promise(resolve => setTimeout(resolve, 0))

		// Verify more conversations loaded
		const after_scroll_count = $old("conversations conversation").length
		assertEquals(true, after_scroll_count > initial_conversation_count, "Should load more conversations after scroll")

		// Verify conversations maintain order after scroll
		const last_conversation_preview = $old("conversations conversation:last-child message-preview").textContent
		assertEquals(true, last_conversation_preview.startsWith("Message"), "Last conversation should have older message")

		// Scroll to the very bottom to test reaching the end
		wrapper.scrollHeight = 3000
		wrapper.scrollTop = 2500
		wrapper.dispatchEvent(new window.Event("scroll"))
		await new Promise(resolve => setTimeout(resolve, 0))

		// Should have loaded all 55 conversations now
		const final_count = $old("conversations conversation").length
		assertEquals(55, final_count, "Should have loaded all 55 conversations")

		// Try scrolling again - should not load more
		wrapper.scrollHeight = 3000
		wrapper.scrollTop = 2700
		wrapper.dispatchEvent(new window.Event("scroll"))
		await new Promise(resolve => setTimeout(resolve, 0))

		assertEquals(55, $old("conversations conversation").length, "Should not load more conversations after reaching the end")
	},
}

runTests(path.basename(__filename), Object.values(tests))