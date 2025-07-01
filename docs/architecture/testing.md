# Testing Architecture

## Overview

Full-stack integration testing that runs the complete application stack in JSDOM, enabling 25+ complex scenarios to complete in ~8 seconds with zero external dependencies.

## Core Approach

**Complete Environment Simulation**
- Full Node.js backend with business logic
- Complete client-side JavaScript with real DOM (`testSetupHelpers.js`)
- In-memory PostgreSQL-compatible database with deterministic timestamps
- Bidirectional WebSocket communication with typing indicators and instant alerts
- Real image processing with Canvas API and base64 data handling
- Multi-user concurrent testing with isolated sessions via `beforeParse` hooks

## Key Components

### setupTestEnvironment()
Creates complete application environment with:
- JSDOM with full DOM and script execution
- In-memory SQLite with PostgreSQL compatibility
- Mocked external services (S3, OpenAI, email)
- Complete client-side application loaded
- User session initialization

### PostgreSQL-to-SQLite Translation
Real-time SQL translation in `testSqliteSetup.js` handling:
- Array parameter flattening: `ANY($1::int[])` → `IN (?, ?, ?)` with parameter expansion
- PostgreSQL functions: `STRING_AGG` → `GROUP_CONCAT`, `NOW()` → deterministic timestamps
- Case-insensitive search: `ILIKE` → `LIKE COLLATE NOCASE`
- Complex UPDATE-FROM subqueries converted to SQLite-compatible syntax
- Automatic triggers for deterministic timestamp generation across related tables

### Mock External Services
Mock only external boundaries (`testSetupHelpers.js`), preserve internal logic:
- **S3**: In-memory storage with `PutObjectCommand`/`GetObjectCommand` simulation
- **OpenAI**: Configurable responses per test setup with AI content moderation flows
- **WebSocket**: Bidirectional client-server communication with real typing indicators
- **Email**: Template verification with `nodemailer` mock storing sent emails in `global.test_email_sent`
- **Images**: Full Canvas API processing with base64 encoding/decoding and resize operations
- All application logic runs in production mode with zero network calls

## Test Patterns

### Multi-User Testing
```javascript
const user_a = await setupTestEnvironment()
const user_b = await setupTestEnvironment({
    beforeParse: (w) => w.localStorage.setItem("session_uuid", "user-b")
})

// Both users interact simultaneously
$a("button").click()
$b("textarea").value = "Hello"
$b("button[submit]").click()

// Verify both perspectives
assertEquals("Hello", $a("messages message:last-child").textContent)
```

### Async Coordination
```javascript
// Allow async operations to complete
await new Promise(resolve => setTimeout(resolve, 0))
```

### DOM-First Verification
```javascript
// Assert against user-visible UI state
assertEquals("Read", $("message read-status").textContent)
assertEquals(true, Boolean($("typing-indicator")))
```

## Visual Debugging

Any test can generate screenshots for debugging display and styling issues:
```bash
npm test message.typing capture          # Single test with screenshots
npm test capture                         # All tests with screenshots  
npm test notifications.simple capture    # Multiple tests with visual capture
```

**Screenshot Details:**
- Automatically captured at key test points via `testVisualHelpers.js`
- Saved to `tests/capture/` with naming pattern: `{testname}-{function}-{index}-{theme}.png`
- Directory cleared each run to prevent leftover files
- Light/dark theme variants captured based on `DARK_MODE` environment variable
- Canvas-rendered with font smoothing disabled for pixel-perfect consistency

**Use Cases:**
- Debug layout bugs and styling issues hard to catch without visual verification  
- Verify UI state during complex multi-user interactions (typing indicators, alerts)
- Compare against baseline screenshots in `tests/capture-baseline/` for regression testing

## Performance Characteristics

- **Database**: In-memory, millisecond response times
- **WebSocket**: Synchronous, zero latency  
- **Image processing**: Real Canvas API
- **AI integration**: Zero external calls

**Result**: Complex integration tests that would traditionally take 10-20 minutes run in seconds.

## Test Coverage

Tests cover complete user journeys with real production code paths:

**Real-Time Communication:**
- WebSocket typing indicators (`message.typing.test.js`): User A types → heartbeat sent → User B sees indicator
- Message delivery with instant alerts and read receipts
- Multi-user conversation state synchronization

**Content Creation & Moderation:**
- Post creation with AI content flagging and spam detection (`message.moderation.test.js`)
- Image upload with Canvas processing, S3 storage, and retrieval  
- Reply threading with notification systems

**User Interactions:**
- Authentication flows with session management and password resets
- User blocking with UI state updates across multiple user sessions
- Profile picture handling with image processing pipeline

**Navigation & State Management:**
- Deep linking with client-side routing and browser history
- Infinite scroll loading with database pagination
- Cross-page state persistence and WebSocket path tracking

Each test exercises the complete stack from UI interaction → client-side JS → HTTP/WebSocket → database → response → UI update.

## Why This Matters

**Traditional testing forces a choice: speed or confidence.**

This architecture delivers both - comprehensive integration testing that's fast enough to run on every code change, changing developer behavior from "skip the tests" to "tests as safety net."

**Key Innovation:**
Rather than mocking application code or using test databases that behave differently from production, this approach runs 100% of the actual production codebase in an accelerated environment. Every function call, database query, WebSocket message, and UI update that happens in production also happens in tests - just without network latency, disk I/O, or external service delays.

**Developer Impact:**
- Tests complete in seconds, not minutes, encouraging frequent execution
- Visual debugging with screenshots provides immediate feedback on UI issues
- Multi-user scenarios can be debugged by examining both user perspectives simultaneously
- Production bugs are caught by tests because the same code paths execute in both environments