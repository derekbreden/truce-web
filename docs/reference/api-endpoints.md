# API Endpoints Reference

## Session Requirements

**Authentication Required** (checks `req.session.user_id`):
- All `save*` endpoints (creating content)
- User-specific data: `getFavorites`, `getNotifications`, `getMessages`
- Profile management: `updateDisplayName`, `saveProfilePicture`
- Account actions: `handleRemoveAccount`

**No Authentication Required**:
- Session creation: `createSessionIfNotExists`, `signUpOrSignIn`
- Public data: `getTopics`, public post viewing
- Password reset: `promptToUsePasswordReset`, `useResetToken`

## Session Management

### Authentication
- `POST /session/signUpOrSignIn` - Create account or sign in with email/password
- `POST /session/createSessionIfNotExists` - Initialize user session (no auth required)
- `POST /session/validateSessionUuid` - Validate existing session

### Password Reset
- `POST /session/promptToUsePasswordReset` - Request password reset email (no auth)
- `POST /session/generateResetToken` - Generate reset token
- `POST /session/useResetToken` - Complete password reset (no auth)

## Content Management

### Posts
- `GET /session/getPagePosts` - Get paginated posts for feed
- `GET /session/getSinglePost` - Get specific post with replies  
- `POST /session/savePost` - Create new post (auth required)
- `GET /session/getSingleThread` - Get post thread for editing (auth required)

### Replies
- `POST /session/saveReply` - Create reply to post (auth required)

### Conversations & Messages
- `GET /session/getConversations` - Get user's conversation list (auth required)
- `GET /session/getMessages` - Get messages in conversation (auth required)
- `POST /session/saveMessage` - Send new message (auth required)
- `POST /session/saveConversation` - Create new conversation (auth required)

## User Management

### Profile
- `GET /session/getUser` - Get user profile information
- `POST /session/updateDisplayName` - Update user display name (auth required)
- `POST /session/saveProfilePicture` - Upload profile picture (auth required)
- `POST /session/handleRemoveAccount` - Delete user account (auth required)

### Social Features
- `POST /session/saveFavorite` - Add/remove post favorite (auth required)
- `GET /session/getFavorites` - Get user's favorited posts (auth required)
- `POST /session/saveBlocked` - Block/unblock user (auth required)
- `POST /session/saveSubscribeToUser` - Follow/unfollow user (auth required)

## Content Discovery

### Topics
- `GET /session/getTopics` - Get available topic categories (no auth required)

### Notifications
- `GET /session/getNotifications` - Get user notifications (auth required)
- `GET /session/getUpdatedCounts` - Get unread counts (auth required)

## Moderation

### Flagging
- `POST /session/saveFlagged` - Report content for moderation (auth required)

## Utility

### Settings
- `GET /session/getSettings` - Get user preferences (auth required)

### Polls
- `POST /session/savePollChoice` - Submit poll vote (auth required)

### Admin
- `GET /session/getAdminImage` - Get uploaded images (admin only)

## Common Patterns

### Request Format
All POST endpoints expect JSON body with `data` object:
```javascript
{
    data: {
        // endpoint-specific parameters
    }
}
```

### Response Format
Standard success response:
```javascript
{
    success: true,
    // endpoint-specific data
}
```

### Authentication Pattern
Authenticated endpoints check:
```javascript
if (!res.writableEnded && req.session.user_id && req.body.data) {
    // Handle authenticated request
}
```

### WebSocket Integration
Content-modifying endpoints trigger WebSocket notifications:
```javascript
req.sendWsMessage("UPDATE", { post_id: post_id })
```

### Error Handling
Failed requests return appropriate HTTP status codes with error details in response body.