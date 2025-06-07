const fs = require("fs")
const path = require("path")
const { JSDOM, VirtualConsole } = require("jsdom")

function setupIntegrationTestEnvironment(options) {
	// Default Options
	options = options || {}
	options.constsToExpose = options.constsToExpose || []
	options.constsToExpose = [...options.constsToExpose, "state", "$"]

	// Index path and content
	const indexPath = path.resolve(__dirname, "../../../index.html")
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

	// Pre-process HTML to uncomment JS includes
	// Removes leading "// " from lines containing "<!--#include file="client/...js" -->"
	let processedIndexHtmlContent = indexHtmlContent
		.split("\n")
		.map((line) => {
			if (
				line.trim().startsWith("//") &&
				line.includes("<!--#include") &&
				line.includes('.js"')
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

	// --------------------------------------------------------------------------
	// Setup JSDOM
	// --------------------------------------------------------------------------
	//
	// Forward the console logs
	const virtualConsole = new VirtualConsole()
	virtualConsole.sendTo(console)
	//
	// Load the index.html content
	const dom = new JSDOM(finalIndexHtmlContent, {
		runScripts: "dangerously", // Allow scripts added to the DOM to run
		url: "http://localhost", // Necessary for some scripts that might use location/history
		pretendToBeVisual: true, // Helps with some DOM manipulations if needed
		includeNodeLocations: true,
		virtualConsole: virtualConsole,
		beforeParse(window) {
			let mockFetchResponseForPaths = {}

			window.setMockFetchResponseForPaths = (newFetchResponsesForPaths) => {
				mockFetchResponseForPaths = {
					...mockFetchResponseForPaths,
					...newFetchResponsesForPaths,
				}
			}

			// Mock scrollIntoView
			window.HTMLElement.prototype.scrollIntoView = () => {}

			// Mock WebSocket to prevent JSDOM errors and allow state.ws.send to be called
			window.WebSocket = function (url) {
				this.url = url;
				this.isMockWebSocket = true; // Identify mock
				this.send = function (data) {
					// console.log(`Mock WebSocket sent: ${data}`);
				};
				this.close = function () {
					// console.log("Mock WebSocket closed");
				};
				this.messageCallback = null;
				this.addEventListener = function (event, callback) {
					if (event === "message") {
						this.messageCallback = callback;
					}
					// Add stubs for other events if necessary, e.g., open, close, error
					if (event === "open" && this.onopen) {
						this.onopen();
					}
					if (event === "close" && this.onclose) {
						this.onclose();
					}
				};
				this.triggerMessage = function (data) {
					if (this.messageCallback) {
						// Simulate a MessageEvent object
						this.messageCallback({ data: data });
					} else {
						// console.log("Mock WebSocket: No message callback registered to trigger.");
					}
				};
				// Helper to simulate 'open' event if client code expects it
				// and if addEventListener isn't used for open
				this.simulateOpen = function() {
					if (this.onopen) {
						this.onopen();
					}
				};
			}

			// Mock setTimeout to be instant, to avoid delays
			window.setTimeout = (fn) => {
				fn()
			}

			// Mock matchMedia
			window.matchMedia = function (query) {
				return {
					matches: false,
				}
			}

			// Mock fetch
			window.fetch = async function (url, fetchOptions) {
				const body = fetchOptions?.body ? JSON.parse(fetchOptions.body) : null;

				if (url === "/session") {
					console.log("FETCH MOCK: /session call. Body:", JSON.stringify(body));
					console.log("FETCH MOCK: mockFetchResponseForPaths['/session'] exists?", Boolean(mockFetchResponseForPaths["/session"]));
					if (body) {
						console.log("FETCH MOCK: body.min_create_date undefined?", body.min_create_date === undefined);
						console.log("FETCH MOCK: body.min_counts_create_date undefined?", body.min_counts_create_date === undefined);
					}

					// Prioritize mockFetchResponseForPaths["/session"] if it looks like a getMoreRecent call
					if (mockFetchResponseForPaths["/session"] && (body?.min_create_date !== undefined || body?.min_counts_create_date !== undefined)) {
						console.log("FETCH MOCK (Hybrid): getMoreRecent-like call, serving data from mockFetchResponseForPaths['/session']");
						return Promise.resolve({ status: 200, json: async () => mockFetchResponseForPaths["/session"] });
					}

					// Fallback for general /session calls
					if (body && body.path && mockFetchResponseForPaths[body.path]) {
						console.log(`FETCH MOCK (Hybrid): /session call for body.path ${body.path}, serving data from mockFetchResponseForPaths['${body.path}']`);
						return Promise.resolve({ status: 200, json: async () => mockFetchResponseForPaths[body.path] });
					}

					// If the above specific /session conditions don't match, but a general "/session" mock exists, use it.
					if (mockFetchResponseForPaths["/session"]) {
						console.log("FETCH MOCK (Hybrid): Fallback /session call, serving data from mockFetchResponseForPaths['/session']");
						return Promise.resolve({ status: 200, json: async () => mockFetchResponseForPaths["/session"] });
					}

				} else { // For non-/session URLs like "/topics", "/" (direct navigation or initial load not via /session)
					const pathData = mockFetchResponseForPaths[url];
					if (pathData) {
						// console.log(`FETCH MOCK (Hybrid): Direct URL match for ${url}, serving data`);
						return Promise.resolve({ status: 200, json: async () => pathData });
					}
				}

				console.error(`FETCH MOCK (Hybrid): Unmocked fetch for URL: ${url}`, fetchOptions ? `with options: ${JSON.stringify(fetchOptions)}` : "");
				return Promise.resolve({
					status: 500,
					json: async () => ({
						success: false,
						error: `Test error: Unmocked fetch for URL: ${url}`,
					}),
				});
			};
		},
	})
	// --------------------------------------------------------------------------
	// END setup JSDOM
	// --------------------------------------------------------------------------

	const { window } = dom

	return window
}

module.exports = { setupIntegrationTestEnvironment }
