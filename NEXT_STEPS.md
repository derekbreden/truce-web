# Next Step: Import Reactive Flint.js Library

## Current State
- ✅ All existing code uses `$old()` (client/flint.old.js)
- ✅ Namespace `$` and `_` is free for reactive library
- ✅ All 26 tests passing with zero regressions

## Immediate Next Task: Import Reactive Library

### 1. Copy Reactive Flint.js
```bash
cp ../flint.js/flint.js ./client/flint.js
```

### 2. Add to index.html
Add include after flint.old.js:
```html
// <!--#include file="client/flint.old.js" -->
// <!--#include file="client/flint.js" -->
```

### 3. Update Test Setup
Add `$` and `_` to exposed constants in `tests/testSetupHelpers.js:9`:
```js
options.constsToExpose = [...options.constsToExpose, "state", "$old", "$", "_"]
```

### 4. Find First Migration Target

**Read foundational files first to understand codebase architecture:**

1. **client/startSession.js** - Session initialization, fetch wrapper, state management
2. **client/loadingPage.js** - Page loading UI and initial rendering  
3. **client/renderPage.js** - Main page rendering orchestration
4. **index.html** - Global state object definition

**Then search for simple, well-tested reactive candidates:**
- Look for isolated UI state (booleans, simple counters)
- Avoid complex nested server data
- Focus on client-side only state
- Find components with existing test coverage

## Key Files to Read

1. **../flint.js/flint.js** - The reactive library to import
2. **Foundational files listed above** - Understanding codebase structure
3. **tests/functional/** directory - Find well-tested components
4. **client/** directory - Search for simple state candidates

## Success Criteria
- Both `$old()` and `$()/_()` available globally
- Existing functionality unchanged (all tests pass)
- One small reactive component working alongside legacy code