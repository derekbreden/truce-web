const path = require("path")
const {
	setupIntegrationTestEnvironment,
} = require("./../shared/integrationTestSetup.js")
const { assertEquals, runTests } = require("../shared/testUtils.js")

const tests = {
	testSettingsPageDisplaysCorrectly: async () => {
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
				// Crucially, mock a user_id to ensure "Account settings" link appears
				user_id: "test-user-123",
				user_slug: "test-user",
				email: "test@example.com",
				display_name: "Test User",
				profile_picture_uuid: null,
				display_name_index: 0,
				subscribed_to_users: 0,
				has_more: false,
			},
			"/settings": {
				// For the actual settings page
				path: "/settings",
				// Mock data that the settings page would use
				user: {
					user_slug: "test-user",
					display_name: "Test User",
					email: "test@example.com",
					profile_picture_uuid: null,
					display_name_index: 0,
				},
				topics: [],
				comments: [],
				activities: [],
				notifications: [], // Other standard page data
				user_id: "test-user-123", // Logged-in user context
				has_more: false,
			},
		})

		// 2. Initial Navigation (Welcome -> Topics)
		const $joinButton = $(`a[href="/topics"][big]`)
		assertEquals(
			true,
			Boolean($joinButton),
			"Agree button (Join the Discussion) should exist on the welcome page.",
		)

		$joinButton.click()
		await new Promise((resolve) => setTimeout(resolve, 0))
		assertEquals(
			"/topics",
			state.path,
			"Path should be /topics after agreeing to terms.",
		)

		// 3. Navigation - Open Menu and Go to Settings
		const $hamburgerIcon = $("header hamburger")
		assertEquals(
			true,
			Boolean($hamburgerIcon),
			"Hamburger menu icon should exist in the header.",
		)
		$hamburgerIcon.click()
		await new Promise((resolve) => setTimeout(resolve, 0)) // Wait for menu to render

		const $settingsLink = $("menu-wrapper menu links a[href='/settings']")
		assertEquals(
			true,
			Boolean($settingsLink),
			"Settings link should exist in the menu.",
		)
		$settingsLink.click()
		await new Promise((resolve) => setTimeout(resolve, 0)) // Wait for settings page to render
		assertEquals(
			"/settings",
			state.path,
			"Path should be /settings after clicking the settings link.",
		)

		// 4. Verify Settings Page Content
		const $mainContentWrapper = $("main-content-wrapper[active]")
		assertEquals(
			true,
			Boolean($mainContentWrapper),
			"Main content wrapper for settings page should be active.",
		)

		const $mainContent = $mainContentWrapper.$("main-content")
		assertEquals(
			true,
			Boolean($mainContent),
			"Main content area should exist within the active wrapper.",
		)

		// Verify the header of the settings page
		// The settings page title is rendered by client/loadingPage.js
		// Structure: topics > topic > h2[settings] > span:first-child
		const $settingsPageHeaderSpan = $mainContent.$(
			"topics topic h2[settings] > span:first-child",
		)
		assertEquals(
			true,
			Boolean($settingsPageHeaderSpan),
			"Settings page H2 header span should exist (topics > topic > h2[settings] > span:first-child).",
		)
		assertEquals(
			"Account settings",
			$settingsPageHeaderSpan.innerText.trim(),
			"Settings page H2 header text should be 'Account settings'.",
		)

		// Verify presence of some key settings elements based on client/loadingPage.js
		const $displayNameInput = $mainContent.$("input[display-name]")
		assertEquals(
			true,
			Boolean($displayNameInput),
			"Display name input field (input[display-name]) should exist on the settings page.",
		)
		assertEquals(
			"Test User",
			$displayNameInput.value,
			"Display name input should be pre-filled with the user's current display name.",
		)

		// Email is not directly displayed with a 'current-email' attribute based on loadingPage.js
		// Password change is not a button with 'change-password' attribute based on loadingPage.js

		const $removeAccountButton = $mainContent.$("button[remove]")
		assertEquals(
			true,
			Boolean($removeAccountButton),
			"Remove Account button should exist on the settings page.",
		)
		assertEquals(
			"Remove Account",
			$removeAccountButton.innerText.trim(),
			"Remove Account button text should be 'Remove Account'.",
		)

		const $saveDisplayNameButton = $mainContent.$("button[save]")
		assertEquals(
			true,
			Boolean($saveDisplayNameButton),
			"Save Display Name button should exist on the settings page.",
		)
		assertEquals(
			"Save display name",
			$saveDisplayNameButton.innerText.trim(),
			"Save Display Name button text should be 'Save display name'.",
		)
	},
}

runTests(path.basename(__filename), Object.values(tests))
