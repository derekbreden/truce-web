# Messaging Function Naming and Organization Analysis

## Established Patterns in Codebase

### Server-side function naming conventions:
1. **save{Entity}** - For creating/updating entities
   - savePost.js - Creates or updates posts
   - saveReply.js - Creates replies
   - saveFavorite.js - Creates favorite relationships
   - saveBlocked.js - Creates blocked relationships
   - savePollChoice.js - Saves poll votes

2. **get{Entity/Entities}** - For retrieving data
   - getPagePosts.js - Gets posts for a page
   - getSinglePost.js - Gets a single post
   - getNotifications.js - Gets notifications AND handles marking as read/seen
   - getUser.js - Gets user information

3. **create{Entity}IfNotExists** - Special case for conditional creation
   - createUserIfNotExists.js
   - createSessionIfNotExists.js

### How notifications are handled:
- All notification operations are consolidated in `getNotifications.js`
- Marking as read is done via body parameters: `mark_as_read`, `mark_all_as_read`, `mark_all_as_seen`
- Client sends: `{ mark_as_read: [notification_id] }`

## Inconsistencies Found in Messaging

### 1. createConversation.js → Should be saveConversation.js
**Evidence:** 
- All other entity creation uses `save{Entity}` pattern
- Even though it only creates (doesn't update), savePost/saveReply can also create new entities
- The `create` prefix is only used for conditional creation (IfNotExists pattern)

### 2. markMessageAsRead.js → Should be integrated into getNotifications.js
**Evidence:**
- Reply notifications are marked as read within getNotifications.js
- Having a separate file breaks the established pattern
- The client is already treating message_notifications similarly to reply_notifications

**Current flow:**
- Client sends: `{ message_id: 123 }`
- Server uses separate markMessageAsRead.js file

**Should be:**
- Client sends: `{ mark_as_read: [notification_id] }` (same as reply notifications)
- Server handles in getNotifications.js (same as reply notifications)

## Required Changes

1. ✅ Rename `createConversation.js` to `saveConversation.js`
2. ✅ Integrate `markMessageAsRead.js` logic into `getNotifications.js`
3. ✅ Update client to send notification_id instead of message_id for marking messages as read
4. ✅ Delete `markMessageAsRead.js`
5. ✅ Update `handleSession.js` to remove the markMessageAsRead import and use saveConversation

## Changes Completed

All server-side function naming and organization changes have been successfully implemented:

1. **createConversation.js → saveConversation.js**: Renamed to follow the established save{Entity} pattern
2. **markMessageAsRead.js deleted**: Logic now handled by existing mark_as_read functionality in getNotifications.js
3. **Client updated**: Now sends notification IDs in the same format as reply notifications
4. **getMessages.js enhanced**: Now includes notification information for proper marking as read
5. **handleSession.js updated**: References corrected

All tests pass after these changes, confirming the refactoring was successful.

## Implementation Plan

### Step 1: Rename createConversation.js to saveConversation.js
- Rename the file
- Update the import in handleSession.js

### Step 2: Integrate message marking into getNotifications.js
- The existing mark_as_read logic already handles message_notifications
- Just need to update the client to use the same pattern

### Step 3: Update client-side code
- Change renderMessages.js to send notification_ids instead of message_ids
- Need to ensure message objects include notification_id

### Step 4: Clean up
- Delete markMessageAsRead.js
- Remove its import from handleSession.js