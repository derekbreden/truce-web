const renderMessageImages = (image_uuids) => {
	return image_uuids.reverse().map(image_uuid => {
		const $image = $(
			`
			p[img]
				img[src=$1]
			`,
			["/image/" + image_uuid]
		)
		
		// Add load event listener to scroll to bottom when image loads (if currently scrolled to bottom)
		if ($("messages").scrollTop === ($("messages").scrollHeight - $("messages").clientHeight)) {
			const $img = $image.$("img")
			$img.on("load", () => {
				if ($("messages")) {
					$("messages").scrollTop = $("messages").scrollHeight
				}
			})
		}

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

	const $message = $(
		`
		message[own=$1]
			message-header
				profile-picture
					image
						$2
				message-info
					author[slug=$3]
						span $4
						$5
					time-ago $6
			message-content
				$7
				$8
				$9
		`,
		[
			is_own_message ? "true" : "false",
			message.profile_picture_uuid
				? $(
					`
					img[src=$1]
					`,
					["/image/" + message.profile_picture_uuid]
				)
				: $(
					`
					icon[profile-picture]
					`
				),
			message.user_slug,
			renderName(message.display_name, message.display_name_index),
			message.user_verified
				? $(
					`
					icon[verified]
					`
				)
				: [],
			time_ago,
			message.note
				? $(
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
		beforeDomUpdate()
		if (!$("main-content-wrapper[active] messages-container")) {
			$("main-content-wrapper[active] main-content").appendChild(
				$(
					`
					messages-container
						conversation-header
							participants
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
			const $textarea = $("main-content-wrapper[active] textarea")
			const pngs = []
			
			const addMessageError = (error) => {
				$("message-input-area error")?.remove()
				$("message-input-area").prepend(
					$(
						`
						error
							$1
						`,
						[error],
					),
				)
			}

			const previewPngs = () => {
				$("message-input-area image-previews")?.remove()
				if (pngs.length) {
					$("message-input-area").prepend(
						$(
							`
							image-previews
							`
						)
					)
					pngs.forEach((png, i) => {
						const $preview = $(
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
						$("message-input-area image-previews").appendChild($preview)
					})
				}
			}

			$("message-input-area input[image]").on("change", () => {
				Array.from($("message-input-area input[image]").files).forEach((file) => {
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
				if ((message_body || pngs.length) && conversation) {
					$("message-input-area").prepend(
						$(
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
						$("message-input-area info")?.remove()
						if (data.error) {
							addMessageError(data.error)
						} else {
							$("message-input-area error")?.remove()
							pngs.splice(0, pngs.length)
							previewPngs()
							// Refresh messages
							getMoreRecent()
						}
					})
					.catch(error => {
						$("message-input-area info")?.remove()
						console.error("Error sending message:", error)
						addMessageError("Network error sending message")
					})
				}
			}

			$textarea.on("focus", () => {
			})

			$("message-input-area button[submit]").on("click", send_message)
			$textarea.on("keydown", (e) => {
				if (e.key === "Enter" && !e.shiftKey) {
					e.preventDefault()
					send_message()
				}
			})

			// Set up infinite scroll for loading older messages
			const $messages_container = $("main-content-wrapper[active] messages")
			$messages_container.on("scroll", () => {
				// Never do anything if already loading something
				if (state.loading_path) {
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
					const threshold = Math.max($messages_container.clientHeight * 0.5, 300) // Trigger when within half screen or 300px of top

					// When we scroll near the top (small scrollTop), load older messages
					if ($messages_container.scrollTop < threshold) {
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

								// Track current scrollHeight and scrollTop for position preservation
								const scroll_height = $messages_container.scrollHeight
								const scroll_top = $messages_container.scrollTop

								// Prepend what we found to the existing cache (older messages go first)
								state.cache[state.path].messages.unshift(...data.messages)

								// And re-render if any messages added
								if (data.messages.length) {
									renderMessages(state.cache[state.path].messages, state.cache[state.path].conversation)
									
									// Preserve scroll position after prepending messages
									const min_threshold = 0
									if (scroll_top > min_threshold) {
										$messages_container.scrollTop = 
											scroll_top + ($messages_container.scrollHeight - scroll_height)
									}
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
			})

		}

		// Update conversation header with other user (1-to-1 messaging)
		if (conversation && conversation.other_user_name) {
			const other_user_name = renderName(conversation.other_user_name, conversation.other_user_display_name_index)
			
			$("main-content-wrapper[active] conversation-header participants").replaceChildren(
				$(
					`
					h2 $1
					`,
					[other_user_name]
				)
			)
		}

		// Render messages
		const $messages = messages.map(renderMessage)
		
		if ($messages.length === 0) {
			$("main-content-wrapper[active] messages").replaceChildren(
				$(
					`
					all-clear-wrapper
						p Nothing to see here
					`
				)
			)
		} else {
			$("main-content-wrapper[active] messages").replaceChildren(
				...$messages
			)
			$("main-content-wrapper[active] messages").scrollTop = $("main-content-wrapper[active] messages").scrollHeight
		}

		// Store conversation ID for WebSocket updates
		if (conversation) {
			state.active_conversation_id = conversation.conversation_id
		}

		// Mark messages from other users as read
		markMessagesAsRead(messages)
		
		$("main-content-wrapper[active] messages").scrollTop = $("main-content-wrapper[active] messages").scrollHeight
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
			// Update notifications cache to mark message notifications as read
			const notifications = state.cache["/notifications"]?.notifications
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

