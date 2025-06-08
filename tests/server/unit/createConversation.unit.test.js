const { createMockRequest, createMockResponse, assertEquals, runTests } = require("../shared/serverTestSetup.js")
const createConversation = require("../../../server/session/createConversation.js")

async function testCreateNewConversation() {
	const req = createMockRequest({
		participant_user_ids: [456]
	}, {
		user_id: 123
	})
	
	// Mock participants existence check
	req.client.addQueryMock(
		(sql) => sql.includes('FROM users') && sql.includes('WHERE user_id = ANY'),
		{ rows: [{ user_id: 123 }, { user_id: 456 }] }
	)
	
	// Mock blocked user check
	req.client.addQueryMock(
		(sql) => sql.includes('FROM blocked_users'),
		{ rows: [] }
	)
	
	// Mock existing conversation check
	req.client.addQueryMock(
		(sql) => sql.includes('FROM conversations') && sql.includes('participant_user_ids @>'),
		{ rows: [] }
	)
	
	// Mock conversation creation
	req.client.addQueryMock(
		(sql) => sql.includes('INSERT INTO conversations'),
		{ rows: [{ conversation_id: 789 }] }
	)
	
	const res = createMockResponse()
	
	await createConversation(req, res)
	
	const responseData = JSON.parse(res.getResponseData())
	assertEquals(true, responseData.success, "Should succeed")
	assertEquals(789, responseData.conversation_id, "Should return conversation_id")
	assertEquals(false, responseData.existing, "Should indicate new conversation")
}

async function testCreateConversationAlreadyExists() {
	const req = createMockRequest({
		participant_user_ids: [456]
	}, {
		user_id: 123
	})
	
	// Mock participants existence check
	req.client.addQueryMock(
		(sql) => sql.includes('FROM users') && sql.includes('WHERE user_id = ANY'),
		{ rows: [{ user_id: 123 }, { user_id: 456 }] }
	)
	
	// Mock blocked user check
	req.client.addQueryMock(
		(sql) => sql.includes('FROM blocked_users'),
		{ rows: [] }
	)
	
	// Mock existing conversation check - conversation exists
	req.client.addQueryMock(
		(sql) => sql.includes('FROM conversations') && sql.includes('participant_user_ids @>'),
		{ rows: [{ conversation_id: 555 }] }
	)
	
	const res = createMockResponse()
	
	await createConversation(req, res)
	
	const responseData = JSON.parse(res.getResponseData())
	assertEquals(true, responseData.success, "Should succeed")
	assertEquals(555, responseData.conversation_id, "Should return existing conversation_id")
	assertEquals(true, responseData.existing, "Should indicate existing conversation")
}

async function testCreateConversationBlockedUser() {
	const req = createMockRequest({
		participant_user_ids: [456]
	}, {
		user_id: 123
	})
	
	// Mock participants existence check
	req.client.addQueryMock(
		(sql) => sql.includes('FROM users') && sql.includes('WHERE user_id = ANY'),
		{ rows: [{ user_id: 123 }, { user_id: 456 }] }
	)
	
	// Mock blocked user check - user is blocked
	req.client.addQueryMock(
		(sql) => sql.includes('FROM blocked_users'),
		{ rows: [{ user_id_blocked: 456 }] }
	)
	
	const res = createMockResponse()
	
	await createConversation(req, res)
	
	const responseData = JSON.parse(res.getResponseData())
	assertEquals("Cannot create conversation with blocked user", responseData.error, "Should return blocked error")
}

async function testCreateConversationParticipantNotFound() {
	const req = createMockRequest({
		participant_user_ids: [999]
	}, {
		user_id: 123
	})
	
	// Mock participants existence check - one user not found
	req.client.addQueryMock(
		(sql) => sql.includes('FROM users') && sql.includes('WHERE user_id = ANY'),
		{ rows: [{ user_id: 123 }] } // Missing user 999
	)
	
	const res = createMockResponse()
	
	await createConversation(req, res)
	
	const responseData = JSON.parse(res.getResponseData())
	assertEquals("One or more participants not found", responseData.error, "Should return not found error")
}

async function testCreateConversationMultipleParticipants() {
	const req = createMockRequest({
		participant_user_ids: [456, 789]
	}, {
		user_id: 123
	})
	
	// Mock participants existence check
	req.client.addQueryMock(
		(sql) => sql.includes('FROM users') && sql.includes('WHERE user_id = ANY'),
		{ rows: [{ user_id: 123 }, { user_id: 456 }, { user_id: 789 }] }
	)
	
	// Mock blocked user check
	req.client.addQueryMock(
		(sql) => sql.includes('FROM blocked_users'),
		{ rows: [] }
	)
	
	// Mock existing conversation check
	req.client.addQueryMock(
		(sql) => sql.includes('FROM conversations') && sql.includes('participant_user_ids @>'),
		{ rows: [] }
	)
	
	// Mock conversation creation
	req.client.addQueryMock(
		(sql) => sql.includes('INSERT INTO conversations'),
		{ rows: [{ conversation_id: 888 }] }
	)
	
	const res = createMockResponse()
	
	await createConversation(req, res)
	
	const responseData = JSON.parse(res.getResponseData())
	assertEquals(true, responseData.success, "Should succeed with multiple participants")
	assertEquals(888, responseData.conversation_id, "Should return conversation_id")
	assertEquals(false, responseData.existing, "Should indicate new conversation")
}

runTests("createConversation.unit.test.js", [
	testCreateNewConversation,
	testCreateConversationAlreadyExists,
	testCreateConversationBlockedUser,
	testCreateConversationParticipantNotFound,
	testCreateConversationMultipleParticipants
])