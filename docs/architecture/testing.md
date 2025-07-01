# Testing Architecture

## Overview

Full-stack integration testing that runs the complete application stack in JSDOM, enabling 25+ complex scenarios to complete in ~8 seconds with zero external dependencies.

## Core Approach

**Complete Environment Simulation**
- Full Node.js backend with business logic
- Complete client-side JavaScript with real DOM
- In-memory PostgreSQL-compatible database
- Bidirectional WebSocket communication
- Real image processing with Canvas API
- Multi-user concurrent testing with isolated sessions

## Key Components

### setupTestEnvironment()
Creates complete application environment with:
- JSDOM with full DOM and script execution
- In-memory SQLite with PostgreSQL compatibility
- Mocked external services (S3, OpenAI, email)
- Complete client-side application loaded
- User session initialization

### PostgreSQL-to-SQLite Translation
Real-time SQL translation handling:
- Array parameter syntax (`ANY($1::int[])`)
- PostgreSQL functions (`STRING_AGG`, `NOW()`, `INTERVAL`)
- Case-insensitive search (`ILIKE`)
- JSON operations

### Mock External Services
Mock only external boundaries, preserve internal logic:
- S3 upload with real image processing
- OpenAI with configurable test responses
- Email sending with template verification
- All application logic runs in production mode

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

Any test can generate screenshots:
```bash
npm test message.typing capture
```

Generates PNG files showing exact UI state during test execution.

## Performance Characteristics

- **Database**: In-memory, millisecond response times
- **WebSocket**: Synchronous, zero latency  
- **Image processing**: Real Canvas API
- **AI integration**: Zero external calls

**Result**: Complex integration tests that would traditionally take 10-20 minutes run in seconds.

## Test Coverage

Tests cover complete user journeys:
- Post creation with AI moderation
- Real-time messaging with typing indicators
- User authentication and session management
- Multi-user interactions and blocking
- Image upload and processing pipelines

## Why This Matters

**Traditional testing forces a choice: speed or confidence.**

This architecture delivers both - comprehensive integration testing that's fast enough to run on every code change, changing developer behavior from "skip the tests" to "tests as safety net."