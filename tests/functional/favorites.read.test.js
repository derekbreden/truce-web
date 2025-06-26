const path = require("path")
const {
	setupTestEnvironment,
} = require("../testSetupHelpers.js")
const { assertEquals, runTests } = require("../testRunUtils.js")

const tests = {
	testFlow: async () => {
		const window = await setupTestEnvironment()
		const { $ } = window
		
		// Navigate to the favorites page via menu
		$("hamburger").click()
		$(`menu a[href="/favorites"]`).click()
		await new Promise(resolve => setTimeout(resolve, 0))

		// Verify we have 2 favorited items (1 post and 1 reply) from the default mocks
		assertEquals(
			2,
			$("main-content-wrapper favorites favorite").length,
			"Should have 2 favorites on favorites page",
		)

		// Check the favorited post title (using textContent due RARE pattern of `\n	$1` instead of `foo $1`
		assertEquals(
			"User B's Post",
			$("main-content-wrapper favorites favorite[post] post h2").textContent.trim(),
			"First favorite should be the favorited post with correct title",
		)

		// Verify we have both favorite types content correctly
		// (span is not present in render function directly, but comes indirectly from markdownToElements on the body text from the user)
		assertEquals(
			"This is User B's post",
			$("main-content-wrapper favorites favorite[post] p span").textContent,
			"Should have a post favorite",
		)
		assertEquals(
			"Great point!",
			$("main-content-wrapper favorites favorite[reply] p span").textContent,
			"Should have a reply favorite",
		)

		// Test navigation flow: favorites -> reply -> post -> back to reply -> back to favorites
		$("main-content-wrapper favorites favorite[reply]").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Should be on reply page
		assertEquals(
			"/reply/100",
			window.state.path,
			"Should navigate to reply page",
		)
		
		// Click forward button to go to post
		$("tab-wrapper tab-item[right]").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Should be on post page
		assertEquals(
			"/post/user-bs-post",
			window.state.path,
			"Should navigate to post page via forward button",
		)
		
		// Click back button to return to reply
		$("tab-wrapper tab-item:not([right])").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Should be back on reply page
		assertEquals(
			"/reply/100",
			window.state.path,
			"Should return to reply page via back button",
		)
		
		// Click back button to return to favorites
		$("tab-wrapper tab-item:not([right])").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Should be back on favorites page
		assertEquals(
			"/favorites",
			window.state.path,
			"Should return to favorites page via back button",
		)
	},
}

runTests(path.basename(__filename), Object.values(tests))