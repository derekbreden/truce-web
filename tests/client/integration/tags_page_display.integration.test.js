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
			"/tags": {
				// For the actual tags page
				path: "/tags",
				tags: [
					// Updated mock data structure
					{ tag_name: "science", topics: 10, subtitle: "All about science" },
					{ tag_name: "history", topics: 5, subtitle: "History discussions" },
				],
				// Other data that might be part of a standard page response (minimal for this test)
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

		// 2. Initial Navigation (Welcome -> Topics)
		const $joinButton = $(`a[href="/topics"][big]`)
		$joinButton.click()
		await new Promise((resolve) => setTimeout(resolve, 0))
		assertEquals(
			"/topics",
			state.path,
			"Path should be /topics after agreeing to terms.",
		)

		// 3. Navigate to Tags Page
		const $tagsFooterIcon = $("footer icon[tag]")
		assertEquals(
			true,
			Boolean($tagsFooterIcon),
			"Tags footer icon should exist.",
		)
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
		assertEquals(true, Boolean($mainContent), "Main content area should exist.")

		const $tagsListContainer = $mainContent.$("tags[tags-list]")
		assertEquals(
			true,
			Boolean($tagsListContainer),
			"A <tags tags-list> container should be present on the tags page.",
		)

		const $renderedTagElements = $tagsListContainer.querySelectorAll("tag[tag]") // Selects all elements like <tag tag="...">
		assertEquals(
			2,
			$renderedTagElements.length,
			"Should render 2 tag elements based on mock data.",
		)

		// Assert content of the first tag ("science")
		const $firstTag = $tagsListContainer.$("tag[tag='science']")
		assertEquals(
			true,
			Boolean($firstTag),
			"First tag (science) element should be found.",
		)

		const $firstNameElement = $firstTag.$("tagname name")
		assertEquals(
			true,
			Boolean($firstNameElement),
			"First tag should have a <name> element.",
		)
		assertEquals(
			"Science",
			$firstNameElement.innerText.trim(),
			"First tag name mismatch. Expected 'Science'.",
		)

		const $firstCountElement = $firstTag.$("tagname count")
		assertEquals(
			true,
			Boolean($firstCountElement),
			"First tag should have a <count> element.",
		)
		assertEquals(
			"10",
			$firstCountElement.innerText.trim(),
			"First tag count mismatch. Expected '10'.",
		)

		const $firstSubtitleElement = $firstTag.$("subtitle")
		assertEquals(
			true,
			Boolean($firstSubtitleElement),
			"First tag should have a <subtitle> element.",
		)
		assertEquals(
			"All about science",
			$firstSubtitleElement.innerText.trim(),
			"First tag subtitle mismatch.",
		)

		// Assert content of the second tag ("history")
		const $secondTag = $tagsListContainer.$("tag[tag='history']")
		assertEquals(
			true,
			Boolean($secondTag),
			"Second tag (history) element should be found.",
		)

		const $secondNameElement = $secondTag.$("tagname name")
		assertEquals(
			true,
			Boolean($secondNameElement),
			"Second tag should have a <name> element.",
		)
		assertEquals(
			"History",
			$secondNameElement.innerText.trim(),
			"Second tag name mismatch. Expected 'History'.",
		)

		const $secondCountElement = $secondTag.$("tagname count")
		assertEquals(
			true,
			Boolean($secondCountElement),
			"Second tag should have a <count> element.",
		)
		assertEquals(
			"5",
			$secondCountElement.innerText.trim(),
			"Second tag count mismatch. Expected '5'.",
		)

		const $secondSubtitleElement = $secondTag.$("subtitle")
		assertEquals(
			true,
			Boolean($secondSubtitleElement),
			"Second tag should have a <subtitle> element.",
		)
		assertEquals(
			"History discussions",
			$secondSubtitleElement.innerText.trim(),
			"Second tag subtitle mismatch.",
		)

		// Check for the overall page structure (header for tags page)
		const $tagsPageHeader = $mainContent.$("topics topic h2[tags] span") // As per renderTags.js structure
		assertEquals(
			true,
			Boolean($tagsPageHeader),
			"Tags page header (h2 > span) should exist.",
		)
		assertEquals(
			"Tags",
			$tagsPageHeader.innerText.trim(),
			"Tags page header text mismatch.",
		)
	},
}

runTests(path.basename(__filename), Object.values(tests))
