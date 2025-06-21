const path = require("path")
const {
	setupTestEnvironment,
} = require("./testSetupHelpers.js")
const { assertEquals, runTests } = require("./testRunUtils.js")


const tests = {
	testAISpamBlocking: async () => {
		// User B setup with AI mock that returns Spam
		const window_user_b = await setupTestEnvironment({
			beforeParse: (window) => {
				window.localStorage.setItem("trucev1:session_uuid", "user-b-session-456")
				
				// Set AI response for this setup using window._setup_id
				global._ai_responses = global._ai_responses || {}
				global._ai_responses[window._setup_id] = JSON.stringify({ 
					keyword: "Spam", 
					note: "This message contains promotional content" 
				})
			}
		})
		const { $: $b } = window_user_b
		
		// Navigate to User A's profile and start conversation
		$b("posts post:nth-child(1) author").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		$b("post[user] button[message]").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Try to send a spam message
		$b("main-content-wrapper[active] textarea").value = "Buy my product! Great deals!"
		
		$b("main-content-wrapper[active] button[submit]").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Verify the spam error appears inline in the form
		assertEquals(
			"Spam This message contains promotional content",
			$b("main-content-wrapper[active] message-input-area error").textContent,
			"Should show inline spam error in message form"
		)
		
		// Verify no message was actually sent (conversation should be empty)
		assertEquals(
			null,
			$b("main-content-wrapper[active] messages message"),
			"No messages should be sent when spam is detected"
		)
	},

	testAIContentFlagging: async () => {
		// User B setup with AI mock that returns flagged content
		const window_user_b = await setupTestEnvironment({
			beforeParse: (window) => {
				window.localStorage.setItem("trucev1:session_uuid", "user-b-session-456")
				
				// Set AI response for this setup using window._setup_id
				global._ai_responses = global._ai_responses || {}
				global._ai_responses[window._setup_id] = JSON.stringify({ 
					keyword: "Escalation", 
					note: "Message contains aggressive language" 
				})
			}
		})
		const { $: $b } = window_user_b
		
		// Navigate to User A's profile and start conversation
		$b("posts post:nth-child(1) author").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		$b("post[user] button[message]").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Send a message that gets flagged but not blocked
		$b("main-content-wrapper[active] textarea").value = "You're completely wrong about this!"
		
		$b("main-content-wrapper[active] button[submit]").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Verify the message was sent (flagged content is stored, not blocked)
		assertEquals(
			"You're completely wrong about this!",
			$b("main-content-wrapper[active] messages message:nth-child(1) message-content p span").textContent,
			"Flagged message should still be sent and displayed"
		)
		
		// Verify the AI moderation note is displayed
		assertEquals(
			"Escalation",
			$b("main-content-wrapper[active] messages message:nth-child(1) message-content info-wrapper info b").textContent,
			"Should display AI moderation note title"
		)
		
		assertEquals(
			"Message contains aggressive language",
			$b("main-content-wrapper[active] messages message:nth-child(1) message-content info-wrapper info span").textContent, 
			"Should display AI moderation note body"
		)
	},
}

runTests(path.basename(__filename), Object.values(tests))