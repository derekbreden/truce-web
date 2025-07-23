// Typing indicator state - local to this file
const other_user_typing = {}
const other_user_typing_display_timeouts = {}

const renderMessageImages = (image_uuids) => {
	return image_uuids.reverse().map(image_uuid => {
		const $image = $old(
			`
			p[img]
				img[src=$1]
			`,
			["/image/" + image_uuid]
		)

		bindImageClick($image, image_uuid)
		return $image
	})
}

const renderMessage = (message) => {
	const is_own_message = message.user_id === state.user_id
	const time_ago = new Date(message.create_date).toLocaleString()
	
	const note = message.note || ""
	const space_index = note.indexOf(" ")
	const note_title = space_index > -1 ? note.slice(0, space_index).replace(/[^a-z\-]/gi, "") : note.replace(/[^a-z\-]/gi, "")
	const note_body = space_index > -1 ? note.slice(space_index + 1) : ""
	
	let $message_body = markdownToElements(message.body)

	const $message = $old(
		`
		message[own=$1]
			message-header
				profile-picture
					profile-image
						$2
				message-info
					author[slug=$3]
						span $4
						$5
					time-ago[muted] $6
				read-status[muted]
					span $7
			message-content
				$8
				$9
				$10
		`,
		[
			is_own_message ? "true" : "false",
			message.profile_picture_uuid
				? $old(
					`
					img[src=$1]
					`,
					["/image/" + message.profile_picture_uuid]
				)
				: $old(
					`
					icon[profile-picture]
					`
				),
			message.user_slug,
			renderName(message.display_name, message.display_name_index),
			message.user_verified
				? $old(
					`
					icon[verified]
					`
				)
				: [],
			time_ago,
			is_own_message ? getMessageReadStatus(message) : "",
			message.note
				? $old(
					`
					info-wrapper
						info
							b $1
							span $2
					`,
					[note_title, note_body],
				)
				: [],
			$message_body,
			message.image_uuids
				? renderMessageImages(message.image_uuids.split(",").filter(uuid => uuid))
				: []
		]
	)


	return $message
}

const renderMessages = (messages, conversation) => {
	const skip_messages = !state.path.startsWith("/messages/")

	if (!skip_messages) {

		// Default scroll distance from bottom to 0 for first load
		let scroll_distance_from_bottom = 0

		// If we have already rendered messages once
		if ($old("messages")) {

			// We can calculate the distance from the bottom as:
			scroll_distance_from_bottom =
				$old("messages").scrollHeight
				- $old("messages").scrollTop
				- $old("messages").clientHeight
		
		// Else this is the first render
		} else {
			$old("main-content-wrapper[active] main-content").appendChild(
				$old(
					`
					messages-container
						messages
						message-input-area
							message-form
								title-wrapper
									label[image]
										icon[image]
										input[image][type=file][accept=image/*]
								textarea[placeholder="Type a message..."]
								button[submit]
									icon[forward]
					`
				)
			)

			// Set up message sending
			const $textarea = $old("main-content-wrapper[active] textarea")
			const pngs = []
			
			const addMessageError = (error) => {
				$old("message-input-area error")?.remove()
				$old("message-input-area").prepend(
					$old(
						`
						error
							$1
						`,
						[error],
					),
				)
			}

			const previewPngs = () => {
				$old("message-input-area image-previews")?.remove()
				if (pngs.length) {
					$old("message-input-area").prepend(
						$old(
							`
							image-previews
							`
						)
					)
					pngs.forEach((png, i) => {
						const $preview = $old(
							`
							preview
								remove-icon
								img[src=$1]
							`,
							[png.url],
						)
						$preview.$("remove-icon").on("click", () => {
							pngs.splice(i, 1)
							previewPngs()
						})
						$old("message-input-area image-previews").appendChild($preview)
					})
				}
			}

			$old("message-input-area input[image]").on("change", () => {
				Array.from($old("message-input-area input[image]").files).forEach((file) => {
					const reader = new FileReader()
					reader.onload = ($event) => {
						imageToPng($event.target.result, (png) => {
							pngs.pop()
							pngs.push(png)
							previewPngs()
						})
					}
					reader.readAsDataURL(file)
				})
			})
			
			const send_message = () => {
				const message_body = $textarea.value.trim()
				$textarea.value = ""
				
				// Stop typing heartbeats when sending message
				stopTypingHeartbeats()
				
				if ((message_body || pngs.length) && conversation) {
					$old("message-input-area").prepend(
						$old(
							`
								info Validating...
							`,
						),
					)
					fetch("/session", {
						method: "POST",
						body: JSON.stringify({
							conversation_id: conversation.conversation_id,
							body: message_body,
							pngs: pngs
						})
					})
						.then(response => response.json())
						.then(data => {
							$old("message-input-area info")?.remove()
							if (data.error) {
								addMessageError(data.error)
							} else {
								$old("message-input-area error")?.remove()
								pngs.splice(0, pngs.length)
								previewPngs()
								// Refresh messages
								getMoreRecent()
							}
						})
						.catch(error => {
							$old("message-input-area info")?.remove()
							console.error("Error sending message:", error)
							addMessageError("Network error sending message")
						})
				}
			}

			$old("message-input-area button[submit]").on("click", send_message)
			$textarea.on("keydown", (e) => {
				if (e.key === "Enter" && !e.shiftKey) {
					e.preventDefault()
					send_message()
				}
			})
			
			// Add typing detection
			$textarea.on("input", () => {
				if (conversation && conversation.conversation_id) {
					const now = Date.now()
					
					// If first keystroke or been inactive for 3+ seconds, start heartbeats
					if (!typing_heartbeat_interval || now - typing_last_activity > 3000) {
						startTypingHeartbeats(conversation.conversation_id)
					}
					
					// Update activity time (accessing the websocket.js variable)
					typing_last_activity = now
					
					// Clear existing timeout
					if (self_typing_inactivity_timeout) {
						clearTimeout(self_typing_inactivity_timeout)
					}
					
					// Set 3 second inactivity timeout
					self_typing_inactivity_timeout = setTimeout(() => {
						stopTypingHeartbeats()
					}, 3000)
				}
			})

			// Set up infinite scroll for loading older messages
			const $messages = $old("messages")
			$messages.on("scroll", () => {
				// Never do anything if already loading or rendering something
				if (state.loading_path || state.rendering_messages) {
					return
				}

				// Only handle scroll for messages pages
				if (
					state.path.startsWith("/messages/")
					&& state.cache[state.path]
					&& !state.cache[state.path].messages_finished
				) {
					// For messages, we want to load older messages when scrolling UP (toward top)
					// So we should trigger when scrollTop is SMALL (near top)
					const threshold = Math.max($messages.clientHeight * 1.5, 300)

					// When we scroll near the top (small scrollTop), load older messages
					if ($messages.scrollTop < threshold) {

						// Find the oldest (min) create_date of what we have so far
						const max_message_create_date = state.cache[state.path].messages.reduce(
							(min, message) => {
								return min < message.create_date ? min : message.create_date
							},
							new Date().toISOString(),
						)

						// Use that to load anything older than that (our min is the max of what we want returned)
						state.loading_path = true
						fetch("/session", {
							method: "POST",
							body: JSON.stringify({
								path: state.path,
								max_message_create_date,
							}),
						})
							.then((response) => response.json())
							.then((data) => {

								// Stop when we reach the end (no more results returned)
								if (data.messages && !data.messages.length) {
									state.cache[state.path].messages_finished = true
								}

								// Prepend what we found to the existing cache (older messages go first)
								state.cache[state.path].messages.unshift(...data.messages)

								// And re-render if any messages added
								if (data.messages.length) {
									renderMessages(state.cache[state.path].messages, state.cache[state.path].conversation)
								}

								state.loading_path = false
							})
							.catch((error) => {
								state.loading_path = false
								console.error(error)
								alertError("Network error loading more")
							})
					}
				}
			})
		}
		// END - first render of messages container

		// Always ensure messages has back navigation to conversations (regardless of path history)
		if (!$old("main-content-wrapper[active] main-content tab-wrapper")) {
			const $messages_tab_wrapper = $old(
				`
				tab-wrapper[line-after]
					tab-item
						icon[back]
						p Conversations
				`
			)
			$old("main-content-wrapper[active] main-content").prepend($messages_tab_wrapper)
			$messages_tab_wrapper.$("tab-item").on("click", () => {
				goToPath("/conversations")
			})
		}

		// Add participant name to tab-wrapper (only if not already there)
		if (conversation && conversation.other_user_name) {
			const other_user_name = renderName(conversation.other_user_name, conversation.other_user_display_name_index)
			const $existing_tab_wrapper = $old("main-content-wrapper[active] main-content tab-wrapper")
			
			// Only add if participant tab doesn't already exist
			if ($existing_tab_wrapper && !$existing_tab_wrapper.$("tab-item[right]")) {
				const $participant_tab = $old(
					`
					tab-item[right]
						p $1
					`,
					[other_user_name]
				)
				$existing_tab_wrapper.appendChild($participant_tab)
			}
		}
		state.rendering_messages = 1

		// Render messages
		const $messages = messages.map(renderMessage)
		
		if ($messages.length === 0) {
			$old("main-content-wrapper[active] messages").replaceChildren(
				$old(
					`
					all-clear-wrapper
						p Nothing to see here
					`
				)
			)
		} else {
			$old("main-content-wrapper[active] messages").replaceChildren(
				...$messages
			)
		}

		// Restore our distance from bottom (even and ESPECIALLY, if it was 0)
		$old("messages").scrollTop = $old("messages").scrollHeight - $old("messages").clientHeight - scroll_distance_from_bottom
		const $images = $old("messages img")
		if ($images) {
			$images.forEach($img => {
				$img.on("load", () => {
					$old("messages").scrollTop = $old("messages").scrollHeight - $old("messages").clientHeight  - scroll_distance_from_bottom
					state.rendering_messages--
				})
				state.rendering_messages++
			})
		}
		state.rendering_messages--

		// Store conversation ID for WebSocket updates
		if (conversation) {
			state.active_conversation_id = conversation.conversation_id
		}

		// Mark messages from other users as read
		markMessagesAsRead(messages)
	}
}

const getMessageReadStatus = (message) => {
	// For user's own messages, show read status based on whether recipient has read it
	if (message.read_by_recipient) {
		return "Read"
	} else {
		return "Sent"
	}
}

const updateMessageReadStatus = () => {
	// Update all messages from current user to show as read
	const $ownMessages = $old("main-content-wrapper[active] messages message[own='true']")
	if ($ownMessages) {
		$ownMessages.forEach($message => {
			const $readStatus = $message.$("read-status span")
			if ($readStatus) {
				$readStatus.textContent = "Read"
			}
		})
	}
	
	// Also update the cached message data
	if (state.cache[state.path] && state.cache[state.path].messages) {
		state.cache[state.path].messages.forEach(message => {
			if (message.user_id === state.user_id) {
				message.read_by_recipient = true
			}
		})
	}
}

const markMessagesAsRead = (messages) => {
	// Only mark messages from other users as read that have notifications
	const unnread_messages = messages.filter(message => 
		message.user_id !== state.user_id && message.notification_id && !message.notification_read
	)

	if (unnread_messages.length === 0) {
		return // Nothing to mark as read
	}

	// Collect all notification IDs to mark as read
	const notification_ids = unnread_messages.map(message => message.notification_id)

	// Mark all notifications as read in one request
	fetch("/session", {
		method: "POST",
		body: JSON.stringify({
			mark_message_notifications_as_read: notification_ids
		})
	})
		.then(response => response.json())
		.then(data => {
			if (data.success) {
			// Update notifications to mark message notifications as read
				const notifications = _.notifications
				if (notifications) {
					notifications.forEach(notification => {
						if (notification_ids.includes(notification.notification_id) && notification.notification_type === "message") {
							notification.read = true
							notification.seen = true
						}
					})
				}
				// Mark messages as read locally
				unnread_messages.forEach(message => {
					message.notification_read = true
					message.notification_seen = true
				})
			}
		})
		.catch(error => {
			console.error("Error marking messages as read:", error)
		})

	// Refresh unread counts from server to ensure accuracy
	getUnreadCountUnseenCount()
}

// Function to update typing indicator UI (called from websocket.js)
const updateTypingIndicator = (user_id, is_typing) => {
	if (is_typing) {
		// Show typing indicator
		other_user_typing[user_id] = true
		
		// Clear existing timeout for this user
		if (other_user_typing_display_timeouts[user_id]) {
			clearTimeout(other_user_typing_display_timeouts[user_id])
		}
		
		// Hide after 3 seconds of no activity
		other_user_typing_display_timeouts[user_id] = setTimeout(() => {
			delete other_user_typing[user_id]
			updateTypingIndicatorUI()
		}, 3000)
	} else {
		// Hide typing indicator
		delete other_user_typing[user_id]
		if (other_user_typing_display_timeouts[user_id]) {
			clearTimeout(other_user_typing_display_timeouts[user_id])
			delete other_user_typing_display_timeouts[user_id]
		}
	}
	
	updateTypingIndicatorUI()
}

// Function to update the typing indicator UI
const updateTypingIndicatorUI = () => {
	const typing_users = Object.keys(other_user_typing)
	const $indicator = $old("typing-indicator")
	
	if (typing_users.length > 0 && state.cache[state.path]?.conversation) {
		if (!$indicator) {
			const other_user_name = state.cache[state.path].conversation.other_user_name
			$old("message-input-area").prepend(
				$old(
					`
					typing-indicator
						span ${other_user_name} is typing...
					`
				)
			)
		}
	} else {
		$old("typing-indicator")?.remove()
	}
}

