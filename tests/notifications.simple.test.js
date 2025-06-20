const path = require("path")
const {
	setupTestEnvironment,
} = require("./testSetupHelpers.js")
const { assertEquals, runTests } = require("./testRunUtils.js")

const tests = {
	testFlow: async () => {
		const window = await setupTestEnvironment()
		const { $ } = window
		
		// Navigate to notifications page via footer "Alerts" link
		$("footer a[href='/notifications']").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		assertEquals(
			"Alerts",
			$("main-content posts[notifications-header] h2").textContent.trim(),
			"Should show 'Alerts' header",
		)

		assertEquals(
			"Unread (2)",
			$("main-content notifications h3").textContent.trim(),
			"Should show unread count as 'Unread (2)'",
		)

		assertEquals(
			"User B",
			$("main-content notifications notification:nth-child(2) b:first-child").textContent,
			"First notification should show User B name",
		)

		assertEquals(
			`"First notification for User A"`,
			$("main-content notifications notification:nth-child(2) i").textContent,
			"First notification should show First notification for User A",
		)

		assertEquals(
			"User B",
			$("main-content notifications notification:nth-child(3) b:first-child").textContent,
			"Second notification should show User B name",
		)

		assertEquals(
			`"Second notification for User A"`,
			$("main-content notifications notification:nth-child(3) i").textContent,
			"Second notification should show Second notification for User A",
		)

		assertEquals(
			"User B",
			$("main-content-2 notifications notification:nth-child(2) b:first-child").textContent,
			"Read notification should show User B name",
		)

		assertEquals(
			`"This was an old reply to User A"`,
			$("main-content-2 notifications notification:nth-child(2) i").textContent,
			"Read notification should show This was an old reply to User A",
		)
	},
}

runTests(path.basename(__filename), Object.values(tests))