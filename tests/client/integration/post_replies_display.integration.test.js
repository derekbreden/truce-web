const path = require("path")
const {
	setupIntegrationTestEnvironment,
} = require("./../shared/integrationTestSetup.js")
const { assertEquals, runTests } = require("../shared/testUtils.js")

const tests = {
	testPostRepliesDisplayOnDetailPage: async () => {
		const { window } = await setupIntegrationTestEnvironment()
		const { state, $ } = window

		window.setMockFetchResponseForPaths({
			"/posts": {
				path: "/posts",
				posts: [
					{
						slug: "test-replies-post",
						title: "Test Post for Replies",
						body: "A post to test reply display.",
						user_slug: "post-author",
						display_name: "Post Author",
						topics: "general", // Changed from "testing" to "general"
						reply_count: 2,
						favorite_count: 0,
						favorited: false,
						replyed: true,
						image_uuids: null,
						profile_picture_uuid: null,
						display_name_index: 0,
						user_verified: false,
						note: "",
						poll_1: null,
						post_id: 456, // Added post_id
						create_date: "2023-01-02T00:00:00Z", // Added create_date
					},
				],
				replies: [],
				activities: [],
				notifications: [],
				user: {},
				topic: {},
				subscribed_to_users: 0,
			},
			"/post/test-replies-post": {
				path: "/post/test-replies-post",
				posts: [
					{
						slug: "test-replies-post",
						title: "Test Post for Replies",
						body: "Full body of the test post for replies.",
						user_slug: "post-author",
						display_name: "Post Author",
						topics: "general", // Changed from "testing" to "general"
						reply_count: 2,
						favorite_count: 0,
						favorited: false,
						replyed: true,
						image_uuids: null,
						profile_picture_uuid: null,
						display_name_index: 0,
						user_verified: false,
						note: "",
						poll_1: null,
						post_id: 123,
						created_at: "2023-01-01T00:00:00Z",
						updated_at: "2023-01-01T00:00:00Z",
					},
				],
				replies: [
					{
						reply_id: "c1",
						user_slug: "replyer-one",
						display_name: "Replyer One",
						body: "This is the first test reply.",
						created_at: "2023-01-01T01:00:00Z",
						profile_picture_uuid: null,
						display_name_index: 0,
						user_verified: false,
						note: "",
					},
					{
						reply_id: "c2",
						user_slug: "replyer-two",
						display_name: "Replyer Two",
						body: "A second insightful reply here.",
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
				topic: {},
				subscribed_to_users: 0,
			},
		})

		// Navigate from welcome page to posts page
		const $joinButton = $("a[href='/posts'][big]")
		$joinButton.click()
		await new Promise((resolve) => setTimeout(resolve, 0)) // Wait for DOM update
		assertEquals(
			"/posts",
			state.path,
			"Clicking join button should navigate to /posts.",
		)

		// Navigate from posts page to post detail page
		const $postLink = $("posts > post[trimmed]") // Assuming first post is the one
		// Check title instead of slug attribute directly on post[trimmed]
		const $postTitle = $postLink.$("h2")
		assertEquals(
			"Test Post for Replies",
			$postTitle.textContent.trim(),
			"Post title mismatch on /posts page.",
		)
		$postLink.click()
		await new Promise((resolve) => setTimeout(resolve, 0)) // Wait for DOM update
		assertEquals(
			"/post/test-replies-post",
			state.path,
			"Clicking post link should navigate to post detail page.",
		)

		// Assertions for Replies
		const $repliesWrapper = $("main-content-wrapper[active] replies")

		// Based on renderReplies.js, root replies are directly appended to <replies>
		// and each reply is represented by a <reply> custom element.
		const $renderedReplies =
			$repliesWrapper.querySelectorAll(":scope > reply")
		assertEquals(
			2,
			$renderedReplies.length,
			"Should render 2 reply elements based on mock data.",
		)

		// Assertions for Replies (variables $repliesWrapper and $renderedReplies are defined above)

		// For the first reply ($renderedReplies[0])
		const $reply1 = $renderedReplies[0]

		// Author Name (structure: reply > h3 > author > span)
		const $authorName1 = $reply1.$("author span")
		assertEquals(
			"Replyer One",
			$authorName1.innerText.trim(),
			"First reply author name mismatch.",
		)

		// Reply Body (structure: reply > p > span, from markdownToElements)
		const $body1 = $reply1.$(":scope > p > span")
		assertEquals(
			"This is the first test reply.",
			$body1.innerText.trim(),
			"First reply body mismatch.",
		)

		// For the second reply ($renderedReplies[1])
		const $reply2 = $renderedReplies[1]

		// Author Name
		const $authorName2 = $reply2.$("author span")
		assertEquals(
			"Replyer Two",
			$authorName2.innerText.trim(),
			"Second reply author name mismatch.",
		)

		// Reply Body
		const $body2 = $reply2.$(":scope > p > span")
		assertEquals(
			"A second insightful reply here.",
			$body2.innerText.trim(),
			"Second reply body mismatch.",
		)
	},
}

runTests(path.basename(__filename), Object.values(tests))
