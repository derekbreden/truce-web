# Truce.net Codebase Conventions

This README documents the coding conventions and patterns used in the Truce.net social media platform codebase to help new contributors understand the project structure and style.

## Project Architecture

### Client-Side File Organization
All client-side JavaScript files are included in `index.html` using server-side includes:
```html
// <!--#include file="client/flint.js" -->
// <!--#include file="client/debug.js" -->
// <!--#include file="client/markdownToElements.js" -->
```

These files are processed by `server/server.js` and concatenated into a single `<script>` block, meaning all `const` and `let` declarations are available globally across all client files. This non-standard method of including and scoping client-side files is why a special utility like `loadClientScript` (detailed in the 'Testing' section) is often necessary when writing tests for them, as they are not typical JavaScript modules.

### Server-Side Structure
- `server/session/` - Middleware functions for handling session requests
- `server/` - Core server functionality, database, AI integration
- Each session middleware function follows the pattern `(req, res) => {}`

## JavaScript Conventions

### Function Declarations
Use arrow functions consistently:
```javascript
// ✅ Correct
const renderTopic = (topic) => {
  // function body
}

// ❌ Avoid
function renderTopic(topic) {
  // function body
}
```

### String Literals
Use double quotes consistently:
```javascript
// ✅ Correct
const message = "Hello world"
const className = "topic-wrapper"

// ❌ Avoid  
const message = 'Hello world'
```

### Semicolons
Omit semicolons:
```javascript
// ✅ Correct
const user = { name: "John" }
alert("Success")

// ❌ Avoid
const user = { name: "John" };
alert("Success");
```

## Testing
This project contains both standard server-side Node.js modules and client-side JavaScript files that are handled in a unique, non-modular way. The testing approach varies slightly depending on what you are testing. Server-side code and any client-side code structured as standard modules can be tested using typical Node.js testing patterns. However, for client-side scripts that are globally included (as described in 'Client-Side File Organization'), a special approach is needed.

### How to run tests
To run all automated tests, use the following command from the project root:
```bash
npm install jsdom esprima
npm test
```
This will execute all test files located in the `tests/` directory that end with `.test.js`.

### How to write new tests
Test files should be named with the `.test.js` suffix (e.g., `myModule.test.js`) and placed within the `tests/` directory or its subdirectories.

Tests are written in Node.js.

Use the provided test utilities in `tests/testUtils.js` for assertions and test structure. Import them as needed:
```javascript
const { assertEquals, runTests } = require('./testUtils'); // Adjust path if needed if testUtils is in a different sub-directory of tests/
```

A typical test file structure looks like this:
```javascript
const { assertEquals, runTests } = require('./testUtils'); // Or appropriate path e.g. require('../testUtils') if in a sub-directory of tests/
// Import the module to be tested
// const myModule = require('./myModule');

// Define your test functions
function testFeatureOne() {
  // Setup and assertions
  // assertEquals(expected, myModule.featureOne(), 'Feature one should work');
}

function testFeatureTwo() {
  // Setup and assertions
}

// Run all tests in this file
runTests('myModule.test.js', [
  testFeatureOne,
  testFeatureTwo
  // Add more test functions here
]);
```

### Testing Non-Modular Client-Side Scripts
Client-side files included directly in `index.html` (and not structured as ES6 modules) require a special approach for testing due to their reliance on a global scope and browser-specific APIs. For these situations, use the `loadClientScript` utility from `tests/testHelpers.js`.

The `loadClientScript` function works as follows:
- It reads the target script file.
- It accepts an object of `globalMocks` (e.g., for `document`, `window`, custom global functions).
- It optionally accepts a third argument, `constNamesToReturn`, which can be a string or an array of strings. This argument specifies which constant(s) defined within the script should be returned.
- It executes the script within a context where the `globalMocks` are available globally.
- It returns the requested constant(s):
  - If `constNamesToReturn` is omitted, it defaults to returning the constant that has the same name as the file (e.g., `myScript.js` would lead to `myScript` being returned). This maintains backward compatibility.
  - If `constNamesToReturn` is a string, it returns the value of that specific constant.
  - If `constNamesToReturn` is an array of strings, it returns an object where keys are the names from the array and values are the corresponding constants from the script.

Here’s an updated code example:

```javascript
// In your test.js
const path = require('path');
// Assuming testUtils.js and testHelpers.js are in the tests/ directory or a subdirectory.
// Adjust path if they are in different locations.
const { assertEquals, runTests } = require('./testUtils'); // e.g. require('../testUtils') if in a sub-directory of tests/
const { loadClientScript, createMockDocument, createMockWindow } = require('./testHelpers'); // e.g. require('../testHelpers') if in a sub-directory of tests/

// For browser-specific globals like `document` and `window`, use the helper functions
// from `tests/testHelpers.js` to create mock objects:
const mockDocument = createMockDocument();
const mockWindow = createMockWindow(mockDocument);

// These can then be passed to loadClientScript's globalMocks argument:
// const globalMocks = {
//   document: mockDocument,
//   window: mockWindow,
//   // ... any other custom global mocks your script might need (e.g., Image, navigator)
// };

// --- Scenario 1: Default behavior (backward compatible) ---
// Assuming 'client/myOldScript.js' defines 'const myOldScript = ...;'
// and it might use global document or window objects.
const myOldScript = loadClientScript(
  path.resolve(__dirname, '../client/myOldScript.js'), // Path to the script from tests/ dir
  { document: mockDocument, window: mockWindow /*, ...otherMocks */ } // Global mocks
);
// myOldScript can now be used.
// Example test:
// function testOldScript() {
//   assertEquals('expected', myOldScript.someFunction(), 'Test for old script');
// }

// --- Scenario 2: Loading a script and fetching a specific named constant ---
// Useful for scripts like 'client/flint.js' which defines 'const $ = ...;'
// flint.js might need document/window, so pass mocks.
const $ = loadClientScript(
  path.resolve(__dirname, '../client/flint.js'), // Path to flint.js from tests/ dir
  { document: mockDocument, window: mockWindow /*, ...otherMocks */ },
  "$" // Name of the constant to return
);
// $ can now be used for testing flint.js functionality.
// Example test:
// function testFlintDollar() {
//   const $el = $('div');
//   assertEquals('DIV', $el.tagName, 'Flint $ should create elements');
// }

// --- Scenario 3: Loading a script and fetching multiple specific constants ---
// Assuming 'client/myMultiConstScript.js' defines 'const foo = ...;' and 'const bar = ...;'
const myConstants = loadClientScript(
  path.resolve(__dirname, '../client/myMultiConstScript.js'), // Path to script from tests/ dir
  { document: mockDocument, window: mockWindow /*, globalMocks, if any */ },
  ["foo", "bar"] // Array of constant names to return
);
// myConstants would be { foo: /* value of foo */, bar: /* value of bar */ }
// You can then access myConstants.foo and myConstants.bar.
// Example test:
// function testMultiConst() {
//   assertEquals('fooValue', myConstants.foo, 'Test for foo');
//   assertEquals('barValue', myConstants.bar, 'Test for bar');
// }

// Example of running tests (assuming you have defined test functions)
// runTests('UpdatedLoadClientScriptTests', [
//   testOldScript,
//   testFlintDollar,
//   testMultiConst
// ]);
```
The `loadClientScript` utility is the recommended approach for loading client scripts in new tests. It helps in injecting mock objects into the global scope for your script during testing.

For creating `document` and `window` mocks, use the `createMockDocument()` and `createMockWindow()` helper functions from `tests/testHelpers.js`. For other global browser APIs not covered by these helpers (e.g., `Image`, `navigator`), you might still need to create your own mocks. For examples of creating other mocks (like `Image`), see `tests/imageToPng.test.js`.

### Testing `flint.js` and Dependent Code

To test `flint.js` itself or any client-side scripts that depend on `flint.js`, the standard approach is to use the `loadClientScript` utility. This utility, found in `tests/testHelpers.js`, allows the real `flint.js` code to be loaded and executed within a controlled test environment.

When using `loadClientScript` for this purpose, you should provide mock implementations for browser-specific globals like `document` and `window`. This creates a mock DOM environment, enabling `flint.js` to operate as it would in a browser, but with predictable and controllable behavior for testing.

The example provided in the "Testing Non-Modular Client-Side Scripts" section demonstrates how to use `loadClientScript` to load `flint.js` by requesting the `$` constant, along with providing necessary mock DOM objects:

```javascript
// In your test.js
// ... (ensure mockDocument and mockWindow are created using createMockDocument and createMockWindow as shown above) ...

const $ = loadClientScript(
  path.resolve(__dirname, '../client/flint.js'), // Path to flint.js from tests/ dir
  { document: mockDocument, window: mockWindow /*, ...otherMocks */ },
  "$" // Name of the constant to return
);
// $ can now be used for testing flint.js functionality or for testing
// other client scripts that require $ to be in their scope.
```

This approach ensures that tests are run against the actual `flint.js` implementation, providing more accurate and reliable test results. It is the recommended method for all new tests involving `flint.js`.

## Flint.js DOM Manipulation

### Variable Naming
Prefix all Flint.js DOM element variables with `$`:
```javascript
// ✅ Correct
const $button = $("button[submit]")
const $modal = $("modal-wrapper")
const $topics = topics.map(renderTopic)

// ❌ Avoid
const button = $("button[submit]")
const modal = $("modal-wrapper")
```

### Element Selection
```javascript
// Select single element
const $header = $("header")

// Select multiple elements  
const $buttons = $("button")

// Nested selection within element
const $submitButton = $modal.$("button[submit]")
```

### Event Binding
```javascript
const $button = $("button[save]")
$button.on("click", ($event) => {
  $event.preventDefault()
  saveData()
})

// Event binding on multiple elements
$("button").forEach(($btn) => {
  $btn.on("click", handleClick)
})
```

### Element Creation with Templates
Flint.js uses a distinctive template syntax with indentation-based nesting:

```javascript
const $modal = $(
  `
  modal-wrapper
    modal[info]
      h2 $1
      p $2
      button[close] Done
    modal-bg
  `,
  [title, message]
)
```

### Template Arguments
Use `$1`, `$2`, etc. for dynamic content:
```javascript
const $topic = $(
  `
  topic
    h2 $1
    author[slug=$2] $3
    p $4
  `,
  [topic.title, topic.user_slug, topic.display_name, topic.body]
)
```

### Attribute Syntax
Attributes are specified in square brackets:
```javascript
const $input = $(
  `
  input[type=text][placeholder=$1][maxlength=50]
  `,
  ["Enter name"]
)

const $button = $(
  `
  button[submit][disabled=$1] Save
  `,
  [isLoading]
)
```

### Complex Template Patterns
#### Conditional Content
```javascript
const $userMenu = $(
  `
  menu
    $1
    $2
  `,
  [
    user.isAdmin ? $("admin-link Admin Panel") : [],
    user.email ? $("logout-button Logout") : $("login-button Login")
  ]
)
```

#### Arrays of Elements
```javascript
const $commentList = $(
  `
  comments
    $1
  `,
  [comments.map(renderComment)]
)
```

## State Management

### Global State Object
The application uses a global `state` object:
```javascript
const state = {
  path: "/",
  user_id: "",
  display_name: "",
  cache: {},
  loading_path: false
}
```

### Cache Management
```javascript
// Store data in cache
state.cache[state.path] = data

// Check cache before network request
if (state.cache[state.path]) {
  renderPage(state.cache[state.path])
  return
}
```

## Database and Session Patterns

### Session Middleware Pattern
Each middleware function checks conditions and modifies `req` or `res`:
```javascript
module.exports = async (req, res) => {
  if (!res.writableEnded && req.session.user_id && req.body.title) {
    // Process request
    const result = await req.client.query("SELECT ...", [params])
    
    res.end(JSON.stringify({
      success: true,
      data: result.rows
    }))
  }
}
```

### Database Queries
Use parameterized queries consistently:
```javascript
const topics = await req.client.query(
  `
  SELECT t.title, t.body, u.display_name
  FROM topics t
  INNER JOIN users u ON t.user_id = u.user_id  
  WHERE t.create_date > $1
  ORDER BY t.create_date DESC
  LIMIT $2
  `,
  [since_date, limit]
)
```

## Error Handling and Response Patterns

### Network Requests
```javascript
fetch("/session", {
  method: "POST", 
  body: JSON.stringify({ path: state.path })
})
.then((response) => response.json())
.then((data) => {
  if (data.error || !data.success) {
    alertError(data.error || "Server error")
  } else {
    renderPage(data)
  }
})
.catch(() => {
  alertError("Network error")
})
```

### Modal and Alert Functions
```javascript
// Show error modal
modalError("Something went wrong")

// Show info alert  
alertInfo("Data saved successfully")

// Show confirmation modal
modalConfirm("Are you sure?", () => {
  deleteItem()
})
```

## Component Rendering Patterns

### Render Function Structure
Render functions typically take data and return DOM elements:
```javascript
const renderTopic = (topic) => {
  const $topic = $(
    `
    topic
      h2 $1
      p $2
      author $3
    `,
    [topic.title, topic.body, topic.display_name]
  )
  
  // Add event handlers
  $topic.on("click", () => {
    goToPath(`/topic/${topic.slug}`)
  })
  
  // Store reference for later updates
  topic.$topic = $topic
  return $topic
}
```

### Page Update Patterns
```javascript
const updateCounts = (data) => {
  data.topic_counts?.forEach((count) => {
    const found_topic = state.cache[state.path].topics.find(
      (topic) => topic.topic_id === count.topic_id
    )
    if (found_topic) {
      found_topic.comment_count = count.comment_count
      found_topic.$topic.$("[comments] p").innerText = count.comment_count
    }
  })
}
```

This pattern of caching DOM references on data objects (`topic.$topic`) enables efficient updates without re-rendering entire components.

## Navigation and Routing

### Path Management
The application uses a simple client-side routing system:
```javascript
const goToPath = (new_path, skip_state, clicked_back) => {
  if (state.path !== new_path) {
    state.path = new_path
    state.path_index++
    history.pushState({ path_index: state.path_index }, "", state.path)
    loadingPage(false, skip_state, clicked_back)
  }
  startSession()
}
```

### Link Handling
Internal links are handled with preventDefault and goToPath:
```javascript
$("[href]").forEach(($el) => {
  $el.on("click", ($event) => {
    const new_path = $el.getAttribute("href")
    if (new_path.substr(0, 1) === "/") {
      $event.preventDefault()
      goToPath(new_path)
    }
  })
})
```

## Data Flow and Updates

### Real-time Updates via WebSocket
```javascript
// Client receives update message
state.ws.addEventListener("message", (event) => {
  if (event?.data === "UPDATE") {
    getMoreRecent()
  }
})

// Server sends update after data changes
req.sendWsMessage("UPDATE", topic_id)
```

### Progressive Loading
```javascript
const getMoreRecent = () => {
  const min_create_date = current_cache.topics.reduce((max, topic) => {
    return max > topic.create_date ? max : topic.create_date
  }, "")
  
  fetch("/session", {
    method: "POST",
    body: JSON.stringify({
      path: current_path,
      min_create_date
    })
  })
  .then((response) => response.json())
  .then((data) => {
    current_cache.topics.unshift(...data.topics)
    renderTopics(current_cache.topics)
  })
}
```

## AI Integration Patterns

### Content Moderation
All user content is processed through AI moderation:
```javascript
const ai_response = await ai.ask(messages, "common", prompts.common_response_format)
let ai_response_parsed = { keyword: "OK" }
try {
  ai_response_parsed = JSON.parse(ai_response)
} catch (e) {
  console.error("Failed to parse AI JSON", ai_response, e)
}

if (ai_response_parsed.keyword === "Spam") {
  res.end(JSON.stringify({ error: ai_response_parsed.keyword }))
  return
}
```

### Structured AI Responses
AI responses use JSON schema for consistency:
```javascript
const prompts = {
  common_response_format: {
    type: "json_schema",
    json_schema: {
      name: "response",
      strict: true,
      schema: {
        type: "object",
        properties: {
          keyword: {
            enum: ["Spam", "Escalation", "Judgment", "Name-calling", "OK"],
            description: "The most applicable keyword"
          },
          note: {
            type: "string",
            description: "A note explaining why the keyword applies"
          }
        },
        required: ["keyword", "note"],
        additionalProperties: false
      }
    }
  }
}
```

## File Upload and Storage

### Image Processing
Images are converted to PNG and uploaded to object storage:
```javascript
const imageToPng = (src, callback, size, crop) => {
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")
  const img = new Image()
  
  img.onload = () => {
    // Resize and crop logic
    const data_url = canvas.toDataURL("image/png")
    callback({
      url: data_url,
      width: canvas.width,
      height: canvas.height
    })
  }
  img.src = src
}
```

### Upload to Server
```javascript
const image_uuids = []
for (const png of req.body.pngs) {
  const image_uuid = crypto.randomUUID()
  await object_client.send(
    new PutObjectCommand({
      Bucket: "truce.net",
      Key: `${image_uuid}.png`,
      Body: png.url
    })
  )
  image_uuids.push(image_uuid)
}
```

## Notification System

### Push Notifications
```javascript
const subscriptions = await req.client.query(
  `
  SELECT user_id, subscription_json, fcm_token
  FROM subscriptions  
  WHERE user_id IN (SELECT user_id FROM topics WHERE topic_id = $1)
  AND active = TRUE
  `,
  [topic_id]
)

subscriptions.rows.forEach(async (subscription) => {
  if (subscription.fcm_token) {
    // Firebase Cloud Messaging
    const message = {
      notification: {
        title: `${short_display_name} replied`,
        body: short_body
      },
      token: JSON.parse(subscription.fcm_token)
    }
    await fcm_messaging.send(message)
  } else {
    // Web Push
    webpush.sendNotification(
      JSON.parse(subscription.subscription_json),
      JSON.stringify({
        title: `${short_display_name} replied`,
        body: short_body
      })
    )
  }
})
```