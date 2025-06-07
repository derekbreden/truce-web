const path = require("path")
const {
	setupIntegrationTestEnvironment,
} = require("./../shared/integrationTestSetup.js")
const { assertEquals, runTests } = require("../shared/testUtils.js")

const tests = {
	testTopicDetailsDisplayOnDetailPage: async () => {
		const window = await setupIntegrationTestEnvironment()
		const { state, $ } = window

		// Setup mock API responses
		window.setMockFetchResponseForPaths({
			"/topics": {
				path: "/topics",
				topics: [
					{
						slug: "test-topic-for-details",
						title: "Test Topic for Details",
						body: "Short body for testing details display.",
						user_slug: "user-details",
						display_name: "User Details",
						tags: "general",
						profile_picture_uuid: null,
						display_name_index: 0,
						user_verified: false,
						note: "",
						poll_1: null,
						favorited: false,
						favorite_count: 3,
						commented: false,
						comment_count: 5,
						image_uuids: null,
						created_at: new Date().toISOString(),
						last_activity_at: new Date().toISOString(),
					},
				],
				comments: [],
				activities: [],
				notifications: [],
				user_slug: null, // Default values, can be customized if test needs specific user context
				subscribed_to_users: 0,
				user_id: null,
				email: null,
				display_name: null,
				profile_picture_uuid: null,
				display_name_index: 0,
				has_more: false, // Important for renderTopics to know if "load more" should be shown
			},
			"/topic/test-topic-for-details": {
				path: "/topic/test-topic-for-details",
				topics: [
					{
						// getSingleTopic returns data in "topics" array
						slug: "test-topic-for-details",
						title: "Test Topic for Details",
						body: "Full body for the test topic, ensuring details are shown.",
						user_slug: "user-details",
						display_name: "User Details",
						tags: "general",
						profile_picture_uuid: null,
						display_name_index: 0,
						user_verified: false,
						note: "Detailed note for the topic.",
						poll_1: null,
						poll_2: null,
						poll_3: null,
						poll_4: null,
						poll_5: null,
						poll_counts: "0,0,0,0,0",
						user_poll_choice: null,
						favorited: false,
						favorite_count: 3,
						commented: false,
						comment_count: 5,
						image_uuids: null,
						created_at: new Date().toISOString(),
						last_activity_at: new Date().toISOString(),
					},
				],
				comments: [], // Start with no comments for this specific test
				activities: [],
				notifications: [],
				user_slug: null, // Default values
				subscribed_to_users: 0,
				user_id: null,
				email: null,
				display_name: null,
				profile_picture_uuid: null,
				display_name_index: 0,
			},
		})

		// 1. Agree to terms to navigate to /topics
		const $joinButton = $(`a[href="/topics"][big]`)
		$joinButton.click()

		// Wait for navigation and rendering
		// Multiple awaits for setTimeout(0) to allow microtasks and rendering to process
		await new Promise((resolve) => setTimeout(resolve, 0))
		await new Promise((resolve) => setTimeout(resolve, 0))

		assertEquals(
			"/topics",
			state.path,
			"Path should be /topics after agreeing to terms.",
		)
		const $topicsWrapper = $("topics")
		assertEquals(
			true,
			Boolean($topicsWrapper),
			"Topics wrapper element should be present on /topics page.",
		)

		// 2. Simulate at least one topic appearing on the /topics page
		// This is necessary to be able to click on a topic to navigate to its detail page.
		// The navigation.integration.test.js uses a similar approach.
		// The manual topic injection is no longer needed as fetch mock will provide the topic.

		const $firstTopicElement = $("topics > topic[trimmed]")

		// 3. Click the topic to navigate to its detail page
		$firstTopicElement.click()

		// Wait for navigation and rendering to the detail page
		await new Promise((resolve) => setTimeout(resolve, 0))

		const expectedTopicPath = "/topic/test-topic-for-details"
		assertEquals(
			expectedTopicPath,
			state.path,
			`Path should be "${expectedTopicPath}" after clicking the topic.`,
		)

		// 4. Assert that topic detail specific elements are rendered
		// As per renderTopic.js, these details are within a "topic-details[detail-wrapper]"
		const $topicDetailsWrapper = $(
			"main-content-wrapper[active] topic topic-details[detail-wrapper]",
		)

		const $favoritesDetail =
			$topicDetailsWrapper.querySelector("detail[favorites]")

		const $favoriteCountElement = $favoritesDetail.querySelector("p")
		// Assert the actual count from the mocked API response
		assertEquals(
			"3",
			$favoriteCountElement.innerText.trim(),
			`Favorite count should be "3".`,
		)

		const $commentsDetail =
			$topicDetailsWrapper.querySelector("detail[comments]")

		const $commentCountElement = $commentsDetail.querySelector("p")
		// Assert the actual count from the mocked API response
		assertEquals(
			"5",
			$commentCountElement.innerText.trim(),
			`Comment count should be "5".`,
		)
	},
}

runTests(path.basename(__filename), Object.values(tests))
