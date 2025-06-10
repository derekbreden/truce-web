# Messaging Feature TODO

## High Priority Issues

### 1. Conversation Unread Indicator Always Shows Blue Dot
- **Problem**: No client-side logic to mark message notifications as read when entering a conversation
- **Location**: `renderConversations.js:43-45` (conversation click handler)
- **Fix**: Add call to `markMessageAsRead` when clicking into a conversation
- **Impact**: Users can't clear unread indicators

### 2. Missing Infinite Scroll Implementation
- **Conversations List**: No infinite scroll - `onScroll.js` excludes messaging paths (line 9-10)
- **Messages List**: No infinite scroll for loading older messages
- **Pattern**: Use `max_create_date` pattern like other features
- **Location**: Add to `onScroll.js` and implement server-side pagination
- **Impact**: Limited to 50 conversations/messages max

### 3. No Message Read Marking on Conversation Entry
- **Problem**: Messages not marked as read when entering conversation view
- **Available**: `markMessageAsRead` endpoint exists but never called
- **Location**: `renderMessages.js` needs read marking logic
- **Impact**: Messages remain unread even after viewing

## Medium Priority Issues

### 4. Poor Empty State for Conversations
- **Current**: Generic "Nothing to see here" in `renderConversations.js:72`
- **Expected**: Icon-based pattern like favorites page
- **Pattern**: `renderActivities.js:14-17` shows proper pattern with icon and instructions
- **Fix**: Replace with message icon and instructional text

### 5. Missing WebSocket Message Read Updates
- **Problem**: No real-time updates when messages marked as read in other sessions
- **Current**: Only MESSAGE_UPDATE and CONVERSATION_UPDATE
- **Need**: READ_STATUS_UPDATE for real-time read state sync
- **Location**: `websocket.js` and server WebSocket handling

### 6. No Scroll-to-Bottom on New Messages
- **Problem**: New messages don't auto-scroll to bottom via WebSocket updates
- **Current**: Only scrolls on initial render in `renderMessages.js:147`
- **Fix**: Add scroll logic to WebSocket message handler

### 7. Message Edit Missing Conversation ID Fallback
- **Problem**: `showMessageModal.js:325` uses `state.active_conversation_id` fallback
- **Risk**: Could fail if state not properly set
- **Fix**: Pass conversation_id explicitly to edit modal

## Low Priority Issues

### 8. Inconsistent Action Patterns
- **Problem**: Message sending uses `action: "sendMessage"` but other endpoints use direct approach
- **Location**: `showMessageModal.js` and `renderMessages.js`
- **Fix**: Standardize to match other session endpoints

### 9. Inconsistent Empty State Patterns
- **Messages**: Uses generic "Nothing to see here" in `renderMessages.js:139`
- **Fix**: Match favorites pattern with relevant icon and instructions

### 10. Missing Error Handling for Blocked Users
- **Problem**: Server properly blocks, but client shows generic network errors
- **Fix**: Handle specific "user blocked" error messages in client
- **Location**: Message sending and conversation creation error handlers

### 11. CSS/Styling Issues
- **Unread Indicator**: `style.css:2706` defines `unread-indicator` but code creates `unread-count`
- **Missing**: `conversation[unread]` styling for visual distinction
- **Fix**: Align CSS selectors with actual DOM structure

### 12. Conversation Header Shows Redundant Info
- **Problem**: Message header shows filtered participants correctly, but could be clearer
- **Location**: `renderMessages.js:116-118`
- **Status**: Actually working correctly, low priority

## Technical Debt

### Server-Side Improvements
- Add pagination support to `getConversations.js` and `getMessages.js`
- Add WebSocket events for read status updates
- Standardize error response format for blocked user scenarios

### Client-Side Improvements  
- Consolidate message marking logic into reusable functions
- Add proper TypeScript-style JSDoc comments for messaging functions
- Implement consistent error handling patterns across all message operations

### Testing Gaps
- No integration tests for infinite scroll behavior
- Missing tests for read/unread state management
- No tests for WebSocket message updates
- Missing tests for blocked user scenarios

## Notes

- Follow existing patterns from other features (posts, replies, notifications)
- Maintain consistency with established UI/UX patterns
- Test thoroughly with multiple users and conversations
- Consider performance impact of frequent read status updates