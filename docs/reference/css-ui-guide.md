# CSS UI Reference Guide

Complete reference for all custom HTML elements and semantic attributes used throughout the application's CSS architecture.

## Component Architecture

The CSS follows a **non-standard module system** using custom HTML elements and semantic attributes instead of CSS classes. Components are organized into a 5-layer hierarchy:

1. **Foundation** (`foundation/`) - CSS reset, variables, typography
2. **Layout** (`layout/`) - Grid systems, containers, spacing
3. **Attributes** (`attributes/`) - Semantic attributes like `[muted]`, `[center]`
4. **Features** (`features/`) - Domain-specific components (posts, conversations)
5. **Interactions** (`interactions/`) - UI components and animations

## Custom HTML Elements

### Content Structure
**`posts`** - Post container with flex column layout
```css
posts { display: flex; flex-direction: column; }
posts post { padding-bottom: 21px; position: relative; }
```

**`post`** - Individual post element with metadata
- Child elements: `author-topics`, `info-wrapper`, `post-details`
- States: `[trimmed]` for collapsed content
- Image handling: `p[img]` with `[total-images]` attribute

**`reply`** - Reply element in threaded conversations
- Nested structure: `replies > reply > reply` for threading
- Child elements: `reply-wrapper` with action details
- Spacing: Automatic margin adjustments for thread depth

**`replies`** - Container for reply threads
- State: `[thread]` for threaded display mode
- Automatic spacing between replies and nested replies

### Communication Components
**`conversations`** - List of conversation items
```css
conversations { display: flex; flex-direction: column; }
```

**`conversation`** - Individual conversation list item
- Child elements: `conversation-info`, `conversation-details`, `conversation-header`
- Features: `unread-indicator`, `unread-count`, `message-preview`

**`messages-container`** - Full-height messaging layout
- Viewport calculation: `calc(100vh - var(--header-height) - var(--footer-height-base))`
- Child elements: `messages`, `message-input-area`

**`messages`** - Scrollable message container
```css
messages { flex: 1; overflow-y: auto; display: flex; flex-direction: column; }
```

**`message`** - Individual message element
- Child elements: `message-header`, `message-info`, `message-content`
- Profile integration: `profile-picture` within `message-header`

**`message-form`** - Message input form with textarea and submit button
```css
message-form { display: flex; gap: var(--space-xs); align-items: flex-end; }
```

**`typing-indicator`** - Real-time typing status display
```css
typing-indicator { animation: pulse 1.5s ease-in-out infinite; }
```

### User Interface Components
**`notifications`** - Notification container
- Child elements: `notification` items with `icon`, `summary`, `info`

**`notification`** - Individual notification item
```css
notification { display: flex; justify-content: space-between; align-items: center; cursor: pointer; }
```

**`favorites`** - Favorites container
- Child elements: `favorite` items with special styling

**`favorite`** - Individual favorited item
- States: `[post]` for post-type favorites
- Special styling: `[parent-reply]` for reply context

**`users`** - User list container
- Child elements: `user` items with `author-name` and `name`

### Navigation & Actions
**`action`** - Interactive action item
```css
action { display: flex; align-items: center; padding: var(--space-xs) 0; cursor: pointer; }
```

**`modal`** - Modal dialog component
- Positioning and overlay behavior defined in interactions

**`menu`** - Navigation menu component
- Tab-based navigation with active states

**`tab-wrapper`** - Tab container for page navigation

### Profile Components
**`profile-picture`** - Profile image container
- Variants: `[large]` for 120px size (default 40px)
- Child element: `profile-image` with `img`
```css
profile-picture profile-image { width: 40px; height: 40px; border-radius: 50%; }
```

**`user-actions`** - User action buttons
```css
h2[user] user-actions { display: flex; flex-direction: column; align-items: flex-end; }
```

### Topic System
**`topics`** - Topic container
- Variants: `[topics-list]` for grid layout, `[big]` for large display
```css
topics[topics-list] { display: flex; flex-wrap: wrap; gap: var(--space-md); }
```

**`topic`** - Individual topic item
- Child elements: `topicname`, `subtitle`, `count`
- Topic-specific styling: `[topic=politics]`, `[topic=sports]`, etc.

**`topicname`** - Topic name container with icon and count
**`topicname-subtitle`** - Topic with subtitle layout

### Specialized Elements
**`alert-wrapper`** - Fixed-position alert container
```css
alert-wrapper { position: fixed; top: var(--header-height); left: 50%; z-index: 1; }
```

**`posts-loading`** - Loading state skeleton
```css
posts-loading { animation: loading 1.5s ease-in-out infinite 1s; }
```

**`expand-wrapper`** - Expandable content controls
- States: `[above-replies]` for reply expansion

**`app-store-wrapper`** - App store badge container with dark/light mode variants

## Semantic Attributes

### Layout & Positioning
**`[center]`** - Flexbox centering
```css
[center] { display: flex; justify-content: center; align-items: center; }
```

**`[right]`** - Right-aligned flex container
```css
[right] { display: flex; justify-content: flex-end; }
```

**`[full-width]`** - Full container width
```css
[full-width] { width: 100%; }
```

**`[flex-column]`** - Vertical flex layout
```css
[flex-column] { display: flex; flex-direction: column; }
```

### Content States
**`[muted]`** - Reduced opacity for secondary content
```css
[muted] { opacity: var(--opacity-muted); }
```

**`[ellipsis]`** - Text truncation
```css
[ellipsis] { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
```

**`[trimmed]`** - Collapsed content state
- Applied to `post[trimmed]` and `reply[trimmed]`
- Affects image display: `p img { height: 100px; }`

### Interactive States
**`[active]`** - Active/selected state
**`[disabled]`** - Disabled state styling
**`[favorited]`** - Favorited content state
```css
detail[favorites][favorited] icon { background-color: var(--color-favorite); }
```

**`[explode-out]`** - Favorite animation state
```css
favorite[explode-out] { animation: explode-out .2s ease-in-out 0s forwards; }
```

### Content Metadata
**`[img]`** - Image container marker
- Used with `[total-images]` attribute for image layout
- Applied to `p[img]` elements

**`[total-images]`** - Image count for layout decisions
```css
post[trimmed] p[img][total-images="1"] { justify-content: center; }
```

**`[line-after]`** - Bottom border separator
```css
[line-after]::after { border-bottom: 1px solid var(--color-border-standard); }
```

### Size Variants
**`[large]`** - Large size variant
```css
[profile-picture][large] profile-image { width: 120px; height: 120px; }
```

**`[tiny]`** - Small size variant for info elements

**`[inline]`** - Inline display modifier
```css
icon[inline] { display: inline-block; margin-bottom: -10px; }
```

## Component Hierarchies

### Post Structure
```
posts
  post
    h2 (title)
      icon[more] (actions)
    author-topics
      author
        by, name, span
      topics
        topic
          icon
    p (content)
    p[img] (images)
    info-wrapper
    post-details
      detail[favorites]
      detail[replies]
      detail[more]
```

### Conversation Structure
```
conversations
  conversation
    conversation-info
      profile-picture
      conversation-details
        conversation-header
          name
          time-ago
        message-preview
    unread-indicator
    unread-count
```

### Message Structure
```
messages-container
  messages
    message
      message-header
        profile-picture
        message-info
          author
        read-status
      message-content
        p
  message-input-area
    message-form
      textarea
      button[submit]
```

### Reply Threading
```
replies[thread]
  reply
    h2, p, info
    reply-wrapper
      detail[favorites]
      button
    reply (nested)
      reply (further nested)
```

## Design Token Integration

All components use CSS custom properties for consistent theming:
- **Spacing**: `var(--space-xs)` through `var(--space-xl)`
- **Colors**: `var(--color-text-primary)`, `var(--color-bg-primary)`
- **Typography**: `var(--font-size-sm)` through `var(--font-size-xl)`
- **Icons**: `var(--icon-menu)`, `var(--icon-xl)`, `var(--icon-xxl)`

## Usage Patterns

### Component Discovery
Search the codebase for specific patterns:
```bash
rg "posts post" client/css/    # Find post styling
rg "\[muted\]" client/css/     # Find muted attribute usage
rg "conversation" client/css/   # Find conversation components
```

### State Management
States are controlled through attribute presence:
- Add/remove `[favorited]` attribute for favorite state
- Add/remove `[trimmed]` attribute for content expansion
- Add/remove `[active]` attribute for selection state

### Layout Composition
Combine semantic attributes for complex layouts:
```html
<div center muted>Centered muted content</div>
<section flex-column full-width>Full-width vertical layout</section>
```