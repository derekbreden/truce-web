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

These files are processed by `server/server.js` and concatenated into a single `<script>` block, meaning all `const` and `let` declarations are available globally across all client files. This non-standard method of including and scoping client-side files requires a specific setup for tests, as they are not typical JavaScript modules.

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

### How to run tests
```bash
npm test                              # Run all tests
npm test navigation.integration.test.js  # Run specific test file
```

Make sure you have run `npm install jsdom` before running tests.

### How to write tests

All integration tests follow this pattern:

```javascript
const { assertEquals, runTests } = require("../shared/testUtils.js")
const { setupIntegrationTestEnvironment } = require("../shared/integrationTestSetup.js")

async function testMyFeature() {
	const window = await setupIntegrationTestEnvironment()
	const { state, $ } = window

	// Mock API responses
	window.setMockFetchResponseForPaths({
		"/topics": { 
			path: "/topics", 
			topics: [{slug: "example", title: "Example", body: "Body", user_slug: "user", display_name: "User"}], 
			comments: [], 
			activities: [], 
			notifications: [] 
		}
	})

	// Navigate from welcome page
	const $joinButton = $("a[href='/topics'][big]")
	$joinButton.click()
	await new Promise(resolve => setTimeout(resolve, 0))

	// Test assertions
	assertEquals("/topics", state.path, "Should navigate to topics")
	assertEquals("Example", $("topic h2").innerText.trim(), "Should show topic title")
}

runTests("myFeature.test.js", [testMyFeature])
```

### Critical Testing Philosophy: No Guard Assertions

**This project strictly prohibits "guard assertions" in favor of direct failure patterns.**

#### Wrong Approach (Guard Assertions)
```javascript
// ❌ AVOID: Defensive, noisy, less informative
const $element = $("my-selector")
assertEquals(true, Boolean($element), "Element should exist")
assertEquals("expected text", $element.innerText.trim(), "Text should match")
```

#### Correct Approach (Direct Assertions)
```javascript
// ✅ CORRECT: Direct, clear, more informative
assertEquals("expected text", $("my-selector").innerText.trim(), "Text should match")
```

#### Why Direct Assertions Are Superior

1. **Better Error Messages**: When `$("my-selector")` returns null, you get `Cannot read properties of null (reading 'innerText')` which immediately tells you the selector failed and what you were trying to access.

2. **Less Code Noise**: Guard assertions double the line count and obscure the actual test intent.

3. **Modern JSDOM**: Unlike legacy environments, JSDOM provides excellent isolated error messages without crashing test suites.

4. **Mirrors Application Behavior**: If the app would crash with a missing element, the test should too.

### Key Testing Guidelines

1. **Mock Data First**: Before changing application code, adjust mock data to match expected server responses.

2. **Target Flint.js Child Elements**: For text content, target the specific child element where Flint.js places text:
   ```javascript
   // Correct for Flint.js rendered content
   assertEquals("Title", $("h2[page-title] span").innerText.trim(), "Title should match")
   ```

3. **Use innerText.trim()**: Preferred for Flint.js rendered content as it handles `<br>` tags properly.

4. **Direct Failures Over Guards**: Let tests crash naturally at the point of failure for better debugging.

## Flint.js DOM Manipulation

### Variable Naming
Prefix all Flint.js DOM element variables with `$`:
```javascript
// ✅ Correct
const $button = $("button[submit]")
const $modal = $("modal-wrapper")

// ❌ Avoid
const button = $("button[submit]")
```

### Element Selection and Events
```javascript
// Single element
const $header = $("header")

// Nested selection
const $submitButton = $modal.$("button[submit]")

// Event binding
$button.on("click", ($event) => {
	$event.preventDefault()
	saveData()
})
```

### Template Creation
Flint.js uses indentation-based templates with `$1`, `$2` placeholders:

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

### Attributes
```javascript
const $input = $(
	`
	input[type=text][placeholder=$1][maxlength=50]
	`,
	["Enter name"]
)
```

## State Management

### Global State Object
```javascript
const state = {
	path: "/",
	user_id: "",
	display_name: "",
	cache: {},
	loading_path: false
}
```

### Cache Pattern
```javascript
// Check cache first
if (state.cache[state.path]) {
	renderPage(state.cache[state.path])
	return
}

// Store after fetch
state.cache[state.path] = data
```

## Database and Session Patterns

### Session Middleware
```javascript
module.exports = async (req, res) => {
	if (!res.writableEnded && req.session.user_id && req.body.title) {
		const result = await req.client.query("SELECT ...", [params])
		res.end(JSON.stringify({ success: true, data: result.rows }))
	}
}
```

### Database Queries
Use parameterized queries:
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

## Component Rendering Patterns

### Render Functions
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
	
	$topic.on("click", () => {
		goToPath(`/topic/${topic.slug}`)
	})
	
	// Cache DOM reference for updates
	topic.$topic = $topic
	return $topic
}
```

### Update Pattern
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

## Navigation

### Client-Side Routing
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

## Real-time Updates

### WebSocket Pattern
```javascript
// Client listens for updates
state.ws.addEventListener("message", (event) => {
	if (event?.data === "UPDATE") {
		getMoreRecent()
	}
})

// Server sends updates
req.sendWsMessage("UPDATE", topic_id)
```

## AI Integration

### Content Moderation
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

### Structured Responses
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