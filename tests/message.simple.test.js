const path = require("path")
const {
	setupTestEnvironment,
} = require("./testSetupHelpers.js")
const { assertEquals, runTests } = require("./testRunUtils.js")

const tests = {
	testFlow: async () => {
		// Set up a conversation with some messages between User A and User B
		const conversationData = [
			// Create a conversation
			[
				`INSERT INTO conversations (conversation_id, create_date) VALUES ($1, $2)`,
				[1, "2024-01-01T10:00:00.000Z"]
			],
			// Add participants (User A and User B)
			[
				`INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2)`,
				[1, 10] // User A
			],
			[
				`INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2)`,
				[1, 20] // User B
			],
			// Add some messages to the conversation
			[
				`INSERT INTO messages (message_id, conversation_id, sender_user_id, body, create_date) VALUES ($1, $2, $3, $4, $5)`,
				[1, 1, 20, "Hello User A! How are you doing?", "2024-01-01T10:01:00.000Z"]
			],
			[
				`INSERT INTO messages (message_id, conversation_id, sender_user_id, body, create_date) VALUES ($1, $2, $3, $4, $5)`,
				[2, 1, 10, "Hi User B! I am doing great, thanks for asking.", "2024-01-01T10:02:00.000Z"]
			],
			[
				`INSERT INTO messages (message_id, conversation_id, sender_user_id, body, create_date) VALUES ($1, $2, $3, $4, $5)`,
				[3, 1, 20, "That is wonderful to hear! What have you been up to lately?", "2024-01-01T10:03:00.000Z"]
			],
			// Update conversation to point to the last message
			[
				`UPDATE conversations SET last_message_id = $1 WHERE conversation_id = $2`,
				[3, 1]
			]
		]

		const window = await setupTestEnvironment({
			sql_statements_to_execute: conversationData,
		})
		const { $ } = window
		
		// Navigate to conversations
		$("footer a[href='/conversations']").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Verify we can see the conversation with User B in the list
		assertEquals(
			"User B",
			$("main-content-wrapper[active] conversations conversation:nth-child(1) other-user-name").innerText,
			"Should see conversation with User B in list",
		)
		
		// Verify the preview shows the latest message
		assertEquals(
			"That is wonderful to hear! What have you been up to lately?",
			$("main-content-wrapper[active] conversations conversation:nth-child(1) message-preview").innerText,
			"Should show latest message in preview",
		)
		
		// Click on the conversation to open it
		$("main-content-wrapper[active] conversations conversation:nth-child(1)").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Verify we can see all messages in the conversation
		assertEquals(
			3,
			$("main-content-wrapper[active] messages message").length,
			"Should display all 3 messages in the conversation",
		)
		
		// Verify the first message content
		assertEquals(
			"Hello User A! How are you doing?",
			$("main-content-wrapper[active] messages message:nth-child(1) message-content p span").innerText,
			"First message should show correct content",
		)
		
		// Verify the second message content  
		assertEquals(
			"Hi User B! I am doing great, thanks for asking.",
			$("main-content-wrapper[active] messages message:nth-child(2) message-content p span").innerText,
			"Second message should show correct content",
		)
		
		// Verify the third message content
		assertEquals(
			"That is wonderful to hear! What have you been up to lately?",
			$("main-content-wrapper[active] messages message:nth-child(3) message-content p span").innerText,
			"Third message should show correct content",
		)
	},
}

runTests(path.basename(__filename), Object.values(tests))