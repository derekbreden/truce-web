# JavaScript Standards

## JavaScript Architecture Overview

This project uses a unique client-side architecture:
- **Non-standard module system**: All JS files concatenated via server-side includes
- **Global state object**: Single `state` object manages all application state
- **Flint.js DOM library**: Custom jQuery-like selector with template engine
- **Cache-first rendering**: Aggressive client-side caching with incremental updates
- **Queue-based operations**: Sequential processing of user actions

## Naming Conventions

- **Functions**: `camelCase` for functions only
- **Variables**: `snake_case` for all variables
- **DOM variables**: Prefix with `$` like `const $button = $("button")`
- **Constants**: Use `const` for function declarations: `const func = () => {}`
- **Global variables**: Explicitly declare in `index.html` initialization

## Code Style

- **Arrow functions**: Use `const func = () => {}` not `function func() {}`
- **Quotes**: Double quotes `"string"` not single quotes
- **Semicolons**: Omit semicolons
- **Array methods**: Use `.includes()` instead of `.indexOf() === -1`
- **Type casting**: Use `Number()` not `parseInt()`
- **Path extraction**: Use `path.split("/")[index]` consistently

## Client-Side Architecture

### Non-Standard Module System
All client JS files are included via server-side includes in `index.html`:

```html
<script>
    // Global state initialization
    const state = { path: "/", cache: {}, ... }
    
    // Libraries
    // <!--#include file="client/flint.js" -->
    // <!--#include file="client/markdownToElements.js" -->
    
    // Navigation
    // <!--#include file="client/goToPath.js" -->
    
    // All files concatenated into single script block
</script>
```

**Implications**:
- All variables are globally scoped
- File order matters for initialization
- No namespace isolation
- Direct access to any function/variable

### Global State Management
Single `state` object tracks all application state (`index.html`):

```javascript
const state = {
    // Navigation
    path: "/",
    path_history: [],
    path_index: 0,
    
    // User data
    user_id: "",
    display_name: "",
    profile_picture_uuid: "",
    session_uuid: localStorage.getItem("session_uuid") || "",
    
    // UI state
    expanded_reply_ids: [],
    cache: {},  // Path-based response cache
    loading_path: false,
    
    // WebSocket
    ws: null,
    unread_count: 0
}
```

### Flint.js DOM Library (`flint.js`)
**Two distinct modes** detected by leading newline:

**Selector Mode** (query existing elements):
```javascript
const $button = $("button")            // Returns single element
const $posts = $("posts post")         // Returns NodeList with .length
$button.on("click", handler)           // Enhanced with .on() helper
$posts.forEach(($post) => {...})       // Enhanced with .forEach()
$("modal").$("button[close]")          // Chained selection with .$()
```

**Template Mode** (create new elements):
```javascript
const $modal = $(`
  modal-wrapper
    modal[confirm]
      h2 $1
      button-wrapper
        button[confirm] Yes
        button[cancel] No
    modal-bg[full-width]
`, ["Delete this post?"])

// Features:
// - Indentation defines hierarchy
// - [attributes] in square brackets
// - $1, $2 placeholders for arguments
// - Returns root element(s)
```

### Cache-First Rendering Pattern
Aggressive client-side caching with incremental updates (`startSession.js`):

```javascript
// 1. Check cache first
if (state.cache[state.path]) {
    renderPage(state.cache[state.path])
    getMoreRecent()  // Fetch only newer items
    return
}

// 2. Incremental updates with timestamps
fetch("/session", {
    body: JSON.stringify({
        path: current_path,
        min_post_create_date: client_max_post_date,
        min_reply_create_date: client_max_reply_date,
        // Only fetch items newer than what we have
    })
})
```

### Queue-Based Operations
Sequential processing prevents race conditions (`toggleFavorite.js`):

```javascript
const pending_toggle_saves = []
let active_toggle_save = null

const toggleFavorite = async (post_or_reply) => {
    // 1. Update UI optimistically
    post.favorited = !post.favorited
    
    // 2. Queue the save operation
    pending_toggle_saves.push(() => {
        fetch("/session", {...})
            .then(() => performNextSave())
    })
    
    // 3. Process queue sequentially
    if (!active_toggle_save) {
        pending_toggle_saves.shift()()
    }
}
```

## Server-Side Patterns

### Session Middleware Pattern
All session endpoints follow this pattern:

```javascript
module.exports = async (req, res) => {
    if (!res.writableEnded && req.session.user_id && req.body.data) {
        // Validate session and required data
        const result = await req.client.query(...)
        
        // Send response
        res.end(JSON.stringify({ success: true, ...result }))
    }
}
```

### Request/Response Flow (`handleSession.js`)
Centralized session handling with middleware chain:

```javascript
// 1. Initialize request state
req.session = { user_id: "", ... }
req.results = { posts: [], replies: [], ... }

// 2. Run middleware in order
await require("./session/validateSessionUuid")(req, res)
await require("./session/getNotifications")(req, res)
await require("./session/savePost")(req, res)
// ... 20+ more middleware

// 3. Send accumulated results
res.end(JSON.stringify(req.results))
```

## Event Handling Patterns

### DOM Focus Preservation (`beforeAfterDomUpdate.js`)
Maintain user context during re-renders:

```javascript
const beforeDomUpdate = () => {
    state.active_element = document.activeElement
    state.active_element_state = {
        selectionStart: state.active_element?.selectionStart,
        selectionEnd: state.active_element?.selectionEnd,
        bodyScrollTop: $("main-content-wrapper[active]").scrollTop
    }
}
```

### Global Event Delegation
Use body-level event delegation for dynamic content:

```javascript
$("body").on("click", ($event) => {
    if ($event.target.matches("button[favorite]")) {
        toggleFavorite(findParentPost($event.target))
    }
})
```

### Custom Events
Emit custom events for cross-component communication:

```javascript
$("body").dispatchEvent(new CustomEvent("page-updated"))
```

## Path Handling

### Client-Side Routing (`goToPath.js`)
```javascript
const goToPath = (new_path, skip_state, clicked_back) => {
    // 1. Save scroll position
    state.cache[state.path].scroll_top = $("main-content-wrapper[active]").scrollTop
    
    // 2. Update state and history
    state.path = new_path
    history.pushState({ path_index: state.path_index }, "", state.path)
    
    // 3. Notify WebSocket
    updateWebSocketPath(new_path)
    
    // 4. Start session (render from cache or fetch)
    startSession(was_same_path)
}
```

### Animation Direction Detection
Slide animations based on navigation hierarchy:

```javascript
const path_sequence = ["/", "/posts", "/topics", "/conversations", ...]
if (next_sequence < previous_sequence) {
    clicked_back = true  // Animate right-to-left
}
```

## Performance Patterns

### Debounced Operations
Prevent excessive server calls:

```javascript
let typing_timeout = null
$("textarea").on("input", () => {
    clearTimeout(typing_timeout)
    typing_timeout = setTimeout(sendTypingHeartbeat, 1500)
})
```

### Optimistic UI Updates
Update UI before server confirms:

```javascript
// 1. Update cache immediately
post.favorited = true
post.favorite_count++

// 2. Update DOM
$element.$("[favorited]").setAttribute("favorited", "")

// 3. Queue server update
pending_saves.push(() => fetch(...))
```

### Batched DOM Updates
Minimize reflows with DocumentFragment:

```javascript
const $fragment = document.createDocumentFragment()
posts.forEach(post => $fragment.appendChild(renderPost(post)))
$("posts").appendChild($fragment)
```