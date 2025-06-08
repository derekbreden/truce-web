// Path sequence
const path_sequence = [
	"/",
	"/privacy",
	"/posts",
	"/posts/all",
	"/topics",
	"/conversations",
	"/messages",
	"/notifications",
	"/settings",
]

// Read URL into path
const parsePath = () => {
	let new_path = "/"
	const new_paths = window.location.pathname.split("/").filter((x) => x)
	if (new_paths[0] === "reset") {
		state.reset_token_uuid = new_paths[1] || ""
	} else if ((new_paths[0] === "post" || new_paths[0] === "post") && new_paths[1]) {
		new_path = "/" + new_paths[0] + "/" + new_paths[1]
	} else if ((new_paths[0] === "reply" || new_paths[0] === "reply") && new_paths[1]) {
		new_path = "/" + new_paths[0] + "/" + new_paths[1]
	} else if (new_paths[0] === "topic" && new_paths[1]) {
		new_path = "/" + new_paths[0] + "/" + new_paths[1]
	} else if (new_paths[0] === "user" && new_paths[1]) {
		new_path = "/" + new_paths[0] + "/" + new_paths[1]
	} else if (new_paths[0] === "messages" && new_paths[1]) {
		new_path = "/" + new_paths[0] + "/" + new_paths[1]
	} else if ((new_paths[0] === "posts" || new_paths[0] === "posts") && new_paths[1] === "all") {
		new_path = "/" + new_paths[0] + "/" + new_paths[1]
	} else if (new_paths[0]) {
		new_path = "/" + new_paths[0]
	}
	return new_path
}
state.path = parsePath()
if (
	state.path !== "/" &&
	state.path !== "/privacy" &&
	!localStorage.getItem(`${window.local_storage_key}:agreed`)
) {
	state.next_path = state.path
	state.path = "/"
}

// Default to /posts instead of / when we have visited before
if (state.path === "/") {
	if (localStorage.getItem(`${window.local_storage_key}:has_visited_posts`)) {
		state.path = "/posts"
		state.path_index++
		history.pushState({ path_index: state.path_index }, "", state.path)
	}
	// Default to last root path
	if (localStorage.getItem(`${window.local_storage_key}:last_root_path`)) {
		state.path = localStorage.getItem(
			`${window.local_storage_key}:last_root_path`,
		)
			.replace(/topic/g, "post")
			.replace(/comments/g, "replies")
			.replace(/comment/g, "reply")
		state.path_index++
		history.pushState({ path_index: state.path_index }, "", state.path)
	}
}

// New path for /topic/ is same as /topics
let new_path_parsed = state.path
if (state.path.substr(0, 7) === "/topic/") {
	new_path_parsed = "/topics"
}

const dot_index = Math.max(path_sequence.indexOf(new_path_parsed) - 1, 0)
$("footer dot").setAttribute("index", dot_index)

// Update page contents when the user hits the back button
window.addEventListener("popstate", () => {
	const new_path = parsePath()

	// When a new path is not the current one, load the page
	if (state.path !== new_path) {
		// Attempt to detect if back was pressed, and update our path_history accordingly
		if (history.state?.path_index) {
			const index_diff = state.path_index - history.state.path_index
			if (index_diff > 0) {
				state.path_history = state.path_history.slice(0, -1 - index_diff)
			}
			state.path_index = state.path_index - index_diff
		}

		// Load the page
		goToPath(new_path, true)
	}
})
