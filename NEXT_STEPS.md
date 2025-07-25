# NEXT_STEPS.md

## Goal

Move all render functions to placeholder functions passed to _() templates as $1 $2 etc.

## Recent Work: renderNotifications.js

## Recent Work: renderHeaderFooter.js

### Critical Understanding for Next Instance

**The core insight:** The breakthrough was NOT about individual templates using `_()`. It was about making PARENT containers use `_()` so that child functions could be passed as placeholders and become reactive. The parent `_()` IS NOT reactive. The children passed as functions to placeholders ARE reactive.

### Files to Study

**flint.js**
- `../flint.js/README.md` - Complete explanation of dependency tracking, re-execution, and mental model
- `client/flint.js` - The library you will be using
- `../flint.js/examples/todo-mvc/` - A small clean example of how flint.js SHOULD be used.

**Recent Work:**
- `client/loadingPage.js` - Parent template (NOT reactive)
- `client/renderNotifications.js` - Functions that become reactive via placeholders
- `client/renderHeaderFooter.js` - Functions that become reactive via placeholders

**Current imperative patterns:**
- `client/renderPage.js` - Manual function calls and DOM manipulation
- Other `client/render*.js` files - Manual DOM approaches

## Next Architecture: Persistent Reactive Wrappers

### The Problem
Currently `loadingPage()` creates and destroys `main-content-wrapper` elements on each navigation. This makes reactive patterns difficult because:
- Wrappers are constantly being created/destroyed
- Animation depends on having both old and new wrappers during transition
- Reactive functions need stable DOM targets

### The Solution: Lazy-Loaded Reactive Wrappers

Instead of creating/destroying wrappers imperatively on every navigation, we will have reactive `main-content-wrapper` elements that:
- Are created when first visiting a path (lazy-loaded)
- Persist during navigation transitions (when most_recent_path matches)
- Reactively appear/disappear based on _.path and _.most_recent_path
- Use CSS animations triggered by reactive attribute changes

### Implementation Plan

#### Phase 1: Reactive Wrappers for `/notifications` and `/posts`

Start with just `/notifications` and `/posts` using reactive wrappers, while keeping the current system for everything else.

**Existing reactive state:**
```javascript
_.path // Current active path (same as state.path, already reactive)
```

**New reactive state:**
```javascript
_.most_recent_path  // Previous path, used for animation transitions
_.clicked_back // Boolean for animation direction
```

**Example: Self-contained renderNotifications with three-level structure:**
```javascript
// In renderHeaderFooter.js

$("body").appendChild(
	_(
		`
			$1
			$2
      $3
		`,
		[
			renderHeader,
			renderFooter,
      renderNotifications
		]
	)
)


// In renderNotifications.js
const renderNotifications = () => {
  // FIRST LEVEL: main-content-wrapper rendered or not - ONLY NAVIGATION STATE
  if (
    _.path !== "/notifications"
    && _.most_recent_path !== "/notifications"
  ) {
    return _("div")
  }

  const wrapper = _(`
    main-content-wrapper[
      active=$1
      inactive=$2
      clicked-back=$3
      full-width
    ]
      main-content
        $4
      main-content-2
        $5
  `, [
    // SECOND LEVEL: Attribute functions - ONLY NAVIGATION STATE  
    () => _.path === "/notifications",
    () => _.path !== "/notifications",
    () => _.clicked_back,
    
    // THIRD LEVEL: Content functions - ANY STATE
    () => {
      // Can access _.notifications, _.unread_count, etc.
      return [
        createNotificationsHeader(),
        _(`
          notifications[flex-column]
            h3[unread-header] $1
            $2
            $3
        `, [
          () => _.unread_count > 0 ? `Unread (${_.unread_count})` : "Unread",
          () => !Boolean(_.unread_count) ? [_(`
            all-clear-wrapper
              p Nothing to see here
          `)] : [],
          () => {
            const unread_notifications = (_.notifications || []).filter((n) => !n.read)
            return unread_notifications
              .sort((a, b) => new Date(b.create_date) - new Date(a.create_date))
              .map(renderNotification)
          }
        ])
      ]
    },
    
    // Third level for main-content-2
    () => {
      
      return _(`
        notifications[flex-column]
          h3 Read
          $1
          $2
      `, [
        () => {
          const read_notifications = (_.notifications || []).filter((n) => n.read)
          return !read_notifications.length ? [_(`
            all-clear-wrapper
              p Nothing to see here
          `)] : []
        },
        () => {
          const read_notifications = (_.notifications || []).filter((n) => n.read)
          return read_notifications
            .sort((a, b) => new Date(b.create_date) - new Date(a.create_date))
            .map(renderNotification)
        }
      ])
    }
  ])
}
```

NOTE TO CLAUDE CODE: I ONLY CHANGED ABOVE HERE - I DIDNT EVEN READ BELOW HERE - PLEASE FIX

**Key architectural points:**

**Three-Level Structure (within each render function):**
1. **FIRST LEVEL** (conditional wrapper rendering):
   - The conditional check using ONLY navigation state: `_.path`, `_.most_recent_path`
   - Decides whether to render the wrapper at all or return empty `div`
   - This function re-executes when navigation state changes
   - Creates/destroys the entire wrapper reactively

2. **SECOND LEVEL** (attribute functions passed as $1, $2, $3):
   - Anonymous arrow functions for wrapper attributes  
   - Only access navigation state: `_.path`, `_.most_recent_path`, `_.clicked_back`
   - When these state keys change, flint.js automatically re-executes these functions
   - Results only update DOM attributes (`active`, `inactive`, `clicked-back`)
   - This isolation ensures animations work smoothly

3. **THIRD LEVEL** (content functions passed as $4, $5):
   - Anonymous arrow functions for content within the wrapper
   - Can access ANY state: `_.posts`, `_.notifications`, `_.unread_count`, etc.
   - Re-execute whenever their accessed state changes
   - Can re-render content frequently without affecting wrapper or animations

**Integration with renderHeaderFooter:**
- Each render function (renderNotifications, renderPosts, etc.) is called as a placeholder from renderHeaderFooter.js
- All wrappers are siblings rendered at the same level in the DOM
- Navigation state changes cause the appropriate wrapper to appear/disappear and animate

**How flint.js tracks dependencies:**
- First time a function executes, flint.js tracks which `_.*` properties it accesses
- Creates a map: `_.path` → [functions that accessed it]
- When `_.path = newValue`, flint.js re-executes all mapped functions
- Each re-execution updates the dependency tracking

**Why this separation matters:**
- Content can update (via WebSocket, user actions) without triggering navigation attribute recalculation
- Navigation state changes (`_.path`, `_.most_recent_path`) cause appropriate wrappers to appear/disappear
- Animation CSS transitions respond only to attribute changes, creating smooth animations

**Modified `loadingPage()`:**
```javascript
const loadingPage = (first_render, skip_state, clicked_back) => {
  // Update reactive navigation state for animations
  // This causes renderNotifications(), renderPosts(), etc. to re-execute from renderHeaderFooter
  _.most_recent_path = _.path || ""
  _.clicked_back = clicked_back
  
  // Note: _.path is already set elsewhere (in goToPath() or similar)
  // We would migrate existing state.path assignments to _.path for tracking
  
  // No need to call render functions directly - they're reactive placeholders
  // No need to manage wrapper creation/cleanup - it's handled reactively
  
  // Continue with other loadingPage logic for non-reactive elements
  // ... existing loadingPage logic for other elements (renderBack, special pages, etc.) ...
}
```

#### Phase 2: Expand to More Static Paths

Once Phase 1 is working, add similar render functions for more paths:
- `renderTopics()` for `/topics`
- `renderConversations()` for `/conversations` 
- `renderFavorites()` for `/favorites`
- `renderSettings()` for `/settings`
- `renderWelcome()` for `/`
- `renderPrivacy()` for `/privacy`

Each follows the same pattern:
```javascript
const renderTopics = () => {
  if (_.path !== "/topics" && _.most_recent_path !== "/topics") {
    return _("div")
  }
  
  return _(`
    main-content-wrapper[active=$1][inactive=$2][clicked-back=$3][full-width]
      main-content
        $4
      main-content-2
        $5
  `, [
    () => _.path === "/topics",
    () => _.path !== "/topics", 
    () => _.clicked_back,
    () => renderTopicsContent(),
    () => [] // empty for topics
  ])
}
```

#### Phase 3: Handle Dynamic Routes

For dynamic routes (user profiles, individual posts, etc.), we have two options:
1. Skip animation for same-type transitions (user→user) - just use current loadingPage system
2. Create pattern-based render functions that handle multiple similar routes

### Benefits

1. **True reactivity**: Wrappers appear/disappear reactively based on navigation state
2. **Clean animations**: CSS animations based on reactive attributes  
3. **No timing issues**: Animation timing handled entirely by reactive state changes
4. **Gradual migration**: Can add one render function at a time to renderHeaderFooter.js
5. **Simplified loadingPage**: Just updates reactive state, no wrapper management

### Challenges to Solve

1. **Migration tracking**: Change existing `state.path` assignments to `_.path` throughout codebase
   - This helps track which parts have been migrated to reactive architecture
   - Functionally identical since `state` and `_` are the same object
   - Initialize new state: `_.most_recent_path = ""; _.clicked_back = false`
   
2. **Data fetching**: Keep current `startSession()` unchanged
   - Continue calling from `goToPath()` as before
   - Reactive content functions will automatically update when data populates
   
3. **Testing**: Tests should continue working since DOM structure is similar
   - Main difference is wrappers appear/disappear reactively instead of being created imperatively