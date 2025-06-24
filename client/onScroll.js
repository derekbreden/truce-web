const bindScrollEvent = () => {
	$("main-content-wrapper[active]")?.on("scroll", () => {
		// Never do anything if already loading something
		if (state.loading_path) {
			return
		}

		// Posts load older
		// Favorites load older
		// Topics load older
		// User load older
		if (
			(state.path === "/posts"
				|| state.path === "/posts/all"
				|| state.path === "/favorites"
				|| state.path.startsWith("/topic/")
				|| state.path.startsWith("/user/"))
			&& state.cache[state.path]
			&& !state.cache[state.path].finished
		) {
			// A threshold based on how much is left to scroll
			const threshold =
				$("main-content-wrapper[active]").scrollHeight
				- $("main-content-wrapper[active]").clientHeight * 3

			// When we pass the threshold
			if ($("main-content-wrapper[active]").scrollTop > threshold) {
				// Find the oldest (min) create_date of what we have so far
				const max_post_create_date = state.cache[state.path].posts.reduce(
					(min, post) => {
						return min < post.create_date ? min : post.create_date
					},
					new Date().toISOString(),
				)
				let max_create_date = state.cache[state.path].activities.reduce(
					(min, activity) => {
						return min < activity.create_date ? min : activity.create_date
					},
					new Date().toISOString(),
				)
				if (state.path === "/favorites") {
					max_create_date = state.cache[state.path].activities.reduce(
						(min, activity) => {
							return min < activity.favorite_create_date
								? min
								: activity.favorite_create_date
						},
						new Date().toISOString(),
					)
				}

				// Use that to load anything older than that (our min is the max of what we want returned)
				state.loading_path = true
				fetch("/session", {
					method: "POST",
					body: JSON.stringify({
						path: state.path,
						max_post_create_date,
						max_create_date,
					}),
				})
					.then((response) => response.json())
					.then((data) => {
						// Stop when we reach the end (no more results returned)
						if (
							state.path === "/favorites"
							|| (state.path.startsWith("/user")
								&& state.path.split("/")[3] === "replies")
						) {
							if (data.activities && !data.activities.length) {
								state.cache[state.path].finished = true
							}
						} else {
							if (data.posts && !data.posts.length) {
								state.cache[state.path].finished = true
							}
						}

						// Append what we found to the existing cache
						state.cache[state.path].posts.push(...data.posts)
						state.cache[state.path].activities.push(...data.activities)

						// And re-render if any posts added
						if (data.posts.length) {
							renderPosts(
								state.cache[state.path].posts,
								state.cache[state.path].topic,
								state.cache[state.path].user,
							)
						}
						// And re-render if any activities added
						if (data.activities.length) {
							renderActivities(state.cache[state.path].activities)
						}

						state.loading_path = false
					})
					.catch((error) => {
						state.loading_path = false
						console.error(error)
						state.most_recent_error = error
						alertError("Network error loading more")
					})
			}
		}

		// Replies load older
		if (
			state.path.startsWith("/post/")
			&& state.cache[state.path]
			&& !state.cache[state.path].replies_finished
		) {
			// A threshold based on how much is left to scroll
			const threshold =
				$("main-content-wrapper[active]").scrollHeight
				- $("main-content-wrapper[active]").clientHeight * 3

			// When we pass the threshold
			if ($("main-content-wrapper[active]").scrollTop > threshold) {
				// Find the oldest (min) create_date of what we have so far
				const max_reply_create_date = state.cache[state.path].replies.reduce(
					(min, reply) => {
						return min < reply.create_date ? min : reply.create_date
					},
					new Date().toISOString(),
				)

				// Use that to load anything older than that (our min is the max of what we want returned)
				state.loading_path = true
				fetch("/session", {
					method: "POST",
					body: JSON.stringify({
						path: state.path,
						max_reply_create_date,
					}),
				})
					.then((response) => response.json())
					.then((data) => {
						// Stop when we reach the end (no more results returned)
						if (data.replies && !data.replies.length) {
							state.cache[state.path].replies_finished = true
						}

						// Append what we found to the existing cache
						state.cache[state.path].replies.push(...data.replies)

						// And re-render if any replies added
						if (data.replies.length) {
							renderReplies(state.cache[state.path].replies)
						}
						state.loading_path = false
					})
					.catch((error) => {
						state.loading_path = false
						console.error(error)
						state.most_recent_error = error
						alertError("Network error loading more")
					})
			}
		}

		// Notifications load older
		if (
			state.path === "/notifications"
			&& state.cache["/notifications"]
			&& !state.cache["/notifications"].finished
		) {
			// A threshold based on how much is left to scroll
			const threshold =
				$("main-content-wrapper[active]").scrollHeight
				- $("main-content-wrapper[active]").clientHeight * 3

			// When we pass the threshold
			if ($("main-content-wrapper[active]").scrollTop > threshold) {
				// Find the oldest (min) create_date of what we have so far
				const max_notification_unread_create_date = state.cache[
					"/notifications"
				].notifications.reduce((min, notification) => {
					if (!notification.read) {
						return min < notification.create_date
							? min
							: notification.create_date
					} else {
						return min
					}
				}, new Date().toISOString())
				const max_notification_read_create_date = state.cache[
					"/notifications"
				].notifications.reduce((min, notification) => {
					if (notification.read) {
						return min < notification.create_date
							? min
							: notification.create_date
					} else {
						return min
					}
				}, new Date().toISOString())

				// Use that to load anything older than that (our min is the max of what we want returned)
				state.loading_path = true
				fetch("/session", {
					method: "POST",
					body: JSON.stringify({
						path: "/notifications",
						max_notification_unread_create_date,
						max_notification_read_create_date,
					}),
				})
					.then((response) => response.json())
					.then((data) => {
						// Stop when we reach the end (no more results returned)
						if (data.notifications && !data.notifications.length) {
							state.cache["/notifications"].finished = true
						}

						// Append what we found to the existing cache
						state.cache["/notifications"].notifications.push(
							...data.notifications,
						)

						// And re-render if any results added
						if (data.notifications.length) {
							renderNotifications(state.cache["/notifications"].notifications)
						}
						state.loading_path = false
					})
					.catch((error) => {
						state.loading_path = false
						console.error(error)
						state.most_recent_error = error
						alertError("Network error loading more")
					})
			}
		}

		// Conversations load older
		if (
			state.path === "/conversations"
			&& state.cache["/conversations"]
			&& !state.cache["/conversations"].finished
		) {
			// A threshold based on how much is left to scroll
			const threshold =
				$("main-content-wrapper[active]").scrollHeight
				- $("main-content-wrapper[active]").clientHeight * 3

			// When we pass the threshold
			if ($("main-content-wrapper[active]").scrollTop > threshold) {
				// Find the oldest (min) create_date of what we have so far
				const max_conversation_create_date = state.cache["/conversations"].conversations.reduce(
					(min, conversation) => {
						const conversation_date = conversation.last_message_date || conversation.create_date
						return min < conversation_date ? min : conversation_date
					},
					new Date().toISOString(),
				)

				// Use that to load anything older than that (our min is the max of what we want returned)
				state.loading_path = true
				fetch("/session", {
					method: "POST",
					body: JSON.stringify({
						path: "/conversations",
						max_conversation_create_date,
					}),
				})
					.then((response) => response.json())
					.then((data) => {
						// Stop when we reach the end (no more results returned)
						if (data.conversations && !data.conversations.length) {
							state.cache["/conversations"].finished = true
						}

						// Append what we found to the existing cache
						state.cache["/conversations"].conversations.push(...data.conversations)

						// And re-render if any conversations added
						if (data.conversations.length) {
							renderConversations(state.cache["/conversations"].conversations)
						}

						state.loading_path = false
					})
					.catch((error) => {
						state.loading_path = false
						console.error(error)
						state.most_recent_error = error
						alertError("Network error loading more")
					})
			}
		}

		// Messages scroll handling moved to renderMessages.js since messages element only exists during messages view
	})
}
