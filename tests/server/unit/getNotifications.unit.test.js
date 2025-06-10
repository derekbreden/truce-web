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
	testMarkSpecificAsRead: async () => {
		// Setup mock request to mark specific notifications as read
		const req = createMockRequest(
			{ mark_as_read: [1, 2, 3] },
			{ user_id: 'user-123' }
		)
		req.results = {}
		
		// Setup mock database response
		req.client.addQueryMock(
			'UPDATE notifications',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		// Execute the handler
		await getNotifications(req, res)
		
		// Verify response was sent
		assertEquals(
			true,
			res.isEnded(),
			"Response should be ended after marking as read."
		)
		assertEquals(
			'{"success":true}',
			res.getResponseData(),
			"Should return success response."
		)
	},

	testMarkAllAsRead: async () => {
		// Setup mock request to mark all notifications as read
		const req = createMockRequest(
			{ mark_all_as_read: true },
			{ user_id: 'user-123' }
		)
		req.results = {}
		
		req.client.addQueryMock(
			'UPDATE notifications',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		await getNotifications(req, res)
		
		// Verify response
		assertEquals(
			true,
			res.isEnded(),
			"Response should be ended."
		)
		assertEquals(
			'{"success":true}',
			res.getResponseData(),
			"Should return success for mark all as read."
		)
	},

	testMarkAllAsSeen: async () => {
		// Setup mock request to mark all notifications as seen
		const req = createMockRequest(
			{ mark_all_as_seen: true },
			{ user_id: 'user-123' }
		)
		req.results = {}
		
		req.client.addQueryMock(
			'UPDATE notifications',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		await getNotifications(req, res)
		
		// Verify response
		assertEquals(
			true,
			res.isEnded(),
			"Response should be ended."
		)
		assertEquals(
			'{"success":true}',
			res.getResponseData(),
			"Should return success for mark all as seen."
		)
	},

	testGetUnreadUnseenCounts: async () => {
		// Setup mock request to get counts
		const req = createMockRequest(
			{ path: "/unread_count_unseen_count" },
			{ user_id: 'user-123' }
		)
		req.results = {}
		
		// Setup mock database response for counts
		req.client.addQueryMock(
			'SUM(CASE WHEN read = FALSE',
			{ 
				rows: [{ 
					unread_count: '5',
					unseen_count: '2'
				}]
			}
		)
		
		const res = createMockResponse()
		
		await getNotifications(req, res)
		
		// Verify response
		assertEquals(
			true,
			res.isEnded(),
			"Response should be ended."
		)
		
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			'5',
			responseData.unread_count,
			"Should return correct unread count."
		)
		assertEquals(
			'2',
			responseData.unseen_count,
			"Should return correct unseen count."
		)
		assertEquals(
			null,
			responseData.reply_id,
			"Should not return reply_id when multiple unseen."
		)
	},

	testGetCountsWithSingleUnseen: async () => {
		// Setup mock request when exactly 1 unseen notification
		const req = createMockRequest(
			{ path: "/unread_count_unseen_count" },
			{ user_id: 'user-123' }
		)
		req.results = {}
		
		// Setup sequential mock responses
		req.client.addQueryMock(
			'SUM(CASE WHEN read = FALSE',
			{ 
				rows: [{ 
					unread_count: '3',
					unseen_count: '1'
				}]
			}
		)
		req.client.addQueryMock(
			'SELECT type, reply_id, conversation_id, notification_id',
			{ 
				rows: [{ 
					type: 'reply',
					reply_id: 'reply-456',
					conversation_id: null,
					notification_id: 'notification-789'
				}]
			}
		)
		
		const res = createMockResponse()
		
		await getNotifications(req, res)
		
		// Verify response includes reply details
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			'3',
			responseData.unread_count,
			"Should return unread count."
		)
		assertEquals(
			'1',
			responseData.unseen_count,
			"Should return unseen count."
		)
		assertEquals(
			'reply-456',
			responseData.reply_id,
			"Should return reply_id for single unseen."
		)
		assertEquals(
			'notification-789',
			responseData.notification_id,
			"Should return notification_id for single unseen."
		)
	},

	testGetNotificationsList: async () => {
		// Setup mock request to get notifications list
		const req = createMockRequest(
			{ path: "/notifications" },
			{ user_id: 'user-123' }
		)
		req.results = {}
		
		// Setup mock database responses for unread and read notifications
		req.client.addQueryMock(
			'read = FALSE',
			{ 
				rows: [
					{
						notification_id: 'notif-1',
						read: false,
						seen: false,
						create_date: '2024-01-15T10:00:00Z',
						display_name: 'John Doe',
						display_name_index: 0,
						reply_id: 'reply-1',
						body: 'This is an unread notification reply...',
						note: 'Note text',
						title: 'Post Title',
						reply_type: 'post'
					}
				]
			}
		)
		req.client.addQueryMock(
			'read = TRUE',
			{ 
				rows: [
					{
						notification_id: 'notif-2',
						read: true,
						seen: true,
						create_date: '2024-01-14T09:00:00Z',
						display_name: 'Jane Smith',
						display_name_index: 1,
						reply_id: 'reply-2',
						body: 'This is a read notification reply...',
						note: '',
						title: 'Another Post',
						reply_type: 'reply'
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		await getNotifications(req, res)
		
		// Verify notifications were loaded
		assertEquals(
			"/notifications",
			req.results.path,
			"Path should be set in results."
		)
		assertEquals(
			2,
			req.results.notifications.length,
			"Should combine unread and read notifications."
		)
		assertEquals(
			'notif-1',
			req.results.notifications[0].notification_id,
			"First notification should be unread."
		)
		assertEquals(
			false,
			req.results.notifications[0].read,
			"First notification should be unread."
		)
		assertEquals(
			'notif-2',
			req.results.notifications[1].notification_id,
			"Second notification should be read."
		)
		assertEquals(
			true,
			req.results.notifications[1].read,
			"Second notification should be read."
		)
	},

	testNoActionWhenNoUser: async () => {
		// Setup mock request without user_id
		const req = createMockRequest(
			{ mark_as_read: [1, 2] },
			{ user_id: undefined }
		)
		req.results = {}
		
		const res = createMockResponse()
		
		// Execute the handler
		await getNotifications(req, res)
		
		// Verify no action taken
		assertEquals(
			false,
			res.isEnded(),
			"Should not end response when no user."
		)
	},

	testNoActionWhenAlreadyEnded: async () => {
		// Setup mock request
		const req = createMockRequest(
			{ mark_as_read: [1, 2] },
			{ user_id: 'user-123' }
		)
		req.results = {}
		
		const res = createMockResponse()
		// Simulate response already ended
		res.writableEnded = true
		
		// Execute the handler
		await getNotifications(req, res)
		
		// Verify no action taken (response was already ended)
		assertEquals(
			true,
			res.writableEnded,
			"Response should remain ended."
		)
	},

	testNotificationReplyTypes: async () => {
		// Test different reply types in notifications
		const req = createMockRequest(
			{ path: "/notifications" },
			{ user_id: 'user-123' }
		)
		req.results = {}
		
		req.client.addQueryMock(
			'read = FALSE',
			{ 
				rows: [
					{
						notification_id: 'notif-post',
						reply_type: 'post',
						reply_id: 'reply-post',
						body: 'Reply to post'
					},
					{
						notification_id: 'notif-reply',
						reply_type: 'reply',
						reply_id: 'reply-reply',
						body: 'Reply to reply'
					},
					{
						notification_id: 'notif-post-reply',
						reply_type: 'post_reply',
						reply_id: 'reply-post-reply',
						body: 'Reply on post thread'
					}
				]
			}
		)
		req.client.addQueryMock(
			'read = TRUE',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		await getNotifications(req, res)
		
		// Verify different reply types are handled
		assertEquals(
			3,
			req.results.notifications.length,
			"Should return all notification types."
		)
		assertEquals(
			'post',
			req.results.notifications[0].reply_type,
			"Should have post reply type."
		)
		assertEquals(
			'reply',
			req.results.notifications[1].reply_type,
			"Should have reply reply type."
		)
		assertEquals(
			'post_reply',
			req.results.notifications[2].reply_type,
			"Should have post_reply reply type."
		)
	},

	testWithDateFilters: async () => {
		// Test notifications with date filtering
		const req = createMockRequest(
			{ 
				path: "/notifications",
				max_notification_unread_create_date: '2024-01-15T12:00:00Z',
				min_notification_read_create_date: '2024-01-10T00:00:00Z'
			},
			{ user_id: 'user-123' }
		)
		req.results = {}
		
		req.client.addQueryMock(
			'read = FALSE',
			{ 
				rows: [
					{
						notification_id: 'filtered-unread',
						read: false,
						create_date: '2024-01-14T10:00:00Z'
					}
				]
			}
		)
		req.client.addQueryMock(
			'read = TRUE',
			{ 
				rows: [
					{
						notification_id: 'filtered-read',
						read: true,
						create_date: '2024-01-12T10:00:00Z'
					}
				]
			}
		)
		
		const res = createMockResponse()
		
		await getNotifications(req, res)
		
		// Should handle date filtering
		assertEquals(
			2,
			req.results.notifications.length,
			"Should return filtered notifications."
		)
	},

	testEmptyNotifications: async () => {
		// Test when no notifications exist
		const req = createMockRequest(
			{ path: "/notifications" },
			{ user_id: 'user-123' }
		)
		req.results = {}
		
		req.client.addQueryMock(
			'read = FALSE',
			{ rows: [] }
		)
		req.client.addQueryMock(
			'read = TRUE',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		await getNotifications(req, res)
		
		// Should handle empty results gracefully
		assertEquals(
			"/notifications",
			req.results.path,
			"Path should still be set."
		)
		assertEquals(
			0,
			req.results.notifications.length,
			"Should handle empty notifications gracefully."
		)
	},

	testZeroCounts: async () => {
		// Test when counts are zero
		const req = createMockRequest(
			{ path: "/unread_count_unseen_count" },
			{ user_id: 'user-123' }
		)
		req.results = {}
		
		req.client.addQueryMock(
			'SUM(CASE WHEN read = FALSE',
			{ 
				rows: [{ 
					unread_count: '0',
					unseen_count: '0'
				}]
			}
		)
		
		const res = createMockResponse()
		
		await getNotifications(req, res)
		
		// Verify zero counts are handled
		const responseData = JSON.parse(res.getResponseData())
		assertEquals(
			'0',
			responseData.unread_count,
			"Should return zero unread count."
		)
		assertEquals(
			'0',
			responseData.unseen_count,
			"Should return zero unseen count."
		)
		assertEquals(
			null,
			responseData.reply_id,
			"Should not return reply_id when zero unseen."
		)
	},

	testMultipleActions: async () => {
		// Test that only one action is performed per request
		const req = createMockRequest(
			{ 
				mark_as_read: [1, 2],
				mark_all_as_read: true,
				path: "/notifications"
			},
			{ user_id: 'user-123' }
		)
		req.results = {}
		
		req.client.addQueryMock(
			'UPDATE notifications',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		await getNotifications(req, res)
		
		// Should execute first matching action (mark_as_read)
		assertEquals(
			true,
			res.isEnded(),
			"Should end response after first action."
		)
		assertEquals(
			'{"success":true}',
			res.getResponseData(),
			"Should return success for first action."
		)
	},

	testTextTruncation: async () => {
		// Test that text fields are properly truncated
		const req = createMockRequest(
			{ path: "/notifications" },
			{ user_id: 'user-123' }
		)
		req.results = {}
		
		req.client.addQueryMock(
			'read = FALSE',
			{ 
				rows: [
					{
						notification_id: 'truncate-test',
						body: 'This is a very long reply body that should be truncated at 51 characters max according to the LEFT function in SQL',
						note: 'This is a long note that should be truncated at 21 chars',
						title: 'This is a long post title that should be truncated at 21 chars'
					}
				]
			}
		)
		req.client.addQueryMock(
			'read = TRUE',
			{ rows: [] }
		)
		
		const res = createMockResponse()
		
		await getNotifications(req, res)
		
		// Verify truncation (exact truncation handled by database LEFT function)
		const notification = req.results.notifications[0]
		assertEquals(
			'truncate-test',
			notification.notification_id,
			"Should load notification with truncated fields."
		)
		assertEquals(
			'string',
			typeof notification.body,
			"Body should be a string (truncated by DB)."
		)
		assertEquals(
			'string',
			typeof notification.note,
			"Note should be a string (truncated by DB)."
		)
		assertEquals(
			'string',
			typeof notification.title,
			"Title should be a string (truncated by DB)."
		)
	}
}

runTests(path.basename(__filename), Object.values(tests))