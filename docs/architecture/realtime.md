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
// Server side - when content changes (savePost.js)
req.sendWsMessage("UPDATE", { post_id: post_id })

// Client side - WebSocket handler (websocket.js)
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
    reply_notification_id: 123,
    message_notification_id: 456
}
```

**Acknowledgment Flow:**
- Client receives instant alert and shows notification banner
- Client sends `INSTANT_ALERT_ACK` with notification IDs
- Server removes notification from push queue to prevent duplicate push notifications

### Typing Indicators  
```javascript
{
    type: "TYPING_INDICATOR", 
    conversation_id: 456,
    user_id: 789
}
```

**Real-time Flow:**
- User types → sends `TYPING_HEARTBEAT` every 1.5 seconds
- Server forwards `TYPING_INDICATOR` to conversation participants  
- Client shows/hides typing indicator with 3-second timeout

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
Server tracks what each client is viewing for targeted updates (`websocket.js`):

```javascript
// Posts/replies - extract from URL slug
if (message.path.startsWith("/post/")) {
    const post = await pool_client.query(`SELECT post_id FROM posts WHERE slug = $1`, 
        [message.path.split("/")[2]])
    ws.active_post_id = post.rows.length ? post.rows[0].post_id : false
}

// Conversations - verify user participation
if (message.path.startsWith("/messages/")) {
    const conversation_id = Number(message.path.split("/")[2])
    const access_check = await pool_client.query(
        `SELECT conversation_id FROM conversation_users WHERE conversation_id = $1 AND user_id = $2`,
        [conversation_id, ws.user_id])
    ws.active_conversation_id = access_check.rows.length ? conversation_id : false
}
```

**Smart Targeting Logic (`websocket.js`):**
- **post_id**: Send to clients viewing that post OR clients with no `active_post_id` set
- **user_id**: Send to that specific user OR clients with no `user_id` set
- **conversation_id**: Send to clients in that conversation OR clients with no `active_conversation_id` set

This allows both authenticated and anonymous users to receive relevant updates.

## Data Freshness via HTTP

The `getMoreRecent()` function (`startSession.js`) makes intelligent HTTP requests:

```javascript
fetch("/session", {
    method: "POST", 
    body: JSON.stringify({
        path: current_path,
        min_post_create_date: client_max_post_date,
        min_reply_create_date: client_max_reply_date,
        min_message_create_date: client_max_message_date,
        min_notification_unread_create_date: client_max_notification_unread_date,
        min_notification_read_create_date: client_max_notification_read_date,
        min_conversation_last_activity_date: client_max_conversation_last_activity_date,
        min_counts_create_date,  // For reply/favorite counts
        // ... other timestamps
    })
})
```

**Smart Incremental Updates:**
- Client sends timestamps for ALL content types but **path determines which queries run**:
  - `/post/[slug]` → Posts and replies queries (uses `min_post_create_date`, `min_reply_create_date`)
  - `/messages/[id]` → Messages query (uses `min_message_create_date`)
  - `/notifications` → Notifications query (uses notification timestamps)
  - `/conversations` → Conversations query (uses `min_conversation_last_activity_date`)
- Server returns only items newer than relevant timestamps for that path
- Client merges new items, removes duplicates, and re-renders
- Preserves scroll position and flashes new content

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