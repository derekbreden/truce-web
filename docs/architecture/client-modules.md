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
├── flint.js              # Global $ function (selector + template engine)
├── startSession.js       # Session initialization and fetch wrapper
├── goToPath.js          # Client-side routing and navigation
├── renderPage.js        # Main UI orchestration function
├── renderPosts.js       # Post list rendering
├── renderMessages.js    # Real-time messaging UI
├── modals.js           # Modal dialog functions
├── websocket.js        # WebSocket communication
├── css/                # Organized CSS architecture
│   ├── foundation/     # Design tokens, fonts, animations
│   ├── layout/         # Base, header, footer, navigation
│   ├── attributes/     # Semantic attribute classes
│   ├── features/       # Post, conversation, profile styles
│   └── interactions/   # Forms, modals, actions
└── ...                 # 40+ other specialized files
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

### File Organization
- Files are organized by functionality: core utilities, navigation, rendering, actions
- Loading order is for organization, not dependencies
- Application initialization happens after all files are loaded

## Benefits

- **Simple**: No build process or module bundler required
- **Fast**: Single HTTP request for all JavaScript
- **Debuggable**: All code visible in browser dev tools
- **Cacheable**: Single JS file can be efficiently cached

## Considerations

- **Global pollution**: All variables share global namespace
- **Organization**: File order is for readability, not dependencies
- **Testing**: Requires special handling in test environment
- **Scaling**: May become unwieldy with very large codebases

## Flint.js Integration

The global `$()` function from Flint.js provides two modes:

**Selector Mode** (jQuery-like element selection):
```javascript
const $button = $("button")
const $posts = $("posts post")
```

**Template Mode** (indentation-based element creation):
```javascript
const $modal = $(
  `
  modal-wrapper
    modal[confirm]
      $1
      button-wrapper
        button[confirm][close] Yes, I am sure
  `,
  [message],
)
```

## Best Practices

1. **Initialize on DOM ready**: Use event listeners for setup
2. **Namespace functions**: Group related functions in objects
3. **Avoid conflicts**: Use unique variable names
4. **Document dependencies**: Comment when files depend on others
5. **Test thoroughly**: Global scope can hide dependency issues