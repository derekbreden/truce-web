# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## CLAUDE.md Principles
Every line and every word considered carefully for deletion. Say only what is absolutely necessary.

## Development Commands

```bash
npm test                       # Run all tests
npm test reply.create.test.js  # Run specific test file
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

// ❌ WRONG: Defensive state checks before DOM operations
assertEquals("/expected/path", state.path, "Should navigate to path")
$("button[on-that-page]").click() // This will fail better if path is wrong

// ❌ WRONG: Defensive intermediate assertions  
$("nav-link").click()
assertEquals("/user/profile", state.path, "Should be on profile") // NOISE
$("profile-edit-button").click() // This tells you navigation failed anyway

// ✅ CORRECT: Direct assertions that fail immediately
assertEquals("text", $("selector").innerText.trim(), "Text should match")
$("button").click() // Let it crash if button doesn't exist - better error
```

**SHALL NOT add defensive checks before specific assertions** - If your test would fail anyway from more specific checks later on, your assertion is pointless noise

Defensive assertions create the illusion of disambiguation while actually providing minimal debugging value at high readability cost. When something breaks, you need real debugging anyway - console logs, DOM inspection, data verification. One path assertion doesn't meaningfully reduce that debugging burden but permanently clutters the test.

**Common defensive assertion patterns to AVOID:**
- Path checks before DOM operations: `assertEquals("/path", state.path)` then `$("element-on-that-path").click()`
- Existence checks before interactions: `assertEquals(true, Boolean($el))` then `$el.click()`  
- Intermediate state validation during multi-step flows
- Any assertion that doesn't provide better debugging than the natural failure point

**Why direct assertions are superior:**
	Better error messages: "Cannot read properties of null" tells you exactly which selector failed
	Less code noise: Eliminates defensive programming patterns
	Faster debugging: Fails exactly where the problem occurs
	Mirrors app behavior: If the app would crash, the test should too
	Forces precision: Use innerHTML discovery when selectors fail

### Test Pattern
```javascript
const { setupTestEnvironment } = require("./testSetupHelpers.js")
const { assertEquals, runTests } = require("./testRunUtils.js")

async function testFeature() {
	const window = await setupTestEnvironment()
	const { $, state } = window

	$("main-content posts post:nth-child(2) button[submit]").click()
	await new Promise(resolve => setTimeout(resolve, 0))
	assertEquals("expected", $("notifications notification:nth-child(1) span").innerText.trim(), "Should match")
}

runTests("feature.test.js", [testFeature])
```

### Key Testing Gotchas
**JSDOM text**: Always check `.innerText` on deepest element; Sometimes check `.textContent` only for RARE standalone `element\n  $1` instead of usual `element $1`
**Target elements**: MUST use specific CSS selectors like `notification[unread] + notification[unread]` or `post posts:nth-child(2) p:nth-child(0) span` to get a single element instead of an array. NEVER get an array.
**CRITICAL**: NEVER use `$()[index]` syntax - this is FORBIDDEN

### Multiple Test Environments
When testing with multiple users/sessions, require.cache contamination occurs:
```javascript
const { $: $a, setupExternalMocks: aSetupExternalMocks } = window_user_a
const { $: $b } = window_user_b  // This overwrites User A's mocks globally
// Later, User A must restore its mocks:
aSetupExternalMocks()  // Re-establish User A's database mocks
```
**Why**: setupExternalMocks() clears require.cache to prevent cross-test contamination, but this makes the last caller "win" globally. Each environment must re-establish its mocks before database operations.

## Common Patterns

### Cache Updates
Update client cache immediately (and call render functions) before API calls for responsive UI

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

## Debugging Philosophy
	**MUST debug by investigation, not speculation** - Find actual causes before attempting fixes
	**SHALL NOT guess or make vague assertions** about things being broken
	**MUST investigate your own changes first** - When tests fail after your changes, the bug IS in your code
	**MUST check existing working examples** - Before declaring anything impossible, search for how other tests/code in the same codebase solve similar problems
	**SHALL NOT declare approaches impossible** - Keep investigating systematically until you exhaust context/usage limits
	**MUST test suspected layer directly** - Write minimal tests for database, API, DOM
	**MUST subtract complexity, don't add it** - Remove layers to isolate problems - Then add back only the needful to complete the task with no skips
	**MUST change only one variable at a time** - Change only what you're testing
	**MUST be hypothesis-driven** - Form specific theories and test them
	**MUST understand before judging** - Surface patterns != root causes

When encountering selector/DOM issues, you **MUST**:
1. Check `.length` at each selector level to understand structure
2. Look at existing tests for similar selector patterns
3. Test incrementally (nth-child(1), nth-child(2), etc.)
4. **NEVER use `$()[index]` to access array elements**

### DOM Selector Debugging Examples
```javascript
// ❌ WRONG: Using array indexing syntax
const $element = $("posts post author")[0]  // FORBIDDEN

// ✅ CORRECT: Debug hierarchy to find where nth-child is needed
console.log($("posts").length)           // Maybe 2 - multiple posts containers
console.log($("posts post").length)      // Maybe 6 - multiple posts total
console.log($("posts post author").length) // Maybe 6 - one author per post

// Target specific element by finding the right level:
// Want author of 2nd post in 1st posts container
console.log($("posts:nth-child(1) post").length)        // How many posts in first container?
console.log($("posts:nth-child(1) post:nth-child(2)").length) // Does 2nd post exist?
$("posts:nth-child(1) post:nth-child(2) author").click() // Click author of 2nd post

// ❌ WRONG: Adding nth-child at wrong level
$("posts post author:nth-child(1)").click() // author is likely unique in its parent

// ✅ CORRECT: nth-child where the multiplicity actually occurs
$("posts post:nth-child(2) author").click() // post is where disambiguation needed
```

## 10x Developer Principles

### Subtraction Over Addition
	Before adding code, ask: "What can I remove?"
	Before adding abstraction, ask: "Is a concrete version clearer?"
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
	`tests/`: End-to-end-to-end Integration tests