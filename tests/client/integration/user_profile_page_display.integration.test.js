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
				posts: [
					{
						slug: "test-post-1",
						title: "Test Post 1",
						body: "Body for test post 1",
						user_slug: "test-user", // Author of the post
						display_name: "Test User Name",
						tags: "general",
						profile_picture_uuid: null,
						display_name_index: 0,
						user_verified: false,
						note: "",
						poll_1: null,
						favorited: false,
						favorite_count: 0,
						replyed: false,
						reply_count: 0,
						image_uuids: null,
						created_at: new Date().toISOString(),
						last_activity_at: new Date().toISOString(),
					},
				],
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
				posts: [], // Posts by this user (empty for simplicity in this test)
				replies: [],
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

		// 2. Initial Navigation (Welcome -> Posts)
		const $joinButton = $(`a[href="/posts"][big]`)
		$joinButton.click()
		await new Promise((resolve) => setTimeout(resolve, 0))
		assertEquals(
			"/posts",
			state.path,
			"Path should be /posts after agreeing to terms.",
		)

		// 3. Ensure the post is rendered on /posts
		const $postAuthorElement = $(`posts > post author[slug="test-user"]`)

		// 4. Navigate to User Profile by clicking the author element
		$postAuthorElement.click()
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
		// renderPosts.js creates a structure like: post[user] > h2[user] > author > span
		const $userProfileHeaderSpan = $mainContent.$(
			"post[user] h2[user] author span",
		)
		assertEquals(
			"Test User Name",
			$userProfileHeaderSpan.innerText.trim(),
			"User profile header text should be the user's display name.",
		)

		// Verify that a <posts> element (container for the user's posts) is present.
		// renderPosts.js will create this, even if the posts array is empty.
		const $userPostsContainer = $mainContent.$("posts")

		// Check that no posts are rendered if the mock data has posts: [] for the user page
		const $renderedUserPostElements =
			$userPostsContainer.querySelectorAll("post:not([user])") // Exclude the header post, which is post[user]
		assertEquals(
			0,
			$renderedUserPostElements.length,
			"Should render 0 actual post elements if mock data for /user/test-user has posts: [].",
		)
	},
}

runTests(path.basename(__filename), Object.values(tests))
