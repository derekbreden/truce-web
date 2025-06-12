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
				}
			}
		})
		const { state, $ } = window
		
		console.log("Testing client-server flow")
		
		const fetchPromise = window.mockAsyncFetch("/session", '{"path":"/posts"}', async (fetchOptions) => {
			window.setupExternalMocks()
			const { req, res } = window.createMockReqRes(fetchOptions.body, fetchOptions.headers)
			return await window.executeHandler(req, res)
		})
		
		const $join_button = $(`a[href="/posts"][big]`)
		$join_button.click()
		
		await fetchPromise
		await new Promise(resolve => setTimeout(resolve, 0))
		
		assertEquals("Test User", state.display_name, "State should have display_name from server")
		assertEquals(1, state.user_id, "State should have user_id as integer")
	},
}

runTests(path.basename(__filename), Object.values(tests))