const { createMockRequest, createMockResponse, assertEquals, runTests } = require("../shared/serverTestSetup.js")
const markMessageAsRead = require("../../../server/session/markMessageAsRead.js")

async function testMarkMessageAsReadSuccess() {
	const req = createMockRequest({
		message_id: 789
	}, {
		user_id: 123
	})
	
	// Mock message notification update
	req.client.addQueryMock(
		"UPDATE message_notifications",
		{ rows: [] }
	)
	
	const res = createMockResponse()
	
	await markMessageAsRead(req, res)
	
	const responseData = JSON.parse(res.getResponseData())
	assertEquals(true, responseData.success, "Should succeed")
}

async function testMarkMessageAsReadMissingMessageId() {
	const req = createMockRequest({
		// missing message_id
	}, {
		user_id: 123
	})
	
	const res = createMockResponse()
	
	await markMessageAsRead(req, res)
	
	// Should not respond since message_id is missing
	assertEquals(null, res.getResponseData(), "Should not respond without message_id")
}

async function testMarkMessageAsReadNoSession() {
	const req = createMockRequest({
		message_id: 789
	}, {
		user_id: null // explicitly no user_id in session
	})
	
	const res = createMockResponse()
	
	await markMessageAsRead(req, res)
	
	// Should not respond since user is not logged in
	assertEquals(null, res.getResponseData(), "Should not respond without user session")
}

runTests("markMessageAsRead.unit.test.js", [
	testMarkMessageAsReadSuccess,
	testMarkMessageAsReadMissingMessageId,
	testMarkMessageAsReadNoSession
])