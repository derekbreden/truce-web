# Messaging Feature TODO

## Remaining Tasks

### 1. Apply Push Notification Filtering to Post Replies
- **Current**: Only message notifications use the new filtering system
- **Need**: Apply same logic to `saveReply.js` for post reply notifications
- **Logic**: If user has active WebSocket → instant alert + auto-read, else push notification
- **Location**: `server/session/saveReply.js` lines 439-597
- **Note**: Uses `isUserActivelyViewingPost()` instead of conversation-specific logic

### 2. Add Cleanup/Timeout for Notification Queue
- **Current**: Notifications remain queued indefinitely until WebSocket disconnect
- **Need**: Periodic cleanup of old queued notifications (5-10 minute timeout)
- **Purpose**: Prevent memory leaks and ensure notifications aren't lost for hours
- **Implementation**: Background cleanup job or timeout-based flushing

### 3. Handle Multiple Device/Session Edge Cases  
- **Current**: User might have WebSocket on phone but not seeing notification on desktop
- **Need**: Consider device-specific notification preferences or cross-device coordination
- **Complexity**: Low priority since current implementation covers primary use case

### 4. Add Integration Test for End-to-End Notification Filtering
- **Current**: Unit tests cover individual functions, no full flow test
- **Need**: Integration test showing: active user → instant alert → acknowledgment → no push
- **Scope**: Test both message and reply notification filtering
- **File**: Create `tests/client/integration/notification_filtering_complete.integration.test.js`

### 5. Consider Notification Batching for Multiple Messages
- **Current**: Each message creates separate instant alert
- **Need**: If user receives 5 messages while app open, show single "5 new messages" alert
- **Complexity**: Requires debouncing and message grouping logic
- **Priority**: Enhancement, not critical

### 6. Add Admin/Debug Interface for Notification Queue
- **Current**: No visibility into queued notifications for debugging
- **Need**: Simple endpoint to view pending notifications per user
- **Use case**: Debugging stuck notifications or understanding queue behavior
- **Priority**: Low - only needed if issues arise in production
