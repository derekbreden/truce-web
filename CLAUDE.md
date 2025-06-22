# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## CLAUDE.md Principles
Every line and every word considered carefully for deletion. Say only what is absolutely necessary.

## Progress Reporting Format

When making changes, use this exact format:

**What I changed:** [specific technical change]
**What this accomplishes:** [specific outcome] 
**What still needs work:** [remaining issues]
**Ready for review:** Yes/No

Never use completion language until "Ready for review: Yes"

## Development Commands

```bash
npm test                       # Run all functional tests
npm test reply.create.test.js  # Run specific test file
npm test capture               # Run all tests with visual capture (pngs you can read in /tests/capture/)
npm test notifications.simple capture  # Run specific test with visual capture
npm test message conversation capture  # Run multiple tests with visual capture

# Visual Testing Commands
npm test visual                # Run visual baseline tests
npm test visual capture        # Run visual tests with screenshots in /tests/capture/
npm test visual capture-baseline  # Store baseline images in /tests/baseline/
npm run capture-diff           # Compare baseline vs capture images, generate diffs
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
	**Array methods**: Use `.includes()` instead of `.indexOf() === -1`
	**Path extraction**: Use `path.split("/")[index]` consistently
	**Casting**: Use `Number()` not `parseInt()`

## Testing Philosophy

### Visual Testing
**Screenshot capture** for debugging display and styling issues:
```bash
npm test capture               # All tests with screenshots  
npm test specific.test capture # Specific test with screenshot
```

**Automatic capture**: Screenshots saved to `tests/capture/` (git-ignored) at test completion
**Clean runs**: Directory cleared each capture run - no leftover files
**Naming**: `{testname}-{function}.png` format for easy identification
**Purpose**: Debug layout bugs, styling issues, visual regressions that are hard to catch without seeing rendered output

### Incremental Implementation
1. Tests pass → 2. Add coverage → 3. Verify green → 4. Small change → 5. Test → 6. Repeat 4-5

### No Guard Assertions

If your test would fail anyway from more specific checks later on, your assertion is pointless noise.

```javascript
// ❌ WRONG: $element.click() would fail anyway
const $element = $("selector")
assertEquals(true, Boolean($element), "Element should exist")
if ($element) $element.click()

// ❌ WRONG: $("profile-edit-button").click() would fail anyway
$("nav-link").click()
assertEquals("/user/profile", state.path, "Should be on profile") // NOISE
$("profile-edit-button").click() // This tells you navigation failed anyway

// ✅ CORRECT: Check exact text (not just existence) of an element
assertEquals("text", $("selector").textContent.trim(), "Text should match")
```

### Test Pattern
```javascript
const path = require("path")
const {
	setupTestEnvironment,
} = require("./testSetupHelpers.js")
const { assertEquals, runTests } = require("./testRunUtils.js")

const tests = {
	testFlow: async () => {
		const window = await setupTestEnvironment()
		const { $ } = window
		
		// By default, testSetupHelpers.js starts on /posts with 2 posts

		// The first listed (by create_date) default post is the user's own post
		$("main-content-2 posts post:first-child icon[more]").click()
		assertEquals(false, Boolean($("modal action[block]")), "Own post should not show block action")
		$("modal-bg").click()

		// The second listed (by create_date) default post is another user's post
		$("main-content-2 posts post:nth-child(2) icon[more]").click()
		assertEquals("Block user", $("action[block] p").textContent, "Other user's post should show Block action")
	},
}

runTests(path.basename(__filename), Object.values(tests))
```

### Key Testing Gotchas
**Target elements**: MUST use specific CSS selectors like `$("post posts:nth-child(2) p:nth-child(0) span")` to get exactly one element.
**Use DOM only**: Verify outcomes through user-visible UI changes, not internal state inspection. Mock 3rd party libraries and services, never mock our own code. Exercise our code.

## Debugging Philosophy
	**DO NOT** guess and try things to fix it
	**DO** guess and verify with console.warn in real code and test code what is happening
	Use console.warn liberally in both real code and test code to see precisely what is happening - it is the only way you will ever know anything at all.

When debugging failing tests, you **SHOULD**:
1. **Add console.warn to trace data flow** - Log key variables, database state, API responses
2. **Add console.warn to trace execution paths** - Log function calls, branches taken, user actions
3. **Add console.warn to verify assumptions** - Log what you expect vs what actually happens
4. **Clean up all console.warn statements** after debugging is complete

When encountering issues identifying the right selector for a single element, you **SHOULD**:
1. Check `.length` at each selector level to understand structure
2. Look at existing tests for similar selector patterns
3. Test incrementally (nth-child(1), nth-child(2), etc.)

### DOM Selector Debugging Examples
```javascript
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

## DRY vs Readability

**Abstract when:** 20+ lines repeated identically 3+ times AND abstraction is clearer than original

**Keep duplication when:** Functions serve different purposes, used only twice, or abstraction adds complexity

**The test:** Would you rather debug the abstracted or original version?

## Key Files
	`index.js`: Application entry point
	`server/server.js`: HTTP server and client file concatenation
	`client/flint.js`: Custom DOM manipulation library
	`tests/scripts/runAllTests.js`: Test runner
	`tests/scripts/compareVisualDiff.js`: Visual diff comparison utility
	`server/session/`: Session middleware functions
	`tests/functional/`: End-to-end Integration tests
	`tests/visual/`: Visual baseline tests

## You are new
When I am new to a code base, there are a few things I like to do:

	* Before picking a name for a new variable, search for other similar things and see how they are named and then follow that pattern.
	* When I am working on something, such as a user action causing a database update and something changing on another screen because of that, then I like to read all of the code involved in that complete flow starting with finding the button itself that the user clicked seeing what happens in the client when that button is clicked what functions are called what those function called all the way through to see everything that execute when that happens, continuing through to any http://calls that are made finding in the server side code where that in point is handled following every function called Reading every bit of code that gets executed in the full path of what I am using.
	* Before I write a single line of new code I look for another line somewhere in the code that does something similar to what I am doing and I follow that pattern.
	* Before I write a new function I'll look for another function somewhere in the code that does something similar to what I am doing and I follow that pattern.
	* Before writing new code that does a series of steps to accomplish a goal, I will look for another place in the code that does a similar series of steps to achieve a similar goal and I will read that code and I will follow that pattern.

You are new to this code.