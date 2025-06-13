const path = require("path")
const {
	setupIntegrationTestEnvironment,
} = require("./clientServerTestSetup.js")
const { assertEquals, runTests } = require("../client/shared/testUtils.js")

const tests = {
	testClientServerFlow: async () => {
		const window = await setupIntegrationTestEnvironment()
		const { $ } = window
		
		// Navigate to the single post page for "My Post" (which has edit: true)
		$("hamburger").click()
		$(`menu a[href="/posts"]`).click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Click on "My Post" to go to its single post page
		$("main-content-2 posts post:first-child").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Click the more (three dots) icon to open the modal
		$("main-content post icon[more]").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Click "Edit" in the modal
		$("modal-wrapper action[edit]").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Verify the edit form is shown with existing values
		assertEquals(
			"My Post",
			$("add-new[post] input[title]").value,
			"Edit form should be pre-filled with existing title",
		)
		assertEquals(
			"This is my own post with full content",
			$("add-new[post] textarea[body]").value,
			"Edit form should be pre-filled with existing body",
		)
		
		// Modify only the body (keep same title to avoid slug change and redirect)
		$("add-new[post] textarea[body]").value = "This is my edited post content with much more text than the original to pass validation."
		
		// Submit the changes
		$("add-new[post] button[submit]").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Verify the updated post is displayed
		assertEquals(
			"My Post",
			$("main-content post h2").textContent.trim(),
			"Post should keep the same title",
		)
		assertEquals(
			"This is my edited post content with much more text than the original to pass validation.",
			$("main-content post p span").innerText,
			"Post should show updated body content",
		)
	},
}

runTests(path.basename(__filename), Object.values(tests))