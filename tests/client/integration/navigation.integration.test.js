const path = require("path")
const {
	setupIntegrationTestEnvironment,
} = require("./../shared/integrationTestSetup.js")
const { assertEquals, runTests } = require("../shared/testUtils.js")

const tests = {
	testNavigateToFirstTopicDetail: async () => {
		const window = await setupIntegrationTestEnvironment()
		const { state, $ } = window

		// Set fetch response for topics and specific topic
		window.setMockFetchResponseForPaths({
			"/topics": {
				path: "/topics",
				topics: [
					{
						slug: "test-topic-1",
						title: "Test Topic 1",
						body: "Short body for list",
						user_slug: "user1",
						display_name: "User One",
						tags: "politics",
						comment_count: 0,
						favorite_count: 0,
						favorited: false,
						commented: false,
						image_uuids: null,
						profile_picture_uuid: null,
						display_name_index: 0,
						user_verified: false,
						note: "",
						poll_1: null,
					},
				],
				comments: [],
				activities: [],
				notifications: [],
				user: {},
				tag: {},
				subscribed_to_users: 0,
			},
			"/topic/test-topic-1": {
				path: "/topic/test-topic-1",
				topics: [
					// Server returns topic detail in a "topics" array
					{
						slug: "test-topic-1",
						title: "Test Topic 1",
						body: "Full detailed body for test-topic-1. This should appear on the detail page.",
						user_slug: "user1",
						display_name: "User One",
						tags: "politics",
						comment_count: 0,
						favorite_count: 0,
						favorited: false,
						commented: false,
						image_uuids: null,
						profile_picture_uuid: null,
						display_name_index: 0,
						user_verified: false,
						note: "",
						poll_1: null,
						topic_id: 1,
						created_at: "2023-01-01T00:00:00Z",
						updated_at: "2023-01-01T00:00:00Z",
					},
				],
				comments: [], // Assuming no comments for this test
				activities: [],
				notifications: [],
				user: {},
				tag: {},
				subscribed_to_users: 0,
			},
		})

		// 1. Agree to terms to navigate to /topics
		const $joinButton = $(`a[href="/topics"][big]`)
		$joinButton.click()
		await new Promise((resolve) => setTimeout(resolve, 0))

		// 2. Verify navigation to /topics
		assertEquals(
			"/topics",
			state.path,
			"Path should be /topics after agreeing to terms.",
		)

		// 3. Find and click the first topic link/element
		const $firstTopicElement = $("topics > topic[trimmed]")
		$firstTopicElement.click()
		await new Promise((resolve) => setTimeout(resolve, 0))

		// 4. Assert navigation to the topic detail path
		const expectedTopicPath = "/topic/test-topic-1"
		assertEquals(
			expectedTopicPath,
			state.path,
			`Path should be "${expectedTopicPath}" after clicking the first topic.`,
		)

		// 5. Assert the topic includes the detail rendered text
		const $topicPSpan = $("main-content-wrapper[active] topic p span")
		assertEquals(
			true,
			$topicPSpan.innerText.includes("Full detailed body for test-topic-1"),
			`Topic p span should include text "Full detailed body for test-topic-1"`,
		)
	},
}

runTests(path.basename(__filename), Object.values(tests))
