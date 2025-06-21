const path = require("path")
const {
	setupTestEnvironment,
} = require("./testSetupHelpers.js")
const { assertEquals, runTests } = require("./testRunUtils.js")

const tests = {
	testFlow: async () => {
		const window = await setupTestEnvironment()
		const { $ } = window
		
		// By default, testSetupHelpers.js starts on /posts with 2 posts

		// The first listed (by create_date) default post is the user's own post
		$("main-content-2 posts post:first-child icon[more]").click()
		assertEquals(false, Boolean($("modal action[block]")), "Own post should not show block action")
		$("modal-bg").click()

		// The second listed (by create_date) default post is another user's post
		$("main-content-2 posts post:nth-child(2) icon[more]").click()
		assertEquals("Block user", $("action[block] p").textContent, "Other user's post should show Block action")
	},
}

runTests(path.basename(__filename), Object.values(tests))