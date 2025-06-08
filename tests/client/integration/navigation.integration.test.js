const path = require("path")
const {
	setupIntegrationTestEnvironment,
} = require("./../shared/integrationTestSetup.js")
const { assertEquals, runTests } = require("../shared/testUtils.js")

const tests = {
	testNavigateToFirstPostDetail: async () => {
		const window = await setupIntegrationTestEnvironment()
		const { state, $ } = window

		// Set fetch response for posts and specific post
		window.setMockFetchResponseForPaths({
			"/posts": {
				path: "/posts",
				posts: [
					{
						slug: "test-post-1",
						title: "Test Post 1",
						body: "Short body for list",
						user_slug: "user1",
						display_name: "User One",
						topics: "politics",
						reply_count: 0,
						favorite_count: 0,
						favorited: false,
						replyed: false,
						image_uuids: null,
						profile_picture_uuid: null,
						display_name_index: 0,
						user_verified: false,
						note: "",
						poll_1: null,
					},
				],
				replies: [],
				activities: [],
				notifications: [],
				user: {},
				topic: {},
				subscribed_to_users: 0,
			},
			"/post/test-post-1": {
				path: "/post/test-post-1",
				posts: [
					// Server returns post detail in a "posts" array
					{
						slug: "test-post-1",
						title: "Test Post 1",
						body: "Full detailed body for test-post-1. This should appear on the detail page.",
						user_slug: "user1",
						display_name: "User One",
						topics: "politics",
						reply_count: 0,
						favorite_count: 0,
						favorited: false,
						replyed: false,
						image_uuids: null,
						profile_picture_uuid: null,
						display_name_index: 0,
						user_verified: false,
						note: "",
						poll_1: null,
						post_id: 1,
						created_at: "2023-01-01T00:00:00Z",
						updated_at: "2023-01-01T00:00:00Z",
					},
				],
				replies: [], // Assuming no replies for this test
				activities: [],
				notifications: [],
				user: {},
				topic: {},
				subscribed_to_users: 0,
			},
		})

		// 1. Agree to terms to navigate to /posts
		const $joinButton = $(`a[href="/posts"][big]`)
		$joinButton.click()
		await new Promise((resolve) => setTimeout(resolve, 0))

		// 2. Verify navigation to /posts
		assertEquals(
			"/posts",
			state.path,
			"Path should be /posts after agreeing to terms.",
		)

		// 3. Find and click the first post link/element
		const $firstPostElement = $("posts > post[trimmed]")
		$firstPostElement.click()
		await new Promise((resolve) => setTimeout(resolve, 0))

		// 4. Assert navigation to the post detail path
		const expectedPostPath = "/post/test-post-1"
		assertEquals(
			expectedPostPath,
			state.path,
			`Path should be "${expectedPostPath}" after clicking the first post.`,
		)

		// 5. Assert the post includes the detail rendered text
		const $postPSpan = $("main-content-wrapper[active] post p span")
		assertEquals(
			true,
			$postPSpan.innerText.includes("Full detailed body for test-post-1"),
			`Post p span should include text "Full detailed body for test-post-1"`,
		)
	},
}

runTests(path.basename(__filename), Object.values(tests))
