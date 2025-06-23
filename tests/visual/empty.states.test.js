const path = require("path")
const {
	setupTestEnvironment,
} = require("../testSetupHelpers.js")
const { assertEquals, runTests } = require("../testRunUtils.js")

const tests = {
	captureEmptyStates: async () => {
		const window = await setupTestEnvironment()
		const { $ } = window

		// Navigate to favorites via hamburger menu
		$("hamburger").click()
		$(`menu a[href="/favorites"]`).click()
		await new Promise(resolve => setTimeout(resolve, 200))
		
		// Navigate to conversations via footer
		$("footer a[href='/conversations']").click()
		await new Promise(resolve => setTimeout(resolve, 200))
		
		// Navigate to notifications via footer  
		$("footer a[href='/notifications']").click()
		await new Promise(resolve => setTimeout(resolve, 200))
	},
}

runTests(path.basename(__filename), Object.values(tests))