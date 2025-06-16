# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## CLAUDE.md Principles
Every line and every word considered carefully for deletion. Say only what is absolutely necessary.

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
	**Critical**: Returns single elements or NodeLists with `.length`

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

### Boolean() as Type Documentation
Use `Boolean()` wrapper to signal intentional type transformation:
```javascript
// ✅ CORRECT: Signals "this returns a number, converting to boolean"
const has_items = Boolean(items.length)

## Testing Philosophy

### Incremental Implementation
1. Tests pass → 2. Add coverage → 3. Verify green → 4. Small change → 5. Test → 6. Repeat 4-5

### No Guard Assertions
**Critical**: You **MUST** use direct assertions over defensive checks:

```javascript
// ❌ WRONG: Defensive existence checks
const $element = $("selector")
assertEquals(true, Boolean($element), "Element should exist")
if ($element) $element.click()

// ✅ CORRECT: Direct assertions that fail immediately
assertEquals("text", $("selector").innerText.trim(), "Text should match")
$("button").click() // Let it crash if button doesn't exist
```

**SHALL NOT add defensive checks before specific assertions** - If your test would fail anyway from more specific checks later on, your assertion is pointless noise

**Why direct assertions are superior:**
	Better error messages: "Cannot read properties of null" tells you exactly which selector failed
	Less code noise: Eliminates defensive programming patterns
	Faster debugging: Fails exactly where the problem occurs
	Mirrors app behavior: If the app would crash, the test should too
	Forces precision: Use innerHTML discovery when selectors fail

### Client-Server Test Pattern
```javascript
const { setupIntegrationTestEnvironment } = require("./clientServerTestSetup.js")
const { assertEquals, runTests } = require("../client/shared/testUtils.js")

async function testFeature() {
	const window = await setupIntegrationTestEnvironment()
	const { $, state } = window

	$("main-content posts post:nth-child(2) button[submit]").click()
	await new Promise(resolve => setTimeout(resolve, 0))
	assertEquals("expected", $("notifications notification:nth-child(1) span").innerText.trim(), "Should match")
}

runTests("feature.test.js", [testFeature])
```

### Key Testing Gotchas
**JSDOM text**: `.innerText` on deepest element; `.textContent` only for standalone `$1`
**Flint.js NodeLists**: Access first element when needed: `$("selector")[0]`
**URL attributes**: Use `.endsWith()` for image src comparisons in tests
**Test data**: Use minimal, focused test cases rather than complex scenarios
**Data flow tracing**: When tests fail, trace data from mock → DOM attributes → JS parsing (e.g. Number()) → API calls
**Database mock isolation**: Track session state to prevent test interference (e.g., post creation affecting favorites test)

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

### Cache Updates
Update client cache immediately before API calls for responsive UI

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
	**MUST** use TodoWrite tool to plan multi-step tasks
	**MUST** use search tools to understand codebase and requirements
	**MUST create comprehensive tests** for new functionality
	**MUST run `npm test` after changes** to verify everything works
	**MUST commit after tests pass** with descriptive message
	User handles pushing to remote - only commit locally
	**MUST** scope down aggressively: Pick ONE task when complexity emerges

### Test-First Refactoring
1. **MUST** write comprehensive tests FIRST
2. **MUST** ensure ALL tests pass with original code
3. Make refactoring changes
4. **MUST** verify tests still pass with identical results
5. Any test failure means refactoring broke something - **MUST** fix code, not test

## Debugging Philosophy - when debugging:
	**MUST debug by investigation, not speculation** - Find actual causes before attempting fixes
	**SHALL NOT guess or make vague assertions** about things being broken
	**MUST investigate your own changes first** - When tests fail after your changes, the bug IS in your code
	**MUST test suspected layer directly** - Write minimal tests for database, API, DOM
	**MUST subtract complexity, don't add it** - Remove layers to isolate problems - Then add back only the needful to complete the task with no skips
	**MUST change only one variable at a time** - Change only what you're testing
	**MUST be hypothesis-driven** - Form specific theories and test them
	**MUST understand before judging** - Surface patterns != root causes.

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