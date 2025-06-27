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
		
		// Create a valid image UUID for testing
		const crypto = require("crypto")
		const test_image_uuid = crypto.randomUUID()
		
		// Create 60 messages in the conversation, some with images
		for (let i = 1; i <= 60; i++) {
			const create_date = new Date(new Date("2023-02-01T00:00:00.000Z") - ((61 - i) * 1000 * 60))
			const has_image = i % 10 === 0
			
			statements.push([
				`INSERT INTO messages (message_id, conversation_id, user_id, body, create_date, image_uuids) VALUES ($1, $2, $3, $4, $5, $6)`,
				[i, 1, i % 2 === 0 ? 10 : 20, `Message ${i} from ${i % 2 === 0 ? "User A" : "User B"}`, create_date, has_image ? test_image_uuid : null]
			])
		}
		
		// Update conversation with the last message
		statements.push([
			`UPDATE conversations SET last_message_id = $1 WHERE conversation_id = $2`,
			[60, 1]
		])

		// Load image data for S3 mock
		const fs = require("fs")
		const processed_data_file = path.join(__dirname, "../data", "1024_base64.txt")
		const valid_png_base64 = await fs.promises.readFile(processed_data_file, "utf8")
		
		const window = await setupTestEnvironment({
			sql_statements_to_execute: statements,
			beforeParse: (window) => {
				// Pre-populate S3 mock storage
				global._s3_mock_storage = global._s3_mock_storage || {}
				global._s3_mock_storage[test_image_uuid + ".png"] = valid_png_base64
			}
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
		
		// Messages should be scrolled to bottom initially
		const messages_container = $("messages")
		assertEquals(messages_container.scrollHeight - messages_container.clientHeight, messages_container.scrollTop, "Messages should be scrolled to bottom initially")
		
		// Wait for any async operations to complete
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Verify images have been processed by MutationObserver 
		const images_after_load = $("messages img")
		if (images_after_load.length > 0) {
			const first_image_src = images_after_load[0].src
			assertEquals("data:image/png;base64," + valid_png_base64, first_image_src, "Image should be processed with path prefix + base64")
		}

		// Scroll up to load older messages
		const messages_element = $("messages")
		messages_element.scrollHeight = 1000
		messages_element.clientHeight = 400
		messages_element.scrollTop = 200
		
		// Trigger scroll on the messages element
		messages_element.dispatchEvent(new window.Event("scroll"))
		await new Promise(resolve => setTimeout(resolve, 0))

		// Check if more messages were loaded
		const after_scroll_count = $("messages message").length
		
		// Verify we loaded more messages
		assertEquals(40, after_scroll_count, "Should have 40 messages after first scroll")
		assertEquals("Message 21 from User B", $("messages message:first-child message-content").textContent.trim(), "First message should now be Message 21")
		
		// Continue scrolling up
		messages_element.scrollTop = 100
		messages_element.dispatchEvent(new window.Event("scroll"))
		await new Promise(resolve => setTimeout(resolve, 0))
		
		const final_count = $("messages message").length
		assertEquals(60, final_count, "Should have all 60 messages after scrolling to top")
		
		// Verify all messages loaded and in correct order
		assertEquals("Message 1 from User B", $("messages message:first-child message-content").textContent.trim(), "First message should be Message 1")
		assertEquals("Message 60 from User A", $("messages message:last-child message-content").textContent.trim(), "Last message should still be Message 60")
	},
}

runTests(path.basename(__filename), Object.values(tests))