const fs = require("fs")
const path = require("path")
const { JSDOM, VirtualConsole } = require("jsdom")

const setupTestEnvironment = async (options) => {
	// Default Options
	options = options || {}
	options.constsToExpose = options.constsToExpose || []
	options.constsToExpose = [...options.constsToExpose, "state", "$"]
	options.localStorage = options.localStorage || {}
	options.setup_id = options.setup_id || require("crypto").randomUUID()
	
	// Initialize SQLite test database first
	const { createTestDatabase } = require("./testSqliteSetup.js")
	await createTestDatabase()

	// Index path and content
	const indexPath = path.resolve(__dirname, "../index.html")
	const indexHtmlContent = fs.readFileSync(indexPath, "utf8")



	const parseIncludes = (fromHtmlContent) => {
		let returningHtmlContent = fromHtmlContent
		// Regex to find <!--#include file="..." --> directives
		const includeDirectiveRegex = /<!--#include\s+file="([^"]+)"\s*-->/g
		let match

		// Keep replacing until no more include directives are found
		// This handles nested includes by repeatedly applying the regex
		while (
			(match = includeDirectiveRegex.exec(returningHtmlContent)) !== null
		) {
			const directive = match[0] // The full directive, e.g., <!--#include file="path/to/file.html" -->
			const relativeFilePath = match[1] // The path from the directive, e.g., "path/to/file.html"

			// Resolve the script path relative to the directory of the indexHtmlFile
			const indexDir = path.dirname(indexPath)
			const absoluteFilePath = path.resolve(indexDir, relativeFilePath) // Use path.resolve for robustness

			try {
				const fileContent = fs.readFileSync(absoluteFilePath, "utf8")
				returningHtmlContent = returningHtmlContent.replace(
					directive,
					fileContent,
				)
			} catch (error) {
				console.error(
					`Error including file "${absoluteFilePath}": ${error.message}`,
				)
				// Optionally, replace with an error message or leave the directive,
				// depending on desired error handling. For now, it will effectively remove the directive if file not found.
				// returningHtmlContent = returningHtmlContent.replace(directive, `<!-- Error including ${relativeFilePath} -->`)
			}
		}
		return returningHtmlContent
	}

	// Pre-process HTML to unreply JS includes
	// Removes leading "// " from lines containing "<!--#include file="client/...js" -->"
	let processedIndexHtmlContent = indexHtmlContent
		.split("\n")
		.map((line) => {
			if (
				line.trim().startsWith("//")
				&& line.includes("<!--#include")
				&& line.includes(".js\"")
			) {
				return line.replace("//", "")
			}
			return line
		})
		.join("\n")

	// Parse includes. Iterative to handle nested includes.
	let finalIndexHtmlContent = processedIndexHtmlContent
	let previousHtmlContent
	do {
		previousHtmlContent = finalIndexHtmlContent
		finalIndexHtmlContent = parseIncludes(finalIndexHtmlContent)
	} while (finalIndexHtmlContent !== previousHtmlContent)

	// Expose consts to window
	options.constsToExpose.forEach((constToExpose) => {
		finalIndexHtmlContent = finalIndexHtmlContent.replace(
			`const ${constToExpose} = `,
			`window.${constToExpose} = `,
		)
	})

	// Setup virtual console
	const virtualConsole = new VirtualConsole()
	virtualConsole.on("error", (error) => {
		console.error(error)
	})
	virtualConsole.on("warn", (warn, warn2, warn3) => {
		console.warn(warn, warn2 || "", warn3 || "")
	})
	// Load the index.html content
	const dom = new JSDOM(finalIndexHtmlContent, {
		runScripts: "dangerously", // Allow scripts added to the DOM to run
		url: "http://localhost", // Necessary for some scripts that might use location/history
		pretendToBeVisual: true, // Helps with some DOM manipulations if needed
		includeNodeLocations: true,
		virtualConsole: virtualConsole,
		async beforeParse(window) {
			
			// Mock fetch
			const mockFetchImplementation = async (url, fetchOptions) => {
				const { req, res } = window.createMockReqRes(fetchOptions.body, fetchOptions.headers)
				const response = await window.executeHandler(req, res)
				return {
					status: 200,
					json: async () => response
				}
			}
			
			// Replace fetch directly - client code will wrap this
			window.fetch = mockFetchImplementation
			
			// Utility functions for testing
			window.setupExternalMocks = async function() {

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
				
				// Mock ws module (WebSocketServer)
				const wsPath = require.resolve("ws")
				const setup_id = options.setup_id
				
				global.current_setup_id = setup_id
				require.cache[wsPath] = {
					exports: {
						WebSocketServer: class MockWebSocketServer {
							constructor(options) {}
							on(event, handler) {
								if (event === "connection") {
									global._ws_connection_handlers = global._ws_connection_handlers || {}
									global._ws_connection_handlers[global.current_setup_id] = handler
								}
							}
						}
					},
					loaded: true,
					id: wsPath
				}
				
				// Mock AI module
				const aiPath = require.resolve("../server/ai")
				require.cache[aiPath] = {
					exports: {
						ask: async (messages, type, format) => {
							// Return appropriate mock responses
							if (type === "topics") {
								return JSON.stringify({ topics: ["religion", "media"] })
							}
							if (type === "poll_estimate") {
								return JSON.stringify({ 
									response_rate: 0.1,
									choice_a: 0.6,
									choice_b: 0.4,
									choice_c: 0,
									choice_d: 0
								})
							}
							return JSON.stringify({ keyword: "OK", note: "" })
						}
					},
					loaded: true,
					id: aiPath
				}
				
				// Mock S3 client dependencies
				const s3Path = require.resolve("@aws-sdk/client-s3")
				require.cache[s3Path] = {
					exports: {
						S3Client: class MockS3Client {
							constructor() {}
							async send() { return { success: true } }
						},
						PutObjectCommand: class MockPutObjectCommand {
							constructor() {}
						},
						DeleteObjectCommand: class MockDeleteObjectCommand {
							constructor() {}
						}
					},
					loaded: true,
					id: s3Path
				}
				
				// Use SQLite instead of mocks (already initialized)
				const { executeQuery } = require("./testSqliteSetup.js")
				
				// Mock the pool module to use SQLite
				const poolPath = require.resolve("../server/pool")
				require.cache[poolPath] = {
					exports: {
						pool: {
							connect: async () => ({
								query: async (sql, params) => {
									return await executeQuery(sql, params)
								},
								release: () => {
									// Silent release
								}
							})
						}
					},
					loaded: true,
					id: poolPath
				}

				// Execute any statements passed in
				const sql_statements_to_execute = options.sql_statements_to_execute || []
				if (sql_statements_to_execute && sql_statements_to_execute.length > 0) {
					// Execute provided SQL statements
					for (const [sql, params] of sql_statements_to_execute) {
						await executeQuery(sql, params)
					}
				}
				
				// Initialize server WebSocket module  
				const websocketModule = require("../server/websocket.js")
				websocketModule.init({ on: () => {} })
			}
			
			window.createMockReqRes = function(body, headers) {
				const websocketModule = require("../server/websocket.js")
				const req = {
					headers: headers || {},
					body: body,
					sendWsMessage: (message, post_id) => websocketModule.sendMessage(message, post_id),
					sendWsMessageToConversation: (message, conversation_id) => websocketModule.sendMessageToConversation(message, conversation_id),
					sendWsMessageToUsers: (message, user_ids) => websocketModule.sendMessageToUsers(message, user_ids)
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
						// Silent header setting
					},
					end: function(data) {
						this.responseData = data
						this.ended = true
						this.writableEnded = true
						// Silent response
					}
				}
				return { req, res }
			}
			
			window.executeHandler = async function(req, res) {
				const handleSession = require("../server/handleSession.js")
				await handleSession(req, res)
				return JSON.parse(res.responseData)
			}
			
			// Keep essential mocks
			window.HTMLElement.prototype.scrollIntoView = () => {}
			window.sessionStorage = {
				getItem: () => null,
				setItem: () => {},
				removeItem: () => {}
			}
			// Store setup identifier for client logging
			window._setup_id = options.setup_id
			
			window.WebSocket = class {
				constructor(url) { 
					this.readyState = 1
					this._handlers = {}
					
					// Simulate connection opening
					setTimeout(() => {
						if (this._handlers.open) {
							this._handlers.open()
						}
					}, 0)
				}
				send(data) {
					const client_ws = this
					if (global._ws_connection_handlers[window._setup_id]) {
						if (!global._ws_connection_handlers[window._setup_id].mock_ws) {
							const mock_ws = {
								_handlers: {},
								readyState: 1,
								client_ws: client_ws, // Store reference to client websocket
								on(event, handler) {
									if (event === "message") {
										this._handlers.message = handler
									}
								},
								send(message) {
									this.client_ws._handlers.message({
										data: message
									})
								}
							}
							global._ws_connection_handlers[window._setup_id](mock_ws)
							global._ws_connection_handlers[window._setup_id].mock_ws = mock_ws
						}
						global._ws_connection_handlers[window._setup_id].mock_ws._handlers.message({
							toString(){ return data }
						})
					} else {
						console.error("No global _ws_connection_handlers for setup_id:", window._setup_id)
					}
				}
				close() {}
				addEventListener(event, handler) {
					if (!this._messageHandlers) {
						this._messageHandlers = []
					}
					if (event === "message") {
						this._messageHandlers.push(handler)
					}
					this._handlers[event] = handler
				}
			}

			window.matchMedia = () => ({ matches: false })
			window.originalSetTimeout = window.setTimeout
			window.setTimeout = (fn) => {
				// Special case with banners to leave them for a moment only
				if (fn.toString().includes(`$("alert-wrapper")?.remove()`)) {
					window.originalSetTimeout(fn, 0)

				// Otherwise we call the setTimeout instantly
				} else {
					fn()
				}
			}

			// Default to user being logged in, agreed to terms, and last visited /posts
			window.localStorage.setItem("trucev1:session_uuid", "user-a-session-123")
			window.localStorage.setItem("trucev1:agreed", true)
			window.localStorage.setItem("trucev1:last_root_path", "/posts")
			
			// Allow an options "beforeParse()" handler to be executed
			/*
				NOTE TO CLAUDE:
					If you need to override localStorage defaults, for example to simulate not logged-in user:
					(one that will be required to click "Join" first)

				const window = await setupTestEnvironment({
					beforeParse(window){
						window.localStorage.removeItem("trucev1:session_uuid")
						window.localStorage.removeItem("trucev1:agreed")
						window.localStorage.removeItem("trucev1:last_root_path")
					},
				})
			*/
			if (options.beforeParse && typeof options.beforeParse === "function") {
				options.beforeParse(window)
			}

			// Trigger setup external mocks
			await window.setupExternalMocks()
		},
	})
	const { window } = dom
	
	// Wait for DOM content to be loaded and scripts to execute
	await new Promise(resolve => setTimeout(resolve, 0))
	
	// Add state.ws._messageHandlers support
	if (window.state && window.state.ws) {
		// The mock WebSocket already has _messageHandlers from addEventListener calls
		// Just add the triggerMessage method
		window.state.ws.triggerMessage = (message) => {
			const event = { data: message }
			window.state.ws._messageHandlers?.forEach(handler => handler(event))
		}
		
		// Also ensure _handlers.message calls all _messageHandlers
		const originalMessageHandler = window.state.ws._handlers.message
		window.state.ws._handlers.message = function(event) {
			// Call all addEventListener handlers
			window.state.ws._messageHandlers?.forEach(handler => handler(event))
			// Call the original single handler if it exists
			if (originalMessageHandler) {
				originalMessageHandler.call(this, event)
			}
		}
	}
	
	return window
}


module.exports = { setupTestEnvironment }