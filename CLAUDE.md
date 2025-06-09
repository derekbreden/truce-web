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
- **String methods**: Use modern methods like `.startsWith()` and `.endsWith()` instead of `.substr(0, n) === "prefix"`
- **Array methods**: Use `.includes()` instead of `.indexOf() === -1` or `.indexOf() > -1` for existence checks
- **Path extraction**: Use `path.split("/")[index]` pattern consistently instead of `substring()` for URL path parsing

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
        return body.display_name && body.body // Match reply submissions
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
// Set up environment variables FIRST if handler uses external services
process.env.FIREBASE_CREDENTIAL = JSON.stringify({
  type: "service_account",
  project_id: "test-project",
  // ... other required fields
})
process.env.VAPID_PUBLIC_KEY = "test-vapid-public-key"
process.env.VAPID_PRIVATE_KEY = "test-vapid-private-key"

const { createMockRequest, createMockResponse, assertEquals, runTests } = require("../shared/serverTestSetup.js")
const handlerToTest = require("../../../server/session/handlerName.js")

async function testHandler() {
  // Create mock request with body and session data
  const req = createMockRequest({
    post_id_to_favorite: 'post-123',
    was_favorited: false
  }, {
    user_id: 'test-user-123',
    display_name: 'Test User'
  })
  
  // Mock database responses
  req.client.addQueryMock(
    'INSERT INTO favorite_posts',  // SQL to match
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
- **Mock external dependencies** - Database client, Firebase, web-push, AWS S3, etc.
- **Set environment variables early** - Before importing modules that need them
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
      return body.body && body.display_name // Reply submission
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

// ✅ BETTER: Direct property access for attributes
assertEquals("http://localhost/mp3/test.mp3", $("audio").src, "Check audio src")
```

**Flint.js Element Access and Direct Property Access**: 
```javascript
// When you know there's exactly one element, use direct property access
assertEquals("Test Image", $("post img").alt, "Check alt text")  // Direct property access
assertEquals("/path/to/image", $("post img").src, "Check src")   // No need for getAttribute()

// Flint returns NodeList even for single matches, but supports direct property access
const $element = $("selector")     // Returns NodeList-like object
const text = $element.innerText    // Direct access works when there's one match
const $first = $("selector")[0]    // Explicit first element access when needed
```

**CRITICAL - JSDOM innerText Behavior**: In JSDOM, `innerText` is ONLY set on the actual elements that contain text, not propagated to parents:
```javascript
// Given this DOM: <p bold><span>Header Text</span></p>

// ❌ WRONG: Parent elements don't have innerText in JSDOM
assertEquals("Header Text", $("p[bold]").innerText, "Check header")  // Will be undefined!

// ✅ CORRECT: Access the actual text-containing element
assertEquals("Header Text", $("p[bold] span").innerText.trim(), "Check header")

// ❌ WRONG: Searching through multiple elements when you know there's only one
let found = false
$("p[bold]").forEach($p => {
  if ($p.innerText && $p.innerText.includes("Header")) found = true
})
assertEquals(true, found, "Should find header")

// ✅ CORRECT: Direct assertion on the one element you expect
assertEquals("Header Text", $("p[bold] span").innerText.trim(), "Check header")
```

**Markdown Rendering Gotchas**: 
```javascript
// Lists require blank lines before items in markdown
const markdown = `Here's a list:\n\n- Item one`  // ✅ CORRECT - blank line before list
const markdown = `Here's a list:\n- Item one`     // ❌ WRONG - no blank line, won't render as list
```

**Test Data Simplicity**: When testing, use minimal data:
```javascript
// ❌ WRONG: Creating complex scenarios with multiple elements
posts: [
  { body: "# Header 1" },
  { body: "# Header 2" },
  { body: "# Header 3" }
]
// Then using forEach to find the right one...

// ✅ CORRECT: One simple test case with all features you need
posts: [{
  body: `# Header Test\n\n> Quote Test\n\n**Bold Test**`
}]
// Direct assertions on the single elements
```

**WebSocket Testing**: Use the mock WebSocket's `triggerMessage` method:
```javascript
// ❌ WRONG: Using standard dispatchEvent
state.ws.dispatchEvent(new MessageEvent("message", { data: "UPDATE" }))

// ✅ CORRECT: Using mock WebSocket triggerMessage
state.ws.triggerMessage("UPDATE")
```

**setTimeout in Tests**: The JSDOM environment mocks setTimeout for client-side code:
```javascript
// In test code itself - these have real delays
await new Promise(resolve => setTimeout(resolve, 100)) // Actually waits 100ms

// But client-side timeouts (renderMessages.js, websocket.js) execute immediately in JSDOM
// So typing indicator timeouts, auto-refresh timers, etc. fire synchronously in tests
sendTypingIndicator(true, conversationId) // The 3-second timeout inside fires immediately
```

**getMoreRecent() Response Handling**: Ensure all data types are handled in startSession.js:
```javascript
// The getMoreRecent() function in startSession.js must handle all response data types
// Missing handlers will cause WebSocket updates to be ignored:
if (data.conversations?.length) {
  // Update cache and call renderConversations()
}
if (data.messages?.length) {
  // Update cache and call renderMessages()
}
// Similar patterns for posts, replies, activities, notifications
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

## Development Workflow

When working on tasks in this codebase, follow this workflow:
- Use the TodoWrite tool to plan the task if required
- Use the available search tools to understand the codebase and the user's query
- Implement the solution using all tools available to you
- **ALWAYS create comprehensive tests** without being asked:
  - **Client integration tests** for all user-facing functionality and UI interactions
  - **Server unit tests** for all session handlers and business logic
  - **Test all code paths** including error cases, edge conditions, and security validations
  - **Tests must remain part of the permanent test suite** - no temporary or throwaway tests
- **ALWAYS run `npm test` after making any changes** to verify everything still works
- **ALWAYS create a commit after tests pass** with a descriptive message about what was changed
- The user handles pushing to remote - you should only commit locally

### CRITICAL: Test-First Refactoring Workflow

When refactoring or cleaning up existing code that lacks tests:

1. **Write comprehensive tests FIRST** that exercise the functionality you're about to change
2. **Ensure ALL tests pass completely** with the original code - no failures, no exceptions, no "this will probably work"
3. **Only then** make your refactoring changes
4. **Verify tests still pass with identical results** after your changes
5. **Any test failure means your refactoring broke something** - fix the code, not the test

**Example of WRONG workflow (what NOT to do):**
```
❌ Write test for markdownToElements function
❌ See test has 13 passes, 2 failures
❌ "Oh those failures are probably just test issues, not real problems"
❌ Apply refactoring changes anyway
❌ Run test again, still has failures, assume refactoring worked
```

**Example of CORRECT workflow:**
```
✅ Write comprehensive test for markdownToElements function
✅ Fix test data and assertions until ALL tests pass (e.g. add missing line breaks for lists)
✅ Verify 100% pass rate with original code
✅ Apply refactoring changes (remove comments, modernize syntax, etc.)
✅ Run tests again - must have identical results (same number of passes, zero failures)
✅ If any test fails after refactoring, the refactoring broke something - fix the code
```

**The test is your contract:** If the test doesn't pass 100% before your changes, you have no way to verify that your changes preserved functionality. Test failures are not "probably fine" - they indicate real problems that must be fixed before proceeding.

### Test Coverage Requirements
**Every new feature must include:**
- Integration tests covering the complete user workflow from UI interaction to final state
- Unit tests for each server session handler with mocked dependencies
- Error case testing (invalid inputs, network failures, authorization failures)
- Security testing (blocked users, unauthorized access, input validation)
- Real-time functionality testing (WebSocket events, cache updates)

**Existing messaging feature test gaps that need addressing:**
- Missing server unit tests for complex scenarios (blocked users, conversation validation)
- Missing integration tests for error states and edge cases
- Incomplete coverage of image upload/deletion workflows
- No tests for typing indicator race conditions or WebSocket reconnection

## Debugging Philosophy
- **Test the suspected layer directly** - If you suspect database issues, write a minimal database test
- **Subtract complexity, don't add it** - Remove application layers to isolate the problem  
- **One variable at a time** - Change only the thing you're testing
- **Hypothesis-driven** - Form specific theories ("CockroachDB doesn't like ISO strings") and test them
- **Avoid cargo cult debugging** - Don't add logging everywhere, guard assertions, or "comprehensive" edge case testing before understanding the core issue

### WebSocket Race Condition Patterns
WebSocket connections can be deleted while message processing is still accessing them:

```javascript
// ❌ WRONG: Direct property access without checking existence
delete this.ws_active[ws_uuid].active_post_id

// ✅ CORRECT: Guard against deleted connections
if (this.ws_active[ws_uuid]) {
  delete this.ws_active[ws_uuid].active_post_id
}

// ✅ BETTER: Helper function for safe cleanup
clearConnectionProperties(ws_uuid) {
  if (this.ws_active[ws_uuid]) {
    delete this.ws_active[ws_uuid].active_post_id
    delete this.ws_active[ws_uuid].active_conversation_id
  }
}
```

## Anti-Patterns to Avoid
- **Debugging by addition** - Adding logging, complexity, or "safety" before understanding the problem
- **Shotgun debugging** - Changing multiple things hoping one fixes it
- **Environmental complexity** - When you suspect environment differences, test the underlying systems directly, don't add application-layer workarounds

## Messaging Feature Implementation Status

### Overview
The messaging feature is **partially implemented** with core functionality working but missing several components found in complete features like posts/replies.

### What's Implemented ✅
**Core Messaging**: Full CRUD operations for messages and conversations
- Server handlers: `sendMessage.js`, `getMessages.js`, `getConversations.js`, `createConversation.js`, `markMessageAsRead.js`
- Client rendering: `renderMessages.js`, `renderConversations.js`
- UI components: `showMessageModal.js`, `startConversationWithUser.js`

**Real-time Updates**: WebSocket integration works
- `MESSAGE_UPDATE` and `CONVERSATION_UPDATE` events in `websocket.js:7-16`
- Typing indicators with timeout handling in `websocket.js:95-107`
- Proper cache updates in `startSession.js:330-357`

**Security & Validation**: Complete implementation
- Blocked user checking in `sendMessage.js:52-70`
- Participant verification in `getMessages.js:14-34`
- Message ownership validation for editing in `sendMessage.js:72-84`

**Image Support**: Full implementation matching posts/replies
- Image upload, storage, and deletion in `sendMessage.js:131-155`
- Image rendering with click binding in `renderMessages.js:1-13`

**Push Notifications**: Complete implementation
- Both FCM and Web Push support in `sendMessage.js:176-291`
- Notification database tracking with `message_notifications` table
- Unread count calculation and badge updates

**Database Schema**: Properly normalized
- `conversations` table with participant arrays
- `messages` table with foreign keys
- `message_notifications` table for unread tracking

### What's Missing ❌
**AI Content Moderation**: Posts/replies have comprehensive AI checking, messaging does not
- Posts use AI for spam detection, content classification, and topic assignment (`savePost.js:59-264`)
- Replies use full conversation context for AI moderation (`saveReply.js:74-267`)
- Messages have **no AI moderation whatsoever** - any text OR images can be sent without review
- **Critical security gap**: Users can bypass content policies by sending inappropriate images via messages instead of posts
- **Missing pattern**: Messages should follow same AI evaluation as posts (`savePost.js:47-57`) for both text and image content before storage

**Infinite Scrolling**: Posts/replies support pagination, messaging does not
- Posts use `min_post_create_date` parameter for loading more content
- Messages only load from conversation start with basic `min_message_create_date`
- **No "load more messages" functionality** for long conversation histories

**Search & Discovery**: Missing compared to posts
- Posts have topic-based categorization and discovery
- Messages have **no search functionality** across conversations or message content
- **No conversation archiving or organization features**

**Advanced UI Features**: Several gaps compared to posts/replies
- **No message reactions** (posts have favorites)
- **No message threading** (replies have hierarchical structure)
- **No message polls** (posts support poll creation and voting)
- **No conversation management UI** (mute, archive, leave conversation)

**Content Analytics**: Missing metrics found in posts
- Posts track `reply_count`, `favorite_count`, `counts_max_create_date`
- Messages have **no equivalent metrics** or conversation statistics

### Integration Completeness
**WebSocket**: ✅ Full integration with proper event handling
**Cache System**: ✅ Properly integrated with `getMoreRecent()` in `startSession.js`
**Navigation**: ✅ Full routing support for `/messages/{id}` and `/conversations`
**Testing**: ✅ Comprehensive integration tests pass (`messaging_functionality.integration.test.js`, `messaging_complete_flow.integration.test.js`)

### Recommendation
The messaging feature is **NOT production-ready** due to the complete absence of content moderation, creating a serious security vulnerability. Priority gaps to address:

1. **AI Content Moderation** (CRITICAL) - Messages bypass all content policies, allowing spam/abuse/inappropriate images
2. **Infinite Scrolling** (High) - Essential for conversations with 50+ messages  
3. **Search Functionality** (Medium) - Important for user experience in active messaging

## Key Files
- `index.js`: Application entry point
- `server/server.js`: HTTP server and client file concatenation
- `client/flint.js`: Custom DOM manipulation library
- `runAllTests.js`: Test runner
- `server/session/`: Session middleware functions
- `tests/client/integration/`: Integration tests

## 10x Developer Principles

### Subtraction Over Addition
- **Before adding code, ask: "What can I remove?"**
- **Before adding abstraction, ask: "Is the concrete version actually clearer?"**
- **Before adding defensive code, ask: "Will this actually help debugging?"**

### Hypothesis-Driven Development
- **Form specific theories before investigating**
- **Test one variable at a time**
- **Go directly to the source layer (database, API, DOM) rather than adding application-layer debugging**

### Signal vs Noise Optimization
- **Every line of code should either solve the problem or help debug it**
- **Eliminate ceremony, boilerplate, and "just in case" code**
- **Prefer failures that give actionable information**

## Red Flags to Avoid
- Adding logging before understanding the problem
- Creating "comprehensive" test coverage before understanding the actual failure modes
- Following "best practices" without understanding the underlying context
- Defensive programming that obscures rather than clarifies issues