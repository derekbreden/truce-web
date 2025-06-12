const fs = require("fs")
const path = require("path")
const { JSDOM, VirtualConsole } = require("jsdom")

async function setupIntegrationTestEnvironment(options) {
	// Default Options
	options = options || {}
	options.constsToExpose = options.constsToExpose || []
	options.constsToExpose = [...options.constsToExpose, "state", "$"]
	options.localStorage = options.localStorage || {}
	options.databaseMocks = options.databaseMocks || {}

	// Index path and content
	const indexPath = path.resolve(__dirname, "../../index.html")
	const indexHtmlContent = fs.readFileSync(indexPath, "utf8")



	// --------------------------------------------------------------------------
	// Parse the includes
	// --------------------------------------------------------------------------
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
	// --------------------------------------------------------------------------
	// Finish process includes
	// --------------------------------------------------------------------------

	// --------------------------------------------------------------------------
	// Exponse consts to window
	// --------------------------------------------------------------------------
	options.constsToExpose.forEach((constToExpose) => {
		finalIndexHtmlContent = finalIndexHtmlContent.replace(
			`const ${constToExpose} = `,
			`window.${constToExpose} = `,
		)
	})

	// --------------------------------------------------------------------------
	// Setup virtual console
	// --------------------------------------------------------------------------
	const virtualConsole = new VirtualConsole()
	virtualConsole.on("error", (error) => {
		console.error(error)
	})
	virtualConsole.on("warn", (warn) => {
		console.warn(warn)
	})
	// --------------------------------------------------------------------------
	// END Setup virtual console
	// --------------------------------------------------------------------------
	//
	// Load the index.html content
	const dom = new JSDOM(finalIndexHtmlContent, {
		runScripts: "dangerously", // Allow scripts added to the DOM to run
		url: "http://localhost", // Necessary for some scripts that might use location/history
		pretendToBeVisual: true, // Helps with some DOM manipulations if needed
		includeNodeLocations: true,
		virtualConsole: virtualConsole,
		beforeParse(window) {
			// Clean slate - new API for client-server tests
			
			// Track async fetch handlers
			const asyncFetchHandlers = []
			
			// Register an async handler for a specific fetch
			window.mockAsyncFetch = function(url, bodyPattern, asyncHandler) {
				if (!asyncHandler) {
					asyncHandler = async (fetchOptions) => {
						const { req, res } = window.createMockReqRes(fetchOptions.body, fetchOptions.headers)
						return await window.executeHandler(req, res)
					}
				}
				const promise = new Promise(resolve => {
					asyncFetchHandlers.push({
						url,
						bodyPattern,
						asyncHandler,
						resolve
					})
				})
				return promise
			}
			
			// Mock fetch that supports async handlers
			async function mockFetchImplementation(url, fetchOptions) {
				// Find matching handler
				const handlerIndex = asyncFetchHandlers.findIndex(h => {
					if (h.url !== url) return false
					if (h.bodyPattern && fetchOptions?.body !== h.bodyPattern) return false
					return true
				})
				
				if (handlerIndex !== -1) {
					const handler = asyncFetchHandlers[handlerIndex]
					asyncFetchHandlers.splice(handlerIndex, 1) // Remove after use
					
					// Run the async handler and get response
					const response = await handler.asyncHandler(fetchOptions)
					
					// Resolve the promise returned by mockAsyncFetch
					handler.resolve()
					
					return {
						status: 200,
						json: async () => response
					}
				}
				
				// No handler registered
				console.error("No async fetch handler for:", url, fetchOptions?.body)
				return {
					status: 500,
					json: async () => ({ error: "No handler registered" })
				}
			}
			
			// Replace fetch directly - client code will wrap this
			window.fetch = mockFetchImplementation
			
			// Utility functions for client-server testing
			window.setupExternalMocks = function() {
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
									// Use database mocks from options if provided
									if (options.databaseMocks) {
										for (const mockName in options.databaseMocks) {
											const mockFn = options.databaseMocks[mockName]
											const result = mockFn(sql, params)
											if (result) return result
										}
									}
									
									// Default responses
									if (sql.includes("INSERT INTO sessions")) {
										return { rows: [{ session_id: 1 }] }
									}
									
									// Log unmocked queries
									console.log("UNMOCKED database query:", sql.substring(0, 100) + "...")
									console.log("Query params:", params)
									return { rows: [] }
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
			}
			
			window.createMockReqRes = function(body, headers) {
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
				const handleSession = require("../../server/handleSession.js")
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
			window.WebSocket = class {
				constructor() { this.readyState = 1 }
				send() {}
				close() {}
				addEventListener() {}
			}
			window.matchMedia = () => ({ matches: false })
			window.setTimeout = (fn) => {
				fn()
			}
			
			// Allow an options "beforeParse()" handler to be executed
			if (options.beforeParse && typeof options.beforeParse === "function") {
				options.beforeParse(window)
			}
		},
	})
	// --------------------------------------------------------------------------
	// END setup JSDOM
	// --------------------------------------------------------------------------

	const { window } = dom
	
	
	//
	// Wait for DOM content to be loaded and scripts to execute
	await new Promise(resolve => setTimeout(resolve, 0))
	//
	// Add state.ws._messageHandlers support
	if (window.state && window.state.ws) {
		window.state.ws._messageHandlers = []
		const originalAddEventListener = window.state.ws.addEventListener
		window.state.ws.addEventListener = function(event, handler) {
			if (event === "message") {
				this._messageHandlers.push(handler)
			}
			originalAddEventListener?.call(this, event, handler)
		}
		// Attach trigger to the mock WebSocket
		window.state.ws.triggerMessage = (message) => {
			const event = { data: message }
			window.state.ws._messageHandlers?.forEach(handler => handler(event))
		}
	}
	//
	// Return the window
	return window
}

module.exports = { setupIntegrationTestEnvironment }