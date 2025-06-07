# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Run all tests
npm test

# Run specific test types
npm test integration  # Client-side integration tests
npm test unit         # Server-side unit tests
npm run test:integration

# Run specific test file
npm test navigation.integration.test.js

# Start the application
node index.js
```

## Project Architecture

### Core Structure
This is a Node.js social media platform (Truce.net) with a unique client-side architecture:

- **Server**: Standard Express-like HTTP server with PostgreSQL database
- **Client**: Non-standard module system using server-side includes in `index.html`
- **Real-time**: WebSocket integration for live updates
- **AI Integration**: OpenAI-powered content moderation

### Client-Side Architecture (Critical)
The client uses a **non-standard module system**:
- All client JS files are included via server-side includes in `index.html`
- Files are concatenated into a single `<script>` block by `server/server.js`
- All `const`/`let` declarations are globally scoped across client files
- No traditional module imports/exports - everything is global

### Flint.js DOM Library
Custom lightweight DOM manipulation library with:
- jQuery-like `$()` selector function
- Indentation-based template syntax with `$1`, `$2` placeholders
- Event binding via `.on()` method
- Nested selection support

**Critical**: Flint.js selectors often return NodeLists, not single elements:
```javascript
// ❌ WRONG: Assumes single element
const $element = $("img")
$element.click() // Error: NodeList doesn't have click()

// ✅ CORRECT: Access first element from NodeList
const $images = $("img")
const $firstImage = $images[0]
$firstImage.click()
```

### Session Middleware Pattern
Server routes in `server/session/` follow this pattern:
```javascript
module.exports = async (req, res) => {
  if (!res.writableEnded && req.session.user_id && req.body.data) {
    // Handle request logic
    res.end(JSON.stringify({ success: true }))
  }
}
```

### State Management
Global client state object:
```javascript
const state = {
  path: "/",
  user_id: "",
  display_name: "",
  cache: {},
  loading_path: false
}
```

## Code Conventions

### JavaScript Style
- **Arrow functions**: Use `const func = () => {}` not `function func() {}`
- **Quotes**: Double quotes `"string"` not single quotes
- **Semicolons**: Omit semicolons
- **DOM variables**: Prefix with `$` like `const $button = $("button")`

### Testing Philosophy: No Guard Assertions
**Critical**: This project strictly prohibits ALL forms of "guard assertions":

```javascript
// ❌ WRONG: Boolean existence checks
const $element = $("selector")
assertEquals(true, Boolean($element), "Element should exist")
assertEquals("text", $element.innerText.trim(), "Text should match")

// ❌ WRONG: Conditional existence checks
const $button = $("button")
if ($button) {
  $button.click()
  // test continues...
}

// ❌ WRONG: Optional chaining guards
$element?.click()
assertEquals("text", $element?.innerText?.trim(), "Should match")

// ✅ CORRECT: Direct assertions that fail immediately
assertEquals("text", $("selector").innerText.trim(), "Text should match")
$("button").click() // Let it crash if button doesn't exist
```

**Why direct assertions are superior:**
- **Better error messages**: "Cannot read properties of null (reading 'innerText')" immediately tells you which selector failed
- **Less code noise**: Eliminates defensive programming patterns
- **Faster debugging**: Fails exactly where the problem occurs
- **Mirrors app behavior**: If the app would crash, the test should too

**Guard assertion patterns to avoid:**
- `if (element)` conditionals
- `Boolean(element)` checks  
- `element?.property` optional chaining in tests
- `try/catch` around element access
- Any defensive existence validation

### Integration Test Pattern
```javascript
const { assertEquals, runTests } = require("../shared/testUtils.js")
const { setupIntegrationTestEnvironment } = require("../shared/integrationTestSetup.js")

async function testFeature() {
  const window = await setupIntegrationTestEnvironment()
  const { state, $ } = window

  // Mock API responses by path (simple cases)
  window.setMockFetchResponseForPaths({
    "/path": { data: "mock response" }
  })

  // Mock API responses with custom logic (complex cases)
  window.addMockFetchMatcher({
    match: (url, options) => {
      if (url === "/session" && options?.method === "POST") {
        const body = JSON.parse(options.body)
        return body.display_name && body.body // Match comment submissions
      }
      return false
    },
    response: { success: true, user_id: "123" }
  })

  // Test navigation and assertions
  $("button").click()
  await new Promise(resolve => setTimeout(resolve, 0))
  assertEquals("expected", $("element").innerText.trim(), "Should match")
}

runTests("test.js", [testFeature])
```

### Server Unit Test Pattern
Server unit tests focus on individual session handlers in isolation:

```javascript
const { createMockRequest, createMockResponse, assertEquals, runTests } = require("../shared/serverTestSetup.js")
const handlerToTest = require("../../../server/session/handlerName.js")

async function testHandler() {
  // Create mock request with body and session data
  const req = createMockRequest({
    topic_id_to_favorite: 'topic-123',
    was_favorited: false
  }, {
    user_id: 'test-user-123',
    display_name: 'Test User'
  })
  
  // Mock database responses
  req.client.addQueryMock(
    'INSERT INTO favorite_topics',  // SQL to match
    { rows: [] }                   // Mock response
  )
  
  const res = createMockResponse()
  
  // Execute the actual handler
  await handlerToTest(req, res)
  
  // Assert response
  const responseData = JSON.parse(res.getResponseData())
  assertEquals(true, responseData.success, "Should succeed")
}

runTests("handler.unit.test.js", [testHandler])
```

**Server Unit Test Philosophy:**
- **Test individual handlers in isolation** - One session handler per test file
- **Mock only the database client** - `req.client.query()` responses
- **Use real handler code** - Import and execute actual session handlers
- **Test all code paths** - Happy path, error cases, edge conditions
- **Fast execution** - No external dependencies or network calls

### Fetch Mocking System
**Path-based mocking** (simple): Use `setMockFetchResponseForPaths` for basic path matching
**Custom matching** (flexible): Use `addMockFetchMatcher` for POST body content, headers, etc.

```javascript
// Custom matcher example for form submissions
window.addMockFetchMatcher({
  match: (url, options) => {
    if (url === "/session" && options?.method === "POST") {
      const body = JSON.parse(options.body)
      return body.body && body.display_name // Comment submission
    }
    return false
  },
  status: 200, // Optional, defaults to 200
  response: { success: true, user_id: "123" }
})
```

### Testing Gotchas
**JSDOM URL Handling**: Image src attributes include full URLs in tests:
```javascript
// ❌ WRONG: Direct string comparison
assertEquals("/image/uuid", $img.src, "Check src")

// ✅ CORRECT: Use endsWith for URL comparison
assertEquals(true, $img.src.endsWith("/image/uuid"), "Check src")
```

**Flint.js Element Access**: Multiple ways to access DOM elements:
```javascript
// Single element selectors may return NodeList
const $element = $("selector")[0]  // Get first from NodeList
const $nested = $element.$("child") // Nested selection on single element
```

## Database and AI Integration

### Database Queries
Always use parameterized queries:
```javascript
const result = await req.client.query(
  `SELECT * FROM table WHERE id = $1 AND date > $2`,
  [id, date]
)
```

### AI Content Moderation
```javascript
const ai_response = await ai.ask(messages, "common", prompts.common_response_format)
const parsed = JSON.parse(ai_response)
if (parsed.keyword === "Spam") {
  res.end(JSON.stringify({ error: parsed.keyword }))
  return
}
```

## Key Files
- `index.js`: Application entry point
- `server/server.js`: HTTP server and client file concatenation
- `client/flint.js`: Custom DOM manipulation library
- `runAllTests.js`: Test runner
- `server/session/`: Session middleware functions
- `tests/client/integration/`: Integration tests