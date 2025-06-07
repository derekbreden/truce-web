const path = require("path")
const {
	setupIntegrationTestEnvironment,
} = require("../shared/integrationTestSetup.js") // Corrected path
const { assertEquals, runTests } = require("../shared/testUtils.js") // Corrected path

async function testCommentCountUpdate() {
	const window = await setupIntegrationTestEnvironment()
	const { state, $ } = window // Destructure after window is defined

	// 1. Setup: Initial Topic Data
	const initialTopic = {
		topic_id: 1,
		slug: "test-topic-1",
		title: "Test Topic 1",
		body: "Initial body for test topic 1. This is a summary.",
		user_slug: "user1",
		display_name: "User One",
		comment_count: 5,
		create_date: "2023-01-01T00:00:00.000Z", // ISO format for dates
		tags: "general", // Comma-separated string, removed "test" tag
		favorite_count: 2,
		favorited: false,
		commented: false,
		profile_picture_uuid: null,
		display_name_index: 0,
		user_verified: false,
		note: "",
		poll_1: null,
		image_uuids: null,
	}

	// Mock fetch responses for initial page load
	window.setMockFetchResponseForPaths({
		"/topics": {
			path: "/topics",
			topics: [initialTopic],
			comments: [],
			activities: [],
			notifications: [],
		},
	})

	// Simulate "Join the Discussion" click to navigate to /topics
	const $joinButton = $("a[href='/topics'][big]")
	$joinButton.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	assertEquals("/topics", state.path, "Should have navigated to /topics.")

	// 2. Verify Initial Comment Count
	const $topicElement = $("topics > topic")
	const $commentCountElement = $topicElement.$("detail[comments] p")
	assertEquals("5", $commentCountElement.innerText.trim(), "Initial comment count should be 5.")

	// 3. Prepare for Update (Mock response for getMoreRecent's fetch)
	window.setMockFetchResponseForPaths({
		"/topics": {
			path: "/topics",
			topics: [],
			comments: [],
			activities: [],
			notifications: [],
			topic_counts: [{ topic_id: 1, comment_count: 10, favorite_count: initialTopic.favorite_count }],
		},
	})

	// 4. Trigger WebSocket Update
	state.ws.triggerMessage("UPDATE")
	await new Promise(resolve => setTimeout(resolve, 0))

	// Assert is now 10
	assertEquals("10", String($commentCountElement.innerText).trim(), "Updated comment count should be 10.")

	const updatedCachedTopic = state.cache["/topics"]?.topics.find(t => t.topic_id === initialTopic.topic_id)
	assertEquals(10, updatedCachedTopic.comment_count, "Comment count in cache should be updated to 10.")
}

runTests(path.basename(__filename), [testCommentCountUpdate])
