const path = require("path")
const {
	setupIntegrationTestEnvironment,
} = require("./../shared/integrationTestSetup.js")
const { assertEquals, runTests } = require("../shared/testUtils.js")

const tests = {
	testUserProfilePageDisplaysCorrectlyAfterNavigation: async () => {
		const window = await setupIntegrationTestEnvironment()
		const { state, $ } = window

		// 1. Mock API responses
		window.setMockFetchResponseForPaths({
			"/posts": {
				// For navigation after agreeing to terms
				path: "/posts",
				topics: [
					{
						slug: "test-topic-1",
						title: "Test Topic 1",
						body: "Body for test topic 1",
						user_slug: "test-user", // Author of the topic
						display_name: "Test User Name",
						tags: "general",
						profile_picture_uuid: null,
						display_name_index: 0,
						user_verified: false,
						note: "",
						poll_1: null,
						favorited: false,
						favorite_count: 0,
						commented: false,
						comment_count: 0,
						image_uuids: null,
						created_at: new Date().toISOString(),
						last_activity_at: new Date().toISOString(),
					},
				],
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
			"/user/test-user": {
				// For the user profile page
				path: "/user/test-user",
				// The user object whose profile is being viewed
				user: {
					user_slug: "test-user",
					display_name: "Test User Name",
					profile_picture_uuid: null,
					display_name_index: 0,
					user_verified: false,
					// other user fields if necessary for rendering the profile page
				},
				topics: [], // Topics by this user (empty for simplicity in this test)
				comments: [],
				activities: [],
				notifications: [], // Other standard page data
				// Fields from a typical page response
				user_slug: null,
				subscribed_to_users: 0,
				user_id: null,
				email: null,
				// display_name here would be the logged-in user's name, null if not logged in
				display_name: null,
				profile_picture_uuid: null,
				display_name_index: 0,
				has_more: false,
			},
		})

		// 2. Initial Navigation (Welcome -> Topics)
		const $joinButton = $(`a[href="/posts"][big]`)
		$joinButton.click()
		await new Promise((resolve) => setTimeout(resolve, 0))
		assertEquals(
			"/posts",
			state.path,
			"Path should be /posts after agreeing to terms.",
		)

		// 3. Ensure the topic is rendered on /posts
		const $topicAuthorElement = $(`topics > topic author[slug="test-user"]`)

		// 4. Navigate to User Profile by clicking the author element
		$topicAuthorElement.click()
		await new Promise((resolve) => setTimeout(resolve, 0))
		assertEquals(
			"/user/test-user",
			state.path,
			"Path should be /user/test-user after clicking the author link.",
		)

		// 5. Verify User Profile Page Content
		const $mainContentWrapper = $("main-content-wrapper[active]")
		const $mainContent = $mainContentWrapper.$("main-content")

		// Verify the user's name is displayed as a header.
		// renderTopics.js creates a structure like: topic[user] > h2[user] > author > span
		const $userProfileHeaderSpan = $mainContent.$(
			"topic[user] h2[user] author span",
		)
		assertEquals(
			"Test User Name",
			$userProfileHeaderSpan.innerText.trim(),
			"User profile header text should be the user's display name.",
		)

		// Verify that a <topics> element (container for the user's topics) is present.
		// renderTopics.js will create this, even if the topics array is empty.
		const $userTopicsContainer = $mainContent.$("topics")

		// Check that no topics are rendered if the mock data has topics: [] for the user page
		const $renderedUserTopicElements =
			$userTopicsContainer.querySelectorAll("topic:not([user])") // Exclude the header topic, which is topic[user]
		assertEquals(
			0,
			$renderedUserTopicElements.length,
			"Should render 0 actual topic elements if mock data for /user/test-user has topics: [].",
		)
	},
}

runTests(path.basename(__filename), Object.values(tests))
