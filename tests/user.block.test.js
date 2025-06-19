const path = require("path")
const {
	setupTestEnvironment,
} = require("./testSetupHelpers.js")
const { assertEquals, runTests } = require("./testRunUtils.js")

const tests = {
	testFlow: async () => {
		// Phase 1: User B verifies they can see User A's content initially
		const window_user_b = await setupTestEnvironment({
			beforeParse: (window) => {
				window.localStorage.setItem("trucev1:session_uuid", "user-b-session-456")
			}
		})
		const { $: $b } = window_user_b
		
		// Verify User B can see User A's post initially
		assertEquals(
			"User A's Post",
			$b("main-content-2 posts post:first-child h2").textContent.trim(),
			"User B should see User A's post initially",
		)
		
		// Phase 2: User B blocks User A
		$b("main-content-2 posts post:first-child icon[more]").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		assertEquals(
			"Block user",
			$b("modal action[block] p").innerText,
			"Block action should be available for User A's post",
		)
		
		$b("modal action[block]").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Confirm the block action
		assertEquals(
			"Block user - are you sure?",
			$b("modal[confirm] h2 span").innerText,
			"Should show block confirmation modal",
		)
		
		$b("modal[confirm] button[confirm]").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Verify we're redirected to /posts after blocking
		assertEquals(
			"/posts",
			window_user_b.state.path,
			"Should be redirected to /posts after blocking",
		)
		
		// Phase 3: Verify User A's content disappears from posts list
		assertEquals(
			"User B's Post",
			$b("main-content-2 posts post:first-child h2").textContent.trim(),
			"After blocking, User B's own post should now be first in the list",
		)
		
		// Phase 4: User A creates new content - verify User B doesn't see it
		const window_user_a = await setupTestEnvironment()
		const { $: $a } = window_user_a
		
		// User A should start on /posts by default with add-new form available
		
		$a("add-new[post] input[title]").value = "New Post After Block"
		$a("add-new[post] textarea[body]").value = "This is a new post created by User A after being blocked by User B. User B should not see this content."
		
		$a("add-new[post] button[submit]").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Phase 5: Verify User B still doesn't see User A's new content
		// Navigate away and back to refresh the posts view
		$b("hamburger").click()
		$b("menu a[href=\"/notifications\"]").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		$b("hamburger").click()
		$b("menu a[href=\"/posts\"]").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		assertEquals(
			"User B's Post",
			$b("main-content-2 posts post:first-child h2").textContent.trim(),
			"User B should still not see User A's new post after blocking",
		)
	},
}

runTests(path.basename(__filename), Object.values(tests))