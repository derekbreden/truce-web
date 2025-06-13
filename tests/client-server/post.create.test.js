const path = require("path")
const {
	setupIntegrationTestEnvironment,
} = require("./clientServerTestSetup.js")
const { assertEquals, runTests } = require("../client/shared/testUtils.js")

const tests = {
	testClientServerFlow: async () => {
		const window = await setupIntegrationTestEnvironment()
		const { $ } = window
		
		// Fill in the post form
		$("add-new[post] input[title]").value = "Newly Created Post Title"
		$("add-new[post] textarea[body]").value = "This is the body content of the newly created post. It needs to be longer than the title to pass validation."

		// Submit the post
		$("add-new[post] button[submit]").click()
		await new Promise(resolve => setTimeout(resolve, 100))

		// Verify the form was cleared after successful creation
		assertEquals(
			"",
			$("add-new[post] input[title]").value,
			"Title field should be cleared after successful post creation",
		)

		// Verify the new post is rendered instantly (getMoreRecent was triggered)
		assertEquals(
			"Newly Created Post Title", 
			$("main-content-2 posts post:first-child h2").textContent.trim(),
			"New post should be rendered with correct title",
		)
		assertEquals(
			"This is the body content of the newly created post. It needs to be longer than the title to pass validation.",
			$("main-content-2 posts post:first-child p span").innerText,
			"New post should be rendered with correct body content",
		)
	},
}

runTests(path.basename(__filename), Object.values(tests))