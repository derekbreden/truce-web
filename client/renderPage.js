const renderPage = (data) => {
	// Update global state
	if (state.path !== data.path) {
		state.path = data.path
		history.replaceState({ path_index: state.path_index }, "", data.path)
	}
	if (!state.path.split("/")[3]) {
		state.path_history.push(state.path)
	}

	// Render Users
	renderUsers(data.users)

	// Render Posts
	renderPosts(data.posts, data.topic, data.user)

	// Render Replies
	renderReplies(data.replies)

	// Render Favorites
	renderFavorites(data.favorites)

	// Reactive Update Notifications
	_.notifications = data.notifications

	// Render Conversations
	renderConversations(data.conversations)

	// Render Messages
	renderMessages(data.messages, data.conversation)

	// Render Images
	renderImages()

	// Render Topics
	renderTopics(data.topics)

	// Render Forward Button on reply thread
	renderForward(data.parent_post)

	// Render Mark all as read on notifications
	renderMarkAllAsRead()

	// Emit rendered event
	$old("body").dispatchEvent(new CustomEvent("page-rendered"))
}
