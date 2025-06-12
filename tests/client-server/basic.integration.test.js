const path = require("path")
const {
	setupIntegrationTestEnvironment,
} = require("./clientServerTestSetup.js")
const { assertEquals, runTests } = require("../client/shared/testUtils.js")

const tests = {
	testClientServerFlow: async () => {
		const window = await setupIntegrationTestEnvironment({
			beforeParse(window){
				window.localStorage.setItem("trucev1:session_uuid", "test-session-uuid-123")
				
				// Set up external mocks before any scripts run
				window.setupExternalMocks()
				
				// Register async fetch handlers for early requests to prevent failures
				window.mockAsyncFetch("/session", '{"path":"/"}', async (fetchOptions) => {
					const { req, res } = window.createMockReqRes(fetchOptions.body, fetchOptions.headers)
					return await window.executeHandler(req, res)
				})
				
				window.mockAsyncFetch("/session", '{"path":"/unread_count_unseen_count"}', async (fetchOptions) => {
					const { req, res } = window.createMockReqRes(fetchOptions.body, fetchOptions.headers)
					return await window.executeHandler(req, res)
				})
				
			},
			databaseMocks: {
				sessionValidation: (sql, params) => {
					if (sql.includes("SELECT") && sql.includes("sessions.session_uuid") && sql.includes("users.display_name")) {
						if (params && params[0] === "test-session-uuid-123") {
							return { 
								rows: [{ 
									session_uuid: "test-session-uuid-123",
									session_id: 1, 
									email: "test@example.com",
									display_name: "Test User",
									admin: false,
									user_id: 1,
									profile_picture_uuid: null,
									slug: "test-user",
									subscribed_to_users: "0"
								}] 
							}
						}
					}
				},
				notifications: (sql, params) => {
					if (sql.includes("WITH combined_notifications") || sql.includes("unseen_count")) {
						return { 
							rows: [{ 
								unseen_count: 0,
								unread_count: 0
							}] 
						}
					}
				},
				posts: (sql, params) => {
					if (sql.includes("SELECT") && sql.includes("p.create_date") && sql.includes("p.post_id")) {
						return { 
							rows: [
								{
									post_id: 1,
									title: "Test Post",
									content: "This is a test post",
									create_date: "2024-01-01T00:00:00.000Z",
									user_id: 1,
									reply_count: 0,
									favorite_count: 0
								}
							] 
						}
					}
				}
			}
		})
		const { state, $ } = window
		
		console.log("Testing client-server flow")
		
		const $join_button = $(`a[href="/posts"][big]`)
		const fetchPromise = window.mockAsyncFetch("/session", '{"path":"/posts"}', async (fetchOptions) => {
			const { req, res } = window.createMockReqRes(fetchOptions.body, fetchOptions.headers)
			return await window.executeHandler(req, res)
		})
		
		$join_button.click()
		await fetchPromise
		await new Promise(resolve => setTimeout(resolve, 0))
		
		assertEquals("Test User", state.display_name, "State should have display_name from server")
		assertEquals(1, state.user_id, "State should have user_id as integer")
	},
}

runTests(path.basename(__filename), Object.values(tests))