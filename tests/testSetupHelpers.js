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
	options.url = options.url || "http://localhost"
	
	// Initialize SQLite test database first
	const { createTestDatabase } = require("./testSqliteSetup.js")
	await createTestDatabase()

	// Index path and content
	const indexPath = path.resolve(__dirname, "../index.html")
	const indexHtmlContent = fs.readFileSync(indexPath, "utf8")



	const parseIncludes = (fromHtmlContent) => {
		// Process line by line like server.js does
		const lines = fromHtmlContent.split("\n")
		const processedLines = []
		
		for (const line of lines) {
			if (line.includes("<!--#include file=\"")) {
				const file = line.split("\"")[1]
				
				// Resolve the script path relative to the directory of the indexHtmlFile
				const indexDir = path.dirname(indexPath)
				const absoluteFilePath = path.resolve(indexDir, file)
			
				const fileContent = fs.readFileSync(absoluteFilePath, "utf8")

				// Extra processing to remove "animation:" and "transition:" from CSS for cleaner screenshots
				if (file.endsWith(".css")) {
					let processed_content = fileContent.replace(/^.*(animation:|transition:).*$/gm, "")
					// Force color scheme: dark if explicitly requested, otherwise light
					if (file.endsWith("root.css")) {
						if (process.env.DARK_MODE === "true") {
							processed_content = `
								:root {
									color-scheme: dark !important;
								}
								app-store-wrapper img[white] {
									display: none !important;
								}
								app-store-wrapper img[black] {
									display: flex !important;
								}
							` + processed_content
						} else {
							processed_content = `
								:root {
									color-scheme: light !important;
								}
								app-store-wrapper img[black] {
									display: none !important;
								}
								app-store-wrapper img[white] {
									display: flex !important;
								}
							` + processed_content
						}
					}
					processedLines.push(processed_content)
				} else {
					processedLines.push(fileContent)
				}
			} else {
				processedLines.push(line)
			}
		}
		
		return processedLines.join("\n")
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
	virtualConsole.on("warn", (...args) => {
		console.warn(...args)
	})
	
	// Load the index.html content
	const dom = new JSDOM(finalIndexHtmlContent, {
		runScripts: "dangerously", // Allow scripts added to the DOM to run
		url: options.url, // Necessary for some scripts that might use location/history
		pretendToBeVisual: true, // Helps with some DOM manipulations if needed
		includeNodeLocations: true,
		virtualConsole: virtualConsole,
		async beforeParse(window) {
			
			// Replace window.Image with Canvas.Image for proper image support in tests
			const Canvas = require("canvas")
			window.Image = Canvas.Image
			
			// Mock fetch
			const mockFetchImplementation = async (url, fetchOptions) => {
				const { req, res } = window.createMockReqRes(fetchOptions.body, fetchOptions.headers, url)
				const response = await window.fetchExecuteHandler(req, res)
				return {
					status: 200,
					json: async () => response
				}
			}
			
			// Replace fetch directly - client code will wrap this
			window.fetch = mockFetchImplementation
			
			// Utility functions for testing
			window.setupExternalMocks = async function() {

				// Mock nodemailer module
				const nodemailerPath = require.resolve("nodemailer")
				global.test_email_sent = null
				require.cache[nodemailerPath] = {
					exports: {
						createTransport: () => ({
							sendMail: (options, callback) => {
								global.test_email_sent = options
								if (callback) callback(null, { messageId: "test-id" })
							}
						})
					},
					loaded: true,
					id: nodemailerPath
				}
				
				// Ensure email module is initialized with mock
				const email = require("../server/email")
				email.init()

				// Mock bcrypt module
				const bcryptPath = require.resolve("bcrypt")
				require.cache[bcryptPath] = {
					exports: {
						hash: async (password, saltRounds) => "mocked_hash_" + password,
						compare: async (password, hash) => hash === "mocked_hash_" + password
					},
					loaded: true,
					id: bcryptPath
				}

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
				global.current_setup_id = setup_id
				require.cache[aiPath] = {
					exports: {
						ask: async (messages, type, format) => {
							// Check for setup-specific AI behavior
							global._ai_responses = global._ai_responses || {}
							const setupResponse = global._ai_responses[global.current_setup_id]
							if (setupResponse) {
								return setupResponse
							}
							
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
				
				// Mock S3 client dependencies with in-memory storage
				const s3Path = require.resolve("@aws-sdk/client-s3")
				global._s3_mock_storage = global._s3_mock_storage || {}
				
				// Define classes globally first
				class MockPutObjectCommand {
					constructor(params) {
						this.Bucket = params.Bucket
						this.Key = params.Key
						this.Body = params.Body
					}
				}
				
				class MockGetObjectCommand {
					constructor(params) {
						this.Bucket = params.Bucket
						this.Key = params.Key
					}
				}
				
				class MockDeleteObjectCommand {
					constructor() {}
				}
				
				require.cache[s3Path] = {
					exports: {
						S3Client: class MockS3Client {
							constructor() {}
							async send(command) { 
								if (command instanceof MockPutObjectCommand) {
									global._s3_mock_storage[command.Key] = command.Body
									return { success: true }
								} else if (command instanceof MockGetObjectCommand) {
									const storedData = global._s3_mock_storage[command.Key]
									if (storedData) {
										return {
											Body: {
												transformToString: async () => storedData
											}
										}
									} else {
										throw new Error(`Key ${command.Key} not found in S3 mock storage`)
									}
								}
								return { success: true }
							}
						},
						PutObjectCommand: MockPutObjectCommand,
						GetObjectCommand: MockGetObjectCommand,
						DeleteObjectCommand: MockDeleteObjectCommand
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
			
			window.createMockReqRes = function(body, headers, url) {
				const websocketModule = require("../server/websocket.js")
				const req = {
					url: url || "",
					path: (url || "").split("/").filter(x => x).join("").split("?")[0], // Match server.js path extraction
					headers: headers || {},
					body: body,
					sendWsMessage: (...args) => websocketModule.sendMessage(...args),
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
			
			// Direct fetch requests to the appropriate server side handler
			window.fetchExecuteHandler = async function(req, res) {
				// Set current setup ID for this execution
				global.current_setup_id = options.setup_id
				
				// Route image requests to handleImage instead of handleSession
				if (req.path.startsWith("image") && req.path.length > 20) {
					const handleImage = require("../server/handleImage.js")
					await handleImage(req, res)
					return res.responseData // Return raw data for images, not JSON
				}
				
				// All other requests go to handleSession
				const handleSession = require("../server/handleSession.js")
				await handleSession(req, res)
				return JSON.parse(res.responseData)
			}

			// Mock scrollIntoView, sessionStorage, and waitForElement
			window.HTMLElement.prototype.scrollIntoView = () => {}
			window.sessionStorage = {
				getItem: () => null,
				setItem: () => {},
				removeItem: () => {}
			}
			window.waitForElement = (selector) => {
				return new Promise((resolve, reject) => {
					const checkElement = () => {
						const element = window.document.querySelector(selector)
						if (element) {
							resolve(element)
						}
					}
					window.originalSetTimeout(checkElement, 0)
				})
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
									this._handlers[event] = handler
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

				// Special case for stop typing timeout
				} else if (fn.toString().includes(`updateTypingIndicatorUI`)) {
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

	// Fetch load img tags from src
	const observer = new window.MutationObserver((mutations) => {
		mutations.forEach((mutation) => {
			if (mutation.type === "childList") {
				mutation.addedNodes.forEach((node) => {
					if (node.tagName === "IMG" || node.querySelector("img")) {
						if (node.tagName === "IMG") {
							node = node
						} else {
							node = node.querySelector("img")
						}
						if (node.src.startsWith("http") && !node.did_fetch) {
							(async () => {
								node.did_fetch = true
								const image_response = await window.fetch(node.getAttribute("src"), { method: "GET" })
								const response_data = await image_response.json()
								node.src = `data:image/png;base64,${response_data}`
								node.dispatchEvent(new window.Event("load", { bubbles: true }))
							})()
						}
					}
				})
			}
		})
	})
	observer.observe(window.document.body, {
		childList: true,
		subtree: true,
	})
	
	// Wait for DOM content to be loaded and scripts to execute
	await new Promise(resolve => setTimeout(resolve, 0))
	
	// Store window globally for visual capture
	global._test_window = global._test_window || []
	global._test_window.push(window)

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
			// The original handler is already included in _messageHandlers, so don't call it again
		}
	}
	
	return window
}


module.exports = { setupTestEnvironment }