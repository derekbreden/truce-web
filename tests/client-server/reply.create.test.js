const path = require("path")
const {
	setupIntegrationTestEnvironment,
} = require("./clientServerTestSetup.js")
const { assertEquals, runTests } = require("../client/shared/testUtils.js")

const tests = {
	testClientServerFlow: async () => {
		const window = await setupIntegrationTestEnvironment()
		const { $ } = window
		
		// Start at /posts and navigate to single post (like single-post.simple.test.js)
		$("main-content-2 posts post:first-child").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Verify we're on the single post page
		assertEquals(
			"/post/my-post",
			window.state.path,
			"Should navigate to single post path",
		)
		
		// Click the "Reply to post" button to show the reply form
		$("p[add-new-reply] button")[0].click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Fill in the reply form
		$("add-new[reply] textarea[body]").value = "Newly Created Reply Content"
		
		// Submit the reply
		$("add-new[reply] button[submit]").click()
		await new Promise(resolve => setTimeout(resolve, 100))
		
		// Verify the new reply is rendered instantly (getMoreRecent was triggered)
		assertEquals(
			"Newly Created Reply Content",
			$("reply p span")[0]?.innerText,
			"New reply should be rendered with correct content",
		)
	},
}

runTests(path.basename(__filename), Object.values(tests))