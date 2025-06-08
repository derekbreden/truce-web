const path = require("path")
const {
	setupIntegrationTestEnvironment,
} = require("../shared/integrationTestSetup.js") // Corrected path
const { assertEquals, runTests } = require("../shared/testUtils.js") // Corrected path

async function testReplyCountUpdate() {
	const window = await setupIntegrationTestEnvironment()
	const { state, $ } = window // Destructure after window is defined

	// 1. Setup: Initial Post Data
	const initialPost = {
		post_id: 1,
		slug: "test-post-1",
		title: "Test Post 1",
		body: "Initial body for test post 1. This is a summary.",
		user_slug: "user1",
		display_name: "User One",
		reply_count: 5,
		create_date: "2023-01-01T00:00:00.000Z", // ISO format for dates
		tags: "general", // Comma-separated string, removed "test" tag
		favorite_count: 2,
		favorited: false,
		replyed: false,
		profile_picture_uuid: null,
		display_name_index: 0,
		user_verified: false,
		note: "",
		poll_1: null,
		image_uuids: null,
	}

	// Mock fetch responses for initial page load
	window.setMockFetchResponseForPaths({
		"/posts": {
			path: "/posts",
			posts: [initialPost],
			replies: [],
			activities: [],
			notifications: [],
		},
	})

	// Simulate "Join the Discussion" click to navigate to /posts
	const $joinButton = $("a[href='/posts'][big]")
	$joinButton.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	assertEquals("/posts", state.path, "Should have navigated to /posts.")

	// 2. Verify Initial Reply Count
	const $postElement = $("posts > post")
	const $replyCountElement = $postElement.$("detail[replies] p")
	assertEquals("5", $replyCountElement.innerText.trim(), "Initial reply count should be 5.")

	// 3. Prepare for Update (Mock response for getMoreRecent's fetch)
	window.setMockFetchResponseForPaths({
		"/posts": {
			path: "/posts",
			posts: [],
			replies: [],
			activities: [],
			notifications: [],
			post_counts: [{ post_id: 1, reply_count: 10, favorite_count: initialPost.favorite_count }],
		},
	})

	// 4. Trigger WebSocket Update
	state.ws.triggerMessage("UPDATE")
	await new Promise(resolve => setTimeout(resolve, 0))

	// Assert is now 10
	assertEquals("10", String($replyCountElement.innerText).trim(), "Updated reply count should be 10.")

	const updatedCachedPost = state.cache["/posts"]?.posts.find(t => t.post_id === initialPost.post_id)
	assertEquals(10, updatedCachedPost.reply_count, "Reply count in cache should be updated to 10.")
}

runTests(path.basename(__filename), [testReplyCountUpdate])
