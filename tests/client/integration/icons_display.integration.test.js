const path = require("path")
const {
	setupIntegrationTestEnvironment,
} = require("./../shared/integrationTestSetup.js")
const { assertEquals, runTests } = require("../shared/testUtils.js")

const tests = {
	testFooterIconsAreVisible: async () => {
		const window = await setupIntegrationTestEnvironment()
		const { state, $ } = window

		// Mock API responses for initial load and navigation to /posts
		window.setMockFetchResponseForPaths({
			"/posts": {
				path: "/posts",
				posts: [], // Empty posts list is fine for this test's assertions
				replies: [],
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

		// Simulate agreeing to terms to navigate to /posts
		const $joinButton = $(`a[href="/posts"][big]`)
		$joinButton.click()

		// Wait for navigation and rendering
		await new Promise((resolve) => setTimeout(resolve, 0))

		assertEquals(
			"/posts",
			state.path,
			"Path should be /posts after agreeing to terms.",
		)

		const footerIconsToTest = ["posts", "tag", "favorites", "notifications"]

		footerIconsToTest.forEach((iconName) => {
			const selector = `footer icon[${iconName}] svg`
			const $iconSvg = $(selector)
			assertEquals(
				"svg",
				$iconSvg.tagName?.toLowerCase(),
				`Footer icon <${iconName}> element should be an SVG tag.`,
			)
		})
	},

	// This test was added by a previous subtask and is being kept.
	testHeaderHamburgerIconIsVisible: async () => {
		const window = await setupIntegrationTestEnvironment()
		const { $ } = window

		const $hamburgerImg = $("header hamburger img")
		assertEquals(
			"img",
			$hamburgerImg.tagName?.toLowerCase(),
			"Hamburger element should be an <img> tag.",
		)
		assertEquals(
			"/hamburger.svg",
			$hamburgerImg.getAttribute("src"),
			"Hamburger image src attribute should be correct.",
		)
		assertEquals(
			"Menu",
			$hamburgerImg.getAttribute("alt"),
			"Hamburger image alt attribute should be correct.",
		)
	},

	testGlobalIconsAreAvailable: async () => {
		const window = await setupIntegrationTestEnvironment()
		const { $ } = window

		const globalIconsToTest = [
			{ name: "reply", selector: "icons icon[reply] svg" },
			{ name: "settings", selector: "icons icon[settings] svg" },
			{ name: "more", selector: "icons icon[more] svg" },
		]

		globalIconsToTest.forEach((iconInfo) => {
			const $iconSvg = $(iconInfo.selector)
			assertEquals(
				"svg",
				$iconSvg.tagName?.toLowerCase(),
				`Global icon <${iconInfo.name}> element should be an SVG tag.`,
			)
		})
	},
}

runTests(path.basename(__filename), Object.values(tests))
