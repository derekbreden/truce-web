const { assertEquals, runTests } = require("../shared/testUtils.js")
const { setupIntegrationTestEnvironment } = require("../shared/integrationTestSetup.js")

async function testMarkMessagesAsReadWhenOpeningConversation() {
	const window = await setupIntegrationTestEnvironment()
	const { $ } = window

	// Mock API responses
	window.setMockFetchResponseForPaths({
		"/posts": {
			success: true,
			user_id: "123",
			display_name: "Test User",
			email: "test@example.com",
			posts: [],
			replies: [],
			activities: [],
			notifications: [],
			path: "/posts"
		},
		"/conversations": {
			success: true,
			user_id: "123",
			display_name: "Test User",
			email: "test@example.com",
			conversations: [{
				conversation_id: 456,
				create_date: "2024-01-01T09:30:00Z",
				participants: [
					{ user_id: "123", display_name: "Test User", display_name_index: 0 },
					{ user_id: "789", display_name: "Other User", display_name_index: 0 }
				],
				last_message_body: "Hello there",
				last_message_date: "2024-01-01T10:00:00Z",
				unread_count: 2 // Has unread messages
			}],
			posts: [],
			replies: [],
			activities: [],
			notifications: [],
			path: "/conversations"
		},
		"/messages/456": {
			success: true,
			user_id: "123",
			display_name: "Test User",
			email: "test@example.com",
			messages: [
				{
					message_id: 101,
					conversation_id: 456,
					sender_user_id: "789", // From other user (should be marked as read)
					body: "First unread message",
					create_date: "2024-01-01T09:00:00Z",
					display_name: "Other User",
					display_name_index: 0,
					user_slug: "789",
					profile_picture_uuid: null,
					user_verified: false,
					edit: false
				},
				{
					message_id: 102,
					conversation_id: 456,
					sender_user_id: "123", // From current user (should NOT be marked as read)
					body: "My own message",
					create_date: "2024-01-01T09:30:00Z",
					display_name: "Test User",
					display_name_index: 0,
					user_slug: "123",
					profile_picture_uuid: null,
					user_verified: false,
					edit: true
				},
				{
					message_id: 103,
					conversation_id: 456,
					sender_user_id: "789", // From other user (should be marked as read)
					body: "Second unread message",
					create_date: "2024-01-01T10:00:00Z",
					display_name: "Other User",
					display_name_index: 0,
					user_slug: "789",
					profile_picture_uuid: null,
					user_verified: false,
					edit: false
				}
			],
			conversation: {
				conversation_id: 456,
				participants: [
					{ user_id: "123", display_name: "Test User", display_name_index: 0 },
					{ user_id: "789", display_name: "Other User", display_name_index: 0 }
				]
			},
			posts: [],
			replies: [],
			activities: [],
			notifications: [],
			path: "/messages/456"
		}
	})

	// Track calls to markMessageAsRead
	const markAsReadCalls = []
	window.addMockFetchMatcher({
		match: (url, options) => {
			if (url === "/session" && options?.method === "POST") {
				const body = JSON.parse(options.body)
				if (body.action === "markMessageAsRead") {
					markAsReadCalls.push(body.message_id)
					return true
				}
			}
			return false
		},
		response: { success: true }
	})

	// Navigate to posts first
	const $join_button = $(`a[href="/posts"][big]`)
	$join_button.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	// Navigate to conversations
	const $conversations_link = $(`footer a[href="/conversations"]`)
	$conversations_link.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	// Click on the conversation to open it
	const $conversation = $("conversation")
	$conversation.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	// Verify messages are displayed
	const $messages = $("message")
	assertEquals(3, $messages.length, "Should display all 3 messages")

	// Verify markMessageAsRead was called for messages from other users only
	assertEquals(2, markAsReadCalls.length, "Should call markMessageAsRead for 2 messages from other users")
	assertEquals(true, markAsReadCalls.includes(101) || markAsReadCalls.includes("101"), "Should mark message 101 as read")
	assertEquals(true, markAsReadCalls.includes(103) || markAsReadCalls.includes("103"), "Should mark message 103 as read") 
	assertEquals(false, markAsReadCalls.includes(102) || markAsReadCalls.includes("102"), "Should NOT mark own message 102 as read")
}

runTests("message_read_marking.integration.test.js", [
	testMarkMessagesAsReadWhenOpeningConversation
])