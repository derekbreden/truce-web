# API Endpoints Reference

## API Architecture Overview

All endpoints are handled through a **single `/session` route** with middleware chain processing:
- **Middleware pattern**: 20+ middleware functions process each request sequentially  
- **Request accumulation**: Middleware adds results to `req.results` object
- **Path-based routing**: `req.body.path` determines which middleware executes
- **Session validation**: Optional authentication via `session_uuid` cookie/header
- **Denormalized counters**: Updates trigger count recalculation with `counts_max_create_date`

## Session Requirements

**Authentication Required** (checks `req.session.user_id`):
- All `save*` endpoints (creating content)
- User-specific data: `getFavorites`, `getNotifications`, `getMessages`
- Profile management: `updateDisplayName`, `saveProfilePicture`
- Account actions: `handleRemoveAccount`

**No Authentication Required**:
- Session creation: `createSessionIfNotExists`, `signUpOrSignIn`
- Public data: `getTopics`, public post viewing (some fields filtered)
- Password reset: `promptToUsePasswordReset`, `useResetToken`

## Session Management

### Authentication & Session Creation
```http
POST /session
{
    "email": "user@example.com",
    "password": "password123"
}
```

- **`signUpOrSignIn`**: Handles both account creation and login
  - Checks if email exists, creates account if not
  - Uses bcrypt for password hashing (12 rounds)
  - Special handling for admin account via `ROOT_EMAIL` env var
  - Creates `user_sessions` link between user and session

- **`createSessionIfNotExists`**: Always creates new session
  - Generates UUID for `session_uuid`
  - Sets HttpOnly secure cookie
  - Fallback to Authorization header for Android compatibility

### Password Reset Flow
```http
POST /session
{
    "email": "user@example.com",
    "forgot_password": true
}
```

- **`generateResetToken`**: Creates UUID token, sends email
- **`useResetToken`**: Validates token and updates password
- No session required for password reset completion

## Content Management

### Posts & Replies
```http
POST /session
{
    "title": "Post title",
    "body": "Post content",
    "pngs": [{"url": "data:image/png;base64,..."}],
    "poll_1": "Option A",
    "poll_2": "Option B"
}
```

- **`savePost`**: Complex workflow with AI moderation
  - OpenAI content evaluation for spam/inappropriate content
  - S3 image upload with UUID-based keys
  - Topic classification via AI
  - Poll estimation via AI
  - Slug generation with collision handling
  - WebSocket notification: `req.sendWsMessage("UPDATE", {post_id})`

- **`saveReply`**: Similar to posts but with threading
  - Parent post or reply ID required
  - Reply ancestor tracking for nested threads
  - Automatic reply count updates on parent post

### Content Retrieval
```http
POST /session
{
    "path": "/posts",
    "min_post_create_date": "2024-01-01T00:00:00Z"
}
```

- **`getPagePosts`**: Path-based content filtering
  - Supports `/posts`, `/posts/all`, `/topic/{name}`, `/user/{slug}`
  - Blocked user and flagged content filtering
  - Incremental loading with timestamp-based pagination
  - Complex JOINs for favorited status, user verification

- **`getSinglePost`**: Individual post with full reply tree
- **`getSingleThread`**: Edit mode for existing posts

## Real-Time Communication

### Conversations & Messages
```http
POST /session
{
    "other_user_id": 123
}
```

- **`saveConversation`**: Creates or finds existing conversation
  - Checks for existing conversation between participants
  - Two-user conversations only
  - Creates `conversation_users` entries for both participants

```http
POST /session
{
    "path": "/messages/456",
    "min_message_create_date": "2024-01-01T00:00:00Z"
}
```

- **`getMessages`**: Conversation message history
  - Participant verification required
  - Read/unread status tracking
  - Blocked user filtering
  - Bidirectional read receipts

## User Interactions

### Social Features
```http
POST /session
{
    "post_id_to_favorite": 123,
    "was_favorited": false
}
```

- **`saveFavorite`**: Optimistic UI pattern
  - Immediate count updates with `COALESCE(subquery.favorite_count, 0)`
  - Supports both posts and replies
  - Updates `counts_max_create_date` for client sync

- **`saveBlocked`**: User blocking with content filtering
- **`saveSubscribeToUser`**: Follow/unfollow functionality
- **`saveFlagged`**: Content moderation reporting

### Profile Management
```http
POST /session
{
    "display_name": "New Name"
}
```

- **`updateDisplayName`**: Display name with collision handling
  - `display_name_index` for duplicate names
  - Slug generation for URLs

- **`saveProfilePicture`**: S3 image upload with UUID keys

## Data Synchronization

### Incremental Updates
```http
POST /session
{
    "path": "/posts",
    "min_counts_create_date": "2024-01-01T00:00:00Z",
    "has_posts": true,
    "has_replies": false
}
```

- **`getUpdatedCounts`**: Efficient count synchronization
  - Only returns counts changed after `min_counts_create_date`
  - Separate queries for posts vs replies based on page content
  - Supports client-side count updates without full re-render

### Notifications & Activity
- **`getNotifications`**: User activity feed with read/unread status
- **`getConversations`**: Conversation list with unread counts and last message preview

## Account Management

### Account Deletion
```http
POST /session
{
    "remove_account": true
}
```

- **`handleRemoveAccount`**: Complete data purge
  - S3 image deletion (posts, replies, profile pictures)
  - Cascading deletes across all user data
  - Denormalized counter recalculation for remaining content
  - Session invalidation and new session creation

## Polling System

### Poll Voting
```http
POST /session
{
    "post_id": 123,
    "poll_choice": 2
}
```

- **`savePollChoice`**: Real-time poll updates
  - Vote recording with choice validation (1-4)
  - Aggregate count calculation
  - Updates post's `poll_counts` field
  - Triggers `counts_max_create_date` for sync

## Middleware Chain Pattern

All requests flow through `handleSession.js` middleware chain:

```javascript
// 1. Session validation
await require("./session/validateSessionUuid")(req, res)

// 2. Content retrieval
await require("./session/getNotifications")(req, res)
await require("./session/getPagePosts")(req, res)

// 3. Content modification
await require("./session/savePost")(req, res)
await require("./session/saveReply")(req, res)

// 4. Return accumulated results
res.end(JSON.stringify(req.results))
```

**Request State Pattern**:
```javascript
req.session = { user_id: "", display_name: "", ... }
req.results = { posts: [], replies: [], notifications: [], ... }
```

## Common Patterns

### Response Formats
**Success Response**:
```javascript
{
    success: true,
    user_id: 123,
    display_name: "Username",
    // endpoint-specific data
}
```

**Error Response**:
```javascript
{
    error: "Specific error message"
}
```

### Authentication Pattern
```javascript
if (!res.writableEnded && req.session.user_id && req.body.required_field) {
    // Process authenticated request
    res.end(JSON.stringify({ success: true }))
}
```

### WebSocket Integration
Content-modifying endpoints trigger real-time updates:
```javascript
req.sendWsMessage("UPDATE", { post_id: post_id })
```

### Timestamp-Based Sync
Efficient incremental updates using create_date fields:
```javascript
WHERE create_date > $1  // Only newer content
AND counts_max_create_date > $2  // Only updated counts
```