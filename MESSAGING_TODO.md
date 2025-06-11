# Messaging Feature TODO

### 1. Missing Infinite Scroll Implementation
- **Conversations List**: No infinite scroll - `onScroll.js` excludes messaging paths (line 9-10)
- **Messages List**: No infinite scroll for loading older messages
- **Pattern**: Use `max_create_date` pattern like other features
- **Location**: Add to `onScroll.js` and implement server-side pagination
- **Impact**: Limited to 50 conversations/messages max

### 2. No Message Read Marking on Conversation Entry
- **Problem**: Messages not marked as read when entering conversation view
- **Available**: `markMessageAsRead` endpoint exists but never called
- **Location**: `renderMessages.js` needs read marking logic
- **Impact**: Messages remain unread even after viewing

### 3. Poor Empty State for Conversations
- **Current**: Generic "Nothing to see here" in `renderConversations.js:72`
- **Expected**: Icon-based pattern like favorites page
- **Pattern**: `renderActivities.js:14-17` shows proper pattern with icon and instructions
- **Fix**: Replace with message icon and instructional text

### 4. Missing WebSocket Message Read Updates
- **Problem**: No real-time updates when messages marked as read in other sessions
- **Current**: Only MESSAGE_UPDATE and CONVERSATION_UPDATE
- **Need**: READ_STATUS_UPDATE for real-time read state sync
- **Location**: `websocket.js` and server WebSocket handling

### 5. No Scroll-to-Bottom on New Messages
- **Problem**: New messages don't auto-scroll to bottom via WebSocket updates
- **Current**: Only scrolls on initial render in `renderMessages.js:147`
- **Fix**: Add scroll logic to WebSocket message handler

### 6. Broken Message Edit Functionality
- **Problem**: `renderMessages.js:80` calls `showEditMessageModal(message)` but function doesn't exist
- **Risk**: Clicking edit button causes JavaScript runtime error
- **Fix**: Remove edit button, this is advanced and not needed
