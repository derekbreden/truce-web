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
	const is_own_message = message.sender_user_id === state.user_id
	const time_ago = new Date(message.create_date).toLocaleString()
	
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
			$message_body,
			message.image_uuids
				? renderMessageImages(message.image_uuids.split(",").filter(uuid => uuid))
				: []
		]
	)

	// Add edit functionality for own messages
	if (is_own_message) {
		$message.$("message-header").appendChild(
			$(
				`
				edit-button
					icon[edit]
						$1
				`,
				[$("icons icon[edit] svg").cloneNode(true)]
			)
		)
		
		$message.$("edit-button").on("click", () => {
			showEditMessageModal(message)
		})
	}

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
		}

		// Update conversation header with participants
		if (conversation && conversation.participants) {
			const other_participants = conversation.participants
				.filter(participant => Number(participant.user_id) !== Number(state.user_id))
			const participant_names = other_participants.map(participant => 
				renderName(participant.display_name, participant.display_name_index || 0)
			).join(", ")
			
			$("main-content-wrapper[active] conversation-header participants").replaceChildren(
				$(
					`
					h2 $1
					`,
					[participant_names]
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

		// Set up message sending
		const $textarea = $("main-content-wrapper[active] textarea")
		const $sendButton = $("main-content-wrapper[active] send-button")
		
		const send_message = () => {
			const message_body = $textarea.value.trim()
			if (message_body && conversation) {
				fetch("/session", {
					method: "POST",
					body: JSON.stringify({
						action: "sendMessage",
						conversation_id: conversation.conversation_id,
						body: message_body,
						pngs: []
					})
				})
				.then(response => response.json())
				.then(data => {
					if (data.error) {
						alertError(data.error)
					} else {
						$textarea.value = ""
						// Refresh messages
						startSession()
					}
				})
				.catch(error => {
					console.error("Error sending message:", error)
					alertError("Network error sending message")
				})
			}
		}

		$sendButton.on("click", send_message)
		$textarea.on("keydown", (e) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault()
				send_message()
			}
		})

		// Add typing indicators
		let last_typing_time = 0
		$textarea.on("input", () => {
			if (conversation && conversation.conversation_id) {
				const now = Date.now()
				last_typing_time = now
				
				// Start typing indicator
				sendTypingIndicator(true, conversation.conversation_id)
				
				// Stop typing after 1 second of no input
				setTimeout(() => {
					if (Date.now() - last_typing_time >= 1000) {
						sendTypingIndicator(false, conversation.conversation_id)
					}
				}, 1000)
			}
		})

		// Store conversation ID for WebSocket updates
		if (conversation) {
			state.active_conversation_id = conversation.conversation_id
		}
		
		$("main-content-wrapper[active] messages").scrollTop = $("main-content-wrapper[active] messages").scrollHeight
	}
}

