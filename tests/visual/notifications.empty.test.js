const path = require("path")
const {
	setupTestEnvironment,
} = require("../testSetupHelpers.js")
const { assertEquals, runTests } = require("../testRunUtils.js")

const tests = {
	testFlow: async () => {
		const statements = []
		
		// Delete all notifications to ensure empty state
		statements.push([
			`DELETE FROM message_notifications`,
			[]
		])
		statements.push([
			`DELETE FROM reply_notifications`,
			[]
		])

		const window = await setupTestEnvironment({
			sql_statements_to_execute: statements,
		})
		const { $old } = window
		
		$old("footer a[href='/notifications']").click()
		await new Promise(resolve => setTimeout(resolve, 0))
	},
}

runTests(path.basename(__filename), Object.values(tests))