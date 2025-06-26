const path = require("path")
const {
	setupTestEnvironment,
} = require("../testSetupHelpers.js")
const { assertEquals, runTests } = require("../testRunUtils.js")

const tests = {
	testFlow: async () => {
		// Phase 1: User A navigates to conversations list
		const window_user_a = await setupTestEnvironment()
		const { $: $a } = window_user_a
		
		$a("footer a[href='/conversations']").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Phase 2: User B navigates to conversations list
		const window_user_b = await setupTestEnvironment({
			beforeParse: (window) => {
				window.localStorage.setItem("trucev1:session_uuid", "user-b-session-456")
			}
		})
		const { $: $b } = window_user_b
		
		$b("footer a[href='/conversations']").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Verify User B starts with empty conversations list
		assertEquals(
			"Messages",
			$b("main-content-wrapper[active] conversations post[conversations-empty] h2[conversations-empty] span").textContent,
			"User B should start with empty conversations list"
		)
		
		// Phase 3: User A navigates to posts to send a message to User B
		$a("footer a[href='/posts']").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Click on User B's profile from posts list
		$a("posts post:nth-child(2) author").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Click message button for User B
		$a("post[user] button[message]").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Send message from User A to User B
		$a("main-content-wrapper[active] textarea").value = "Hello User B, this is from User A"
		$a("main-content-wrapper[active] button[submit]").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Verify that User B's conversations list now shows the conversation with User A
		assertEquals(
			"User A", 
			$b("main-content-wrapper[active] conversations conversation:nth-child(1) other-user-name").textContent,
			"User B should see conversation with User A after websocket UPDATE"
		)
		
		assertEquals(
			"Hello User B, this is from User A", 
			$b("main-content-wrapper[active] conversations conversation:nth-child(1) message-preview").textContent,
			"User B should see the message preview in conversations list"
		)
		
		// Phase 4: Test navigation from conversations to messages
		$b("main-content-wrapper[active] conversations conversation:nth-child(1)").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Verify we're on messages page
		assertEquals(true, window_user_b.state.path.startsWith("/messages/"), "Should navigate to messages page")
		
		// Verify back button exists and shows "Conversations"
		const $back_button = $b("main-content-wrapper[active] tab-wrapper tab-item icon[back]")?.parentElement
		assertEquals(true, Boolean($back_button), "Back button should exist on messages page")
		assertEquals("Conversations", $back_button.$("p").textContent, "Back button should say 'Conversations'")
		
		// Verify participant name is shown as compact tab-item on right
		const $participant_tab = $b("main-content-wrapper[active] tab-wrapper tab-item[right]")
		assertEquals(true, Boolean($participant_tab), "Participant tab should exist")
		assertEquals("User A", $participant_tab.$("p").textContent, "Participant tab should show User A")
		
		// Verify no large conversation header exists
		assertEquals(false, Boolean($b("conversation-header")), "Should not have large conversation header")
		
		// Test back navigation to conversations
		$back_button.click()
		await new Promise(resolve => setTimeout(resolve, 0))
		assertEquals("/conversations", window_user_b.state.path, "Should return to conversations page")
	},
}

runTests(path.basename(__filename), Object.values(tests))