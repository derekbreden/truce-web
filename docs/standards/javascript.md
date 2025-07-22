# JavaScript Standards

Coding conventions for JavaScript development in this project.

## Naming Conventions

- **Functions**: `camelCase` for functions only
- **Variables**: `snake_case` for all variables
- **DOM variables**: Prefix with `$` like `const $button = $old("button")`
- **Constants**: Use `const` for function declarations: `const func = () => {}`
- **Global variables**: Explicitly declare in `index.html` initialization

## Code Style

- **Arrow functions**: Use `const func = () => {}` not `function func() {}`
- **Quotes**: Double quotes `"string"` not single quotes
- **Semicolons**: Omit semicolons
- **Array methods**: Use `.includes()` instead of `.indexOf() === -1`
- **Type casting**: Use `Number()` not `parseInt()`
- **Path extraction**: Use `path.split("/")[index]` consistently

## File Organization

- Use descriptive filenames that indicate purpose
- Group related functions in the same file  
- Place initialization code in IIFE blocks
- Coordinate between files using DOM events or global state

## Global Scope Guidelines

Since all files share global scope:
- Use descriptive variable names to avoid conflicts
- Prefix related variables with common prefixes  
- Check for existing global variables before declaring new ones

## DOM Variable Conventions

```javascript
// Prefix DOM variables with $ for clarity
const $button = $old("button")
const $posts = $old("posts post")

// Use descriptive names for cached elements
const $main_content_wrapper = $old("main-content-wrapper[active]")
const $modal_background = $old("modal-bg")
```

## Event Handling

**Use body-level delegation for dynamic content:**
```javascript
$old("body").on("click", ($event) => {
    if ($event.target.matches("button[favorite]")) {
        handleFavoriteClick($event.target)
    }
})
```

**Emit custom events for component communication:**
```javascript
$old("body").dispatchEvent(new CustomEvent("page-updated"))
```