const path = require("path")
const {
	setupIntegrationTestEnvironment,
} = require("./../shared/integrationTestSetup.js")
const { assertEquals, runTests } = require("../shared/testUtils.js")

const tests = {
	testFavoritesPageDisplaysCorrectlyAfterNavigation: async () => {
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
			"/favorites": {
				// For the actual favorites page
				path: "/favorites",
				topics: [], // Assuming no favorited topics for this basic display test
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

		// 3. Navigate to Favorites Page
		const $favoritesFooterIcon = $("footer icon[favorites]")
		$favoritesFooterIcon.click()
		await new Promise((resolve) => setTimeout(resolve, 0))
		assertEquals(
			"/favorites",
			state.path,
			"Path should be /favorites after clicking the favorites footer icon.",
		)

		// 4. Verify Favorites Page Content
		const $mainContentWrapper = $("main-content-wrapper[active]")
		const $mainContent = $mainContentWrapper.$("main-content")
		assertEquals(
			true,
			Boolean($mainContent),
			"Main content area should exist within the active wrapper.",
		)

		// Adjusted header selector: Look for any h2 and check its text.
		const $favoritesPageHeaderH2Span = $mainContent.$("h2[favorites] span")
		assertEquals(
			"Favorites",
			$favoritesPageHeaderH2Span.innerText.trim(),
			"Favorites page H2 header text mismatch (using innerText).",
		)

		// Adjusted container selector: Look for any <topics> container.
		const $favoritesListContainer = $mainContent.$("topics")
		const $renderedTopicElements =
			$favoritesListContainer.querySelectorAll("topic[trimmed]")
		assertEquals(
			0,
			$renderedTopicElements.length,
			"Should render 0 topic elements if mock data for /favorites has topics: [].",
		)
	},
	testFavoritesPageDisplayWithActivities: async () => {
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
			"/favorites": {
				// For the actual favorites page
				path: "/favorites",
				topics: [],
				comments: [],
				activities: [
					{
						// Topic activity fields
						type: "topic",
						slug: "test-activity-topic-1",
						title: "Activity Topic Title 1",
						body: "Body of activity topic 1",
						user_slug: "activity-user-1",
						display_name: "Activity User One",
						tags: "general",
						comment_count: 0,
						favorite_count: 0,
						favorited: false,
						commented: false,
						create_date: "2023-10-26T10:00:00Z",
						profile_picture_uuid: null,
						display_name_index: 0,
						user_verified: false,
						note: "",
						poll_1: null,
						image_uuids: null,
					},
					{
						// Comment activity fields
						type: "comment",
						id: "activity-comment-1",
						parent_topic_title: "Parent Topic for Comment Activity",
						parent_topic_slug: "parent-topic-comment-activity",
						body: "This is an activity for a new comment.",
						user_slug: "activity-user-2",
						display_name: "Activity User Two",
						create_date: "2023-10-26T11:00:00Z", // Newer, so should appear first
						profile_picture_uuid: null,
						display_name_index: 0,
						user_verified: false,
						note: "",
						topic_id: "topic-for-comment-activity",
						parent_comment_body: null,
						parent_comment_display_name: null,
						parent_comment_display_name_index: null,
						parent_comment_user_slug: null,
						parent_comment_profile_picture_uuid: null,
						parent_comment_note: null,
					},
				],
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

		// 3. Navigate to Favorites Page
		const $favoritesFooterIcon = $("footer icon[favorites]")
		$favoritesFooterIcon.click()
		await new Promise((resolve) => setTimeout(resolve, 0))
		assertEquals(
			"/favorites",
			state.path,
			"Path should be /favorites after clicking the favorites footer icon.",
		)

		// Find the first activities container
		const $activitiesContainer1WithData = $(
			"main-content-wrapper[active] main-content activities",
		)

		// Assertions for the comment activity (should appear first due to create_date)
		const $commentActivity =
			$activitiesContainer1WithData.$("activity[comment]")
		assertEquals(
			true,
			Boolean($commentActivity),
			"Comment activity element should be present.",
		)

		// renderActivities > renderCommentActivity > h2 for parent topic title
		const $topicTitle = $commentActivity.$("h2")
		assertEquals(
			"Parent Topic for Comment Activity",
			$topicTitle?.innerText.trim(),
			"Comment activity's parent topic title mismatch.",
		)

		// renderActivities > renderCommentActivity > renderComment > p > span for body
		const $commentBody = $commentActivity.$("comment p > span")
		assertEquals(
			"This is an activity for a new comment.",
			$commentBody?.innerText.trim(),
			"Comment activity body text mismatch.",
		)

		// Author
		const $commentAuthor = $commentActivity.$("comment author span")
		assertEquals(
			"Activity User Two",
			$commentAuthor?.innerText.trim(),
			"Comment activity author name mismatch.",
		)

		// Find the second activities container
		const $activitiesContainer2WithData = $(
			"main-content-wrapper[active] main-content-2 activities",
		)

		// Assertions for the topic activity (should appear second)
		const $topicActivity = $activitiesContainer2WithData.$("activity[topic]")

		// Title
		const $titleElement = $topicActivity.$("topic h2")
		const titleText = $titleElement.firstChild?.textContent?.trim()
		assertEquals(
			"Activity Topic Title 1",
			titleText,
			"Topic activity title text mismatch.",
		)

		// Author
		const $author = $topicActivity.$("topic author span")
		assertEquals(
			"Activity User One",
			$author?.innerText.trim(),
			"Topic activity author name mismatch.",
		)
	},
}

runTests(path.basename(__filename), Object.values(tests))
