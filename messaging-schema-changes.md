# Messaging Schema Changes Analysis

## Database Schema Inconsistencies Found

### 1. Column Naming: `sender_user_id` → `user_id`

**Evidence from existing schema:**
- `posts` table: Uses `user_id` for the post author
- `replies` table: Uses `user_id` for the reply author
- `notifications` table: Uses `user_id` for the notification recipient
- `favorite_posts` table: Uses `user_id` for who favorited
- `favorite_replies` table: Uses `user_id` for who favorited
- `flagged_posts` table: Uses `user_id` for who flagged
- `flagged_replies` table: Uses `user_id` for who flagged
- `poll_votes` table: Uses `user_id` for who voted
- `subscriptions` table: Uses `user_id` for the subscriber
- `subscribers` table: Uses `user_id` for the subscriber

**Current inconsistency:**
- `messages` table: Uses `sender_user_id` instead of `user_id`

**Justification:** Every other table in the system uses plain `user_id` for the primary actor. The context makes it clear (messages are sent by the user, posts are created by the user, etc.)

### 2. Table Naming: `conversation_participants` → `conversation_users`

**Evidence from existing schema:**
- `blocked_users` - Links two users in a blocking relationship
- `post_topics` - Links posts and topics
- `poll_votes` - Links users and polls
- `favorite_posts` - Links users and posts
- `favorite_replies` - Links users and replies

**Pattern observed:** When linking tables involve users, they use the actual entity name "users" not a descriptive term like "participants"

**Current inconsistency:**
- `conversation_participants` uses "participants" instead of "users"

### 3. Column Naming: `read_by_recipients` → `read`

**Evidence from existing schema:**
- `notifications` table: Uses `read` (boolean) and `seen` (boolean)
- `message_notifications` table: Uses `read` (boolean) and `seen` (boolean)

**Current inconsistency:**
- `messages` table: Uses `read_by_recipients` instead of simple `read`

**Note:** The current implementation seems flawed - a single boolean can't track if multiple recipients have read a message. This should likely be tracked in the `message_notifications` table per recipient, just like reply notifications work.

## Required Changes

1. ✅ Rename `sender_user_id` to `user_id` in messages table
2. ✅ Rename `conversation_participants` table to `conversation_users`
3. ✅ Remove `read_by_recipients` from messages table (track read status in message_notifications per user)

## Changes Completed

All three database schema changes have been successfully implemented:

1. **sender_user_id → user_id**: Updated in all files including schema definitions, server-side queries, client-side rendering, and tests
2. **conversation_participants → conversation_users**: Renamed table and updated all references across the codebase
3. **read_by_recipients removed**: Field was already not being used, removed from schema definitions

All tests pass after these changes, confirming the refactoring was successful.

## Files That Will Need Updates

Based on grep results, these files reference the affected columns/tables:
- `/server/schema.js` - Schema definition
- `/tests/test-schema.sql` - Test schema
- `/server/session/saveMessage.js` - Message creation
- `/server/session/getMessages.js` - Message retrieval
- `/server/session/getConversations.js` - Conversation listing
- `/server/session/createConversation.js` - Conversation creation
- `/server/session/getNotifications.js` - Notification handling
- `/server/websocket.js` - WebSocket handling
- `/client/renderMessages.js` - Client-side rendering
- `/tests/message.simple.test.js` - Tests
- Any other test files that test messaging