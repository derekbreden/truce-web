const path = require("path")
const {
	setupIntegrationTestEnvironment,
} = require("./clientServerTestSetup.js")
const { assertEquals, runTests } = require("../client/shared/testUtils.js")

const tests = {
	testRealIndexHtmlLoads: async () => {
		const window = await setupIntegrationTestEnvironment()
		const { state, $ } = window
		// $ and state are exposed to the window from consts by options.constsToExpose by default
		assertEquals("function", typeof $)
		assertEquals("object", typeof state)
		
		// Simple test: one async fetch with controlled delay
		console.log("Testing single async fetch")
		const startTime = Date.now()
		
		// External library mocks
		function setupExternalMocks() {
			// Mock web-push module
			const webpushPath = require.resolve("web-push")
			require.cache[webpushPath] = {
				exports: {
					setVapidDetails: () => {},
					sendNotification: async () => ({ success: true })
				},
				loaded: true,
				id: webpushPath
			}
			
			// Mock the pool module
			const poolPath = require.resolve("../../server/pool")
			require.cache[poolPath] = {
				exports: {
					pool: {
						connect: async () => ({
							query: async (sql, params) => {
								console.log("Mock database query called:", sql.substring(0, 50) + "...")
								console.log("Query params:", params)
								
								// Return different results based on query type
								if (sql.includes("INSERT INTO sessions")) {
									return { rows: [{ session_id: "mock-session-123" }] }
								}
								
								// Handle session validation query from validateSessionUuid.js
								if (sql.includes("SELECT") && sql.includes("sessions.session_uuid") && sql.includes("users.display_name")) {
									// Check if this is for our test session_uuid
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
								
								return { rows: [] }
							},
							release: () => {
								console.log("Mock database connection released")
							}
						})
					}
				},
				loaded: true,
				id: poolPath
			}
		}

		// HTTP request/response objects
		function createMockReqRes(body, headers) {
			const req = {
				headers: headers || {},
				body: body
			}
			// Ensure headers are lowercase (HTTP standard)
			if (req.headers.Authorization) {
				req.headers.authorization = req.headers.Authorization
				delete req.headers.Authorization
			}
			const res = {
				responseData: "",
				ended: false,
				statusCode: 200,
				writableEnded: false,
				setHeader: function(name, value) {
					console.log(`Setting header ${name}: ${value}`)
				},
				end: function(data) {
					this.responseData = data
					this.ended = true
					this.writableEnded = true
					console.log("Response sent:", data.substring(0, 50) + "...")
				}
			}
			return { req, res }
		}

		// Handler execution
		async function executeHandler(req, res) {
			const handleSession = require("../../server/handleSession.js")
			await handleSession(req, res)
			console.log("Handler completed, response ended:", res.ended)
			return { path: "/posts", posts: [] }
		}

		const fetchPromise = window.mockAsyncFetch("/session", '{"path":"/posts"}', async (fetchOptions) => {
			console.log("Testing real server handler call")
			console.log("Client sent body:", fetchOptions.body)
			console.log("Client sent headers:", fetchOptions.headers)
			try {
				setupExternalMocks()
				const { req, res } = createMockReqRes(fetchOptions.body, fetchOptions.headers)  // Use actual client body and headers
				console.log("Mock req.headers:", req.headers)
				const result = await executeHandler(req, res)
				const responseObj = JSON.parse(res.responseData)
				console.log("Server response display_name:", responseObj.display_name)
				console.log("Server response user_id:", responseObj.user_id)
				return JSON.parse(res.responseData)
			} catch (error) {
				console.error("Handler failed:", error.message)
				return { path: "/posts", posts: [] }
			}
		})
		
		console.log("Triggering button click")
		console.log("window.local_storage_key:", window.local_storage_key)
		console.log("localStorage session_uuid:", window.localStorage.getItem("trucev1:session_uuid"))
		console.log("localStorage with dynamic key:", window.localStorage.getItem(`${window.local_storage_key}:session_uuid`))
		console.log("state.session_uuid before click:", window.state.session_uuid)
		const $join_button = $(`a[href="/posts"][big]`)
		$join_button.click()
		
		console.log("Awaiting fetch promise")
		await fetchPromise
		const endTime = Date.now()
		console.log(`Total time: ${endTime - startTime}ms`)
		
		// Give client code time to process the response and update state
		await new Promise(resolve => setTimeout(resolve, 0))
		console.log("Final state.display_name:", window.state.display_name)
		console.log("Final state.user_id:", window.state.user_id)
	},
}

runTests(path.basename(__filename), Object.values(tests))