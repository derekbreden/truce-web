# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm test                              # Run all tests
npm test integration                  # Client-side integration tests  
npm test unit                         # Server-side unit tests
npm test navigation.integration.test.js  # Run specific test file
node index.js                         # Start the application
```

## Project Architecture

### Core Structure
Node.js social media platform with unique client-side architecture:
	**Server**: Express-like HTTP server with PostgreSQL database
	**Client**: Non-standard module system using server-side includes
	**Real-time**: WebSocket integration for live updates
	**AI Integration**: OpenAI-powered content moderation

### Client-Side Architecture (Critical)
**Non-standard module system**:
	All client JS files included via server-side includes in `index.html`
	Files concatenated into single `<script>` block by `server/server.js`
	All `const`/`let` declarations globally scoped across client files
	No traditional module imports/exports - everything is global

### Flint.js DOM Library
Custom DOM manipulation library:
	jQuery-like `$()` selector function
	Indentation-based template syntax with `$1`, `$2` placeholders
	**Critical**: Often returns NodeLists, not single elements

### Session Middleware Pattern
```javascript
module.exports = async (req, res) => {
	if (!res.writableEnded && req.session.user_id && req.body.data) {
		// Handle request logic
		res.end(JSON.stringify({ success: true }))
	}
}
```

### State Management
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
	**Functions**: `camelCase` for functions only
	**Variables**: `snake_case` for all variables  
	**Arrow functions**: Use `const func = () => {}` not `function func() {}`
	**Quotes**: Double quotes `"string"` not single quotes
	**Semicolons**: Omit semicolons
	**DOM variables**: Prefix with `$` like `const $button = $("button")`
	**String methods**: Use `.startsWith()` and `.endsWith()` instead of `.substr()`
	**Array methods**: Use `.includes()` instead of `.indexOf() === -1`
	**Path extraction**: Use `path.split("/")[index]` consistently

### Variable Naming for Client-Server Data Flow
When client calculations become server filters with inverted meaning:
```javascript
// ✅ CORRECT: Name for client context, map explicitly to server
const client_max_post_date = findMaxDate(posts)
fetch("/session", {
	body: JSON.stringify({
		min_post_create_date: client_max_post_date  // Explicit mapping
	})
})

// ❌ WRONG: Name for server context, confusing on client  
const min_post_create_date = posts.reduce((max, post) => max > post.date ? max : post.date)
```

### Boolean() as Type Documentation
Use `Boolean()` wrapper to signal intentional type transformation:
```javascript
// ✅ CORRECT: Signals "this returns a number, converting to boolean"
const has_items = Boolean(items.length)

// ❌ WRONG: In contexts that already do boolean coercion
if (Boolean(items.length)) { ... }  // Redundant
```

## Testing Philosophy

### No Guard Assertions
**Critical**: Direct assertions over defensive checks:

```javascript
// ❌ WRONG: Defensive existence checks
const $element = $("selector")
assertEquals(true, Boolean($element), "Element should exist")
if ($element) $element.click()

// ✅ CORRECT: Direct assertions that fail immediately
assertEquals("text", $("selector").innerText.trim(), "Text should match")
$("button").click() // Let it crash if button doesn't exist
```

**Why direct assertions are superior:**
	Better error messages: "Cannot read properties of null" tells you exactly which selector failed
	Less code noise: Eliminates defensive programming patterns
	Faster debugging: Fails exactly where the problem occurs
	Mirrors app behavior: If the app would crash, the test should too

### Integration Test Pattern
```javascript
const { assertEquals, runTests } = require("../shared/testUtils.js")
const { setupIntegrationTestEnvironment } = require("../shared/integrationTestSetup.js")

async function testFeature() {
	const window = await setupIntegrationTestEnvironment()
	const { state, $ } = window

	window.setMockFetchResponseForPaths({
		"/path": { data: "mock response" }
	})

	$("button").click()
	await new Promise(resolve => setTimeout(resolve, 0))
	assertEquals("expected", $("element").innerText.trim(), "Should match")
}

runTests("test.js", [testFeature])
```

### Server Unit Test Pattern
```javascript
const { createMockRequest, createMockResponse, assertEquals, runTests } = require("../shared/serverTestSetup.js")
const handlerToTest = require("../../../server/session/handlerName.js")

async function testHandler() {
	const req = createMockRequest({ data: "test" }, { user_id: "123" })
	req.client.addQueryMock("INSERT INTO table", { rows: [] })
	const res = createMockResponse()
	
	await handlerToTest(req, res)
	
	const responseData = JSON.parse(res.getResponseData())
	assertEquals(true, responseData.success, "Should succeed")
}

runTests("handler.unit.test.js", [testHandler])
```

### Key Testing Gotchas
**JSDOM innerText**: Only set on actual text-containing elements, not parents
**Flint.js NodeLists**: Access first element when needed: `$("selector")[0]`
**URL attributes**: Use `.endsWith()` for image src comparisons in tests
**Test data**: Use minimal, focused test cases rather than complex scenarios
**Data flow tracing**: When tests fail, trace data from mock → DOM attributes → JS parsing (e.g. Number()) → API calls

### Integration Test Complex Flows
**Pre-populate state**: Pass `mockFetchResponseForPaths` to `setupIntegrationTestEnvironment()`
**Target elements**: Use specific CSS selectors like `notification[unread] + notification[unread]`
**Update mocks mid-test**: Call `window.setMockFetchResponseForPaths()` between actions
**Mock POST actions**: Use `window.addMockFetchMatcher()` for requests with specific body keys (not path-based)
**Test full flow**: Check DOM content before/after, update mocks, navigate to trigger re-render

## Common Patterns

### Database Queries
Always use parameterized queries:
```javascript
const result = await req.client.query(
	`SELECT * FROM table WHERE id = $1 AND date > $2`,
	[id, date]
)
```

### WebSocket Race Conditions
Guard against deleted connections:
```javascript
// ✅ CORRECT: Guard against deleted connections
if (this.ws_active[ws_uuid]) {
	delete this.ws_active[ws_uuid].active_post_id
}
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

## Development Workflow

When working on tasks:
	Use TodoWrite tool to plan multi-step tasks
	Use search tools to understand codebase and requirements
	**ALWAYS create comprehensive tests** for new functionality
	**ALWAYS run `npm test` after changes** to verify everything works
	**ALWAYS commit after tests pass** with descriptive message
	User handles pushing to remote - only commit locally

### Test-First Refactoring
1. Write comprehensive tests FIRST
2. Ensure ALL tests pass with original code
3. Make refactoring changes
4. Verify tests still pass with identical results
5. Any test failure means refactoring broke something - fix code, not test

## Debugging Philosophy
	**Test suspected layer directly** - Write minimal tests for database, API, DOM
	**Subtract complexity, don't add it** - Remove layers to isolate problems  
	**One variable at a time** - Change only what you're testing
	**Hypothesis-driven** - Form specific theories and test them
	**Understand before judging** - Surface patterns != root causes. Dig deeper than "guards bad" or "comments bad"

## 10x Developer Principles

### Subtraction Over Addition
	Before adding code, ask: "What can I remove?"
	Before adding abstraction, ask: "Is concrete version clearer?"
	Before adding defensive code, ask: "Will this help debugging?"

### Signal vs Noise Optimization
	Every line should solve the problem or help debug it
	Eliminate ceremony, boilerplate, and "just in case" code
	Prefer failures that give actionable information

## DRY vs Readability

**Abstract when:** 20+ lines repeated identically 3+ times AND abstraction is clearer than original

**Keep duplication when:** Functions serve different purposes, used only twice, or abstraction adds complexity

**The test:** Would you rather debug the abstracted or original version?

## Key Files
	`index.js`: Application entry point
	`server/server.js`: HTTP server and client file concatenation
	`client/flint.js`: Custom DOM manipulation library
	`runAllTests.js`: Test runner
	`server/session/`: Session middleware functions
	`tests/client/integration/`: Integration tests