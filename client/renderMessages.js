const renderMessageImages = (image_uuids) => {
	return image_uuids.reverse().map(image_uuid => {
		const $image = $(
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
				: $("icons icon[profile-picture] svg").cloneNode(true),
			message.user_slug,
			renderName(message.display_name, message.display_name_index),
			message.user_verified
				? $(
					`
					icon
						$1
					`,
					[$("icons icon[verified] svg").cloneNode(true)]
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
								textarea[placeholder="Type a message..."]
								send-button
									icon[forward]
										$1
					`,
					[
						$("icons icon[forward] svg").cloneNode(true)
					]
				)
			)

			// Set up message sending
			const $textarea = $("main-content-wrapper[active] textarea")
			const $sendButton = $("main-content-wrapper[active] send-button")
			const $messageForm = $("main-content-wrapper[active] message-form")
			
			const addMessageError = (error) => {
				$messageForm.appendChild(
					$(
						`
						error
							$1
						`,
						[error],
					),
				)
			}
			
			const send_message = () => {
				$messageForm.$("error")?.remove()
				const message_body = $textarea.value.trim()
				if (message_body && conversation) {
					fetch("/session", {
						method: "POST",
						body: JSON.stringify({
							conversation_id: conversation.conversation_id,
							body: message_body,
							pngs: []
						})
					})
					.then(response => response.json())
					.then(data => {
						if (data.error) {
							addMessageError(data.error)
						} else {
							$textarea.value = ""
							// Refresh messages
							getMoreRecent()
						}
					})
					.catch(error => {
						console.error("Error sending message:", error)
						addMessageError("Network error sending message")
					})
				}
			}
			
			// Remove error when user focuses on textarea (same pattern as posts/replies)
			$textarea.on("focus", () => {
				$messageForm.$("error")?.remove()
			})

			$sendButton.on("click", send_message)
			$textarea.on("keydown", (e) => {
				if (e.key === "Enter" && !e.shiftKey) {
					e.preventDefault()
					send_message()
				}
			})


		}

		// Update conversation header with other user (1-to-1 messaging)
		if (conversation && conversation.other_user_name) {
			const other_user_name = renderName(conversation.other_user_name, 0)
			
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
	const unreadMessages = messages.filter(message => 
		message.user_id !== state.user_id && message.notification_id && !message.notification_read
	)

	if (unreadMessages.length === 0) {
		return // Nothing to mark as read
	}

	// Collect all notification IDs to mark as read
	const notification_ids = unreadMessages.map(message => message.notification_id)

	// Mark all notifications as read in one request
	fetch("/session", {
		method: "POST",
		body: JSON.stringify({
			mark_as_read: notification_ids
		})
	})
	.then(response => response.json())
	.then(data => {
		if (data.success) {
			// Update notifications cache to mark message notifications as read
			const notifications = state.cache["/notifications"]?.notifications
			if (notifications) {
				notifications.forEach(notification => {
					if (notification_ids.includes(notification.notification_id)) {
						notification.read = true
						notification.seen = true
					}
				})
			}
			// Mark messages as read locally
			unreadMessages.forEach(message => {
				message.notification_read = true
				message.notification_seen = true
			})
		}
	})
	.catch(error => {
		console.error("Error marking messages as read:", error)
	})

	// Update conversations cache to set unread_count = 0 for current conversation
	const conversation_id = state.active_conversation_id
	if (conversation_id && state.cache["/conversations"]?.conversations) {
		const conversation = state.cache["/conversations"].conversations.find(
			conv => conv.conversation_id === conversation_id
		)
		if (conversation) {
			conversation.unread_count = 0
		}
	}

	// Update state.unread_count immediately to reflect the reduced count
	const unreadNotifications = state.cache["/notifications"]?.notifications?.filter(n => !n.read) || []
	state.unread_count = unreadNotifications.length

	// Update UI indicators immediately
	if (state.unread_count === 0) {
		$("hamburger")?.removeAttribute("unread")
		$("footer a[notifications]")?.removeAttribute("unread")
	}

	// Update notifications page header if currently on notifications page
	if (state.path === "/notifications") {
		const $unreadHeader = $("main-content h3")
		if ($unreadHeader) {
			$unreadHeader.textContent = state.unread_count > 0 ? `Unread (${state.unread_count})` : "Unread"
		}
	}

	// Refresh unread counts from server to ensure accuracy
	getUnreadCountUnseenCount()
}

