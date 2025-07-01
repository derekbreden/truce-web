# Client-Side Module Architecture

## Non-Standard Module System

This project uses a unique client-side architecture that differs from standard JavaScript modules.

## How It Works

### Server-Side Includes
- All client JS files are included via server-side includes in `index.html`
- Files are concatenated into a single `<script>` block by `server/server.js`
- No traditional ES6 imports/exports or CommonJS requires

### Global Scope
- All `const` and `let` declarations are globally scoped across client files
- Variables declared in one file are accessible in all other files
- No module boundaries or namespace isolation

### File Structure
```
client/
├── js/
│   ├── core.js           # Core utilities and setup
│   ├── navigation.js     # Routing and navigation
│   ├── posts.js         # Post-related functionality
│   ├── conversations.js # Messaging features
│   └── ...              # Other feature files
```

## Development Patterns

### Variable Naming
- Use descriptive names to avoid global conflicts
- Prefix DOM variables with `$` for clarity
- Use `snake_case` for variables, `camelCase` for functions

### Code Organization
- Group related functionality in same file
- Use IIFE (Immediately Invoked Function Expressions) for initialization
- Leverage DOM events for coordination between files

### Dependencies
- Files load in order defined by server concatenation
- Earlier files can define utilities used by later files
- No explicit dependency management

## Benefits

- **Simple**: No build process or module bundler required
- **Fast**: Single HTTP request for all JavaScript
- **Debuggable**: All code visible in browser dev tools
- **Cacheable**: Single JS file can be efficiently cached

## Considerations

- **Global pollution**: All variables share global namespace
- **Load order**: File order matters for dependencies
- **Testing**: Requires special handling in test environment
- **Scaling**: May become unwieldy with very large codebases

## Flint.js Integration

The global `$()` function from Flint.js is available everywhere:
```javascript
// Works in any client file
const $button = $("button")
const $posts = $("posts post")
```

## Best Practices

1. **Initialize on DOM ready**: Use event listeners for setup
2. **Namespace functions**: Group related functions in objects
3. **Avoid conflicts**: Use unique variable names
4. **Document dependencies**: Comment when files depend on others
5. **Test thoroughly**: Global scope can hide dependency issues