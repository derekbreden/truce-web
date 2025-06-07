# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Run all tests
npm test

# Run specific test types
npm test integration
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
**Critical**: This project strictly prohibits "guard assertions":

```javascript
// ❌ WRONG: Guard assertions
const $element = $("selector")
assertEquals(true, Boolean($element), "Element should exist")
assertEquals("text", $element.innerText.trim(), "Text should match")

// ✅ CORRECT: Direct assertions
assertEquals("text", $("selector").innerText.trim(), "Text should match")
```

Direct assertions provide better error messages and less code noise.

### Integration Test Pattern
```javascript
const { assertEquals, runTests } = require("../shared/testUtils.js")
const { setupIntegrationTestEnvironment } = require("../shared/integrationTestSetup.js")

async function testFeature() {
  const window = await setupIntegrationTestEnvironment()
  const { state, $ } = window

  // Mock API responses
  window.setMockFetchResponseForPaths({
    "/path": { data: "mock response" }
  })

  // Test navigation and assertions
  $("button").click()
  await new Promise(resolve => setTimeout(resolve, 0))
  assertEquals("expected", $("element").innerText.trim(), "Should match")
}

runTests("test.js", [testFeature])
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