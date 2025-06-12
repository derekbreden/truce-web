# Messaging System TODO

## Executive Summary

**What Works**: Session-based WebSocket authentication, unified push handling, instant alert vs push fallback logic, proper connection cleanup.

**Core Flow**: User connects → sends `session_uuid` → server validates → tracks active conversations/posts → routes notifications (instant alert if active, push if not) → client acknowledges → cleanup.

**Priority Issues**: Database connection leaks, incomplete error handling, notification queue memory leaks, circular dependencies, inconsistent message formatting.

---

## Critical Issues (Fix First)

### 1. **Database Connection Management**
**Files**: `server/websocket.js:39`, `server/websocket.js:46`
**Issue**: Multiple `pool_client` connections opened in WebSocket handlers, not always released
**Risk**: Connection pool exhaustion under load
**Fix**: Centralize connection handling, ensure release in all code paths
**Code**: 
```javascript
// Currently: connections opened but not always released
const pool_client = await pool.pool.connect()
// Missing: pool_client.release() in error cases
```

### 2. **Critical Logic Bug in Push Notification Loop**
**File**: `server/push.js:100`
**Issue**: `return` statement exits entire function instead of continuing loop
**Impact**: Only first user with active WebSocket gets processed, others ignored
**Fix**: Change `return` to `continue`
**Code**:
```javascript
// BUG: This exits the entire function
if (user_details[subscription.user_id].has_active_websocket) {
    return // Should be 'continue'
}
```

### 3. **Incomplete Logic Branch**
**File**: `server/push.js:52`
**Issue**: Comment "If we are in this code" with no implementation
**Risk**: Unhandled state that could cause silent failures
**Fix**: Complete the logic or remove dead code

### 4. **JSON Parsing Without Error Handling**
**File**: `server/websocket.js:40`
**Issue**: `JSON.parse(buffer.toString())` can crash entire WebSocket server
**Fix**: Wrap in try/catch, handle malformed JSON gracefully

---

## Resource Management Issues

### 5. **Notification Queue Memory Leak**
**File**: `server/websocket.js:205-229`
**Issue**: `pending_push_notifications` grows indefinitely, only cleaned on acknowledgment
**Risk**: Memory exhaustion with unacknowledged notifications
**Fix**: Time-based cleanup (5-10 minute timeout)
**Implementation**: Background job or setTimeout-based cleanup

### 6. **WebSocket Connection Cleanup Race Conditions**
**Files**: `server/websocket.js:19-35`
**Issue**: Rapid connect/disconnect could leave stale references
**Scenario**: User closes browser, reconnects quickly - old cleanup interferes with new connection
**Fix**: More defensive checks, connection state validation

---

## Architecture Issues

### 7. **Circular Dependency Risk**
**Files**: `server/websocket.js:221` ↔ `server/push.js:9`
**Issue**: `websocket.js` requires `./push`, `push.js` requires `./websocket`
**Risk**: Module loading issues, tight coupling
**Fix**: Extract shared interfaces or invert dependency structure

### 8. **Session UUID Database Query on Every Message**
**File**: `server/websocket.js:46-61`
**Issue**: Session validation query runs on every WebSocket message
**Performance Impact**: N+1 query problem for active users
**Fix**: Cache session → user_id mapping, invalidate on session changes

---

## Data Consistency Issues

### 9. **Inconsistent Push Message Formatting**
**Files**: `server/session/sendMessage.js:192` vs `server/session/saveReply.js:478`
**Issue**: Messages show "replied" instead of "sent a message"
**User Impact**: Confusing notifications
**Fix**: Standardize message templates, extract to shared module

### 10. **Unread Count Query Performance**
**File**: `server/push.js:54-76`
**Issue**: Complex UNION query runs for every notification recipient
**Performance**: O(users × notifications) database load
**Fix**: Cache unread counts, update incrementally

---

## Missing Functionality

### 11. **No Integration Test for Core Flow**
**Missing**: Two browser windows → send message → instant alert → close window → push notification
**Risk**: Core functionality could break without detection
**Priority**: Essential for confident development

### 12. **No Notification Suppression Logic**
**Issue**: Instant alerts show even when user is viewing the conversation
**Expected**: Suppress UI alerts when user is actively viewing source
**Current Code**: `data.suppress_ui` exists but not implemented in routing logic

### 13. **Typing Indicator Memory Leak**
**File**: `client/websocket.js:121-135`
**Issue**: `typing_timeout` global variable, no cleanup on page navigation
**Fix**: Clear timeout on navigation, scope to conversation

---

## Code Quality Issues

### 14. **Magic Numbers and Configuration**
**Examples**: 
- Message truncation: 20 chars (line 476), 50 chars (line 479)
- Typing timeout: 3000ms (line 132)
- No configuration for VAPID keys, Firebase settings
**Fix**: Centralized configuration management

### 15. **Limited Error Logging**
**Files**: Throughout WebSocket and push handling
**Issue**: Errors logged but no context about notification flow
**Need**: Structured logging with user_id, notification_id, flow step

### 16. **Inconsistent Async Patterns**
**Examples**: 
- `push.js:96` uses forEach with async (won't wait)
- `websocket.js:255` uses forEach instead of for...of
**Fix**: Consistent async/await patterns

---

## Testing Infrastructure Needs

### 17. **Unit Test Coverage Gaps**
**Missing**: WebSocket connection lifecycle, notification acknowledgment flow
**Current**: Basic functionality tested, but not error scenarios
**Need**: Edge case coverage (malformed JSON, connection drops, etc.)

### 18. **Load Testing Requirements**
**Missing**: Performance testing under concurrent WebSocket connections
**Scenarios**: 100+ concurrent users, rapid message sending, connection churn
**Metrics**: Memory usage, connection pool utilization, notification latency

---

## Security Considerations

### 19. **Session Validation Caching**
**Current**: Session UUID validated on every WebSocket message
**Security Risk**: If caching implemented incorrectly, stale sessions could persist
**Balance**: Performance vs security, proper cache invalidation

### 20. **WebSocket Message Size Limits**
**Missing**: No limits on incoming WebSocket message size
**Risk**: Memory exhaustion attacks via large JSON payloads
**Fix**: Implement message size limits, rate limiting

---

## Implementation Priority

**Phase 1 (Critical Stability)**:
1. Fix push notification loop bug (#2)
2. Add database connection cleanup (#1)
3. Handle JSON parsing errors (#4)

**Phase 2 (Resource Management)**:
4. Implement notification queue cleanup (#5)
5. Fix circular dependency (#7)
6. Add session caching (#8)

**Phase 3 (User Experience)**:
7. Fix message formatting (#9)
8. Add notification suppression (#12)
9. Optimize unread counts (#10)

**Phase 4 (Quality & Testing)**:
10. Add integration tests (#11)
11. Centralize configuration (#14)
12. Improve error logging (#15)

**Principle**: Preserve the elegant simplicity that makes the current system work. Every change should make the code easier to understand and debug, not more complex.