# JavaScript Standards

## Naming Conventions

- **Functions**: `camelCase` for functions only
- **Variables**: `snake_case` for all variables
- **DOM variables**: Prefix with `$` like `const $button = $("button")`
- **Constants**: Use `const` for function declarations: `const func = () => {}`

## Code Style

- **Arrow functions**: Use `const func = () => {}` not `function func() {}`
- **Quotes**: Double quotes `"string"` not single quotes
- **Semicolons**: Omit semicolons
- **Array methods**: Use `.includes()` instead of `.indexOf() === -1`
- **Type casting**: Use `Number()` not `parseInt()`

## Client-Side Architecture

### Module System
- **Non-standard**: All client JS files included via server-side includes in `index.html`
- **Global scope**: All `const`/`let` declarations are globally scoped across client files
- **No imports/exports**: Everything is global - no traditional module imports/exports
- **File concatenation**: Server concatenates files into single `<script>` block

### Flint.js DOM Library
**Critical**: Two distinct modes detected by newline character:

**Selector Mode** (existing elements):
```javascript
const $button = $("button")           // Single element or NodeList
const $posts = $("posts post")        // Multiple elements
```

**Template Mode** (create new elements):
```javascript
const $listItem = $(`
  li[class=$1] $2
`, ["red", "Red Item"])
$("ul").appendChild($listItem)
```

Template mode uses:
- Indentation-based hierarchy
- `$1`, `$2` placeholders for arguments
- Attribute syntax `[class=$1]`

## Session Middleware Pattern

```javascript
module.exports = async (req, res) => {
    if (!res.writableEnded && req.session.user_id && req.body.data) {
        // Handle request logic
        res.end(JSON.stringify({ success: true }))
    }
}
```

## Path Handling

- **Consistent extraction**: Use `path.split("/")[index]` consistently
- **URL patterns**: Follow existing routing conventions in server files

## Common Patterns

- **Button interactions**: Target specific elements with CSS selectors
- **Form handling**: Use semantic HTML with custom attributes
- **State management**: Leverage global scope and DOM state
- **Event handling**: Use standard DOM events with custom business logic