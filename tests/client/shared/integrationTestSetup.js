const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

function setupIntegrationTestEnvironment() {
  const indexPath = path.resolve(__dirname, '../../../index.html');
  const indexHtmlContent = fs.readFileSync(indexPath, 'utf8');

  // Parse the includes
  const parseIncludes = (fromHtmlContent) => {
    let returningHtmlContent = fromHtmlContent;
    // Regex to find <!--#include file="..." --> directives
    const includeDirectiveRegex = /<!--#include\s+file="([^"]+)"\s*-->/g;
    let match;

    // Keep replacing until no more include directives are found
    // This handles nested includes by repeatedly applying the regex
    while ((match = includeDirectiveRegex.exec(returningHtmlContent)) !== null) {
      const directive = match[0]; // The full directive, e.g., <!--#include file="path/to/file.html" -->
      const relativeFilePath = match[1]; // The path from the directive, e.g., "path/to/file.html"

      // Resolve the script path relative to the directory of the indexHtmlFile
      const indexDir = path.dirname(indexPath);
      const absoluteFilePath = path.resolve(indexDir, relativeFilePath); // Use path.resolve for robustness

      try {
        const fileContent = fs.readFileSync(absoluteFilePath, "utf8");
        returningHtmlContent = returningHtmlContent.replace(directive, fileContent);
      } catch (error) {
        console.error(`Error including file "${absoluteFilePath}": ${error.message}`);
        // Optionally, replace with an error message or leave the directive,
        // depending on desired error handling. For now, it will effectively remove the directive if file not found.
        // returningHtmlContent = returningHtmlContent.replace(directive, `<!-- Error including ${relativeFilePath} -->`);
      }
    }
    return returningHtmlContent;
  };

  // Pre-process HTML to uncomment JS includes
  // Removes leading "// " from lines containing "<!--#include file="client/...js" -->"
  let processedIndexHtmlContent = indexHtmlContent.split('\n').map(line => {
    if (line.trim().startsWith('//') && line.includes('<!--#include') && line.includes('.js"')) {
      return line.replace('//', '');
    }
    return line;
  }).join('\n');

  // Parse includes. Iterative to handle nested includes.
  let finalIndexHtmlContent = processedIndexHtmlContent;
  let previousHtmlContent;
  do {
    previousHtmlContent = finalIndexHtmlContent;
    finalIndexHtmlContent = parseIncludes(finalIndexHtmlContent);
  } while (finalIndexHtmlContent !== previousHtmlContent);
  // console.warn("Final HTML content loaded into JSDOM:", finalIndexHtmlContent) // DEBUGGING: Log the final HTML

  // Attempt to ensure 'state' is explicitly assigned to 'window.state'
  // This is a workaround for potential JSDOM issues with 'const state' in global scope
  finalIndexHtmlContent = finalIndexHtmlContent.replace(
    /const state = {/,
    "window.state = {"
  );
  if (!finalIndexHtmlContent.includes("window.state = {")) {
    console.warn("WARNING: Failed to replace 'const state = {' with 'window.state = {' in HTML content. State might still be undefined.");
  }

  // Attempt to ensure 'renderTopic' is explicitly assigned to 'window.renderTopic'
  finalIndexHtmlContent = finalIndexHtmlContent.replace(
    /const renderTopic = \(/,
    "window.renderTopic = ("
  );
  if (!finalIndexHtmlContent.includes("window.renderTopic = (")) {
    console.warn("WARNING: Failed to replace 'const renderTopic = (' with 'window.renderTopic = (' in HTML content. renderTopic might still be undefined.");
  }

  // Attempt to ensure 'flint' ($) is explicitly assigned to 'window.$'
  // Note the more specific regex to avoid unintended replacements if $ is used elsewhere.
  finalIndexHtmlContent = finalIndexHtmlContent.replace(
    /const \$ = \((selector_or_flint, flint_args_or_element)\) => {/,
    "window.$ = (selector_or_flint, flint_args_or_element) => {"
  );
  if (!finalIndexHtmlContent.includes("window.$ = (selector_or_flint, flint_args_or_element) => {")) {
    console.warn("WARNING: Failed to replace 'const $ = (...)' with 'window.$ = (...)' in HTML content. Flint $ might still be undefined or incorrect.");
  }

  const virtualConsole = new VirtualConsole()
  virtualConsole.sendTo(console)
  const dom = new JSDOM(finalIndexHtmlContent, {
    runScripts: "dangerously", // Allow scripts added to the DOM to run
    url: "http://localhost", // Necessary for some scripts that might use location/history
    pretendToBeVisual: true, // Helps with some DOM manipulations if needed
    includeNodeLocations: true,
    virtualConsole: virtualConsole,
    beforeParse(window) {

      // Mock WebSocket to prevent JSDOM errors and allow state.ws.send to be called
      window.WebSocket = function(url) {
        // console.log(`Mock WebSocket attempting to connect to: ${url}`);
        this.send = function(data) {
          // console.log(`Mock WebSocket send: ${data}`);
        };
        this.close = function() {
          // console.log("Mock WebSocket close");
        };
        this.addEventListener = function(event, callback) {
          // console.log(`Mock WebSocket addEventListener for ${event}`);
          // Store listeners if needed for more complex simulation, e.g., this['on'+event] = callback;
        };
        // Simulate open and close events if necessary for client logic, though likely not for this test
        // setTimeout(() => { if (this.onopen) this.onopen(); }, 10); // Example: simulate open
        // setTimeout(() => { if (this.onclose) this.onclose(); }, 20); // Example: simulate close
      };

      // Force setTimeout to be faster, to avoid delays
      //   (add conditional logic here if we need to not do this later)
      window.setTimeout = (fn) => {
        fn()
      }

      if (!window.matchMedia) {
        window.matchMedia = function(query) {
          return {
            matches: false, // Or true, depending on what's more suitable for general tests
            media: query,
            onchange: null,
            addListener: function() {}, // Deprecated
            removeListener: function() {}, // Deprecated
            addEventListener: function() {},
            removeEventListener: function() {},
            dispatchEvent: function() {}
          };
        };
      }

      if (!window.fetch) {
        window.fetch = async function(url, options) {
          // console.log(`Mock fetch called for URL: ${url}`, options);
          if (url === "/session") {
            const body = options && options.body ? JSON.parse(options.body) : {};
            if (body.path === "/topics") {
              // console.log("Mock fetch returning success for /topics");
              return {
                ok: true,
                status: 200,
                statusText: "OK",
                json: async () => ({
                  success: true,
                  path: "/topics",
                  topics: [],
                  comments: [],
                  activities: [],
                  notifications: [],
                  user: {},
                  tag: {},
                  subscribed_to_users: 0,
                }),
                text: async () => JSON.stringify({ success: true, path: "/topics", topics: [], comments: [], activities: [], notifications: [], user: {}, tag: {}, subscribed_to_users: 0 })
              };
            } else if (body.path && body.path.startsWith("/topic/")) {
              // Handle fetch for a specific topic detail page
              // For the test, we'll use a simplified version of mockTopicData
              // In a real scenario, this would be the detailed topic data
              const slug = body.path.split("/")[2];
              // This is a very basic mock. A real app might fetch more detailed data.
              // We'll assume the slug 'test-topic-1' is the one being tested.
              // If other slugs are needed, this mock would need to be more sophisticated
              // or the test data aligned.
              const mockDetailTopic = {
                slug: slug,
                title: `Test Topic ${slug}`,
                body: "Full body of the test topic. This should be longer than the summary.",
                user_slug: "user1",
                display_name: "User One",
                tags: "politics", // Keep consistent with list view for now
                profile_picture_uuid: null,
                display_name_index: 0,
                user_verified: false,
                note: "",
                poll_1: null,
                favorited: false,
                favorite_count: 0,
                commented: false,
                comment_count: 0, // For topic detail, comments are separate
                image_uuids: null,
                // Fields that might appear in a detail view but not summary
                topic_id: 123, // Example ID
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };

              return {
                ok: true,
                status: 200,
                statusText: "OK",
                json: async () => ({
                  success: true,
                  path: body.path,
                  topics: [mockDetailTopic], // Send back the specific topic in a 'topics' array
                  comments: [], // Start with empty comments for simplicity
                  activities: [],
                  notifications: [],
                  user: {},
                  tag: {},
                  subscribed_to_users: 0,
                }),
                text: async () => JSON.stringify({ success: true, path: body.path, topics: [mockDetailTopic], comments: [], activities: [], notifications: [], user: {}, tag: {}, subscribed_to_users: 0 })
              };
            }
          }
          // Default mock fetch for other URLs or unhandled session paths
          // console.warn(`Mock fetch unhandled URL: ${url} or body.path: ${body?.path}`);
          return {
            ok: false,
            status: 500,
            statusText: "Internal Server Error",
            json: async () => ({ success: false, error: "Test error: Unmocked fetch path" }),
            text: async () => JSON.stringify({ success: false, error: "Test error: Unmocked fetch path" })
          };
        };
      }
    }
  })
  const { window } = dom

  return window
}

module.exports = { setupIntegrationTestEnvironment };
