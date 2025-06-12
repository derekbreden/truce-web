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
				window.localStorage.setItem("trucev1:agreed", true)
				window.localStorage.setItem("trucev1:last_root_path", "/posts")
				
				// Set up external mocks before any scripts run
				window.setupExternalMocks()
				
				// Register async fetch handlers for early requests to prevent failures
				window.mockAsyncFetch("/session", '{"path":"/"}')
				window.mockAsyncFetch("/session", '{"path":"/unread_count_unseen_count"}')
				window.mockAsyncFetch("/session", '{"path":"/posts"}')
				
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
									title: "My Post",
									body: "This is my own post",
									create_date: "2024-01-02T00:00:00.000Z",
									user_id: 1, // Same as our logged-in user
									reply_count: 0,
									favorite_count: 0,
									topics: "religion,media",
									edit: true
								},
								{
									post_id: 2,
									title: "Other User's Post", 
									body: "This is someone else's post",
									create_date: "2024-01-01T01:00:00.000Z",
									user_id: 2, // Different user
									reply_count: 0,
									favorite_count: 0,
									topics: "religion,media",
									edit: false
								}
							] 
						}
					}
				}
			}
		})
		const { $ } = window
		
		$("main-content-2 posts post:first-child icon[more]").click()
		assertEquals(false, Boolean($("modal action[block]")), "Own post should not show block action")
		$("modal-bg").click()
		$("main-content-2 posts post:nth-child(2) icon[more]").click()
		assertEquals(true, Boolean($("modal action[block]")), "Other user's post should show block action")

		// Proof things happen instantly and no setTimeout is needed
		assertEquals(true, Boolean($("modal-bg")), "Modal is shown")
		$("modal-bg").click()
		assertEquals(false, Boolean($("modal-bg")), "Modal is closed")
	},
}

runTests(path.basename(__filename), Object.values(tests))