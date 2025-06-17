const path = require("path")
const {
	setupIntegrationTestEnvironment,
} = require("./clientServerTestSetup.js")
const { assertEquals, runTests } = require("./testUtils.js")

const tests = {
	testClientServerFlow: async () => {
		const window = await setupIntegrationTestEnvironment()
		const { $ } = window
		
		// Navigate to the topics page
		$(`footer [href="/topics"]`).click()
		await new Promise(resolve => setTimeout(resolve, 0))

		// Verify the default topics returned in clientServerTestup.js are shown in the DOM
		assertEquals(
			"Religion",
			$("main-content-wrapper topics topic:nth-child(1) topicname-subtitle topicname name").innerText,
			`First topic name should be "Religion"`,
		)
		assertEquals(
			"2",
			$("main-content-wrapper topics topic:nth-child(1) topicname-subtitle topicname count").innerText,
			`First topic post count should be "2"`,
		)
	},
}

runTests(path.basename(__filename), Object.values(tests))