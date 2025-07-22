const path = require("path")
const {
	setupTestEnvironment,
} = require("../testSetupHelpers.js")
const { assertEquals, runTests } = require("../testRunUtils.js")

const tests = {
	testFlow: async () => {
		const window = await setupTestEnvironment()
		const { $old } = window
		
		// By default, testSetupHelpers.js starts on /posts with 2 posts
		// Click on the post itself (not just h2) to navigate to single post view
		$old("main-content-2 posts post:first-child").click()
		await new Promise(resolve => setTimeout(resolve, 0))

		// Verify we navigated to single post page 
		assertEquals(
			"/post/user-as-post",
			window.state.path,
			"Should navigate to single post path",
		)
		
		// Verify the single post content matches what our database mock returns
		assertEquals(
			"User A's Post",
			$old("main-content posts post h2").textContent.trim(),
			"Post title should match database mock",
		)

		// Verify the single post body content
		assertEquals(
			"This is User A's own post with full content",
			$old("main-content posts post p span").textContent,
			"Post body should match database mock content",
		)

		// Verify replies are rendered with correct content
		assertEquals(
			2,
			$old("reply").length,
			"Should have 2 replies from database mock",
		)
		
		assertEquals(
			"First reply to the post",
			$old("replies > reply > p > span").textContent,
			"First reply content should match database mock",
		)
		assertEquals(
			"Reply to the first reply", 
			$old("replies reply:nth-child(4) p span").textContent,
			"Nested reply content should match database mock",
		)
	},
}

runTests(path.basename(__filename), Object.values(tests))