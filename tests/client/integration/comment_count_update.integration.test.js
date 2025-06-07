const path = require("path")
const {
	setupIntegrationTestEnvironment,
} = require("../shared/integrationTestSetup.js") // Corrected path
const { assertEquals, runTests } = require("../shared/testUtils.js") // Corrected path

async function testCommentCountUpdate() {
	const window = setupIntegrationTestEnvironment()
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
		poll_counts: "0,0,0,0", // Expected by renderTopic if poll_1 exists
		poll_counts_estimated: "0,0,0,0", // Expected by renderTopic if poll_1 exists
	}

	// Mock fetch responses for initial page load
	window.setMockFetchResponseForPaths({
		"/": { success: true, path: "/", topics: [], comments: [], user: {}, activities: [] },
		"/topics": {
			success: true,
			path: "/topics",
			topics: [initialTopic],
			comments: [],
			user: {},
			activities: [],
			notifications: [], // Added missing notifications array
		},
	})

	// Simulate "Join the Discussion" click to navigate to /topics
	const $joinButton = $("a[href='/topics'][big]")
	assertEquals(true, Boolean($joinButton), "Join button should exist on welcome page.")
	if (!$joinButton) {
		console.error("Join button not found, test cannot proceed.")
		return
	}

	$joinButton.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	assertEquals("/topics", state.path, "Should have navigated to /topics.")

	// 2. Verify Initial Comment Count
	const $topicElement = $("topics > topic")
	assertEquals(true, Boolean($topicElement), "Topic element should be rendered on the page.")
	if (!$topicElement) {
		console.error("Topic element not found, test cannot proceed.")
		return
	}

	const $commentCountElement = $topicElement.$("detail[comments] p")
	assertEquals(true, Boolean($commentCountElement), "Comment count element should exist.")
	if (!$commentCountElement) {
		console.error("Comment count element not found, test cannot proceed.")
		return
	}

	assertEquals("5", $commentCountElement.innerText.trim(), "Initial comment count should be 5.")

	// 3. Prepare for Update (Mock response for getMoreRecent's fetch)
	window.setMockFetchResponseForPaths({
		"/session": {
			success: true,
			path: "/topics",
			topics: [],
			comments: [],
			user: {},
			activities: [], // Also add here for completeness, though topic_counts is main
			topic_counts: [{ topic_id: 1, comment_count: 10, favorite_count: initialTopic.favorite_count, poll_counts: initialTopic.poll_counts }],
		},
	})

	// 4. Trigger WebSocket Update
	if (!state.ws || !state.ws.isMockWebSocket || typeof state.ws.triggerMessage !== 'function') {
		console.error("WebSocket (state.ws) is not the expected mock or triggerMessage not initialized.");
		if (state.ws) {
			console.error("state.ws.isMockWebSocket:", state.ws.isMockWebSocket);
			console.error("typeof state.ws.triggerMessage:", typeof state.ws.triggerMessage);
		} else {
			console.error("state.ws is undefined or null.");
		}
		assertEquals(true, Boolean(state.ws && state.ws.isMockWebSocket && typeof state.ws.triggerMessage === 'function'), "WebSocket should be the mock and triggerMessage should be initialized.")
		return
	}
	state.ws.triggerMessage("UPDATE")

	// New waiting mechanism
	// await Promise.resolve(); // First attempt, not sufficient
	// await Promise.resolve();
	await new Promise(resolve => setTimeout(resolve, 10)); // Try with a small delay

	// Re-select the comment count element as the DOM might have been re-rendered
	const $reselectedTopicElement = $("topics > topic")
	let $reselectedCommentCountElement = null;
	if ($reselectedTopicElement) {
		$reselectedCommentCountElement = $reselectedTopicElement.$("detail[comments] p");
	}

	// 5. Verify Updated Comment Count
	assertEquals(true, Boolean($reselectedCommentCountElement), "Comment count element should still exist after update.")
	if ($reselectedCommentCountElement) {
		assertEquals("10", $reselectedCommentCountElement.innerText.trim(), "Updated comment count should be 10.")
	}

    const updatedCachedTopic = state.cache["/topics"]?.topics.find(t => t.topic_id === initialTopic.topic_id)
    assertEquals(true, Boolean(updatedCachedTopic), "Topic should still be in cache after update.")
    if (!updatedCachedTopic) {
        console.error("Updated cached topic not found.")
        return
    }
    assertEquals(10, updatedCachedTopic.comment_count, "Comment count in cache should be updated to 10.")
}

runTests(path.basename(__filename), [testCommentCountUpdate])
