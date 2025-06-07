const path = require("path")
const {
	setupIntegrationTestEnvironment,
} = require("./../shared/integrationTestSetup.js")
const { assertEquals, runTests } = require("../shared/testUtils.js")

const tests = {
	testFooterIconsAreVisible: async () => {
		const window = await setupIntegrationTestEnvironment()
		const { state, $ } = window

		// Mock API responses for initial load and navigation to /topics
		window.setMockFetchResponseForPaths({
			"/topics": {
				path: "/topics",
				topics: [], // Empty topics list is fine for this test's assertions
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

		// Simulate agreeing to terms to navigate to /topics
		const $joinButton = $(`a[href="/topics"][big]`)
		$joinButton.click()

		// Wait for navigation and rendering
		await new Promise((resolve) => setTimeout(resolve, 0))

		assertEquals(
			"/topics",
			state.path,
			"Path should be /topics after agreeing to terms.",
		)

		const footerIconsToTest = ["topics", "tag", "favorites", "notifications"]

		footerIconsToTest.forEach((iconName) => {
			const selector = `footer icon[${iconName}] svg`
			const $iconSvg = $(selector)
			assertEquals(
				true,
				Boolean($iconSvg),
				`Footer icon <${iconName}> SVG should exist. Selector: ${selector}`,
			)
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
			true,
			Boolean($hamburgerImg),
			"Hamburger image should exist in the header.",
		)
		if ($hamburgerImg) {
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
		}
	},

	testGlobalIconsAreAvailable: async () => {
		const window = await setupIntegrationTestEnvironment()
		const { $ } = window

		const globalIconsToTest = [
			{ name: "comment", selector: "icons icon[comment] svg" },
			{ name: "settings", selector: "icons icon[settings] svg" },
			{ name: "more", selector: "icons icon[more] svg" },
		]

		globalIconsToTest.forEach((iconInfo) => {
			const $iconSvg = $(iconInfo.selector)
			assertEquals(
				true,
				Boolean($iconSvg),
				`Global icon <${iconInfo.name}> SVG should exist. Selector: ${iconInfo.selector}`,
			)
			assertEquals(
				"svg",
				$iconSvg.tagName?.toLowerCase(),
				`Global icon <${iconInfo.name}> element should be an SVG tag.`,
			)
		})
	},
}

runTests(path.basename(__filename), Object.values(tests))
