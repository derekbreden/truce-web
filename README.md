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
This project contains both standard server-side Node.js modules and client-side JavaScript files that are handled in a unique, non-modular way.

### How to run tests
The primary way to run automated tests is using the `npm test` command from the project root. This command has several options:

*   **To run all tests:**
    ```bash
    npm test
    ```
    This executes all test files (`*.test.js`) located within the `tests/` directory and its subdirectories. The output will be categorized into "Unit Tests", "Integration Tests", and "Other Tests", each with its own summary.

*   **To run a specific test file:**
    Provide the path to the test file relative to the project root:
    ```bash
    npm test tests/client/integration/navigation.integration.test.js
    ```
    **Pro Tip:** `tests/client/integration/navigation.integration.test.js` is an excellent, up-to-date example to reference for common patterns, including initial page navigation (like clicking 'Join the Discussion'). Always consult existing tests like this one when writing new ones.

*   **To run specific categories of tests:**
    You can run all unit tests or all integration tests using the following commands:
    *   **Unit Tests** (tests located in any subdirectory named `unit` within `tests/`):
        ```bash
        npm test unit
        ```
    *   **Integration Tests** (tests located in any subdirectory named `integration` within `tests/`):
        ```bash
        npm test integration
        ```

Make sure you have run `npm install jsdom` before running tests.

### How to write new tests

1.  **Integration Testing for the Full Client Environment**:

    Example for an integration test:
    Many tests need to simulate the user clicking "Join the Discussion" on the welcome page to navigate to the main content. The example below includes this crucial first step:
    ```javascript
    // In your integration test (e.g., tests/client/integration/myFeature.test.js)
    const { assertEquals, runTests } = require("../shared/testUtils.js")
    const { setupIntegrationTestEnvironment } = require("../shared/integrationTestSetup.js")

    async function testMyFeatureInFullEnvironment() { // Added async
      const window = setupIntegrationTestEnvironment()
      // Now window.state, window.$ are available
      const { state, $ } = window // Destructure after window is defined

      // Most integration tests need to simulate the initial "Join the Discussion" click.
      // 1. Mock initial and target path responses:
      window.setMockFetchResponseForPaths({
        "/": { success: true, path: "/", topics: [], comments: [], user: {} }, // Mock for welcome page
        "/topics": { success: true, path: "/topics", topics: [{slug: "example-topic", title:"Example Topic", body: "Body of example topic", user_slug: "user-slug", display_name: "User Name"}], comments: [], user: {} } // Mock for topics page
      })

      // 2. Find and click the "Join the Discussion" button:
      const joinButton = $(`a[href="/topics"][big]`)
      if (joinButton && joinButton.click) { // Ensure button exists before clicking
        joinButton.click()
        // Wait for DOM updates and navigation
        await new Promise(resolve => setTimeout(resolve, 50)) // Small delay for async operations
      } else {
        console.error("Could not find the 'Join the Discussion' button in the test setup.")
        // Potentially throw an error or handle as a test failure condition
      }

      // Now you are on the /topics page (or the page your action navigates to)
      // Example: Assert navigation and find an element on the new page
      assertEquals("/topics", state.path, "Should have navigated to /topics.")

      const topicsWrapper = $("topics") // Element that wraps all topics
      assertEquals(true, Boolean(topicsWrapper), "Topics wrapper element should be present on /topics page.")

      const firstTopicElement = $("topics > topic")
      assertEquals(true, Boolean(firstTopicElement), "A topic element should be found on the /topics page.")

      // Continue with your feature-specific test logic...
      // Example: Trigger another action on the /topics page
      // const specificTopicButton = firstTopicElement.$("button[some-action]")
      // if (specificTopicButton && specificTopicButton.click) {
      //   specificTopicButton.click()
      //   await new Promise(resolve => setTimeout(resolve, 50))
      //   assertEquals("expected state change", state.someProperty, "State should update after feature button click")
      // }
    }

    // Remember to pass the async function to runTests
    runTests("myFeature.integration.test.js", [testMyFeatureInFullEnvironment])
    ```
    This is the preferred method for **ALL** integration tests.

    **Pro Tip:** `tests/client/integration/navigation.integration.test.js` is an excellent, up-to-date example to reference for common patterns, including initial page navigation (like clicking 'Join the Discussion'). Always consult existing tests like this one when writing new ones.

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