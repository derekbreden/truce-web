const { assertEquals, runTests } = require("../shared/testUtils.js")
const { setupIntegrationTestEnvironment } = require("../shared/integrationTestSetup.js")

async function testStartConversationViaMessageButton() {
	const window = await setupIntegrationTestEnvironment()
	const { $ } = window

	// Mock posts page with a post from the target user
	window.setMockFetchResponseForPaths({
		"/posts": {
			path: "/posts",
			user_id: "123",
			display_name: "Test User",
			email: "test@example.com",
			posts: [{
				post_id: "1",
				slug: "test-post",
				title: "Test Post",
				body: "This is a test post",
				user_slug: "target-user",
				display_name: "Target User",
				display_name_index: 0,
				topics: "general",
				profile_picture_uuid: null,
				user_verified: false,
				note: "",
				poll_1: null,
				favorited: false,
				reply_count: 0,
				favorite_count: 0,
				create_date: "2024-01-01T09:00:00Z",
				user_id: "456"
			}],
			replies: [],
			activities: [],
			notifications: []
		},
		"/user/target-user": {
			success: true,
			user_id: "123",
			display_name: "Test User",
			email: "test@example.com",
			user: {
				user_id: "456",
				display_name: "Target User",
				user_slug: "target-user",
				profile_picture_uuid: null,
				user_verified: false,
				subscribed: false
			},
			posts: [],
			replies: [],
			activities: [],
			notifications: [],
			path: "/user/target-user"
		}
	})

	// Mock successful conversation creation using action pattern
	window.addMockFetchMatcher({
		match: (url, options) => {
			if (url === "/session" && options?.method === "POST") {
				const body = JSON.parse(options.body)
				return body.action === "createConversation" 
					   && body.participant_user_ids 
					   && Array.isArray(body.participant_user_ids)
					   && body.participant_user_ids.includes(456)
			}
			return false
		},
		response: { success: true, conversation_id: "conv-789", existing: false }
	})

	// Mock the conversation page that we will navigate to
	window.setMockFetchResponseForPaths({
		"/messages/conv-789": {
			success: true,
			user_id: "123",
			display_name: "Test User",
			email: "test@example.com",
			messages: [],
			conversation: {
				conversation_id: "conv-789",
				participants: [
					{ user_id: "123", display_name: "Test User", display_name_index: 0 },
					{ user_id: "456", display_name: "Target User", display_name_index: 0 }
				]
			},
			posts: [],
			replies: [],
			activities: [],
			notifications: [],
			path: "/messages/conv-789"
		}
	})

	// Navigate to posts page
	$(`a[href="/posts"][big]`).click()
	await new Promise(resolve => setTimeout(resolve, 0))

	// Navigate to user profile by clicking on author
	$(`posts post author[slug="target-user"]`).click()
	await new Promise(resolve => setTimeout(resolve, 0))

	// Click the message button on the user profile page
	$("post[user] button[message]").click()
	await new Promise(resolve => setTimeout(resolve, 0))

	// Verify we navigated to the new conversation and conversation header shows other participant
	assertEquals("Target User", $("conversation-header participants h2") ? $("conversation-header participants h2").innerText.trim() : "not-found", "Should navigate to new conversation")
	assertEquals("Target User", $("conversation-header participants h2").innerText.trim(), "Conversation header should show other participant")
}

async function testStartConversationWithExistingConversation() {
	const window = await setupIntegrationTestEnvironment()
	const { $ } = window

	// Mock posts page with a post from the existing user
	window.setMockFetchResponseForPaths({
		"/posts": {
			path: "/posts",
			user_id: "123",
			display_name: "Test User",
			email: "test@example.com",
			posts: [{
				post_id: "2",
				slug: "existing-post",
				title: "Existing Post",
				body: "This is from existing user",
				user_slug: "existing-user",
				display_name: "Existing User",
				display_name_index: 0,
				topics: "general",
				profile_picture_uuid: null,
				user_verified: false,
				note: "",
				poll_1: null,
				favorited: false,
				reply_count: 0,
				favorite_count: 0,
				create_date: "2024-01-01T09:00:00Z",
				user_id: "456"
			}],
			replies: [],
			activities: [],
			notifications: []
		},
		"/user/existing-user": {
			success: true,
			user_id: "123",
			display_name: "Test User",
			email: "test@example.com",
			user: {
				user_id: "456",
				display_name: "Existing User",
				user_slug: "existing-user",
				profile_picture_uuid: null,
				user_verified: false,
				subscribed: false
			},
			posts: [],
			replies: [],
			activities: [],
			notifications: [],
			path: "/user/existing-user"
		}
	})

	// Mock conversation creation returning existing conversation
	window.addMockFetchMatcher({
		match: (url, options) => {
			if (url === "/session" && options?.method === "POST") {
				const body = JSON.parse(options.body)
				return body.action === "createConversation" 
					   && body.participant_user_ids 
					   && body.participant_user_ids.includes(456)
			}
			return false
		},
		response: { success: true, conversation_id: "123", existing: true }
	})

	// Mock the existing conversation page
	window.setMockFetchResponseForPaths({
		"/messages/123": {
			success: true,
			user_id: "123",
			display_name: "Test User",
			email: "test@example.com",
			messages: [{
				message_id: "1",
				conversation_id: "123",
				sender_user_id: "456",
				body: "Previous message",
				create_date: "2024-01-01T09:00:00Z",
				display_name: "Existing User",
				display_name_index: 0,
				user_slug: "456",
				profile_picture_uuid: null,
				user_verified: false,
				edit: false
			}],
			conversation: {
				conversation_id: "123",
				participants: [
					{ user_id: "123", display_name: "Test User", display_name_index: 0 },
					{ user_id: "456", display_name: "Existing User", display_name_index: 0 }
				]
			},
			posts: [],
			replies: [],
			activities: [],
			notifications: [],
			path: "/messages/123"
		}
	})

	// Navigate to posts page
	$(`a[href="/posts"][big]`).click()
	await new Promise(resolve => setTimeout(resolve, 0))

	// Navigate to user profile by clicking on author
	$(`posts post author[slug="existing-user"]`).click()
	await new Promise(resolve => setTimeout(resolve, 0))

	// Click message button
	$("post[user] button[message]").click()
	await new Promise(resolve => setTimeout(resolve, 0))

	// Verify we navigated to existing conversation and existing messages are displayed
	assertEquals(true, $("messages message message-content p span") && $("messages message message-content p span").innerText.includes("Previous message"), "Should navigate to existing conversation")
	assertEquals(true, $("messages message message-content p span").innerText.includes("Previous message"), "Should show previous message content")
}

runTests("start_conversation_functionality.integration.test.js", [
	testStartConversationViaMessageButton,
	testStartConversationWithExistingConversation
])