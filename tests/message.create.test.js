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
			$a("main-content notifications h3").innerText.trim(),
			"User A should have 2 unread notifications initially",
		)
		
		assertEquals(
			"User B",
			$a("main-content notifications notification:nth-child(2) b:first-child").innerText,
			"First notification should be from User B",
		)
		
		assertEquals(
			`"First notification for User A"`,
			$a("main-content notifications notification:nth-child(2) i").innerText,
			"First notification should show correct content",
		)
		
		// Phase 2: User B navigates to User A's profile from posts list
		const window_user_b = await setupTestEnvironment({
			beforeParse: (window) => {
				window.localStorage.setItem("trucev1:session_uuid", "user-b-session-456")
			}
		})
		const { $: $b } = window_user_b
		
		// Click on User A's profile link directly from posts list
		// User A's post is the first post in the list
		$b("posts post:nth-child(1) author").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Phase 3: User B clicks message button for User A
		$b("post[user] button[message]").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Phase 4: User B sends a message to User A
		$b("main-content-wrapper[active] textarea").value = "Hello User A, this is a message from User B"
		
		$b("main-content-wrapper[active] send-button").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Verify User B sees their own sent message
		assertEquals(
			"Hello User A, this is a message from User B",
			$b("main-content-wrapper[active] messages message:nth-child(1) message-content p span").innerText,
			"User B should see their own sent message"
		)
		
		// Verify the instant alert banner appears for User A
		assertEquals(
			"User B replied\nHello User A, this is a message from User B",
			$a("alert-wrapper alert:nth-child(1) info").innerText.trim(),
			`Alert should show "User B replied" with message content`,
		)
		
		// Wait for notifications to re-render
		await new Promise(resolve => setTimeout(resolve, 0))
		
		assertEquals(
			"Unread (3)",
			$a("main-content notifications h3").innerText.trim(),
			"User A should have 3 unread notifications after User B's message",
		)
		assertEquals(
			"User B",
			$a("main-content notifications notification:nth-child(2) b:first-child").innerText,
			"New notification should be from User B",
		)
		
		assertEquals(
			`"Hello User A, this is a message from User B"`,
			$a("main-content notifications notification:nth-child(2) i").innerText,
			"New notification should show User B's message content",
		)
	},

}

runTests(path.basename(__filename), Object.values(tests))