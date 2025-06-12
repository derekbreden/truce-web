const fs = require("fs")
const path = require("path")
const { JSDOM, VirtualConsole } = require("jsdom")

async function setupIntegrationTestEnvironment(options) {
	// Default Options
	options = options || {}
	options.constsToExpose = options.constsToExpose || []
	options.constsToExpose = [...options.constsToExpose, "state", "$"]

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
	virtualConsole.on("error", () => {
		// Swallow errors to prevent them from cluttering test output.
		// Comment this out if you need to debug.
	})
	virtualConsole.on("warn", () => {
		// Swallow warnings to prevent them from cluttering test output.
		// Comment this out if you need to debug.
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
			
			// Mock fetch that uses registered handlers
			window.fetch = async function(url, fetchOptions) {
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
					const response = await handler.asyncHandler()
					
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
			
			// Keep essential mocks
			window.HTMLElement.prototype.scrollIntoView = () => {}
			window.localStorage = {
				getItem: () => null,
				setItem: () => {},
				removeItem: () => {}
			}
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