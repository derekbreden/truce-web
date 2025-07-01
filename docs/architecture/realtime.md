# Real-Time Architecture

## WebSocket Primary Pattern: Update Notifications

**Core Pattern**: WebSocket sends simple notifications, client fetches data via HTTP.

### Main Flow
1. **Server event occurs** (new post, message, etc.)
2. **Server sends WebSocket message**: `"UPDATE"` (plain string)
3. **Client receives UPDATE**: Calls `getMoreRecent()`
4. **Client makes HTTP request**: POST to `/session` with current data timestamps
5. **Server responds with new data**: Only items newer than client timestamps
6. **Client updates UI**: Merges new data and re-renders

### Implementation
```javascript
// Server side - when content changes
req.sendWsMessage("UPDATE", { post_id: post_id })

// Client side - WebSocket handler
ws.addEventListener("message", (event) => {
    if (event.data === "UPDATE") {
        getMoreRecent()  // Makes HTTP call to fetch fresh data
    }
})
```

## Session Requirements

**WebSocket connections do NOT require sessions** for basic UPDATE notifications.

**Session required for**:
- `INSTANT_ALERT` - user-specific notifications
- `TYPING_HEARTBEAT` - conversation participation
- User-scoped message routing

**No session required for**:
- Basic `"UPDATE"` messages
- Path tracking for public content
- Connection establishment

### Authentication Flow
```javascript
// Optional session association
if (message.session_uuid) {
    // Look up user_id for this session
    ws.user_id = lookupUserId(message.session_uuid)
}
```

## Rare Exceptions: Direct Data Transfer

**These patterns bypass the UPDATE → HTTP flow**:

### Instant Alerts
```javascript
{
    type: "INSTANT_ALERT",
    push_data: { title: "New Reply", body: "..." },
    reply_notification_id: 123
}
```

### Typing Indicators  
```javascript
{
    type: "TYPING_INDICATOR", 
    conversation_id: 456,
    user_id: 789
}
```

**Note**: These are exceptions to the main pattern. Most real-time updates use the UPDATE → HTTP pattern.

## Connection Management

### Client-Side
```javascript
const reconnectWs = () => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    state.ws = new WebSocket(`${protocol}//${window.location.host}`)
    
    state.ws.addEventListener("open", () => {
        // Send current path for context-aware updates
        state.ws.send(JSON.stringify({ 
            path: state.path,
            session_uuid: state.session_uuid  // Optional
        }))
    })
}
```

### Server-Side Context Tracking
Server tracks what each client is viewing for targeted updates:

```javascript
// Posts/replies
if (message.path.startsWith("/post/")) {
    ws.active_post_id = extractPostId(message.path)
}

// Conversations  
if (message.path.startsWith("/messages/")) {
    ws.active_conversation_id = extractConversationId(message.path)
}
```

## Data Freshness via HTTP

The `getMoreRecent()` function makes intelligent HTTP requests:

```javascript
fetch("/session", {
    method: "POST",
    body: JSON.stringify({
        path: current_path,
        min_post_create_date: client_max_post_date,
        min_reply_create_date: client_max_reply_date,
        min_message_create_date: client_max_message_date,
        // ... other timestamps
    })
})
```

Server responds with only data newer than client timestamps, enabling efficient incremental updates.

## Why This Pattern

**Benefits**:
- **Simple WebSocket logic**: Just notification, not data transfer
- **Efficient bandwidth**: HTTP requests only fetch needed data  
- **Resilient**: HTTP handles errors, retries, caching
- **Scalable**: WebSocket servers don't hold application state

**Trade-offs**:
- **Extra HTTP request**: Not truly real-time (UPDATE → fetch delay)
- **More complex client logic**: Must coordinate WebSocket + HTTP

This pattern prioritizes reliability and efficiency over absolute real-time speed.