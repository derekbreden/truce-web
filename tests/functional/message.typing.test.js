const path = require("path")
const {
	setupTestEnvironment,
} = require("../testSetupHelpers.js")
const { assertEquals, runTests } = require("../testRunUtils.js")

const tests = {
	testTypingIndicators: async () => {
		
		// Create conversation between User A (10) and User B (20)
		const statements = [
			[`INSERT INTO conversations (conversation_id, create_date) VALUES ($1, $2)`, [1, new Date("2023-01-01T00:00:00.000Z")]],
			[`INSERT INTO conversation_users (conversation_id, user_id) VALUES ($1, $2)`, [1, 10]],
			[`INSERT INTO conversation_users (conversation_id, user_id) VALUES ($1, $2)`, [1, 20]],
		]

		// Setup windows
		const window_user_a = await setupTestEnvironment({
			sql_statements_to_execute: statements,
		})
		const { $: $a } = window_user_a
		const window_user_b = await setupTestEnvironment({
			sql_statements_to_execute: [], // Already created
			beforeParse: (window) => {
				window.localStorage.setItem("trucev1:session_uuid", "user-b-session-456")
			}
		})
		const { $: $b } = window_user_b

		// Navigate to conversation
		$a("footer a[href='/conversations']").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		$a("conversations conversation:first-child").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		$b("footer a[href='/conversations']").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		$b("conversations conversation:first-child").click()
		await new Promise(resolve => setTimeout(resolve, 0))

		// Trigger typing from user B
		const $textarea_b = $b("main-content-wrapper[active] textarea")
		$textarea_b.value = "H"
		$textarea_b.dispatchEvent(new window_user_b.Event("input", { bubbles: true }))
		
		// Verify typing indicator blips as expected
		assertEquals(false, Boolean($a("typing-indicator")), "User A should not see typing indicator immediately")
		await new Promise(resolve => setTimeout(resolve, 0))
		assertEquals(true, Boolean($a("typing-indicator")), "User A should see typing indicator after a beat")
		await new Promise(resolve => setTimeout(resolve, 0))
		assertEquals(false, Boolean($a("typing-indicator")), "User A should no longer see typing indicator after a beat")

	},
}

runTests(path.basename(__filename), Object.values(tests))