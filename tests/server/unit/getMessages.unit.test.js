const { createMockRequest, createMockResponse, assertEquals, runTests } = require("../shared/serverTestSetup.js")
const getMessages = require("../../../server/session/getMessages.js")

async function testGetMessagesSuccess() {
	const req = createMockRequest({
		conversation_id: 1
	}, {
		user_id: 123
	})
	
	// Mock conversation check - user is participant
	req.client.addQueryMock(
		'SELECT participant_user_ids',
		{ rows: [{ participant_user_ids: [123, 456] }] }
	)
	
	// Mock messages query (first SELECT)
	req.client.addQueryMock(
		(sql) => sql.includes('FROM messages m') && sql.includes('INNER JOIN users u'),
		{ 
			rows: [
				{
					create_date: new Date(),
					message_id: 789,
					body: "Hello world",
					image_uuids: null,
					sender_user_id: 456,
					display_name: "Other User",
					display_name_index: 0,
					user_slug: "456",
					profile_picture_uuid: null,
					user_verified: false,
					edit: false
				}
			] 
		}
	)
	
	// Mock conversation metadata query (second SELECT)
	req.client.addQueryMock(
		(sql) => sql.includes('FROM conversations c') && sql.includes('CROSS JOIN unnest'),
		{ 
			rows: [
				{
					conversation_id: 1,
					create_date: new Date(),
					last_message_id: 789,
					participants: [
						{ user_id: 123, display_name: "Test User", user_slug: "123", profile_picture_uuid: null, user_verified: false },
						{ user_id: 456, display_name: "Other User", user_slug: "456", profile_picture_uuid: null, user_verified: false }
					]
				}
			] 
		}
	)
	
	const res = createMockResponse()
	
	await getMessages(req, res)
	
	const responseData = JSON.parse(res.getResponseData())
	assertEquals(true, responseData.success, "Should succeed")
	assertEquals(1, responseData.messages.length, "Should return messages")
	assertEquals("/messages/1", responseData.path, "Should set correct path")
	assertEquals(1, responseData.conversation.conversation_id, "Should return conversation metadata")
}

async function testGetMessagesNotParticipant() {
	const req = createMockRequest({
		conversation_id: 1
	}, {
		user_id: 999
	})
	
	// Mock conversation check - user not in participants
	req.client.addQueryMock(
		'SELECT participant_user_ids',
		{ rows: [{ participant_user_ids: [123, 456] }] }
	)
	
	const res = createMockResponse()
	
	await getMessages(req, res)
	
	const responseData = JSON.parse(res.getResponseData())
	assertEquals("Conversation not found or access denied", responseData.error, "Should return access denied error")
}

async function testGetMessagesConversationNotFound() {
	const req = createMockRequest({
		conversation_id: 999
	}, {
		user_id: 123
	})
	
	// Mock conversation check - conversation doesn't exist
	req.client.addQueryMock(
		'SELECT participant_user_ids',
		{ rows: [] }
	)
	
	const res = createMockResponse()
	
	await getMessages(req, res)
	
	const responseData = JSON.parse(res.getResponseData())
	assertEquals("Conversation not found or access denied", responseData.error, "Should return not found error")
}

async function testGetMessagesWithDateFilter() {
	const req = createMockRequest({
		conversation_id: 1,
		min_message_create_date: "2024-01-01T00:00:00.000Z"
	}, {
		user_id: 123
	})
	
	// Mock conversation check
	req.client.addQueryMock(
		'SELECT participant_user_ids',
		{ rows: [{ participant_user_ids: [123, 456] }] }
	)
	
	// Mock messages query with date filter (first SELECT)
	req.client.addQueryMock(
		(sql) => sql.includes('FROM messages m') && sql.includes('INNER JOIN users u'),
		{ rows: [] }
	)
	
	// Mock conversation metadata query (second SELECT)
	req.client.addQueryMock(
		(sql) => sql.includes('FROM conversations c') && sql.includes('CROSS JOIN unnest'),
		{ 
			rows: [
				{
					conversation_id: 1,
					create_date: new Date(),
					last_message_id: null,
					participants: []
				}
			] 
		}
	)
	
	const res = createMockResponse()
	
	await getMessages(req, res)
	
	const responseData = JSON.parse(res.getResponseData())
	assertEquals(true, responseData.success, "Should succeed with date filter")
	assertEquals(0, responseData.messages.length, "Should return filtered results")
}

runTests("getMessages.unit.test.js", [
	testGetMessagesSuccess,
	testGetMessagesNotParticipant,
	testGetMessagesConversationNotFound,
	testGetMessagesWithDateFilter
])