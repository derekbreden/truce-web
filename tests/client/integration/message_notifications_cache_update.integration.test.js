const { assertEquals, runTests } = require("../shared/testUtils.js")
const { setupIntegrationTestEnvironment } = require("../shared/integrationTestSetup.js")

async function testMessageNotificationsCacheUpdate() {
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
		"/notifications": {
			success: true,
			user_id: "123",
			display_name: "Test User",
			email: "test@example.com",
			notifications: [
				{
					notification_id: "notif-101",
					read: false,
					seen: false,
					create_date: "2024-01-01T09:00:00Z",
					display_name: "Other User",
					display_name_index: 0,
					reply_id: null,
					body: "First unread message",
					note: null,
					title: null,
					reply_type: null,
					conversation_id: 456,
					message_id: 101, // This should match message in conversation
					notification_type: "message"
				}
			],
			posts: [],
			replies: [],
			activities: [],
			path: "/notifications"
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
				last_message_body: "First unread message",
				last_message_date: "2024-01-01T09:00:00Z",
				unread_count: 1
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
					sender_user_id: "789", // From other user
					body: "First unread message",
					create_date: "2024-01-01T09:00:00Z",
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

	// Mock markMessageAsRead responses
	window.addMockFetchMatcher({
		match: (url, options) => {
			if (url === "/session" && options?.method === "POST") {
				const body = JSON.parse(options.body)
				return body.action === "markMessageAsRead"
			}
			return false
		},
		response: { success: true }
	})

	// Navigate to posts first
	const $join_button = $(`a[href="/posts"][big]`)
	$join_button.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	// Navigate to notifications to populate the cache
	const $notifications_link = $(`footer a[href="/notifications"]`)
	$notifications_link.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	// Verify notification is unread in cache initially
	const notificationsBefore = window.state.cache["/notifications"]?.notifications
	assertEquals(1, notificationsBefore?.length, "Should have 1 notification in cache")
	assertEquals(false, notificationsBefore[0].read, "Notification should initially be unread")
	assertEquals(101, notificationsBefore[0].message_id, "Notification should have message_id 101")

	// Navigate to conversations
	const $conversations_link = $(`footer a[href="/conversations"]`)
	$conversations_link.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	// Click on the conversation to open it and trigger read marking
	const $conversation = $("conversation")
	$conversation.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	// Give time for async operations to complete
	await new Promise(resolve => setTimeout(resolve, 100))

	// Verify notification is now marked as read in cache
	const notificationsAfter = window.state.cache["/notifications"]?.notifications
	assertEquals(1, notificationsAfter?.length, "Should still have 1 notification in cache")
	assertEquals(true, notificationsAfter[0].read, "Notification should now be marked as read")
	assertEquals(true, notificationsAfter[0].seen, "Notification should now be marked as seen")
	assertEquals(101, notificationsAfter[0].message_id, "Notification should still have message_id 101")

	// Verify conversation unread count is also updated
	const conversationsAfter = window.state.cache["/conversations"]?.conversations
	assertEquals(1, conversationsAfter?.length, "Should have 1 conversation in cache")
	assertEquals(0, conversationsAfter[0].unread_count, "Conversation unread count should be 0")
}

runTests("message_notifications_cache_update.integration.test.js", [
	testMessageNotificationsCacheUpdate
])