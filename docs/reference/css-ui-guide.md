# CSS UI Reference Guide

Quick lookup for custom HTML elements and semantic attributes.

## Custom HTML Elements

| Element | Purpose | Key Children |
|---------|---------|--------------|
| `posts` | Post container | `post` |
| `post` | Individual post | `author-topics`, `post-details` |
| `replies` | Reply container | `reply` |
| `reply` | Individual reply | `reply-wrapper` |
| `conversations` | Conversation list | `conversation` |
| `conversation` | Individual conversation | `conversation-info`, `unread-count` |
| `messages` | Message list | `message` |
| `message` | Individual message | `message-header`, `message-content` |
| `notifications` | Notification list | `notification` |
| `notification` | Individual notification | `icon`, `summary` |
| `favorites` | Favorites list | `favorite` |
| `users` | User list | `user` |
| `topics` | Topic container | `topic` |
| `modal` | Modal dialog | `modal-bg` |
| `action` | Action item | `icon`, `p` |
| `profile-picture` | Profile image | `profile-image` |

## Semantic Attributes

| Attribute | Purpose | Common Usage |
|-----------|---------|--------------|
| `[center]` | Center alignment | Text centering, flex centering |
| `[right]` | Right alignment | Flex end alignment |
| `[muted]` | Reduced opacity | Secondary text, disabled states |
| `[ellipsis]` | Text truncation | Long text overflow |
| `[active]` | Selected state | Navigation, buttons |
| `[disabled]` | Disabled state | Form controls |
| `[favorited]` | Favorited state | Heart icons, saved items |
| `[trimmed]` | Collapsed content | Expandable posts/replies |
| `[large]` | Large variant | Profile pictures, buttons |
| `[inline]` | Inline display | Icons within text |
| `[img]` | Image container | Content with images |
| `[line-after]` | Bottom border | Section separators |

## Quick Search Commands

```bash
# Find element styling
rg "posts\s*{" client/css/
rg "conversation\s*{" client/css/

# Find attribute usage  
rg "\[muted\]" client/css/
rg "\[center\]" client/css/

# Find specific components
rg "modal" client/css/
rg "notification" client/css/
```

## Common Patterns

**Combine attributes for complex layouts:**
```html
<div center muted>Centered secondary text</div>
<section [trimmed] [active]>Collapsed active section</section>
```

**State management through attribute presence:**
- Toggle `[favorited]` for favorite state
- Toggle `[active]` for selection state  
- Toggle `[trimmed]` for content expansion