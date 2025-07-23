# NEXT_STEPS.md

## Goal

Move all render functions to placeholder functions passed to _() templates as $1 $2 etc.

## Recent Work: renderNotifications.js

## Recent Work: renderHeaderFooter.js

### Critical Understanding for Next Instance

**The core insight:** The breakthrough was NOT about individual templates using `_()`. It was about making PARENT containers use `_()` so that child functions could be passed as placeholders and become reactive. The parent `_()` IS NOT reactive. The children passed as functions to placeholders ARE reactive.

### Files to Study

**flint.js**
- `client/flint.js` - The library you will be using
- `../flint.js/examples/todo-mvc/` - A small clean example of how flint.js SHOULD be used.

**Recent Work:**
- `client/loadingPage.js` - Parent template (NOT reactive)
- `client/renderNotifications.js` - Functions that become reactive via placeholders
- `client/renderHeaderFooter.js` - Functions that become reactive via placeholders

**Current imperative patterns:**
- `client/renderPage.js` - Manual function calls and DOM manipulation
- Other `client/render*.js` files - Manual DOM approaches
