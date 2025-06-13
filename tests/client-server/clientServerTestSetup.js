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

	// Default database mocks are abstracted as they are quite a few lines of specific code
	/*
		NOTE TO CLAUDE:
			If you want to override one of these defaults, for example to not have a logged in session:

		// Override default logged in session
		setupIntegrationTestEnvironment({
			sessionValidation: (sql, params) => {
				if (sql.includes("SELECT") && sql.includes("sessions.session_uuid") && sql.includes("users.display_name")) {
					return { 
						rows: [{ 
							session_uuid: "foo-bar",
							session_id: "1", 
							email: "",
							display_name: "",
							admin: false,
							user_id: "0",
							profile_picture_uuid: null,
							slug: "",
							subscribed_to_users: "0"
						}] 
					}
				}
			}
		})
	*/
	options.databaseMocks = setupDefaultDatabaseMocks(options.databaseMocks)

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
				
				// Do we want to notify and throw errors for no handler registered?
				// console.error("No async fetch handler for:", url, fetchOptions?.body)
				// return {
				// 	status: 500,
				// 	json: async () => ({ error: "No handler registered" })
				// }
				// Or simply return a good default?
				const { req, res } = window.createMockReqRes(fetchOptions.body, fetchOptions.headers)
				const response = await window.executeHandler(req, res)
				return {
					status: 200,
					json: async () => response
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
									console.warn("UNMOCKED database query:", sql.substring(0, 200) + "...")
									console.warn("Query params:", params)
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

			// Default to user being logged in, agreed to terms, and last visited /posts
			window.localStorage.setItem("trucev1:session_uuid", "test-session-uuid-123")
			window.localStorage.setItem("trucev1:agreed", true)
			window.localStorage.setItem("trucev1:last_root_path", "/posts")
			
			// Allow an options "beforeParse()" handler to be executed
			/*
				NOTE TO CLAUDE:
					If you need to override localStorage defaults, for example to simulate not logged-in user:
					(one that will be required to click "Join" first)

				const window = await setupIntegrationTestEnvironment({
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
			window.setupExternalMocks()
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

function setupDefaultDatabaseMocks(databaseMocks) {
	return {
		...{
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
				// Regular posts queries (not single post)
				if (sql.includes("SELECT") && sql.includes("p.create_date") && sql.includes("p.post_id") && !sql.includes("p.slug = $2")) {
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
								edit: true,
								slug: "my-post"
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
								edit: false,
								slug: "other-users-post"
							}
						] 
					}
				}
			},
			topics: (sql, params) => {
				/*
					NOTE TO CLAUDE:
						I am leaving this large comment block here, as guidance to you for
						how to go about mocking new queries.
						
						(1) Find the query that you are working with in the server handler
						(2) Find the table schemas in schema.js for each table involved

					-- Table Schemas from schema.js
					CREATE TABLE IF NOT EXISTS post_topics (
					post_id INT NOT NULL,
					topic_id INT NOT NULL
					)
					CREATE TABLE IF NOT EXISTS topics (
					topic_id INT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
					topic_name VARCHAR(10) NOT NULL UNIQUE,
					subtitle VARCHAR(50) NOT NULL
					)

					-- The query we are working with from getTopics.js
					SELECT
						ts.topic_name,
						ts.subtitle,
						COUNT(tt.topic_id) AS posts
					FROM
						topics ts
						LEFT JOIN post_topics tt ON ts.topic_id = tt.topic_id
					GROUP BY
						ts.topic_id,
						ts.topic_name,
						ts.subtitle
					ORDER BY ts.topic_id ASC
				*/
				if (sql.includes("SELECT") && sql.includes("topics ts") && sql.includes("COUNT(tt.topic_id) AS posts")) {
					return { 
						rows: [
							{ topic_name: "religion", subtitle: "Discussions about religion", posts: 2 },
							{ topic_name: "media", subtitle: "Media discussions", posts: 2 }
						] 
					}
				}
			},
			activities: (sql, params) => {
				// The query is for favorites page - combines posts and replies that were favorited
				if (sql.includes("WITH combined AS") && sql.includes("combined.favorited = TRUE")) {
					return { 
						rows: [
							// A favorited post
							{
								id: 2,
								create_date: "2024-01-01T01:00:00.000Z",
								title: "Other User's Post",
								body: "This is someone else's post",
								poll_1: null,
								poll_2: null,
								poll_3: null,
								poll_4: null,
								poll_counts: null,
								poll_counts_estimated: null,
								note: null,
								slug: "other-users-post",
								favorite_count: 5,
								reply_count: 3,
								counts_max_create_date: "2024-01-01T01:00:00.000Z",
								type: "post",
								edit: false,
								image_uuids: null,
								favorited: true,
								replyed: false,
								voted: false,
								favorite_create_date: "2024-01-03T00:00:00.000Z",
								user_id: 2,
								display_name: "Other User",
								display_name_index: "other-user",
								user_slug: "other-user",
								profile_picture_uuid: null,
								user_verified: true,
								parent_post_title: null,
								parent_post_slug: null,
								parent_reply_id: null,
								parent_reply_body: null,
								parent_reply_note: null,
								parent_reply_display_name: null,
								parent_reply_display_name_index: null,
								parent_reply_user_slug: null,
								parent_reply_profile_picture_uuid: null,
								parent_reply_favorited: false,
								topics: "religion,media"
							},
							// A favorited reply
							{
								id: 10,
								create_date: "2024-01-02T00:00:00.000Z",
								title: null,
								body: "Great point!",
								poll_1: null,
								poll_2: null,
								poll_3: null,
								poll_4: null,
								poll_counts: null,
								poll_counts_estimated: null,
								note: null,
								slug: null,
								favorite_count: 2,
								reply_count: null,
								counts_max_create_date: "2024-01-02T00:00:00.000Z",
								type: "reply",
								edit: false,
								image_uuids: null,
								favorited: true,
								replyed: false,
								voted: false,
								favorite_create_date: "2024-01-04T00:00:00.000Z",
								user_id: 3,
								display_name: "Reply User",
								display_name_index: "reply-user",
								user_slug: "reply-user",
								profile_picture_uuid: null,
								user_verified: true,
								parent_post_title: "My Post",
								parent_post_slug: "my-post",
								parent_reply_id: null,
								parent_reply_body: null,
								parent_reply_note: null,
								parent_reply_display_name: null,
								parent_reply_display_name_index: null,
								parent_reply_user_slug: null,
								parent_reply_profile_picture_uuid: null,
								parent_reply_favorited: false,
								topics: ""
							}
						] 
					}
				}
			},
			singlePost: (sql, params) => {
				// Single post query from getSinglePost.js
				if (sql.includes("SELECT") && sql.includes("p.post_id as post_id") && sql.includes("p.slug = $2")) {
					return {
						rows: [
							{
								create_date: "2024-01-02T00:00:00.000Z",
								post_id: 1,
								title: "My Post",
								user_id: 1,
								display_name: "Test User",
								display_name_index: "test-user",
								user_slug: "test-user",
								profile_picture_uuid: null,
								user_verified: true,
								slug: "my-post",
								body: "This is my own post with full content",
								poll_1: null,
								poll_2: null,
								poll_3: null,
								poll_4: null,
								poll_counts: null,
								poll_counts_estimated: null,
								note: null,
								favorite_count: 2,
								reply_count: 2,
								counts_max_create_date: "2024-01-02T12:00:00.000Z",
								edit: true,
								image_uuids: null,
								favorited: false,
								replyed: false,
								voted: false,
								topics: "religion,media"
							}
						]
					}
				}
				
				// Post ID lookup query
				if (sql.includes("SELECT p.post_id as post_id") && sql.includes("WHERE p.slug = $2")) {
					return {
						rows: [{ post_id: 1 }]
					}
				}
				
				// Root replies query
				if (sql.includes("SELECT") && sql.includes("r.reply_id as reply_id") && sql.includes("r.parent_reply_id IS NULL")) {
					return {
						rows: [
							{
								create_date: "2024-01-02T01:00:00.000Z",
								reply_id: 101,
								body: "First reply to the post",
								note: null,
								parent_reply_id: null,
								favorite_count: 1,
								counts_max_create_date: "2024-01-02T01:00:00.000Z",
								user_id: 2,
								display_name: "Other User",
								display_name_index: "other-user",
								user_slug: "other-user",
								profile_picture_uuid: null,
								user_verified: true,
								edit: false,
								image_uuids: null,
								favorited: false
							}
						]
					}
				}
				
				// Reply replies query 
				if (sql.includes("SELECT") && sql.includes("r.reply_id as reply_id") && sql.includes("reply_ancestors")) {
					return {
						rows: [
							{
								create_date: "2024-01-02T02:00:00.000Z",
								reply_id: 102,
								body: "Reply to the first reply",
								note: null,
								parent_reply_id: 101,
								favorite_count: 0,
								counts_max_create_date: "2024-01-02T02:00:00.000Z",
								user_id: 3,
								display_name: "Reply User",
								display_name_index: "reply-user",
								user_slug: "reply-user",
								profile_picture_uuid: null,
								user_verified: true,
								edit: false,
								image_uuids: null,
								favorited: false
							}
						]
					}
				}
			}
		},
		...databaseMocks, // Allow user to override or add more mocks
	}
}

module.exports = { setupIntegrationTestEnvironment }