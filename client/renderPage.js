const renderPage = (data) => {
	// Update global state
	if (state.path !== data.path) {
		state.path = data.path
		history.replaceState({ path_index: state.path_index }, "", data.path)
	}
	if (!state.path.split("/")[3]) {
		state.path_history.push(state.path)
	}

	// Remove loading indicator
	$("main-content-wrapper[active] posts-loading")?.remove()

	// Render Users
	renderUsers(data.users)

	// Render Posts
	renderPosts(data.posts, data.tag, data.user)

	// Render Replies
	renderReplies(data.replies)

	// Render Activities
	renderActivities(data.activities)

	// Render Notifications
	renderNotifications(data.notifications)

	// Render Images
	renderImages()

	// Render Tags
	renderTags(data.tags)

	// Render Forward Button on reply thread
	renderForward(data.parent_topic)

	// Render Mark all as read on notifications
	renderMarkAllAsRead()

	// Emit rendered event
	$("body").dispatchEvent(new CustomEvent("page-rendered"))
}
