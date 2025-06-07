const path = require("path")
const {
	setupIntegrationTestEnvironment,
} = require("./../shared/integrationTestSetup.js")
const { assertEquals, runTests } = require("../shared/testUtils.js")

const tests = {
	testStaticMenuElementsAreVisible: async () => {
		const window = await setupIntegrationTestEnvironment()
		const { state, $ } = window

		// Mock API response for initial load (logged-out user)
		window.setMockFetchResponseForPaths({
			"/topics": {
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
		})

		// Click Join
		const $joinButton = $(`a[href="/topics"][big]`)
		$joinButton.click()
		await new Promise((resolve) => setTimeout(resolve, 0))

		// Open the menu
		const $hamburgerIcon = $("header hamburger")
		assertEquals(
			true,
			Boolean($hamburgerIcon),
			"Hamburger menu icon should exist in the header.",
		)

		$hamburgerIcon.click()
		await new Promise((resolve) => setTimeout(resolve, 0))

		// Verify menu container is visible (using menu-wrapper)
		const $menuWrapper = $("menu-wrapper")
		assertEquals(
			true,
			Boolean($menuWrapper),
			"Menu wrapper should be visible after clicking hamburger.",
		)

		const $menu = $menuWrapper.$("menu")
		assertEquals(
			true,
			Boolean($menu),
			"Menu element should exist within the wrapper.",
		)

		// Assertions for logged-out user
		// Settings link (NOT visible for logged-out user as per menu.js)
		const $settingsLink = $menu.$("links a[href='/settings']")
		assertEquals(
			false,
			Boolean($settingsLink),
			"Settings link (a[href='/settings']) should NOT exist in the menu for a logged-out user.",
		)

		// Sign In / Sign Up form (visible when not logged in)
		// menu.js adds a form with a submit button, not separate links
		const $signInForm = $menu.$("menu sign-in") // Check within $menu, then 'menu' tag, then 'sign-in' tag
		assertEquals(
			true,
			Boolean($signInForm),
			"Sign In form element should exist in the menu for a logged-out user.",
		)
		const $submitButton = $signInForm.$("button[submit]")
		assertEquals(
			true,
			Boolean($submitButton),
			"Sign In form should have a submit button.",
		)
		assertEquals(
			"Sign up / Sign in",
			$submitButton?.innerText?.trim(),
			"Submit button text should be 'Sign up / Sign in'.",
		)

		// Ensure individual "Login" and "Sign Up" links as previously checked are NOT there
		const $loginLink = $menu.$("links a[href='/login']")
		assertEquals(
			false,
			Boolean($loginLink),
			"Dedicated Login link (a[href='/login']) should NOT exist for a logged-out user.",
		)
		const $signUpLink = $menu.$("links a[href='/sign-up']")
		assertEquals(
			false,
			Boolean($signUpLink),
			"Dedicated Sign Up link (a[href='/sign-up']) should NOT exist for a logged-out user.",
		)

		// Ensure "Your Profile" and "Logout" are NOT visible
		const $yourProfileLink = $menu.$(`links a[href^='/user/']`) // This selector is fine for checking non-existence
		assertEquals(
			false,
			Boolean($yourProfileLink),
			"Your Profile link should NOT exist for a logged-out user.",
		)

		const $logoutButton = $menu.$("menu signed-in button[sign-out]") // Corrected selector for checking non-existence
		assertEquals(
			false,
			Boolean($logoutButton),
			"Logout button should NOT exist for a logged-out user.",
		)
	},

	testLoggedInUserMenuElementsAreVisible: async () => {
		const window = await setupIntegrationTestEnvironment()
		const { state, $ } = window

		// Define mock user
		const mockUser = {
			user_slug: "test-user-slug",
			display_name: "Test User",
			email: "test@example.com",
			user_id: "test-user-id-123",
		}

		// Mock API response for initial load (still good practice, though we override state)
		window.setMockFetchResponseForPaths({
			"/topics": {
				path: "/topics",
				topics: [],
				comments: [],
				activities: [],
				notifications: [],
				user_slug: mockUser.user_slug,
				subscribed_to_users: 0,
				user_id: mockUser.user_id,
				email: mockUser.email,
				display_name: mockUser.display_name,
				profile_picture_uuid: null,
				display_name_index: 0,
				has_more: false,
			},
		})

		// Click Join
		const $joinButton = $(`a[href="/topics"][big]`)
		$joinButton.click()
		await new Promise((resolve) => setTimeout(resolve, 0))

		// Open the menu
		const $hamburgerIcon = $("header hamburger")
		assertEquals(
			true,
			Boolean($hamburgerIcon),
			"Hamburger menu icon should exist in the header.",
		)

		$hamburgerIcon.click()
		await new Promise((resolve) => setTimeout(resolve, 0))

		// Verify menu container is visible (using menu-wrapper based on subtask feedback)
		const $menuWrapper = $("menu-wrapper")
		assertEquals(
			true,
			Boolean($menuWrapper),
			"Menu wrapper should be visible after clicking hamburger.",
		)

		const $menu = $menuWrapper.$("menu")
		assertEquals(
			true,
			Boolean($menu),
			"Menu element should exist within the wrapper.",
		)

		// Assertions for logged-in user
		// Settings link (visible for logged-in user)
		const $settingsLink = $menu.$("links a[href='/settings']")
		assertEquals(
			true,
			Boolean($settingsLink),
			"Settings link (a[href='/settings']) should exist in the menu for a logged-in user.",
		)
		const $settingsLinkText = $settingsLink.$("p") // menu.js structure: a > icon + p
		assertEquals(
			true,
			Boolean($settingsLinkText),
			"Settings link should have a <p> tag for text.",
		)
		assertEquals(
			"Account settings",
			$settingsLinkText?.innerText?.trim(),
			"Settings link text should be 'Account settings'.",
		)

		// "Your Profile" link (NOT generated by menu.js as per current code)
		const $yourProfileLink = $menu.$(
			`links a[href='/user/${mockUser.user_slug}']`,
		)
		assertEquals(
			false,
			Boolean($yourProfileLink),
			`Your Profile link should NOT exist as per current menu.js for a logged-in user.`,
		)

		// Logout button (visible for logged-in user)
		// menu.js appends 'signed-in' element containing 'button[sign-out]' to menu.$("menu")
		const $signedInSection = $menu.$("menu signed-in")
		assertEquals(
			true,
			Boolean($signedInSection),
			"Signed-in section should exist for a logged-in user.",
		)
		const $logoutButton = $signedInSection.$("button[sign-out]")
		assertEquals(
			true,
			Boolean($logoutButton),
			"Logout button (button[sign-out]) should exist for a logged-in user.",
		)
		assertEquals(
			"Log out",
			$logoutButton?.innerText?.trim(),
			"Logout button text should be 'Log out'.",
		)

		// Ensure "Login Form" / "Sign Up Form" (i.e. sign-in element) is NOT visible
		const $signInForm = $menu.$("menu sign-in")
		assertEquals(
			false,
			Boolean($signInForm),
			"Sign In form element (sign-in) should NOT exist for a logged-in user.",
		)

		// Ensure old selectors for Login/Sign up links are not found
		const $loginLink = $menu.$("links a[href='/login']")
		assertEquals(
			false,
			Boolean($loginLink),
			"Dedicated Login link (a[href='/login']) should NOT exist for a logged-in user.",
		)
		const $signUpLink = $menu.$("links a[href='/sign-up']")
		assertEquals(
			false,
			Boolean($signUpLink),
			"Sign Up link should NOT exist for a logged-in user.",
		)
	},
}

runTests(path.basename(__filename), Object.values(tests))
