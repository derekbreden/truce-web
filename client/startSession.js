const original_fetch_2 = fetch
fetch = function (url, options) {
	state_session_uuid_was = state.session_uuid
	state.session_uuid = localStorage.getItem(
		`${window.local_storage_key}:session_uuid`,
	)
	if (state.session_uuid) {
		options.headers = options.headers || {}
		options.headers["Authorization"] = `Bearer ${state.session_uuid}`

		if (state.session_uuid !== state_session_uuid_was) {
			sendSessionUuidToWebSocket()
		}
	}
	return original_fetch_2(url, options)
}

const startSession = (was_same_path) => {
	// If cache available, render from that first
	if (state.cache[state.path]) {
		if (state.path !== "/" && state.path !== "/privacy") {
			renderPage(state.cache[state.path])
		}

		// Restore scroll position if found
		if (state.cache[state.path].scroll_top) {
			$("main-content-wrapper[active]").scrollTop =
				state.cache[state.path].scroll_top
			delete state.cache[state.path].scroll_top
		}

		// Get more recent if available
		if (was_same_path) {
			if ($("main-content-wrapper[active]").scrollTop !== 0) {
				$("main-content-wrapper[active]").scroll({
					top: 0,
					behavior: "smooth",
				})
			} else {
				getMoreRecent()
			}
		} else {
			getMoreRecent()
		}
		if (state.path !== "/" && state.path !== "/privacy") {
			return
		}
	}

	// Otherwise, make a network call for the entire path results
	const postBody = {
		path: state.path,
	}
	if (state.reset_token_uuid) {
		postBody.reset_token_uuid = state.reset_token_uuid
	}
	state.loading_path = true
	fetch("/session", {
		method: "POST",
		body: JSON.stringify(postBody),
	})
		.then((response) => response.json())
		.then((data) => {
			if (data.session_uuid) {
				localStorage.setItem(
					`${window.local_storage_key}:session_uuid`,
					data.session_uuid,
				)
				state.session_uuid = data.session_uuid
				sendSessionUuidToWebSocket()
			}

			if (data.email) {
				state.email = data.email
				if (state.reset_token_uuid) {
					showResetPassword()
				}
			}
			if (data.subscribed_to_users) {
				state.subscribed_to_users = Number(data.subscribed_to_users)
			}
			if (data.user_slug) {
				state.user_slug = data.user_slug
			}
			if (data.user_id) {
				state.user_id = data.user_id
			}
			if (data.display_name) {
				state.display_name = data.display_name
				$("input[type=text][display-name]")?.forEach(
					($el) => ($el.value = state.display_name),
				)
			}
			if (data.profile_picture_uuid) {
				state.profile_picture_uuid = data.profile_picture_uuid
			}
			if (data.error) {
				modalError(data.error)
			}
			if (data.path) {
				state.cache[data.path] = data
				if (state.path !== "/" && state.path !== "/privacy") {
					renderPage(data)
				}
			}
			state.loading_path = false
		})
		.catch((error) => {
			state.loading_path = false
			console.error(error)
			state.most_recent_error = error
			alertError("Network error loading page")
		})
}

const findMaxDate = (items, date_field = "create_date") => {
	return items.reduce((max, item) => {
		return max > item[date_field] ? max : item[date_field]
	}, "")
}

const getMoreRecent = () => {
	// Skip for introduction
	if (
		state.path === "/"
		|| state.path === "/privacy"
		|| state.path === "/settings"
		|| state.path === "/topics"
	) {
		return
	}

	// Stop if cache not loaded
	if (!state.cache[state.path]) {
		return
	}

	// Track what path and cache we started with
	const current_path = state.path
	const current_cache = state.cache[current_path]

	const client_max_post_date = findMaxDate(current_cache.posts)
	const client_max_reply_date = findMaxDate(current_cache.replies)
	const client_max_message_date = current_cache.messages ? findMaxDate(current_cache.messages) : ""
	const client_max_conversation_last_activity_date = current_cache.conversations ? current_cache.conversations.reduce((max, conversation) => {
		const conversation_date = conversation.last_message_date || conversation.create_date
		return max > conversation_date ? max : conversation_date
	}, "") : ""
	
	const client_max_activity_date = current_cache.activities.reduce((max, activity) => {
		if (current_cache === "/favorites") {
			return max > activity.favorite_create_date ? max : activity.favorite_create_date
		} else {
			return max > activity.create_date ? max : activity.create_date
		}
	}, "")
	
	const client_max_notification_unread_date = current_cache.notifications.reduce((max, notification) => {
		if (!notification.read) {
			return max > notification.create_date ? max : notification.create_date
		} else {
			return max
		}
	}, "")
	
	const client_max_notification_read_date = current_cache.notifications.reduce((max, notification) => {
		if (notification.read) {
			return max > notification.create_date ? max : notification.create_date
		} else {
			return max
		}
	}, "")

	// Find oldest post create_date for reply count, and max of the counts_max_create_date for the posts
	const min_create_date_for_counts_1 = current_cache.posts.reduce(
		(min, post) => {
			return min < post.create_date ? min : post.create_date
		},
		new Date().toISOString(),
	)
	const min_create_date_for_counts_2 = current_cache.replies.reduce(
		(min, reply) => {
			return min < reply.create_date ? min : reply.create_date
		},
		new Date().toISOString(),
	)
	const min_create_date_for_counts_3 = current_cache.activities.reduce(
		(min, activity) => {
			return min < activity.create_date ? min : activity.create_date
		},
		new Date().toISOString(),
	)
	let min_create_date_for_counts = min_create_date_for_counts_1
	if (min_create_date_for_counts_2 < min_create_date_for_counts) {
		min_create_date_for_counts = min_create_date_for_counts_2
	}
	if (min_create_date_for_counts_3 < min_create_date_for_counts) {
		min_create_date_for_counts = min_create_date_for_counts_3
	}
	const min_counts_create_date_1 = current_cache.posts.reduce((max, post) => {
		return max > post.counts_max_create_date
			? max
			: post.counts_max_create_date
	}, "")
	const min_counts_create_date_2 = current_cache.replies.reduce(
		(max, reply) => {
			return max > reply.counts_max_create_date
				? max
				: reply.counts_max_create_date
		},
		"",
	)
	const min_counts_create_date_3 = current_cache.activities.reduce(
		(max, activity) => {
			return max > activity.counts_max_create_date
				? max
				: activity.counts_max_create_date
		},
		"",
	)
	let min_counts_create_date = min_counts_create_date_1
	if (min_counts_create_date_2 > min_counts_create_date) {
		min_counts_create_date = min_counts_create_date_2
	}
	if (min_counts_create_date_3 > min_counts_create_date) {
		min_counts_create_date = min_counts_create_date_3
	}
	// Indicate if there are replies or posts cached on page
	const has_replies = Boolean(
		current_cache.replies.length
			|| current_cache.activities.filter((a) => a.type === "reply").length,
	)
	const has_posts = Boolean(
		current_cache.posts.length
			|| current_cache.activities.filter((a) => a.type === "post").length,
	)

	// Use that to load anything newer than that (our max is the min of what we want returned)
	state.loading_path = true
	fetch("/session", {
		method: "POST",
		body: JSON.stringify({
			path: current_path,
			min_create_date: client_max_activity_date,
			min_reply_create_date: client_max_reply_date,
			min_post_create_date: client_max_post_date,
			min_notification_unread_create_date: client_max_notification_unread_date,
			min_notification_read_create_date: client_max_notification_read_date,
			min_message_create_date: client_max_message_date,
			min_conversation_last_activity_date: client_max_conversation_last_activity_date,
			min_counts_create_date,
			min_create_date_for_counts,
			has_posts,
			has_replies,
		}),
	})
		.then((response) => response.json())
		.then((data) => {
			// Stop if the path changed while we were loading
			if (state.path !== current_path) {
				return
			}

			// Track current scrollHeight
			const scroll_height = $("main-content-wrapper[active]").scrollHeight
			const scroll_top = $("main-content-wrapper[active]").scrollTop

			// Render notifications if appropriate
			if (data.notifications?.length) {
				// Remove only notifications that match both ID and type
				const new_notifications = data.notifications.map((n) => ({ id: n.notification_id, type: n.notification_type }))
				current_cache.notifications = current_cache.notifications.filter(
					(n) => !new_notifications.some(newN => newN.id === n.notification_id && newN.type === n.notification_type),
				)
				current_cache.notifications.unshift(...data.notifications)
				renderNotifications(current_cache.notifications)
			}

			// Render activities if appropriate
			if (data.activities?.length) {
				current_cache.activities = current_cache.activities.filter((a) => {
					return !data.activities.some((a2) => {
						return a.type === a2.type && a.id === a2.id
					})
				})
				current_cache.activities.unshift(...data.activities)
				renderActivities(current_cache.activities)
			}

			// Render replies if appropriate
			if (data.replies?.length) {
				const new_ids = data.replies.map((reply) => reply.reply_id)
				current_cache.replies = current_cache.replies.filter(
					(c) => !new_ids.includes(c.reply_id),
				)
				current_cache.replies.push(...data.replies)
				renderReplies(current_cache.replies)

				// Flash any newly added items
				data.replies.forEach((reply) => {
					if (reply.$reply) {
						reply.$reply.setAttribute("flash-long-focus", "")
					}
				})
			}

			// Render posts if appropriate
			if (data.posts?.length) {
				const new_ids = data.posts.map((post) => post.post_id)
				current_cache.posts = current_cache.posts.filter(
					(a) => !new_ids.includes(a.post_id),
				)
				current_cache.posts.unshift(...data.posts)
				renderPosts(
					current_cache.posts,
					current_cache.topic,
					current_cache.user,
				)

				// Flash any newly added items
				data.posts.forEach((post) => {
					if (post.$post) {
						post.$post.setAttribute("flash-long-focus", "")
					}
				})
			}

			// Render messages if appropriate
			if (data.messages?.length) {
				const new_ids = data.messages.map((message) => message.message_id)
				current_cache.messages = current_cache.messages.filter(
					(m) => !new_ids.includes(m.message_id),
				)
				current_cache.messages.push(...data.messages)
				if (data.conversation) {
					current_cache.conversation = data.conversation
				}
				renderMessages(current_cache.messages, current_cache.conversation)
			}

			// Render conversations if appropriate
			if (data.conversations?.length) {
				const new_ids = data.conversations.map((conversation) => conversation.conversation_id)
				current_cache.conversations = current_cache.conversations.filter(
					(c) => !new_ids.includes(c.conversation_id),
				)
				current_cache.conversations.unshift(...data.conversations)
				renderConversations(current_cache.conversations)
			}

			// Restore scroll position if we re-rendered anything
			if (
				data.activities?.length
				|| data.replies?.length
				|| data.posts?.length
				|| data.notifications?.length
				|| data.messages?.length
				|| data.conversations?.length
			) {
				// Set a min threshold of scroll to do anything
				let min_threshold = 0

				// For /posts specifically we have the add-new element that won't be shifted so we want to be (mostly) past it (~200px of it still showing means shift it away?)
				if (current_path === "/posts" || state.path === "/posts/all") {
					const $add_new = $("main-content > add-new:first-child")
					if ($add_new) {
						min_threshold = $add_new?.offsetTop + $add_new?.offsetHeight - 200
					}
				}

				// If we are past the threshold, then maintain our position
				if (scroll_top > min_threshold) {
					$("main-content-wrapper[active]").scrollTop =
						scroll_top
						+ ($("main-content-wrapper[active]").scrollHeight - scroll_height)
				}
			}

			// Render updated post reply counts
			if (data.post_counts?.length) {
				data.post_counts.forEach((post_count) => {
					// See if we can find a match in the cache
					const found_post = current_cache.posts.find(
						(post) => post.post_id === post_count.post_id,
					)
					const found_activity = current_cache.activities.find(
						(activity) =>
							activity.id === post_count.post_id && activity.type === "post",
					)

					// Prepare the text for the markup
					const reply_text = post_count.reply_count
					const favorite_text = post_count.favorite_count

					// If we found a match in the cache
					if (found_post || found_activity) {
						// Update the cached data
						;(found_post || found_activity).reply_count =
							post_count.reply_count
						;(found_post || found_activity).favorite_count =
							post_count.favorite_count

						// Update the markup
						;(found_post || found_activity).$post.$(
							"[replies] p"
						).textContent = reply_text
						;(found_post || found_activity).$post.$(
							"[favorites] p",
						).textContent = favorite_text

						// Poll requires a complete re-render
						if (
							(found_post || found_activity).poll_1
							&& post_count.poll_counts
						) {
							;(found_post || found_activity).poll_counts =
								post_count.poll_counts
							;(found_post || found_activity).$post.replaceWith(
								renderPost(found_post || found_activity),
							)
						}
					}
				})
			}

			// Render updated reply favorite counts
			if (data.reply_counts?.length) {
				data.reply_counts.forEach((reply_count) => {
					const found_reply = current_cache.replies.find(
						(reply) => reply.reply_id === reply_count.reply_id,
					)
					const found_activity = current_cache.activities.find(
						(activity) =>
							activity.id === reply_count.reply_id
							&& activity.type === "reply",
					)
					const favorite_text = reply_count.favorite_count
					if (found_reply?.$reply?.$("[favorites] p")?.textContent) {
						found_reply.favorite_count = reply_count.favorite_count
						found_reply.$reply.$("[favorites] p").textContent = favorite_text
					}
					if (found_activity?.$reply?.$("[favorites] p")?.textContent) {
						found_activity.favorite_count = reply_count.favorite_count
						found_activity.$reply.$("[favorites] p").textContent = favorite_text
					}
				})
			}

			// Acknowledge we finished loading
			state.loading_path = false

			// Emit rendered event
			$("body").dispatchEvent(new CustomEvent("page-updated"))
		})
		.catch((error) => {
			state.loading_path = false
			console.error(error)
			state.most_recent_error = error
			alertError("Network error loading recent")
		})
}
