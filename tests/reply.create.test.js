const path = require("path")
const {
	setupTestEnvironment,
} = require("./testSetupHelpers.js")
const { assertEquals, runTests } = require("./testRunUtils.js")


const tests = {
	testFlow: async () => {
		// Phase 1: User A checks baseline notifications
		const window_user_a = await setupTestEnvironment()
		const { $: $a } = window_user_a
		
		$a("footer a[href='/notifications']").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		assertEquals(
			"Unread (2)",
			$a("main-content notifications h3").textContent.trim(),
			"User A should have 2 unread notifications initially",
		)
		
		assertEquals(
			"User B",
			$a("main-content notifications notification:nth-child(2) b:first-child").textContent,
			"First notification should be from User B",
		)
		
		assertEquals(
			`"First notification for User A"`,
			$a("main-content notifications notification:nth-child(2) i").textContent,
			"First notification should show correct content",
		)
		
		// Phase 2: User B creates reply to User A's post
		const window_user_b = await setupTestEnvironment({
			beforeParse: (window) => {
				window.localStorage.setItem("trucev1:session_uuid", "user-b-session-456")
			}
		})
		const { $: $b } = window_user_b
		
		// Navigate to User A's post
		$b("main-content-2 posts post:first-child").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		assertEquals(
			"/post/user-as-post",
			window_user_b.state.path,
			"User B should navigate to User A's post",
		)
		$b("main-content-2 replies p[add-new-reply]:first-child button").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		$b("add-new[reply] textarea[body]").value = "Reply from User B to User A"
		
		$b("add-new[reply] button[submit]").click()

		await new Promise(resolve => setTimeout(resolve, 0))

		// Verify the banner appears for $a
		assertEquals(
			"User B replied\nReply from User B to User A",
			$a("alert-wrapper alert:nth-child(1) info").textContent.trim(),
			`Alert should say "User B replied\nReply from User B to User A"`,
		)
		assertEquals(
			"Reply from User B to User A",
			$b("main-content-2 replies reply:nth-child(3) p span").textContent,
			"User B's reply should be rendered with Reply from User B to User A",
		)
		await new Promise(resolve => setTimeout(resolve, 0))
		
		assertEquals(
			"Unread (2)",
			$a("main-content notifications h3").textContent.trim(),
			"User A should still have 2 unread notifications after User B's reply (instant alert marks it as read)",
		)
		assertEquals(
			"User B",
			$a("main-content notifications notification:nth-child(2) b:first-child").textContent,
			"First unread notification should still be from User B",
		)
		
		assertEquals(
			`"First notification for User A"`,
			$a("main-content notifications notification:nth-child(2) i").textContent,
			"First unread notification should show first notification content",
		)
		assertEquals(
			"User B",
			$a("main-content notifications notification:nth-child(3) b:first-child").textContent,
			"Second unread notification should still be from User B",
		)
		
		assertEquals(
			`"Second notification for User A"`,
			$a("main-content notifications notification:nth-child(3) i").textContent,
			"Second unread notification should show second notification content",
		)
	},
}

runTests(path.basename(__filename), Object.values(tests))