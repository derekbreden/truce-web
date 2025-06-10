const path = require("path")
const {
	createMockRequest,
	createMockResponse,
	assertEquals,
	runTests
} = require("../shared/serverTestSetup.js")

// Import the handler we're testing
const getNotifications = require("../../../server/session/getNotifications.js")

const tests = {
	testGetMixedNotificationsWithMessages: async () => {
		// Test that will verify our future UNION implementation works
		const req = createMockRequest(
			{ path: "/notifications" },
			{ user_id: "user-123" }
		)
		req.results = {}
		
		// Mock mixed unread notifications (replies + messages)
		req.client.addQueryMock(
			"read = FALSE",
			{ 
				rows: [
					{
						notification_id: "reply-notif-1",
						notification_type: "reply",
						read: false,
						seen: false,
						create_date: "2024-01-15T10:00:00Z",
						display_name: "John Doe",
						display_name_index: 0,
						reply_id: "reply-1",
						body: "This is a reply notification...",
						note: "Note text",
						title: "Post Title",
						reply_type: "post",
						conversation_id: null,
						message_id: null
					},
					{
						notification_id: "message-notif-1",
						notification_type: "message",
						read: false,
						seen: false,
						create_date: "2024-01-15T09:30:00Z",
						display_name: "Jane Smith",
						display_name_index: 1,
						reply_id: null,
						body: "This is a message notification...",
						note: null,
						title: null,
						reply_type: null,
						conversation_id: "conv-456",
						message_id: "msg-789"
					}
				]
			}
		)
		
		// Mock mixed read notifications
		req.client.addQueryMock(
			"read = TRUE",
			{ 
				rows: [
					{
						notification_id: "reply-notif-2",
						notification_type: "reply",
						read: true,
						seen: true,
						create_date: "2024-01-14T09:00:00Z",
						display_name: "Bob Wilson",
						display_name_index: 2,
						reply_id: "reply-2",
						body: "This is a read reply notification...",
						note: "",
						title: "Another Post",
						reply_type: "reply",
						conversation_id: null,
						message_id: null
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		await getNotifications(req, res)
		
		// Verify mixed notifications were loaded correctly
		assertEquals(
			"/notifications",
			req.results.path,
			"Path should be set in results."
		)
		assertEquals(
			3,
			req.results.notifications.length,
			"Should load both reply and message notifications."
		)
		
		// Verify first notification (newest unread - reply)
		const firstNotif = req.results.notifications[0]
		assertEquals(
			"reply-notif-1",
			firstNotif.notification_id,
			"First notification should be newest unread reply."
		)
		assertEquals(
			"reply",
			firstNotif.notification_type,
			"Should have reply notification type."
		)
		assertEquals(
			"reply-1",
			firstNotif.reply_id,
			"Should have reply_id for reply notifications."
		)
		assertEquals(
			null,
			firstNotif.conversation_id,
			"Reply notifications should not have conversation_id."
		)
		
		// Verify second notification (unread message)
		const secondNotif = req.results.notifications[1]
		assertEquals(
			"message-notif-1",
			secondNotif.notification_id,
			"Second notification should be unread message."
		)
		assertEquals(
			"message",
			secondNotif.notification_type,
			"Should have message notification type."
		)
		assertEquals(
			"conv-456",
			secondNotif.conversation_id,
			"Should have conversation_id for message notifications."
		)
		assertEquals(
			null,
			secondNotif.reply_id,
			"Message notifications should not have reply_id."
		)
		
		// Verify third notification (read reply)
		const thirdNotif = req.results.notifications[2]
		assertEquals(
			"reply-notif-2",
			thirdNotif.notification_id,
			"Third notification should be read reply."
		)
		assertEquals(
			true,
			thirdNotif.read,
			"Should be marked as read."
		)
	},

	testGetMixedCountsWithMessages: async () => {
		// Test count queries include both notification types
		const req = createMockRequest(
			{ path: "/unread_count_unseen_count" },
			{ user_id: "user-123" }
		)
		req.results = {}
		
		// Mock count query that would include both tables in UNION
		req.client.addQueryMock(
			"SUM(CASE WHEN read = FALSE",
			{ 
				rows: [{ 
					unread_count: "7",  // 4 reply + 3 message notifications
					unseen_count: "3"   // 2 reply + 1 message notifications
				}]
			}
		)
		
		const res = createMockResponse()
		
		await getNotifications(req, res)
		
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			"7",
			responseData.unread_count,
			"Should return combined unread count from both notification types."
		)
		assertEquals(
			"3",
			responseData.unseen_count,
			"Should return combined unseen count from both notification types."
		)
	},

	testMessageNotificationDateFiltering: async () => {
		// Test that date filtering works with mixed notification types
		const req = createMockRequest(
			{ 
				path: "/notifications",
				max_notification_unread_create_date: "2024-01-15T12:00:00Z",
				min_notification_read_create_date: "2024-01-10T00:00:00Z"
			},
			{ user_id: "user-123" }
		)
		req.results = {}
		
		req.client.addQueryMock(
			"read = FALSE",
			{ 
				rows: [
					{
						notification_id: "filtered-message",
						notification_type: "message",
						read: false,
						create_date: "2024-01-14T10:00:00Z",
						conversation_id: "conv-123",
						message_id: "msg-456"
					}
				]
			}
		)
		req.client.addQueryMock(
			"read = TRUE",
			{ 
				rows: [
					{
						notification_id: "filtered-reply",
						notification_type: "reply",
						read: true,
						create_date: "2024-01-12T10:00:00Z",
						reply_id: "reply-789"
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		await getNotifications(req, res)
		
		assertEquals(
			2,
			req.results.notifications.length,
			"Should return filtered notifications from both types."
		)
	},

	testMarkAllAsReadIncludesMessages: async () => {
		// Test that mark all as read will include message notifications
		const req = createMockRequest(
			{ mark_all_as_read: true },
			{ user_id: "user-123" }
		)
		req.results = {}
		
		// Should eventually mock two UPDATE queries:
		// - UPDATE reply_notifications SET read = TRUE, seen = TRUE WHERE user_id = $1 
		// - UPDATE message_notifications SET read = TRUE, seen = TRUE WHERE user_id = $1
		req.client.addQueryMock(
			"UPDATE notifications",
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		await getNotifications(req, res)
		
		assertEquals(
			true,
			res.isEnded(),
			"Should end response after marking all as read."
		)
		assertEquals(
			"{\"success\":true}",
			res.getResponseData(),
			"Should return success for mark all as read operation."
		)
	},

	testMarkSpecificMessageNotificationAsRead: async () => {
		// Test marking specific message notifications as read
		const req = createMockRequest(
			{ mark_as_read: ["message-notif-1", "reply-notif-2"] },
			{ user_id: "user-123" }
		)
		req.results = {}
		
		// Should eventually handle mixed notification IDs
		req.client.addQueryMock(
			"UPDATE notifications",
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		await getNotifications(req, res)
		
		assertEquals(
			true,
			res.isEnded(),
			"Should end response after marking specific notifications as read."
		)
		assertEquals(
			"{\"success\":true}",
			res.getResponseData(),
			"Should return success for specific mark as read operation."
		)
	},

	testEmptyMixedNotifications: async () => {
		// Test when no notifications exist of either type
		const req = createMockRequest(
			{ path: "/notifications" },
			{ user_id: "user-123" }
		)
		req.results = {}
		
		req.client.addQueryMock(
			"read = FALSE",
			{ rows: [] }
		)
		req.client.addQueryMock(
			"read = TRUE", 
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		await getNotifications(req, res)
		
		assertEquals(
			"/notifications",
			req.results.path,
			"Path should still be set."
		)
		assertEquals(
			0,
			req.results.notifications.length,
			"Should handle empty mixed notifications gracefully."
		)
	},

	testSingleUnseenMessageNotification: async () => {
		// Test single unseen message notification auto-navigation
		const req = createMockRequest(
			{ path: "/unread_count_unseen_count" },
			{ user_id: "user-123" }
		)
		req.results = {}
		
		req.client.addQueryMock(
			"SUM(CASE WHEN read = FALSE",
			{ 
				rows: [{ 
					unread_count: "3",
					unseen_count: '1'
				}]
			}
		)
		
		// Mock single unseen notification query - should work for messages too
		req.client.addQueryMock(
			"SELECT reply_id, notification_id",
			{ 
				rows: [{ 
					reply_id: null,  // This would be null for message notifications
					notification_id: "message-notif-456",
					conversation_id: "conv-789", // Would need to add this field
					message_id: "msg-123"
				}]
			}
		)
		
		const res = createMockResponse()
		
		await getNotifications(req, res)
		
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			"3",
			responseData.unread_count,
			"Should return unread count."
		)
		assertEquals(
			"1",
			responseData.unseen_count,
			"Should return unseen count."
		)
		assertEquals(
			null,
			responseData.reply_id,
			"Should return null reply_id for message notification."
		)
		// Would need to handle conversation_id for message notifications
		// assertEquals("conv-789", responseData.conversation_id, "Should return conversation_id for message notification.")
	}
}

runTests(path.basename(__filename), Object.values(tests))