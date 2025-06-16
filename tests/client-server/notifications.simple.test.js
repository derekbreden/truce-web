const path = require("path")
const {
	setupIntegrationTestEnvironment,
} = require("./clientServerTestSetup.js")
const { assertEquals, runTests } = require("../client/shared/testUtils.js")

const tests = {
	testClientServerFlow: async () => {
		const window = await setupIntegrationTestEnvironment()
		const { $ } = window
		
		// Navigate to notifications page via footer "Alerts" link
		$("footer a[href='/notifications']").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Check header text
		assertEquals(
			"Alerts",
			$("main-content posts[notifications-header] h2").innerText.trim(),
			"Should show 'Alerts' header",
		)
		
		// Check unread count
		assertEquals(
			"Unread (2)",
			$("main-content notifications h3").innerText.trim(),
			"Should show unread count as 'Unread (2)'",
		)
		
		// Check unread notifications
		const $unreadNotifications = $("main-content notifications notification")
		assertEquals(
			2,
			$unreadNotifications.length,
			"Should have 2 unread notifications",
		)
		
		// Check first notification shows User B name
		assertEquals(
			"User B",
			$unreadNotifications[0].querySelector("b").innerText,
			"First notification should show User B name",
		)
		
		// Check second notification shows User B name
		assertEquals(
			"User B",
			$unreadNotifications[1].querySelector("b").innerText,
			"Second notification should show User B name",
		)
		
		// Check read notifications exist in main-content-2
		const $readNotifications = $("main-content-2").querySelectorAll("notifications notification")
		assertEquals(
			1,
			$readNotifications.length,
			"Should have 1 read notification",
		)
		
		assertEquals(
			"User B",
			$readNotifications[0].querySelector("b").innerText,
			"Read notification should show User B name",
		)
	},
}

runTests(path.basename(__filename), Object.values(tests))