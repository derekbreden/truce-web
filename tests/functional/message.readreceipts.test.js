const path = require("path")
const {
	setupTestEnvironment,
} = require("../testSetupHelpers.js")
const { assertEquals, runTests } = require("../testRunUtils.js")

const tests = {
	testReadReceipts: async () => {
		// Phase 1: User B sends message to User A (no User A window exists yet)
		const window_user_b = await setupTestEnvironment({
			beforeParse: (window) => {
				window.localStorage.setItem("trucev1:session_uuid", "user-b-session-456")
			}
		})
		const { $: $b } = window_user_b
		
		// Navigate to User A's profile and send message
		$b("posts post:nth-child(1) author").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		$b("post[user] button[message]").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		$b("main-content-wrapper[active] textarea").value = "Test message for read receipts"
		$b("main-content-wrapper[active] button[submit]").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Phase 2: Verify User B sees "Sent" status (no recipient has read it yet)
		assertEquals(
			"Sent",
			$b("main-content-wrapper[active] messages message:nth-child(1) read-status span").textContent,
			"User B should see 'Sent' status when no recipient window exists"
		)
		
		// Phase 3: Now create User A window and navigate to read the message
		const window_user_a = await setupTestEnvironment()
		const { $: $a } = window_user_a
		
		$a("footer a[href='/conversations']").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		$a("conversations conversation:first-child").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Phase 4: Verify User B sees "Read" status after User A reads it
		await new Promise(resolve => setTimeout(resolve, 0))
		assertEquals(
			"Read",
			$b("main-content-wrapper[active] messages message:nth-child(1) read-status span").textContent,
			"User B should see 'Read' status after User A reads the message"
		)
	},
}

runTests(path.basename(__filename), Object.values(tests))