const path = require("path")
const {
	setupTestEnvironment,
} = require("../testSetupHelpers.js")
const { assertEquals, runTests } = require("../testRunUtils.js")

const tests = {
	testFlow: async () => {
		const window = await setupTestEnvironment()
		const { $old } = window
		
		// Navigate to notifications page via footer "Alerts" link
		$old("footer a[href='/notifications']").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		assertEquals(
			"Alerts",
			$old("main-content posts[notifications-header] h2").textContent.trim(),
			"Should show 'Alerts' header",
		)

		assertEquals(
			"Unread (2)",
			$old("main-content notifications h3").textContent.trim(),
			"Should show unread count as 'Unread (2)'",
		)

		assertEquals(
			"User B",
			$old("main-content notifications notification:nth-child(2) b:first-child").textContent,
			"First notification should show User B name",
		)

		assertEquals(
			`"First notification for User A"`,
			$old("main-content notifications notification:nth-child(2) i").textContent,
			"First notification should show First notification for User A",
		)

		assertEquals(
			"User B",
			$old("main-content notifications notification:nth-child(3) b:first-child").textContent,
			"Second notification should show User B name",
		)

		assertEquals(
			`"Second notification for User A"`,
			$old("main-content notifications notification:nth-child(3) i").textContent,
			"Second notification should show Second notification for User A",
		)

		assertEquals(
			"User B",
			$old("main-content-2 notifications notification:nth-child(2) b:first-child").textContent,
			"Read notification should show User B name",
		)

		assertEquals(
			`"This was an old reply to User A"`,
			$old("main-content-2 notifications notification:nth-child(2) i").textContent,
			"Read notification should show This was an old reply to User A",
		)
	},
	
	testToggleSurvivesMarkAllAsRead: async () => {
		const window = await setupTestEnvironment()
		const { $old, state, _ } = window
		
		// Enable push notifications to show toggle and mark all as read button
		state.push_available = true
		state.push_active = true // Need to be active to show mark all as read button
		state.email = "test@example.com" // Need email to show toggle functionality
		
		// Navigate to notifications page
		$old("footer a[href='/notifications']").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Verify toggle exists initially
		assertEquals(
			true,
			Boolean($old("toggle-wrapper")),
			"Toggle should exist initially",
		)
		
		// Verify mark all as read button exists 
		assertEquals(
			true,
			Boolean($old("button[mark-all-as-read]")),
			"Mark all as read button should exist",
		)
		
		// Click "mark all as read" button
		$old("button[mark-all-as-read]").click()
		await new Promise(resolve => setTimeout(resolve, 100)) // Allow reactive updates
		
		// Verify toggle still exists after marking as read
		assertEquals(
			true,
			Boolean($old("toggle-wrapper")),
			"Toggle should still exist after mark all as read",
		)
		
		// Verify toggle text is still correct
		assertEquals(
			"Turn on notifications",
			$old("toggle-text").textContent.trim(),
			"Toggle text should be correct",
		)
		
		// Verify unread count updated to 0
		assertEquals(
			"Unread",
			$old("main-content notifications h3").textContent.trim(),
			"Should show 'Unread' (no count) after marking all as read",
		)
	},
}

runTests(path.basename(__filename), Object.values(tests))