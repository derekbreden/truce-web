const path = require("path")
const {
	setupIntegrationTestEnvironment,
} = require("./../shared/integrationTestSetup.js")
const { assertEquals, runTests } = require("../shared/testUtils.js")

const tests = {
	testPostDetailsDisplayOnDetailPage: async () => {
		const window = await setupIntegrationTestEnvironment()
		const { state, $ } = window

		// Setup mock API responses
		window.setMockFetchResponseForPaths({
			"/posts": {
				path: "/posts",
				posts: [
					{
						slug: "test-post-for-details",
						title: "Test Post for Details",
						body: "Short body for testing details display.",
						user_slug: "user-details",
						display_name: "User Details",
						topics: "general",
						profile_picture_uuid: null,
						display_name_index: 0,
						user_verified: false,
						note: "",
						poll_1: null,
						favorited: false,
						favorite_count: 3,
						replyed: false,
						reply_count: 5,
						image_uuids: null,
						created_at: new Date().toISOString(),
						last_activity_at: new Date().toISOString(),
					},
				],
				replies: [],
				activities: [],
				notifications: [],
				user_slug: null, // Default values, can be customized if test needs specific user context
				subscribed_to_users: 0,
				user_id: null,
				email: null,
				display_name: null,
				profile_picture_uuid: null,
				display_name_index: 0,
				has_more: false, // Important for renderPosts to know if "load more" should be shown
			},
			"/post/test-post-for-details": {
				path: "/post/test-post-for-details",
				posts: [
					{
						// getSinglePost returns data in "posts" array
						slug: "test-post-for-details",
						title: "Test Post for Details",
						body: "Full body for the test post, ensuring details are shown.",
						user_slug: "user-details",
						display_name: "User Details",
						topics: "general",
						profile_picture_uuid: null,
						display_name_index: 0,
						user_verified: false,
						note: "Detailed note for the post.",
						poll_1: null,
						poll_2: null,
						poll_3: null,
						poll_4: null,
						poll_5: null,
						poll_counts: "0,0,0,0,0",
						user_poll_choice: null,
						favorited: false,
						favorite_count: 3,
						replyed: false,
						reply_count: 5,
						image_uuids: null,
						created_at: new Date().toISOString(),
						last_activity_at: new Date().toISOString(),
					},
				],
				replies: [], // Start with no replies for this specific test
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

		// 1. Agree to terms to navigate to /posts
		const $joinButton = $(`a[href="/posts"][big]`)
		$joinButton.click()
		await new Promise((resolve) => setTimeout(resolve, 0))

		const $postsWrapper = $("posts")
		assertEquals(
			true,
			Boolean($postsWrapper),
			"Posts wrapper element should be present on /posts page.",
		)

		// 2. Simulate at least one post appearing on the /posts page
		// This is necessary to be able to click on a post to navigate to its detail page.
		// The navigation.integration.test.js uses a similar approach.
		// The manual post injection is no longer needed as fetch mock will provide the post.

		const $firstPostElement = $("posts > post[trimmed]")

		// 3. Click the post to navigate to its detail page
		$firstPostElement.click()

		// Wait for navigation and rendering to the detail page
		await new Promise((resolve) => setTimeout(resolve, 0))

		const expectedPostPath = "/post/test-post-for-details"
		assertEquals(
			expectedPostPath,
			state.path,
			`Path should be "${expectedPostPath}" after clicking the post.`,
		)

		// 4. Assert that post detail specific elements are rendered
		// As per renderPost.js, these details are within a "post-details[detail-wrapper]"
		const $postDetailsWrapper = $(
			"main-content-wrapper[active] post post-details[detail-wrapper]",
		)

		const $favoritesDetail =
			$postDetailsWrapper.querySelector("detail[favorites]")

		const $favoriteCountElement = $favoritesDetail.querySelector("p")
		// Assert the actual count from the mocked API response
		assertEquals(
			"3",
			$favoriteCountElement.innerText.trim(),
			`Favorite count should be "3".`,
		)

		const $repliesDetail =
			$postDetailsWrapper.querySelector("detail[replies]")

		const $replyCountElement = $repliesDetail.querySelector("p")
		// Assert the actual count from the mocked API response
		assertEquals(
			"5",
			$replyCountElement.innerText.trim(),
			`Reply count should be "5".`,
		)
	},
}

runTests(path.basename(__filename), Object.values(tests))
