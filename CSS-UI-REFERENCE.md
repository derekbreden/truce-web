# CSS-UI Reference Guide

*Comprehensive mapping of Truce's custom elements, semantic attributes, and CSS architecture based on actual CSS analysis*

## Overview

This reference documents the unique CSS architecture of the Truce web application, which uses custom HTML elements and semantic attributes instead of traditional CSS classes. The system is organized in 5 hierarchical layers that build upon each other.

## Architecture Layers

As documented in `visual-states.css`, the CSS is organized hierarchically:

1. **Foundation** - Design tokens, animations, fonts
2. **Layout** - Base styles, header, footer, navigation  
3. **Attributes** - Semantic modifiers organized by purpose
4. **Features** - Posts, conversations, notifications, etc.
5. **Interactions** - Forms, modals, actions, components

## Custom Elements

### Layout & Structure Elements
- **`main-content-wrapper`** - Primary responsive content container with slide animations
- **`main-content`**, **`main-content-2`** - Content areas (max-width: 480px)
- **`header`** - Fixed top header with split-point design
- **`footer`** - Fixed bottom footer (app mode only)
- **`hamburger`** - Mobile menu toggle with unread indicators
- **`icons`** - Icon sprite container (hidden)

### Navigation Elements
- **`tab-wrapper`** - Container for tab navigation with responsive layout
- **`tab-item`** - Individual navigation tabs with active states
- **`mark-all-as-read-wrapper`** - Mark all as read functionality
- **`all-clear-wrapper`** - "All clear" state display
- **`dot`** - Footer navigation position indicators with indexed positioning

### Content Elements
- **`posts`** - Flex column container for multiple posts
- **`post`** - Individual post with padding and relative positioning
- **`posts-loading`** - Loading skeleton with animation
- **`author-topics`** - Author and topic information container
- **`author`**, **`by`**, **`name`** - Author identification elements
- **`topics`**, **`topic`** - Topic classification system
- **`info-wrapper`** - Metadata container with indentation support
- **`post-details`**, **`detail`** - Post actions (favorites, replies, more)

### Messaging System
- **`messages-container`** - Full-height message container with flex layout
- **`messages`** - Scrollable message list (flex: 1, overflow-y: auto)
- **`message`** - Individual message with flex column layout
- **`message-header`**, **`message-info`**, **`message-content`** - Message structure
- **`message-input-area`**, **`message-form`** - Message composition with textarea
- **`typing-indicator`** - Real-time typing indicator with pulse animation

### Conversation System
- **`conversations`** - Container for conversation list
- **`conversation`** - Individual conversation item (cursor: pointer, bordered)
- **`conversation-info`**, **`conversation-details`**, **`conversation-header`** - Structure
- **`unread-indicator`**, **`unread-count`** - Read state with blue indicators
- **`read-status`**, **`time-ago`**, **`message-preview`** - Information elements

### Profile Components
- **`profile-picture`**, **`profile-image`** - Profile picture system with size variants

### Forms & UI Components
- **`add-new`** - New content form container (flex column, top padding)
- **`button-wrapper`** - Button group with space-between layout
- **`icon`** - SVG icon containers with semantic sizing system
- **`modal`**, **`modal-bg`** - Modal dialog system with variants
- **`menu`**, **`signed-in`**, **`sign-in`** - Menu system components
- **`action`** - Action button/link elements
- **`error`**, **`info`** - Status messages with pseudo-element icons

### Notification System
- **`notifications`**, **`notification`** - Notification container and items
- **`column`**, **`summary`** - Notification layout and content structure

## Semantic Attributes

### Visual State Attributes
- **`[muted]`** - Reduces opacity to 0.5 for secondary content
- **`[faint]`** - Same as muted, used for disabled-like states
- **`[disabled]`** - Disabled state for forms and buttons
- **`[active]`** - Active state (tab-item: font-weight bold)
- **`[unread]`** - Blue dot indicator via ::before pseudo-element
- **`[favorited]`** - Pink/red heart icon (`#e48` / `var(--color-favorite)`)

### Layout & Positioning Attributes
- **`[center]`** - Centers text alignment and flex content
- **`[right]`** - Flex layout with justify-content: flex-end
- **`[ellipsis]`** - Text truncation with overflow ellipsis
- **`[full-width]`** - Absolute positioning: left: 0, right: 0
- **`[flex-column]`** - Sets display: flex, flex-direction: column
- **`[big]`** - Large button styling with success colors
- **`[small]`** - Reduced padding for buttons (2px var(--space-sm))
- **`[tiny]`** - Small size modifier

### Content Type Attributes
- **`[quote]`** - Block quote with left border and background
- **`[notice]`** - Small notice text with muted children
- **`[bold]`** - Font-weight: 600
- **`[italic]`** - Font-style: italic
- **`[hr]`** - Horizontal rule with bottom border
- **`[img]`** - Image content modifier for paragraphs
- **`[total-images="1"]`** - Special handling for single images

### Interactive State Attributes
- **`[more]`** - Three-dot menu icons with cursor pointer
- **`[edit]`**, **`[delete]`**, **`[block]`** - Action type indicators
- **`[confirm]`** - Modal confirmation variant
- **`[inline]`** - Inline icon display
- **`[favorites]`** - Favorites section/action
- **`[reply]`** - Reply context modifier with indentation
- **`[trimmed]`** - Truncated content state (shows more button)
- **`[alt]`** - Alternative button styling with lighter colors

### App & Layout States
- **`[app]`** - App mode for body (shows footer, adjusts layout)
- **`[inactive]`**, **`[active]`** - Navigation animation states
- **`[clicked-back]`** - Reverse animation direction
- **`[skip-state]`** - Disables animations
- **`[user]`** - User-related content modifier for h2 headers

### Indexed Positioning
- **`[index="0"]` through `[index="6"]`** - Footer dot positioning with calculated right values

### Form States
- **`[submit]`** - Submit button styling
- **`[textarea-focused]`** - Layout adjustments when textarea focused
- **`[flash-focus]`**, **`[flash-long-focus]`** - Focus animation attributes

## CSS File Architecture

### Foundation Layer
**`foundation/design-tokens.css`** - Design system foundation
- Color system with light-dark theme functions
- Spacing scale and indentation system
- Typography scale and icon sizing
- Z-index layering system

**`foundation/animations.css`** - UI transitions
- Navigation slide animations (left/right)
- Loading states and pulse effects
- Focus flash animations
- Scale and opacity transitions

### Layout Layer
**`layout/base.css`** - Document and main layout
- Global reset and font setup
- Main content wrapper with responsive design
- Slide animation states for navigation

**`layout/header.css`** - Fixed top navigation
- Header container with split-point design
- Hamburger menu with unread indicators
- Logo positioning

**`layout/footer.css`** - Fixed bottom navigation (app mode)
- Footer links with icons
- Navigation dots with indexed positioning
- App mode layout adjustments

**`layout/navigation.css`** - Tab navigation system
- Tab wrapper with responsive layout
- Tab items with active states
- Mark all as read functionality

### Attributes Layer
**`attributes/visual-states.css`** - Visual appearance modifiers
- Architectural overview comments
- Opacity states (muted, faint, disabled)
- Notice paragraph styling

**`attributes/layout-utilities.css`** - Layout and positioning
- Text alignment (center, right)
- Flex layouts and sizing modifiers
- Text truncation with ellipsis

**`attributes/content-semantics.css`** - Content type formatting
- Quote block styling
- Text formatting (bold, italic)
- Image and list styling
- Horizontal rules

**`attributes/interactive-states.css`** - User interaction states
- Status messages with pseudo-element icons
- Interactive icon sizing and styling
- Modal and component state modifiers

**`attributes/component-patterns.css`** - Cross-component patterns
- Heading styles (h2, h3)
- Reply indentation system
- Common container patterns

### Features Layer
**`features/posts.css`** - Post display system
- Post container and individual post layout
- Author/topics information structure
- Post details with favorites and replies
- Loading states with skeleton animation

**`features/conversations.css`** - Messaging system
- Message container with full-height layout
- Conversation list with unread indicators
- Message composition with form styling
- Typing indicator with animation

**`features/notifications.css`** - Notification display
- Notification container and item layout
- Content structure with summary elements

### Interactions Layer
**`interactions/forms.css`** - Form controls
- Input/textarea styling with focus states
- Button variants (alt, small, disabled)
- Form layout components
- Button wrapper with flex layout

## Selector Patterns & Combinations

### Multi-Attribute Combinations
```css
/* Post image handling */
post[trimmed] p[img][total-images="1"]
post[trimmed] p[img] + p[img]

/* Interactive states */
detail[favorites][favorited]
button[alt][small]

/* Navigation dots */
footer dot[index="0"] through dot[index="6"]
```

### Element Hierarchies
```css
/* Post structure */
posts post info-wrapper
post author-topics author name
post > h2 > icon[more]
post:not([trimmed]) detail[more]

/* Reply indentation system */
reply > reply-wrapper          /* Nested replies */
reply > info-wrapper           /* Metadata with indent */
reply > p                      /* Content with indent */
reply > ol, reply > ul         /* Lists with special indent */

/* Message structure */
message-header profile-picture icon
conversation unread-indicator
```

### Sibling Selectors
```css
/* Content flow */
p[quote] + p[quote]            /* Consecutive quotes */
action + button-wrapper        /* Button after action */
message + message              /* Consecutive messages */

/* Image sequences */
post[trimmed] p[img] + p[img]  /* Adjacent images */
```

### Contextual Behavior
```css
/* Modal variants */
modal[confirm] h2 icon
modal[image] > p[img] img

/* Form contexts */
add-new[reply] input
message-form button[submit]

/* App mode */
body[app] main-content-wrapper
body[app] footer
```

## Design Token System

### Indentation System
```css
--reply-indent: 50px;              /* Base reply indentation */
--reply-width: calc(100% - 50px);  /* Reply content width */
--reply-nested-indent: 40px;       /* Nested reply indentation */
--list-indent-aligned: 67px;       /* Lists aligned with reply text */
```

### Icon Sizing System
```css
--icon-xs: 14px;     /* Message info icons */
--icon-sm: 16px;     /* Edit buttons */
--icon-md: 18px;     /* Post author topic icons */
--icon-lg: 22px;     /* Reply author icons */
--icon-xl: 26px;     /* H2 user icons, button icons */
--icon-xxl: 30px;    /* Modal icons, settings icons */
--icon-menu: 36px;   /* Menu link icons */
--icon-footer: 34px; /* Footer icons */
```

### Theme System
Extensive use of `light-dark()` function for automatic theme switching:
```css
--color-bg-primary: light-dark(var(--color-white), var(--color-black));
--color-text-primary: light-dark(var(--color-black), var(--color-white));
--color-border-standard: light-dark(var(--color-gray-light), var(--color-gray-dark));
```

## Quick Reference

### Most Common Element Patterns
1. **`posts > post > author-topics > author > name`** - Post author structure
2. **`reply > info-wrapper`** - Reply with indentation
3. **`message-header > profile-picture > profile-image`** - Message author
4. **`conversation > conversation-info > conversation-details`** - Conversation structure
5. **`add-new > button-wrapper > button`** - Form with action buttons

### Most Common Attribute Patterns
1. **`[muted]`** - Most frequently used for secondary content
2. **`[active]`** - Navigation and selection states
3. **`[trimmed]`** - Content truncation with expand functionality
4. **`[unread]`** - Notification indicators
5. **`[more]`** - Action menu triggers

### Key Architectural Principles
- **Semantic over presentational** - Use `[muted]` not `.gray-text`
- **Element composition** - Combine custom elements with semantic attributes
- **Progressive enhancement** - Base elements work, attributes enhance
- **Theme-aware design** - All colors use `light-dark()` functions
- **Hierarchical organization** - 5-layer architecture with clear dependencies
- **Indentation system** - Sophisticated reply nesting with design tokens
- **Context sensitivity** - Same attributes behave differently in different containers

## Usage Guidelines

### Finding Elements
Use `rg "element-name"` to find usage patterns across the codebase.

### Finding Attributes  
Use `rg "\[attribute-name\]"` to find attribute usage examples.

### Debugging CSS
1. Identify the UI area (header, footer, posts, conversations, etc.)
2. Find the corresponding feature CSS file
3. Look for custom elements and their attributes
4. Check attribute files for semantic modifier behavior
5. Verify theme-aware properties use `light-dark()` functions

This reference provides the foundation for understanding and working with Truce's unique CSS architecture based on actual analysis of the codebase.