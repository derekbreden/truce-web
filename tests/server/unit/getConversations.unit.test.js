const { createMockRequest, createMockResponse, assertEquals, runTests } = require("../shared/serverTestSetup.js")
const getConversations = require("../../../server/session/getConversations.js")

async function testGetConversationsSuccess() {
	const req = createMockRequest({
		path: "/conversations"
	}, {
		user_id: 123
	})
	
	// Mock conversations query (first SELECT)
	req.client.addQueryMock(
		(sql) => sql.includes("FROM conversations c") && sql.includes("LEFT JOIN messages lm"),
		{ 
			rows: [
				{
					conversation_id: 1,
					create_date: new Date(),
					last_message_id: 789,
					participant_user_ids: [123, 456],
					last_message_body: "Latest message",
					last_message_date: new Date(),
					last_message_sender_id: 456,
					last_message_sender_name: "Other User",
					last_message_sender_slug: "456",
					last_message_sender_picture: null,
					last_message_sender_verified: false,
					participants: [
						{ user_id: 123, display_name: "Test User", user_slug: "123", profile_picture_uuid: null, user_verified: false },
						{ user_id: 456, display_name: "Other User", user_slug: "456", profile_picture_uuid: null, user_verified: false }
					],
					unread_count: 2
				}
			] 
		}
	)
	
	// Mock total unread count query (second SELECT)
	req.client.addQueryMock(
		(sql) => sql.includes("COUNT(*) as total_unread") && sql.includes("FROM message_notifications mn"),
		{ rows: [{ total_unread: 5 }] }
	)
	
	const res = createMockResponse()
	
	await getConversations(req, res)
	
	assertEquals(1, req.results.conversations.length, "Should return conversations")
	assertEquals(5, req.results.total_unread, "Should return total unread count")
	assertEquals("/conversations", req.results.path, "Should set correct path")
	assertEquals(0, req.results.posts.length, "Should have empty posts array")
	assertEquals(0, req.results.replies.length, "Should have empty replies array")
	assertEquals(0, req.results.activities.length, "Should have empty activities array")
	assertEquals(0, req.results.notifications.length, "Should have empty notifications array")
	assertEquals(0, req.results.messages.length, "Should have empty messages array")
	assertEquals(null, res.getResponseData(), "Should not send immediate response")
}

async function testGetConversationsEmpty() {
	const req = createMockRequest({
		path: "/conversations"
	}, {
		user_id: 123
	})
	
	// Mock empty conversations query (first SELECT)
	req.client.addQueryMock(
		(sql) => sql.includes("FROM conversations c") && sql.includes("LEFT JOIN messages lm"),
		{ rows: [] }
	)
	
	// Mock total unread count query (second SELECT)
	req.client.addQueryMock(
		(sql) => sql.includes("COUNT(*) as total_unread") && sql.includes("FROM message_notifications mn"),
		{ rows: [{ total_unread: 0 }] }
	)
	
	const res = createMockResponse()
	
	await getConversations(req, res)
	
	assertEquals(0, req.results.conversations.length, "Should return empty conversations")
	assertEquals(0, req.results.total_unread, "Should return zero unread count")
}

async function testGetConversationsWithDateFilter() {
	const req = createMockRequest({
		path: "/conversations",
		min_conversation_create_date: "2024-01-01T00:00:00.000Z"
	}, {
		user_id: 123
	})
	
	// Mock conversations query with date filter (first SELECT)
	req.client.addQueryMock(
		(sql) => sql.includes("FROM conversations c") && sql.includes("LEFT JOIN messages lm"),
		{ rows: [] }
	)
	
	// Mock total unread count query (second SELECT)
	req.client.addQueryMock(
		(sql) => sql.includes("COUNT(*) as total_unread") && sql.includes("FROM message_notifications mn"),
		{ rows: [{ total_unread: 0 }] }
	)
	
	const res = createMockResponse()
	
	await getConversations(req, res)
	
	assertEquals(0, req.results.conversations.length, "Should return filtered results")
}

async function testGetConversationsInvalidPath() {
	const req = createMockRequest({
		path: "/invalid"
	}, {
		user_id: 123
	})
	
	const res = createMockResponse()
	
	await getConversations(req, res)
	
	// Should not respond since path doesn't match
	assertEquals(null, res.getResponseData(), "Should not respond to invalid path")
}

runTests("getConversations.unit.test.js", [
	testGetConversationsSuccess,
	testGetConversationsEmpty,
	testGetConversationsWithDateFilter,
	testGetConversationsInvalidPath
])