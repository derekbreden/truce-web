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
      window.mockFetchConfig = { responses: [], defaultResponse: null };

      window.setMockFetchResponses = (responsesConfig) => {
        window.mockFetchConfig.responses = responsesConfig;
      };

      window.setMockFetchDefaultResponse = (responseBody, status = 200) => {
        window.mockFetchConfig.defaultResponse = { responseBody, status };
      };

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

      // Always override fetch with our mock
      window.fetch = async function(url, options) {
        const { responses, defaultResponse } = window.mockFetchConfig;

        for (const entry of responses) {
          let match = false;
          if (typeof entry.requestMatcher === 'function') {
            match = entry.requestMatcher(url, options);
          } else if (typeof entry.urlPattern === 'string') {
            if (url === entry.urlPattern) {
              match = true;
            }
          } else if (entry.urlPattern instanceof RegExp) {
            if (entry.urlPattern.test(url)) {
              match = true;
            }
          }

          if (match) {
            // console.log(`Mock fetch: Matched ${url} with requestMatcher or pattern ${entry.urlPattern || 'custom matcher'}`);
            return Promise.resolve({
              ok: entry.status >= 200 && entry.status < 300,
              status: entry.status,
              statusText: entry.status === 200 ? "OK" : "Error", // Simplified statusText
              json: async () => entry.responseBody,
              text: async () => JSON.stringify(entry.responseBody),
            });
          }
        }

        if (defaultResponse) {
          // console.log(`Mock fetch: Using default response for ${url}`);
          return Promise.resolve({
            ok: defaultResponse.status >= 200 && defaultResponse.status < 300,
            status: defaultResponse.status,
            statusText: defaultResponse.status === 200 ? "OK" : "Error",
            json: async () => defaultResponse.responseBody,
            text: async () => JSON.stringify(defaultResponse.responseBody),
          });
        }

        // console.warn(`Mock fetch: No matching mock or default response for ${url}`, options);
        return Promise.resolve({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
          json: async () => ({ success: false, error: "Test error: Unmocked fetch path" }),
          text: async () => JSON.stringify({ success: false, error: "Test error: Unmocked fetch path" }),
        });
      };
    }
  })
  const { window } = dom

  return window
}

module.exports = { setupIntegrationTestEnvironment };
