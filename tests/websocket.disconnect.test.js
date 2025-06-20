const path = require("path")
const {
	setupTestEnvironment,
} = require("./testSetupHelpers.js")
const { assertEquals, runTests } = require("./testRunUtils.js")

const tests = {
	websocketDisconnectFlushTest: async () => {
		// Phase 1: User A checks baseline state
		const window_user_a = await setupTestEnvironment()
		const { $: $a } = window_user_a
		
		$a("footer a[href='/notifications']").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// User A should have 2 unread notifications initially  
		assertEquals(
			"Unread (2)",
			$a("main-content notifications h3").textContent.trim(),
			"User A should have 2 unread notifications initially",
		)
		
		// Phase 2: User B navigates to User A's post to create a reply
		const window_user_b = await setupTestEnvironment({
			beforeParse: (window) => {
				window.localStorage.setItem("trucev1:session_uuid", "user-b-session-456")
			}
		})
		const { $: $b } = window_user_b
		
		// Navigate to User A's post
		$b("main-content-2 posts post:first-child").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Disconenct User A when instant alert received
		const mock_ws = global._ws_connection_handlers[window_user_a._setup_id].mock_ws
		const original_message_handler = window_user_a.state.ws._messageHandlers[0]
		window_user_a.state.ws._messageHandlers[0] = function(data) {
			const message_str = data.data
			if (message_str.includes("INSTANT_ALERT")) {
				mock_ws._handlers.close()
			}
			original_message_handler.call(this, data)
		}
		
		// Phase 4: User B creates the reply that will trigger instant alert
		$b("main-content-2 replies p[add-new-reply]:first-child button").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		$b("add-new[reply] textarea[body]").value = "Reply that will test websocket disconnect"
		$b("add-new[reply] button[submit]").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		assertEquals(
			"User B replied\nReply that will test websocket disconnect",
			$a("alert-wrapper alert:nth-child(1) info").textContent.trim(),
			`Alert should say "User B replied\nReply that will test websocket disconnect"`,
		)
		
		// Phase 7: User A refreshes notifications and should see increased count
		$a("footer a[href='/notifications']").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// User A should now have 3 unread notifications (original 2 + the one that was flushed)
		assertEquals(
			"Unread (3)",
			$a("main-content notifications h3").textContent.trim(),
			"User A should have 3 unread notifications after flush",
		)
	}
}

runTests(path.basename(__filename), Object.values(tests))