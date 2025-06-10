const { createMockRequest, createMockResponse, assertEquals, runTests } = require("../shared/serverTestSetup.js")
const createConversation = require("../../../server/session/createConversation.js")

async function testCreateConversationMissingParticipants() {
	const req = createMockRequest({
		// Missing participant_user_ids
	}, {
		user_id: 123
	})
	
	const res = createMockResponse()
	
	await createConversation(req, res)
	
	// Should not respond since missing required field
	assertEquals(false, res.writableEnded, "Should not respond when participant_user_ids is missing")
}

async function testCreateConversationEmptyParticipants() {
	const req = createMockRequest({
		participant_user_ids: [] // Empty array
	}, {
		user_id: 123
	})
	
	const res = createMockResponse()
	
	await createConversation(req, res)
	
	// Should not respond since participants array is empty
	assertEquals(false, res.writableEnded, "Should not respond when participant_user_ids is empty")
}

async function testCreateConversationNonArrayParticipants() {
	const req = createMockRequest({
		participant_user_ids: "not-an-array" // Wrong type
	}, {
		user_id: 123
	})
	
	const res = createMockResponse()
	
	await createConversation(req, res)
	
	// Should not respond since participants is not an array
	assertEquals(false, res.writableEnded, "Should not respond when participant_user_ids is not an array")
}

async function testCreateConversationNoSession() {
	const req = createMockRequest({
		participant_user_ids: [456]
	}, {
		// No user_id in session
	})
	
	const res = createMockResponse()
	
	await createConversation(req, res)
	
	// Should not respond since no user session
	assertEquals(false, res.writableEnded, "Should not respond when no user session")
}

async function testCreateConversationSelfOnly() {
	const req = createMockRequest({
		participant_user_ids: [123] // Only current user
	}, {
		user_id: 123
	})
	
	// Mock participants existence check
	req.client.addQueryMock(
		(sql) => sql.includes('FROM users') && sql.includes('WHERE user_id = ANY'),
		{ rows: [{ user_id: 123 }] }
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
		{ rows: [{ conversation_id: 999 }] }
	)
	
	const res = createMockResponse()
	
	await createConversation(req, res)
	
	const responseData = JSON.parse(res.getResponseData())
	assertEquals(true, responseData.success, "Should succeed creating conversation with self only")
	assertEquals(999, responseData.conversation_id, "Should return conversation_id")
}

async function testCreateConversationDuplicateParticipants() {
	const req = createMockRequest({
		participant_user_ids: [456, 456, 456] // Duplicates that should be deduplicated
	}, {
		user_id: 123
	})
	
	// Mock participants existence check (should only need to check unique IDs)
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
		{ rows: [{ conversation_id: 888 }] }
	)
	
	const res = createMockResponse()
	
	await createConversation(req, res)
	
	const responseData = JSON.parse(res.getResponseData())
	assertEquals(true, responseData.success, "Should succeed with duplicate participants (deduplicated)")
	assertEquals(888, responseData.conversation_id, "Should return conversation_id")
}

async function testCreateConversationMixedBlockedUsers() {
	const req = createMockRequest({
		participant_user_ids: [456, 789] // One blocked, one not
	}, {
		user_id: 123
	})
	
	// Mock participants existence check
	req.client.addQueryMock(
		(sql) => sql.includes('FROM users') && sql.includes('WHERE user_id = ANY'),
		{ rows: [{ user_id: 123 }, { user_id: 456 }, { user_id: 789 }] }
	)
	
	// Mock blocked user check - one user is blocked
	req.client.addQueryMock(
		(sql) => sql.includes('FROM blocked_users'),
		{ rows: [{ user_id_blocked: 456 }] }
	)
	
	const res = createMockResponse()
	
	await createConversation(req, res)
	
	const responseData = JSON.parse(res.getResponseData())
	assertEquals("Cannot create conversation with blocked user", responseData.error, "Should return blocked error even if only one user is blocked")
}

async function testCreateConversationInvalidUserIds() {
	const req = createMockRequest({
		participant_user_ids: [456, 999] // 999 doesn't exist
	}, {
		user_id: 123
	})
	
	// Mock participants existence check - missing one user
	req.client.addQueryMock(
		(sql) => sql.includes('FROM users') && sql.includes('WHERE user_id = ANY'),
		{ rows: [{ user_id: 123 }, { user_id: 456 }] } // Missing user 999
	)
	
	const res = createMockResponse()
	
	await createConversation(req, res)
	
	const responseData = JSON.parse(res.getResponseData())
	assertEquals("One or more participants not found", responseData.error, "Should return not found error")
}

async function testCreateConversationCurrentUserBlocked() {
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
	
	// Mock blocked user check - current user is blocked by other user
	req.client.addQueryMock(
		(sql) => sql.includes('FROM blocked_users'),
		{ rows: [{ user_id_blocked: 123 }] }
	)
	
	const res = createMockResponse()
	
	await createConversation(req, res)
	
	const responseData = JSON.parse(res.getResponseData())
	assertEquals("Cannot create conversation with blocked user", responseData.error, "Should return blocked error when current user is blocked")
}

async function testCreateConversationLargeGroup() {
	const req = createMockRequest({
		participant_user_ids: [456, 789, 101, 102, 103] // Large group conversation
	}, {
		user_id: 123
	})
	
	// Mock participants existence check
	req.client.addQueryMock(
		(sql) => sql.includes('FROM users') && sql.includes('WHERE user_id = ANY'),
		{ rows: [
			{ user_id: 123 }, 
			{ user_id: 456 }, 
			{ user_id: 789 }, 
			{ user_id: 101 }, 
			{ user_id: 102 }, 
			{ user_id: 103 }
		] }
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
		{ rows: [{ conversation_id: 777 }] }
	)
	
	const res = createMockResponse()
	
	await createConversation(req, res)
	
	const responseData = JSON.parse(res.getResponseData())
	assertEquals(true, responseData.success, "Should succeed creating large group conversation")
	assertEquals(777, responseData.conversation_id, "Should return conversation_id")
}

runTests("createConversationEdgeCases.unit.test.js", [
	testCreateConversationMissingParticipants,
	testCreateConversationEmptyParticipants,
	testCreateConversationNonArrayParticipants,
	testCreateConversationNoSession,
	testCreateConversationSelfOnly,
	testCreateConversationDuplicateParticipants,
	testCreateConversationMixedBlockedUsers,
	testCreateConversationInvalidUserIds,
	testCreateConversationCurrentUserBlocked,
	testCreateConversationLargeGroup
])