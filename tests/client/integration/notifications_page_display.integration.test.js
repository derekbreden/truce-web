const path = require("path")
const {
	setupIntegrationTestEnvironment,
} = require("./../shared/integrationTestSetup.js")
const { assertEquals, runTests } = require("../shared/testUtils.js")

const tests = {
	testNotificationsPageDisplaysCorrectlyAfterNavigation: async () => {
		const window = await setupIntegrationTestEnvironment()
		const { state, $ } = window

		// 1. Mock API responses
		window.setMockFetchResponseForPaths({
			"/topics": {
				// For navigation after agreeing to terms
				path: "/topics",
				topics: [],
				comments: [],
				activities: [],
				notifications: [],
				user_slug: null,
				subscribed_to_users: 0,
				user_id: null,
				email: null,
				display_name: null,
				profile_picture_uuid: null,
				display_name_index: 0,
				has_more: false,
			},
			"/notifications": {
				// For the actual notifications page
				path: "/notifications",
				notifications: [], // Start with an empty list of notifications
				topics: [],
				comments: [],
				activities: [], // Other data that might be part of a standard page response
				user_slug: null,
				subscribed_to_users: 0,
				user_id: null,
				email: null,
				display_name: null,
				profile_picture_uuid: null,
				display_name_index: 0,
				has_more: false,
			},
		})

		// 2. Initial Navigation (Welcome -> Topics)
		const $joinButton = $(`a[href="/topics"][big]`)
		$joinButton.click()
		await new Promise((resolve) => setTimeout(resolve, 0))
		assertEquals(
			"/topics",
			state.path,
			"Path should be /topics after agreeing to terms.",
		)

		// 3. Navigate to Notifications Page
		const $notificationsFooterIcon = $("footer icon[notifications]")
		assertEquals(
			true,
			Boolean($notificationsFooterIcon),
			"Notifications footer icon should exist.",
		)

		$notificationsFooterIcon.click()
		await new Promise((resolve) => setTimeout(resolve, 0))
		assertEquals(
			"/notifications",
			state.path,
			"Path should be /notifications after clicking the notifications footer icon.",
		)

		// 4. Verify Notifications Page Content
		const $mainContentWrapper = $("main-content-wrapper[active]")
		assertEquals(
			true,
			Boolean($mainContentWrapper),
			"Main content wrapper for notifications page should be active.",
		)

		const $mainContent = $mainContentWrapper.$("main-content")
		assertEquals(
			true,
			Boolean($mainContent),
			"Main content area should exist within the active wrapper.",
		)

		// Based on renderNotifications.js, when state.email is null (as in mock),
		// the header is <topics[notifications-header]><topic><h2>Alerts</h2>...</topic></topics>
		const $notificationsPageHeader = $mainContent.$(
			"topics[notifications-header] topic h2",
		)
		assertEquals(
			true,
			Boolean($notificationsPageHeader),
			"Notifications page H2 header should exist.",
		)
		assertEquals(
			"Alerts",
			$notificationsPageHeader.innerText.trim(),
			"Notifications page H2 header text should be 'Alerts'.",
		)

		// Based on renderNotifications.js, the notifications are rendered inside a <notifications> element
		// within main-content.
		const $notificationsContainer = $mainContent.$("notifications")
		assertEquals(
			true,
			Boolean($notificationsContainer),
			"A <notifications> container should be present on the notifications page.",
		)

		// Since notifications: [] is mocked, and given the logic in renderNotifications.js for when state.email is null,
		// the <notifications> element might not be added, or might be empty.
		// If state.email is null, the main content is replaced by the "Alerts" header and a paragraph.
		// The actual notification rendering (unread/read lists) happens later and depends on state.email.
		// Let's verify that no <notification> custom elements are rendered.
		const $renderedNotificationElements =
			$mainContent.querySelectorAll("notification") // Actual element tag is 'notification'
		assertEquals(
			0,
			$renderedNotificationElements.length,
			"Should render 0 <notification> elements when state.email is null and notifications are empty.",
		)
	},
}

runTests(path.basename(__filename), Object.values(tests))
