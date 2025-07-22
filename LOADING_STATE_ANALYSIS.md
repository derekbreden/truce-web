# Loading State Analysis - Perfect First Reactive Migration Target

## Current Loading State Implementation

### Global State
- **Location**: `index.html:68` 
- **Property**: `state.loading_path: false`
- **Type**: Simple boolean

### Current Flow
1. **Start Loading**: `startSession.js:57` → `state.loading_path = true`
2. **Show UI**: `loadingPage.js:27-37` → Creates `posts-loading` skeleton  
3. **Finish Loading**: `renderPage.js:12` → Removes loading indicator
4. **Reset State**: `startSession.js:106,109,442,448` → `state.loading_path = false`

## Why This Is Perfect for First Migration

### ✅ Simple State
- Single boolean value
- No complex nested data
- Clear on/off states

### ✅ Client-Side Only  
- Never sent to/from server
- Pure UI state
- No persistence concerns

### ✅ Well-Isolated
- Not embedded in server responses
- Independent of post/reply/user data
- Easy to extract from global state

### ✅ Well-Tested
- Loading states used throughout app
- Existing test coverage for fetch operations
- Clear success/failure states

### ✅ Clear UI Mapping
- `loading_path: true` → Show skeleton
- `loading_path: false` → Show content

## Proposed Reactive Migration

### Step 1: Extract to Reactive State
```javascript
// In new flint.js reactive state
_.loading = false

// Replace state.loading_path with _.loading
```

### Step 2: Reactive Loading Indicator
```javascript
// Replace loadingPage.js skeleton creation with reactive template
const loading_indicator = _(`
  $1
`, [() => _.loading ? 
  _(`posts-loading
      h2
      p  
      p`) : 
  _(`<!-- no loading -->`)
])
```

### Step 3: Update State Setters
Replace all instances of:
- `state.loading_path = true` → `_.loading = true`
- `state.loading_path = false` → `_.loading = false`

## Key Files to Modify

1. **startSession.js:57,106,109,442,448** - Update loading state setters
2. **loadingPage.js:27-37** - Replace skeleton creation with reactive template  
3. **renderPage.js:12** - Remove manual loading indicator removal
4. **index.html:68** - Remove `loading_path` from global state

## Success Criteria
- Loading indicator appears/disappears automatically
- All existing functionality preserved
- All 26 tests still pass
- First working example of reactive state alongside `$old` legacy code