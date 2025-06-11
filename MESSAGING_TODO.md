# Messaging Feature TODO

### 1. Missing Infinite Scroll Implementation
- **Conversations List**: No infinite scroll - `onScroll.js` excludes messaging paths (line 9-10)
- **Messages List**: No infinite scroll for loading older messages
- **Pattern**: Use `max_create_date` pattern like other features
- **Location**: Add to `onScroll.js` and implement server-side pagination
- **Impact**: Limited to 50 conversations/messages max

### 2. Missing WebSocket Message Read Updates
- **Problem**: No real-time updates when messages marked as read in other sessions
- **Current**: Only MESSAGE_UPDATE and CONVERSATION_UPDATE
- **Need**: READ_STATUS_UPDATE for real-time read state sync
- **Location**: `websocket.js` and server WebSocket handling
