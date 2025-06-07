const path = require("path")
const {
	setupIntegrationTestEnvironment,
} = require("./../shared/integrationTestSetup.js")
const { assertEquals, runTests } = require("../shared/testUtils.js")

const tests = {
	testAddNewTopicFormDisplaysCorrectlyWhenLoggedInOnTopicsPage: async () => {
		const window = await setupIntegrationTestEnvironment()
		const { state, $ } = window

		// 1. Mock API responses
		window.setMockFetchResponseForPaths({
			"/topics": {
				// For the topics page
				path: "/topics",
				// Simulate a logged-in user
				user_id: "test-user-123",
				email: "test@example.com",
				user_slug: "test-user",
				display_name: "Test User",
				// Other necessary data for /topics page
				topics: [], // No actual topics needed for this test
				comments: [],
				activities: [],
				notifications: [],
				profile_picture_uuid: null,
				display_name_index: 0, // ensure these are present
				subscribed_to_users: 0,
				has_more: false,
			},
		})

		// 2. Actions: Navigate from Welcome to Topics page
		const $joinButton = $(`a[href="/topics"][big]`)
		assertEquals(
			true,
			Boolean($joinButton),
			"Agree button (Join the Discussion) should exist on the welcome page.",
		)

		// Before clicking, state.user_id should be null (or whatever initial value)
		const initialUserId = state.user_id

		$joinButton.click()
		await new Promise((resolve) => setTimeout(resolve, 0)) // Wait for DOM updates and navigation

		assertEquals(
			"/topics",
			state.path,
			"Path should be /topics after agreeing to terms.",
		)

		assertEquals(
			"test-user-123",
			state.user_id,
			`state.user_id should be updated by mock. Initial: ${initialUserId}, Current: ${state.user_id}`,
		)

		const $formContainer = $(
			"main-content-wrapper[active] main-content add-new[topic]",
		)
		assertEquals(
			true,
			Boolean($formContainer),
			"Add New Topic form container (add-new[topic]) should be present in main-content.",
		)

		const $titleInput = $formContainer.$("input[title]")
		assertEquals(
			true,
			Boolean($titleInput),
			"Title input should be present in the form.",
		)
		assertEquals(
			"Title",
			$titleInput.getAttribute("placeholder"),
			"Title input placeholder should be 'Title'.",
		)

		const $bodyTextarea = $formContainer.$("textarea[body]")
		assertEquals(
			true,
			Boolean($bodyTextarea),
			"Body textarea should be present in the form.",
		)
		assertEquals(
			true,
			$bodyTextarea.getAttribute("placeholder")?.includes("Content"),
			"Body textarea placeholder should contain 'Content'.",
		)

		const $pollIconContainer = $formContainer.$("label[poll] icon") // container for the svg
		assertEquals(
			true,
			Boolean($pollIconContainer),
			"Poll icon container (label[poll] icon) should be present.",
		)
		const $pollIconSvg = $pollIconContainer.$("svg")
		assertEquals(
			true,
			Boolean($pollIconSvg),
			"Poll icon SVG should be present within its container.",
		)
		assertEquals(
			"svg",
			$pollIconSvg.tagName?.toLowerCase(),
			"Poll icon should be an SVG.",
		)

		const $imageIconContainer = $formContainer.$("label[image] icon") // container for the svg
		assertEquals(
			true,
			Boolean($imageIconContainer),
			"Image icon container (label[image] icon) should be present.",
		)
		const $imageIconSvg = $imageIconContainer.$("svg")
		assertEquals(
			true,
			Boolean($imageIconSvg),
			"Image icon SVG should be present within its container.",
		)
		assertEquals(
			"svg",
			$imageIconSvg.tagName?.toLowerCase(),
			"Image icon should be an SVG.",
		)

		const $submitButton = $formContainer.$("button[submit]")
		assertEquals(
			true,
			Boolean($submitButton),
			"Submit button should be present.",
		)
		assertEquals(
			"Add topic",
			$submitButton.innerText.trim(),
			"Submit button text should be 'Add topic'.",
		)

		const $cancelButton = $formContainer.$("button[alt][cancel]")
		assertEquals(
			false,
			Boolean($cancelButton),
			"Cancel button should NOT be present for a new topic form.",
		)
	},
}

runTests(path.basename(__filename), Object.values(tests))
