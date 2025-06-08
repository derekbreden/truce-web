const renderMessage = (message) => {
	const isOwnMessage = message.sender_user_id === state.user_id
	const timeAgo = new Date(message.create_date).toLocaleString()
	
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
			isOwnMessage,
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
			timeAgo,
			$message_body,
			message.image_uuids
				? renderImages(message.image_uuids.split(",").filter(x => x))
				: []
		]
	)

	// Add edit functionality for own messages
	if (isOwnMessage) {
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

	beforeDomUpdate()
	if (!$("main-content-wrapper[active] messages-container")) {
		$("main-content-wrapper[active] main-content").appendChild(
			$(
				`
				messages-container
					conversation-header
						participants
						compose-button
							icon[add]
								$1
					messages
					message-input-area
						message-form
							textarea[placeholder="Type a message..."]
							send-button
								icon[forward]
									$2
				`,
				[
					$("icons icon[add] svg").cloneNode(true),
					$("icons icon[forward] svg").cloneNode(true)
				]
			)
		)
	}

	if (!skip_messages) {
		// Update conversation header with participants
		if (conversation && conversation.participants) {
			const otherParticipants = conversation.participants.filter(p => p.user_id !== state.user_id)
			const participantNames = otherParticipants.map(p => 
				renderName(p.display_name, p.display_name_index || 0)
			).join(", ")
			
			$("main-content-wrapper[active] conversation-header participants").replaceChildren(
				$(
					`
					h2 $1
					`,
					[participantNames]
				)
			)
		}

		// Render messages
		const $messages = messages.map(renderMessage)
		
		if ($messages.length === 0) {
			$("main-content-wrapper[active] messages").appendChild(
				$(
					`
					empty-state
						icon mail
						h3 No messages yet
						p Start the conversation by typing a message below
					`
				)
			)
		} else {
			$("main-content-wrapper[active] messages").replaceChildren(
				...$messages
			)
			
			// Scroll to bottom
			const $messagesContainer = $("main-content-wrapper[active] messages")
			$messagesContainer.scrollTop = $messagesContainer.scrollHeight
		}

		// Set up message sending
		const $textarea = $("main-content-wrapper[active] textarea")
		const $sendButton = $("main-content-wrapper[active] send-button")
		
		const sendMessage = () => {
			const messageBody = $textarea.value.trim()
			if (messageBody && conversation) {
				fetch("/session", {
					method: "POST",
					body: JSON.stringify({
						action: "sendMessage",
						conversation_id: conversation.conversation_id,
						body: messageBody
					})
				})
				.then(response => response.json())
				.then(data => {
					if (data.success) {
						$textarea.value = ""
						// Refresh messages
						startSession()
					} else {
						alertError(data.error || "Failed to send message")
					}
				})
				.catch(error => {
					console.error("Error sending message:", error)
					alertError("Network error sending message")
				})
			}
		}

		$sendButton.on("click", sendMessage)
		$textarea.on("keydown", (e) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault()
				sendMessage()
			}
		})

		// Add typing indicators
		let lastTypingTime = 0
		$textarea.on("input", () => {
			if (conversation && conversation.conversation_id) {
				const now = Date.now()
				lastTypingTime = now
				
				// Start typing indicator
				// sendTypingIndicator(true, conversation.conversation_id)
				
				// Stop typing after 1 second of no input
				// setTimeout(() => {
				//	if (Date.now() - lastTypingTime >= 1000) {
				//		sendTypingIndicator(false, conversation.conversation_id)
				//	}
				// }, 1000)
			}
		})

		// Store conversation ID for WebSocket updates
		if (conversation) {
			state.active_conversation_id = conversation.conversation_id
		}
	}
}

const showEditMessageModal = (message) => {
	// This will be implemented when we create the modal system
	console.log("Edit message:", message)
}