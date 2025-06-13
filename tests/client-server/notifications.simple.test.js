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
		
		// Check unread count format "Unread (2)"
		assertEquals(
			"Unread (2)",
			$("main-content notifications h3").innerText.trim(),
			"Should show unread count as 'Unread (2)'",
		)
		
		// Check unread notification text content
		const $unreadNotifications = $("main-content notifications notification")
		assertEquals(
			"Reply User",
			$unreadNotifications[0].querySelector("b").innerText,
			"First notification should show Reply User name",
		)
		assertEquals(
			"\"This is a reply notification\"",
			$unreadNotifications[0].querySelector("i").innerText,
			"First notification should show reply body text",
		)
		assertEquals(
			"Message User",
			$unreadNotifications[1].querySelector("b").innerText,
			"Second notification should show Message User name",
		)
		assertEquals(
			"\"Hey there, how are you?\"",
			$unreadNotifications[1].querySelector("i").innerText,
			"Second notification should show message body text",
		)
		
		// Check read notifications header
		assertEquals(
			"Read",
			$("main-content-2 notifications h3").innerText.trim(),
			"Should show 'Read' header",
		)
		
		// Check read notification text content
		const $readNotifications = $("main-content-2").querySelectorAll("notifications notification")
		assertEquals(
			"Old User",
			$readNotifications[0].querySelector("b").innerText,
			"Read notification should show Old User name",
		)
		assertEquals(
			"\"This was an old reply\"",
			$readNotifications[0].querySelector("i").innerText,
			"Read notification should show old reply body text",
		)
	},
}

runTests(path.basename(__filename), Object.values(tests))