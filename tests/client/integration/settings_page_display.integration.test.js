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
			"/posts": {
				// For navigation after agreeing to terms
				path: "/posts",
				posts: [],
				replies: [],
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
				posts: [],
				replies: [],
				activities: [],
				notifications: [], // Other standard page data
				user_id: "test-user-123", // Logged-in user context
				has_more: false,
			},
		})

		// 2. Initial Navigation (Welcome -> Posts)
		const $joinButton = $(`a[href="/posts"][big]`)
		$joinButton.click()
		await new Promise((resolve) => setTimeout(resolve, 0))

		// 3. Navigation - Open Menu and Go to Settings
		const $hamburgerIcon = $("header hamburger")
		$hamburgerIcon.click()
		await new Promise((resolve) => setTimeout(resolve, 0)) // Wait for menu to render

		const $settingsLink = $("menu-wrapper menu links a[href='/settings']")
		$settingsLink.click()
		await new Promise((resolve) => setTimeout(resolve, 0)) // Wait for settings page to render
		assertEquals(
			"/settings",
			state.path,
			"Path should be /settings after clicking the settings link.",
		)

		// 4. Verify Settings Page Content
		const $mainContentWrapper = $("main-content-wrapper[active]")
		const $mainContent = $mainContentWrapper.$("main-content")

		// Verify the header of the settings page
		// The settings page title is rendered by client/loadingPage.js
		// Structure: posts > post > h2[settings] > span:first-child
		const $settingsPageHeaderSpan = $mainContent.$(
			"posts post h2[settings] > span:first-child",
		)
		assertEquals(
			"Account settings",
			$settingsPageHeaderSpan.innerText.trim(),
			"Settings page H2 header text should be 'Account settings'.",
		)

		// Verify presence of some key settings elements based on client/loadingPage.js
		const $displayNameInput = $mainContent.$("input[display-name]")
		assertEquals(
			"Test User",
			$displayNameInput.value,
			"Display name input should be pre-filled with the user's current display name.",
		)

		// Email is not directly displayed with a 'current-email' attribute based on loadingPage.js
		// Password change is not a button with 'change-password' attribute based on loadingPage.js

		const $removeAccountButton = $mainContent.$("button[remove]")
		assertEquals(
			"Remove Account",
			$removeAccountButton.innerText.trim(),
			"Remove Account button text should be 'Remove Account'.",
		)

		const $saveDisplayNameButton = $mainContent.$("button[save]")
		assertEquals(
			"Save display name",
			$saveDisplayNameButton.innerText.trim(),
			"Save Display Name button text should be 'Save display name'.",
		)
	},
}

runTests(path.basename(__filename), Object.values(tests))
