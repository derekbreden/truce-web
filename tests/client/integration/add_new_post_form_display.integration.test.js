const path = require("path")
const {
	setupIntegrationTestEnvironment,
} = require("./../shared/integrationTestSetup.js")
const { assertEquals, runTests } = require("../shared/testUtils.js")

const tests = {
	testAddNewPostFormDisplaysCorrectlyWhenLoggedInOnPostsPage: async () => {
		const window = await setupIntegrationTestEnvironment()
		const { state, $ } = window

		// 1. Mock API responses
		window.setMockFetchResponseForPaths({
			"/posts": {
				// For the posts page
				path: "/posts",
				// Simulate a logged-in user
				user_id: "test-user-123",
				email: "test@example.com",
				user_slug: "test-user",
				display_name: "Test User",
				// Other necessary data for /posts page
				posts: [], // No actual posts needed for this test
				replies: [],
				activities: [],
				notifications: [],
				profile_picture_uuid: null,
				display_name_index: 0, // ensure these are present
				subscribed_to_users: 0,
				has_more: false,
			},
		})

		// Before clicking, state.user_id should be null (or whatever initial value)
		const initialUserId = state.user_id

		// 2. Actions: Navigate from Welcome to Posts page
		const $joinButton = $(`a[href="/posts"][big]`)
		$joinButton.click()
		await new Promise((resolve) => setTimeout(resolve, 0))

		assertEquals(
			"/posts",
			state.path,
			"Path should be /posts after agreeing to terms.",
		)

		assertEquals(
			"test-user-123",
			state.user_id,
			`state.user_id should be updated by mock. Initial: ${initialUserId}, Current: ${state.user_id}`,
		)

		const $formContainer = $(
			"main-content-wrapper[active] main-content add-new[post]",
		)
		const $titleInput = $formContainer.$("input[title]")
		assertEquals(
			"Title",
			$titleInput.getAttribute("placeholder"),
			"Title input placeholder should be 'Title'.",
		)

		const $bodyTextarea = $formContainer.$("textarea[body]")
		assertEquals(
			true,
			$bodyTextarea.getAttribute("placeholder")?.includes("Content"),
			"Body textarea placeholder should contain 'Content'.",
		)

		const $pollIconContainer = $formContainer.$("label[poll] icon")
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

		const $imageIconContainer = $formContainer.$("label[image] icon")
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
			"Add post",
			$submitButton.innerText.trim(),
			"Submit button text should be 'Add post'.",
		)

		const $cancelButton = $formContainer.$("button[alt][cancel]")
		assertEquals(
			false,
			Boolean($cancelButton),
			"Cancel button should NOT be present for a new post form.",
		)
	},
}

runTests(path.basename(__filename), Object.values(tests))
