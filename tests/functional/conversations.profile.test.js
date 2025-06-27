const path = require("path")
const {
	setupTestEnvironment,
} = require("../testSetupHelpers.js")
const { assertEquals, runTests } = require("../testRunUtils.js")

const tests = {
	testConversationProfilePictures: async () => {
		// User A starts a conversation with User B
		const window_user_a = await setupTestEnvironment()
		const { $: $a } = window_user_a
		
		// Navigate to User B's profile to start a conversation
		$a("main-content-wrapper[active] posts post:nth-child(2) author").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Start a conversation with User B
		$a("post[user] button[message]").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Send a message
		$a("main-content-wrapper[active] textarea").value = "Hello User B!"
		$a("main-content-wrapper[active] button[submit]").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Navigate to conversations list
		$a("footer a[href='/conversations']").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Verify profile picture is displayed (User B has no profile picture, so should show icon)
		assertEquals(
			true,
			Boolean($a("conversations conversation:nth-child(1) profile-picture profile-image icon[profile-picture]")),
			"Should show profile picture icon for User B"
		)
		
		// Verify author name is displayed
		assertEquals(
			"User B",
			$a("conversations conversation:nth-child(1) conversation-header name span").textContent,
			"Should show User B's name"
		)
		
		// Verify verified badge (User B has email in test fixtures)
		assertEquals(
			true,
			Boolean($a("conversations conversation:nth-child(1) conversation-header name icon[verified]")),
			"Should show verified badge for User B who has email"
		)
		
		// Also test that message preview and time are displayed
		assertEquals(
			"Hello User B!",
			$a("conversations conversation:nth-child(1) message-preview").textContent,
			"Should show message preview"
		)
		
		assertEquals(
			true,
			Boolean($a("conversations conversation:nth-child(1) conversation-header time-ago").textContent),
			"Should show time ago"
		)
	},
	
	testConversationWithVerifiedUser: async () => {
		// User B sends a message to User A, then we check from User A's perspective
		const window_user_a = await setupTestEnvironment()
		const { $: $a } = window_user_a
		
		// User B has an email address (verified) and will send a message to User A
		const window_user_b = await setupTestEnvironment({
			beforeParse: (window) => {
				window.localStorage.setItem("trucev1:session_uuid", "user-b-session-456")
			}
		})
		const { $: $b } = window_user_b
		
		// Navigate User B to User A's profile
		$b("main-content-wrapper[active] posts post:nth-child(1) author").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Start a conversation
		$b("post[user] button[message]").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Send a message
		$b("main-content-wrapper[active] textarea").value = "Hello from User B!"
		$b("main-content-wrapper[active] button[submit]").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// User A navigates to conversations
		$a("footer a[href='/conversations']").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// User B has an email in test fixtures, so should show verified badge
		assertEquals(
			true,
			Boolean($a("conversations conversation:nth-child(1) conversation-header name icon[verified]")),
			"Should show verified badge for User B who has email"
		)
		
		// Verify name is displayed
		assertEquals(
			"User B",
			$a("conversations conversation:nth-child(1) conversation-header name span").textContent,
			"Should show User B's name"
		)
	}
}

runTests(path.basename(__filename), Object.values(tests))