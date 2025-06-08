const path = require("path")
const {
	setupIntegrationTestEnvironment,
} = require("./../shared/integrationTestSetup.js")
const { assertEquals, runTests } = require("../shared/testUtils.js")

const testPostsListDisplaysFetchedPosts = async () => {
	const { window } = await setupIntegrationTestEnvironment()
	const { state, $ } = window

	// Simulate agreeing to terms to navigate to /posts
	const $joinButton = $(`a[href="/posts"][big]`)

	window.setMockFetchResponseForPaths({
		"/posts": {
			path: "/posts",
			posts: [
				{
					slug: "tech-trends",
					title: "Tech Trends 2024",
					body: "Exploring upcoming tech.\n\nThis is the first post.",
					user_slug: "jdoe",
					display_name: "John Doe",
					topics: "work",
					reply_count: 5,
					favorite_count: 10,
					favorited: false,
					replyed: false,
					image_uuids: null,
					profile_picture_uuid: null,
					display_name_index: 0,
					user_verified: false,
					note: "",
					poll_1: null,
				},
				{
					slug: "science-discoveries",
					title: "Science Discoveries",
					body: "Latest in science.\n\nThis is the second post.",
					user_slug: "jane",
					display_name: "Jane Roe",
					topics: "science",
					reply_count: 3,
					favorite_count: 7,
					favorited: true,
					replyed: false,
					image_uuids: null,
					profile_picture_uuid: null,
					display_name_index: 0,
					user_verified: true,
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
	})

	$joinButton.click()

	// Wait for navigation and rendering (all setTimeouts in the page will respond instantly)
	await new Promise((resolve) => setTimeout(resolve, 0))

	assertEquals(
		state.path,
		"/posts",
		"State path should be /posts after navigation",
	)

	const $postsWrapper = $("posts")

	const $renderedPostElements = $postsWrapper.querySelectorAll("post")
	assertEquals(
		$renderedPostElements.length,
		2,
		"Should render 2 post elements based on mock data",
	)

	// Assert content of the first post
	const $firstPost = $renderedPostElements[0]

	const $firstTitle = $firstPost.querySelector("h2")
	assertEquals(
		$firstTitle.textContent.trim(),
		"Tech Trends 2024",
		"First post title mismatch",
	)

	const $firstBodySpan = $firstPost.querySelector("p > span") // Target the span inside the first p
	assertEquals(
		$firstBodySpan !== null,
		true,
		"First post body span should exist",
	)

	// Assert content of the second post
	const $secondPost = $renderedPostElements[1]

	const $secondTitle = $secondPost.querySelector("h2")
	assertEquals(
		$secondTitle.textContent.trim(),
		"Science Discoveries",
		"Second post title mismatch",
	)

	const $secondBodySpan = $secondPost.querySelector("p > span") // Target the span inside the first p
	assertEquals(
		$secondBodySpan !== null,
		true,
		"Second post body span should exist",
	)
}

const tests = {
	testPostsListDisplaysFetchedPosts,
	// Add other tests here if any in the future
}

runTests(path.basename(__filename), Object.values(tests))
