const path = require("path")
const {
	setupTestEnvironment,
} = require("./testSetupHelpers.js")
const { assertEquals, runTests } = require("./testRunUtils.js")

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
			$("main-content-wrapper activities activity").length,
			"Should have 2 activities on favorites page",
		)

		// Check the favorited post title (using textContent due RARE pattern of `\n	$1` instead of `foo $1`
		assertEquals(
			"User B's Post",
			$("main-content-wrapper activities activity[post] post h2").textContent.trim(),
			"First activity should be the favorited post with correct title",
		)

		// Verify we have both activity types content correctly
		// (span is not present in render function directly, but comes indirectly from markdownToElements on the body text from the user)
		assertEquals(
			"This is User B's post",
			$("main-content-wrapper activities activity[post] p span").innerText,
			"Should have a post activity",
		)
		assertEquals(
			"Great point!",
			$("main-content-wrapper activities activity[reply] p span").innerText,
			"Should have a reply activity",
		)
	},
}

runTests(path.basename(__filename), Object.values(tests))