const path = require("path")
const {
	setupTestEnvironment,
} = require("../testSetupHelpers.js")
const { assertEquals, runTests } = require("../testRunUtils.js")

const tests = {
	testFlow: async () => {
		const window = await setupTestEnvironment()
		const { $old } = window
		
		// Navigate to the topics page
		$old(`footer [href="/topics"]`).click()
		await new Promise(resolve => setTimeout(resolve, 0))

		// Verify the default topics returned in testSetupHelpers.js are shown in the DOM
		assertEquals(
			"Religion",
			$old("main-content-wrapper topics topic:nth-child(1) topicname-subtitle topicname name").textContent,
			`First topic name should be "Religion"`,
		)
		assertEquals(
			"2",
			$old("main-content-wrapper topics topic:nth-child(1) topicname-subtitle topicname count").textContent,
			`First topic post count should be "2"`,
		)
	},
}

runTests(path.basename(__filename), Object.values(tests))