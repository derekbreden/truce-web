const path = require("path")
const {
	setupTestEnvironment,
} = require("./testSetupHelpers.js")
const { assertEquals, runTests } = require("./testRunUtils.js")

const tests = {
	testFlow: async () => {
		const window = await setupTestEnvironment()
		const { $ } = window
		
		// Navigate to the single post page for "User A's Post" 
		$("hamburger").click()
		$(`menu a[href="/posts"]`).click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Click on "User A's Post" to go to its single post page
		$("main-content-2 posts post:first-child").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Verify we can see the nested reply that belongs to User A (has edit: true)
		// From fixtures: reply_id: 2, "Reply to the first reply", user_id: 10 (User A)
		assertEquals(
			"Reply to the first reply",
			$("replies reply:nth-child(4) p span").innerText,
			"Should see User A's nested reply",
		)
		
		// Click the more (three dots) icon on the nested reply to open the modal
		$("replies reply:nth-child(4) icon[more]").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Click "Edit" in the modal
		$("modal-wrapper action[edit]").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Verify the edit form is shown with existing values
		assertEquals(
			"Reply to the first reply",
			$("add-new[reply] textarea[body]").value,
			"Edit form should be pre-filled with existing reply content",
		)
		
		// Modify the reply content
		$("add-new[reply] textarea[body]").value = "This is User A's edited reply with much more detailed content than the original."
		
		// Submit the changes
		$("add-new[reply] button[submit]").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Verify the updated reply is displayed
		assertEquals(
			"This is User A's edited reply with much more detailed content than the original.",
			$("replies reply:nth-child(4) p span").innerText,
			"Reply should show updated content",
		)
	},
}

runTests(path.basename(__filename), Object.values(tests))