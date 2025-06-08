const path = require("path")
const {
	setupIntegrationTestEnvironment,
} = require("./../shared/integrationTestSetup.js")
const { assertEquals, runTests } = require("../shared/testUtils.js")

const tests = {
	testTopicsPageDisplaysCorrectlyAfterNavigation: async () => {
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
			"/topics": {
				// For the actual topics page
				path: "/topics",
				topics: [
					// Updated mock data structure
					{ topic_name: "science", posts: 10, subtitle: "All about science" },
					{ topic_name: "history", posts: 5, subtitle: "History discussions" },
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

		// 3. Navigate to Topics Page
		const $topicsFooterIcon = $("footer icon[topic]")
		$topicsFooterIcon.click()
		await new Promise((resolve) => setTimeout(resolve, 0))
		assertEquals(
			"/topics",
			state.path,
			"Path should be /topics after clicking the topics footer icon.",
		)

		// 4. Verify Topics Page Content
		// Selectors updated to match client/renderTopics.js
		const $mainContent = $("main-content-wrapper[active] main-content")

		const $topicsListContainer = $mainContent.$("topics[topics-list]")

		const $renderedTopicElements = $topicsListContainer.querySelectorAll("topic[topic]") // Selects all elements like <topic topic="...">
		assertEquals(
			2,
			$renderedTopicElements.length,
			"Should render 2 topic elements based on mock data.",
		)

		// Assert content of the first topic ("science")
		const $firstTopic = $topicsListContainer.$("topic[topic='science']")

		const $firstNameElement = $firstTopic.$("topicname name")
		assertEquals(
			"Science",
			$firstNameElement.innerText.trim(),
			"First topic name mismatch. Expected 'Science'.",
		)

		const $firstCountElement = $firstTopic.$("topicname count")
		assertEquals(
			"10",
			$firstCountElement.innerText.trim(),
			"First topic count mismatch. Expected '10'.",
		)

		const $firstSubtitleElement = $firstTopic.$("subtitle")
		assertEquals(
			"All about science",
			$firstSubtitleElement.innerText.trim(),
			"First topic subtitle mismatch.",
		)

		// Assert content of the second topic ("history")
		const $secondTopic = $topicsListContainer.$("topic[topic='history']")

		const $secondNameElement = $secondTopic.$("topicname name")
		assertEquals(
			"History",
			$secondNameElement.innerText.trim(),
			"Second topic name mismatch. Expected 'History'.",
		)

		const $secondCountElement = $secondTopic.$("topicname count")
		assertEquals(
			"5",
			$secondCountElement.innerText.trim(),
			"Second topic count mismatch. Expected '5'.",
		)

		const $secondSubtitleElement = $secondTopic.$("subtitle")
		assertEquals(
			"History discussions",
			$secondSubtitleElement.innerText.trim(),
			"Second topic subtitle mismatch.",
		)

		// Check for the overall page structure (header for topics page)
		const $topicsPageHeader = $mainContent.$("posts post h2[topics] span") // As per renderTopics.js structure
		assertEquals(
			"Topics",
			$topicsPageHeader.innerText.trim(),
			"Topics page header text mismatch.",
		)
	},
}

runTests(path.basename(__filename), Object.values(tests))
