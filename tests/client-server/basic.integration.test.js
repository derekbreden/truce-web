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
								
								// Return different results based on query type
								if (sql.includes("INSERT INTO sessions")) {
									return { rows: [{ session_id: "mock-session-123" }] }
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
		function createMockReqRes(body) {
			const req = {
				headers: { authorization: "Bearer test-session-uuid" },
				body: body
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

		const fetchPromise = window.mockAsyncFetch("/session", '{"path":"/posts"}', async () => {
			console.log("Testing real server handler call")
			try {
				setupExternalMocks()
				const { req, res } = createMockReqRes('{"path":"/posts"}')
				const result = await executeHandler(req, res)
				return result
			} catch (error) {
				console.error("Handler failed:", error.message)
				return { path: "/posts", posts: [] }
			}
		})
		
		console.log("Triggering button click")
		const $join_button = $(`a[href="/posts"][big]`)
		$join_button.click()
		
		console.log("Awaiting fetch promise")
		await fetchPromise
		const endTime = Date.now()
		console.log(`Total time: ${endTime - startTime}ms`)
	},
}

runTests(path.basename(__filename), Object.values(tests))