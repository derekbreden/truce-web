# Truce.net Codebase Conventions

This README documents the coding conventions and patterns used in the Truce.net social media platform codebase to help new contributors understand the project structure and style.

## Project Architecture

### Client-Side File Organization
All client-side JavaScript files are included in `index.html` using server-side includes:
```html
// <!--#include file="client/flint.old.js" -->
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
const renderPost = (post) => {
	// function body
}

// ❌ Avoid
function renderPost(post) {
	// function body
}
```

### String Literals
Use double quotes consistently:
```javascript
// ✅ Correct
const message = "Hello world"
const className = "post-wrapper"

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
npm test                        # Run all tests
npm test topics.simple.test.js  # Run specific test file
```

Make sure you have run `npm install` before running tests.

## Flint.js DOM Manipulation

### Variable Naming
Prefix all Flint.js DOM element variables with `$`:
```javascript
// ✅ Correct
const $button = $old("button[submit]")
const $modal = $old("modal-wrapper")

// ❌ Avoid
const button = $old("button[submit]")
```

### Element Selection and Events
```javascript
// Single element
const $header = $old("header")

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
const $post = $old(
	`
	post
		h2 $1
		author[slug=$2] $3
		p $4
	`,
	[post.title, post.user_slug, post.display_name, post.body]
)
```

### Attributes
```javascript
const $input = $old(
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
const posts = await req.client.query(
	`
	SELECT t.title, t.body, u.display_name
	FROM posts t
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
const renderPost = (post) => {
	const $post = $old(
		`
		post
			h2 $1
			p $2
			author $3
		`,
		[post.title, post.body, post.display_name]
	)
	
	$post.on("click", () => {
		goToPath(`/post/${post.slug}`)
	})
	
	// Cache DOM reference for updates
	post.$post = $post
	return $post
}
```

### Update Pattern
```javascript
const updateCounts = (data) => {
	data.post_counts?.forEach((count) => {
		const found_post = state.cache[state.path].posts.find(
			(post) => post.post_id === count.post_id
		)
		if (found_post) {
			found_post.reply_count = count.reply_count
			found_post.$post.$("[replies] p").textContent = count.reply_count
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
$old("[href]").forEach(($el) => {
	$el.on("click", ($event) => {
		const new_path = $el.getAttribute("href")
		if (new_path.startsWith("/")) {
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
req.sendWsMessage("UPDATE", {post_id: post_id})
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