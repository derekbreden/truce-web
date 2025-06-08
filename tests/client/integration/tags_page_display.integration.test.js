const path = require("path")
const {
	setupIntegrationTestEnvironment,
} = require("./../shared/integrationTestSetup.js")
const { assertEquals, runTests } = require("../shared/testUtils.js")

const tests = {
	testTagsPageDisplaysCorrectlyAfterNavigation: async () => {
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
				user_slug: null,
				subscribed_to_users: 0,
				user_id: null,
				email: null,
				display_name: null,
				profile_picture_uuid: null,
				display_name_index: 0,
				has_more: false,
			},
			"/tags": {
				// For the actual tags page
				path: "/tags",
				tags: [
					// Updated mock data structure
					{ tag_name: "science", posts: 10, subtitle: "All about science" },
					{ tag_name: "history", posts: 5, subtitle: "History discussions" },
				],
				// Other data that might be part of a standard page response (minimal for this test)
				posts: [],
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

		// 2. Initial Navigation (Welcome -> Posts)
		const $joinButton = $(`a[href="/posts"][big]`)
		$joinButton.click()
		await new Promise((resolve) => setTimeout(resolve, 0))
		assertEquals(
			"/posts",
			state.path,
			"Path should be /posts after agreeing to terms.",
		)

		// 3. Navigate to Tags Page
		const $tagsFooterIcon = $("footer icon[tag]")
		$tagsFooterIcon.click()
		await new Promise((resolve) => setTimeout(resolve, 0))
		assertEquals(
			"/tags",
			state.path,
			"Path should be /tags after clicking the tags footer icon.",
		)

		// 4. Verify Tags Page Content
		// Selectors updated to match client/renderTags.js
		const $mainContent = $("main-content-wrapper[active] main-content")

		const $tagsListContainer = $mainContent.$("tags[tags-list]")

		const $renderedTagElements = $tagsListContainer.querySelectorAll("tag[tag]") // Selects all elements like <tag tag="...">
		assertEquals(
			2,
			$renderedTagElements.length,
			"Should render 2 tag elements based on mock data.",
		)

		// Assert content of the first tag ("science")
		const $firstTag = $tagsListContainer.$("tag[tag='science']")

		const $firstNameElement = $firstTag.$("tagname name")
		assertEquals(
			"Science",
			$firstNameElement.innerText.trim(),
			"First tag name mismatch. Expected 'Science'.",
		)

		const $firstCountElement = $firstTag.$("tagname count")
		assertEquals(
			"10",
			$firstCountElement.innerText.trim(),
			"First tag count mismatch. Expected '10'.",
		)

		const $firstSubtitleElement = $firstTag.$("subtitle")
		assertEquals(
			"All about science",
			$firstSubtitleElement.innerText.trim(),
			"First tag subtitle mismatch.",
		)

		// Assert content of the second tag ("history")
		const $secondTag = $tagsListContainer.$("tag[tag='history']")

		const $secondNameElement = $secondTag.$("tagname name")
		assertEquals(
			"History",
			$secondNameElement.innerText.trim(),
			"Second tag name mismatch. Expected 'History'.",
		)

		const $secondCountElement = $secondTag.$("tagname count")
		assertEquals(
			"5",
			$secondCountElement.innerText.trim(),
			"Second tag count mismatch. Expected '5'.",
		)

		const $secondSubtitleElement = $secondTag.$("subtitle")
		assertEquals(
			"History discussions",
			$secondSubtitleElement.innerText.trim(),
			"Second tag subtitle mismatch.",
		)

		// Check for the overall page structure (header for tags page)
		const $tagsPageHeader = $mainContent.$("posts topic h2[tags] span") // As per renderTags.js structure
		assertEquals(
			"Tags",
			$tagsPageHeader.innerText.trim(),
			"Tags page header text mismatch.",
		)
	},
}

runTests(path.basename(__filename), Object.values(tests))
