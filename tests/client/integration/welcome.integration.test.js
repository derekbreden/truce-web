const path = require("path")
const {
	setupIntegrationTestEnvironment,
} = require("./../shared/integrationTestSetup.js")
const { assertEquals, runTests } = require("../shared/testUtils.js")

const tests = {
	testInitialPageShowsWelcomeOrTerms: async () => {
		const window = await setupIntegrationTestEnvironment()
		const { state, $ } = window

		// The welcome header is specifically <h2 welcome><span>Terms and conditions</span></h2>
		const $welcomeHeaderSpan = $("h2[welcome] span")

		// If $welcomeHeaderSpan is null, the next line (.innerText.trim()) will fail.
		assertEquals(
			"Terms and conditions",
			$welcomeHeaderSpan.innerText.trim(),
			`Initial page should display "Terms and conditions" in the welcome header span.`,
		)

		// Corrected selector for the "Join the Discussion" button
		const $joinButton = $(`a[href="/topics"][big]`)
		assertEquals(
			"Join the Discussion",
			$joinButton.innerText.trim(),
			`Button text should be "Join the Discussion".`,
		)
	},

	testAgreeingToTermsNavigatesToNextPageAndSetsLocalStorage: async () => {
		const window = await setupIntegrationTestEnvironment()
		const { state, $ } = window

		// Setup mock API responses for this test
		window.setMockFetchResponseForPaths({
			"/topics": {
				path: "/topics",
				topics: [], // Empty topics list is fine for this test"s assertions
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

		const $joinButton = $(`a[href="/topics"][big]`)
		$joinButton.click()

		// Wait for render
		await new Promise((resolve) => setTimeout(resolve, 0))

		// 1. Verify terms are no longer visible
		const $welcomeHeaderSpanAfterClick = $("h2[welcome] span")
		assertEquals(
			null,
			$welcomeHeaderSpanAfterClick,
			"Welcome header span should NOT be present after agreeing to terms.",
		)

		// 2. Verify localStorage item is set
		// The client-side code uses `localStorage.setItem(`${window.local_storage_key}:agreed`, true)`
		// window.local_storage_key is set based on referrer or userAgent. In JSDOM, it defaults.
		// The goToPath function refers to it as "agreed" not "truce_terms_agreed"
		const $termsAgreed = window.localStorage.getItem(
			window.local_storage_key
				? `${window.local_storage_key}:agreed`
				: "trucev1:agreed",
		)
		assertEquals(
			"true",
			$termsAgreed,
			`localStorage "${window.local_storage_key || "trucev1"}:agreed" should be set to "true".`,
		)

		// 3. Verify new content is loaded (e.g., topics list)
		const $topicsWrapper = $("topics")
		assertEquals(
			true,
			Boolean($topicsWrapper),
			"Topics wrapper element should be present after agreeing to terms.",
		)

		// Further check: The last_root_path in localStorage should be updated to /topics
		// The client-side goToPath function updates this.
		const lastRootPath = window.localStorage.getItem(
			window.local_storage_key
				? `${window.local_storage_key}:last_root_path`
				: "trucev1:last_root_path",
		)
		assertEquals(
			"/topics",
			lastRootPath,
			`localStorage "last_root_path" should be set to "/topics".`,
		)
	},
}

runTests(path.basename(__filename), Object.values(tests))
