const path = require("path")
const {
	setupIntegrationTestEnvironment,
} = require("./../shared/integrationTestSetup.js")
const { assertEquals, runTests } = require("../shared/testUtils.js")

const tests = {
	testTopicCommentsDisplayOnDetailPage: async () => {
		const { window } = await setupIntegrationTestEnvironment()
		const { state, $ } = window

		window.setMockFetchResponseForPaths({
			"/topics": {
				path: "/topics",
				topics: [
					{
						slug: "test-comments-topic",
						title: "Test Topic for Comments",
						body: "A topic to test comment display.",
						user_slug: "topic-author",
						display_name: "Topic Author",
						tags: "general", // Changed from "testing" to "general"
						comment_count: 2,
						favorite_count: 0,
						favorited: false,
						commented: true,
						image_uuids: null,
						profile_picture_uuid: null,
						display_name_index: 0,
						user_verified: false,
						note: "",
						poll_1: null,
						topic_id: 456, // Added topic_id
						create_date: "2023-01-02T00:00:00Z", // Added create_date
					},
				],
				comments: [],
				activities: [],
				notifications: [],
				user: {},
				tag: {},
				subscribed_to_users: 0,
			},
			"/post/test-comments-topic": {
				path: "/post/test-comments-topic",
				topics: [
					{
						slug: "test-comments-topic",
						title: "Test Topic for Comments",
						body: "Full body of the test topic for comments.",
						user_slug: "topic-author",
						display_name: "Topic Author",
						tags: "general", // Changed from "testing" to "general"
						comment_count: 2,
						favorite_count: 0,
						favorited: false,
						commented: true,
						image_uuids: null,
						profile_picture_uuid: null,
						display_name_index: 0,
						user_verified: false,
						note: "",
						poll_1: null,
						topic_id: 123,
						created_at: "2023-01-01T00:00:00Z",
						updated_at: "2023-01-01T00:00:00Z",
					},
				],
				comments: [
					{
						comment_id: "c1",
						user_slug: "commenter-one",
						display_name: "Commenter One",
						body: "This is the first test comment.",
						created_at: "2023-01-01T01:00:00Z",
						profile_picture_uuid: null,
						display_name_index: 0,
						user_verified: false,
						note: "",
					},
					{
						comment_id: "c2",
						user_slug: "commenter-two",
						display_name: "Commenter Two",
						body: "A second insightful comment here.",
						created_at: "2023-01-01T02:00:00Z",
						profile_picture_uuid: null,
						display_name_index: 0,
						user_verified: true,
						note: "This user is verified.",
					},
				],
				activities: [],
				notifications: [],
				user: {},
				tag: {},
				subscribed_to_users: 0,
			},
		})

		// Navigate from welcome page to topics page
		const $joinButton = $("a[href='/topics'][big]")
		$joinButton.click()
		await new Promise((resolve) => setTimeout(resolve, 0)) // Wait for DOM update
		assertEquals(
			"/topics",
			state.path,
			"Clicking join button should navigate to /topics.",
		)

		// Navigate from topics page to topic detail page
		const $topicLink = $("topics > topic[trimmed]") // Assuming first topic is the one
		// Check title instead of slug attribute directly on topic[trimmed]
		const $topicTitle = $topicLink.$("h2")
		assertEquals(
			"Test Topic for Comments",
			$topicTitle.textContent.trim(),
			"Topic title mismatch on /topics page.",
		)
		$topicLink.click()
		await new Promise((resolve) => setTimeout(resolve, 0)) // Wait for DOM update
		assertEquals(
			"/post/test-comments-topic",
			state.path,
			"Clicking topic link should navigate to topic detail page.",
		)

		// Assertions for Comments
		const $commentsWrapper = $("main-content-wrapper[active] comments")

		// Based on renderComments.js, root comments are directly appended to <comments>
		// and each comment is represented by a <comment> custom element.
		const $renderedComments =
			$commentsWrapper.querySelectorAll(":scope > comment")
		assertEquals(
			2,
			$renderedComments.length,
			"Should render 2 comment elements based on mock data.",
		)

		// Assertions for Comments (variables $commentsWrapper and $renderedComments are defined above)

		// For the first comment ($renderedComments[0])
		const $comment1 = $renderedComments[0]

		// Author Name (structure: comment > h3 > author > span)
		const $authorName1 = $comment1.$("author span")
		assertEquals(
			"Commenter One",
			$authorName1.innerText.trim(),
			"First comment author name mismatch.",
		)

		// Comment Body (structure: comment > p > span, from markdownToElements)
		const $body1 = $comment1.$(":scope > p > span")
		assertEquals(
			"This is the first test comment.",
			$body1.innerText.trim(),
			"First comment body mismatch.",
		)

		// For the second comment ($renderedComments[1])
		const $comment2 = $renderedComments[1]

		// Author Name
		const $authorName2 = $comment2.$("author span")
		assertEquals(
			"Commenter Two",
			$authorName2.innerText.trim(),
			"Second comment author name mismatch.",
		)

		// Comment Body
		const $body2 = $comment2.$(":scope > p > span")
		assertEquals(
			"A second insightful comment here.",
			$body2.innerText.trim(),
			"Second comment body mismatch.",
		)
	},
}

runTests(path.basename(__filename), Object.values(tests))
