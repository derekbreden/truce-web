const reconnectWs = () => {
	const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
	state.ws = new WebSocket(`${protocol}//${window.location.host}`)
	state.ws.addEventListener("message", (event) => {
		if (event.data === "UPDATE") {
			getMoreRecent()
		} else if (event.data === "MESSAGE_UPDATE") {
			if (state.path.startsWith("/messages/")) {
				getMoreRecent()
			}
		} else if (event.data === "CONVERSATION_UPDATE") {
			if (state.path === "/conversations") {
				getMoreRecent()
			}
		} else {
			const data = JSON.parse(event.data)
			if (data.type === "TYPING_INDICATOR") {
				handleTypingIndicator(data)
			} else if (data.type === "READ_STATUS_UPDATE") {
				handleReadStatusUpdate(data)
			} else if (data.type === "INSTANT_ALERT") {
				handleInstantAlert(data)
			}
		}
	})
	state.ws.addEventListener("open", () => {
		state.ws.send(JSON.stringify({ 
			path: state.path,
			session_uuid: state.session_uuid,
		}))
	})
	state.ws.addEventListener("close", (event) => {
		state.ws.close()
		setTimeout(reconnectWs, 10000)
	})
}
reconnectWs()

// Update WebSocket when path changes
const updateWebSocketPath = (new_path) => {
	if (state.ws && state.ws.readyState === WebSocket.OPEN) {
		state.ws.send(JSON.stringify({ 
			path: new_path,
			session_uuid: state.session_uuid,
		}))
	}
}

// Handle typing indicators
const handleTypingIndicator = (data) => {
	if (state.path === `/messages/${data.conversation_id}`) {
		const typingIndicator = $("main-content-wrapper[active] typing-indicator")
		
		if (data.typing) {
			// Show typing indicator if not already present
			if (!typingIndicator) {
				// Get display name from cached conversation data
				const conversation = state.cache[state.path]
				let display_name = data.user_id // fallback
				if (conversation && conversation.participants) {
					const participant = conversation.participants.find(participant => participant.user_id === data.user_id)
					if (participant) {
						display_name = participant.display_name
					}
				}
				
				const $indicator = $(
					`
					typing-indicator
						span $1 is typing...
					`,
					[display_name]
				)
				$("main-content-wrapper[active] messages").appendChild($indicator)
			}
		} else {
			// Remove typing indicator
			typingIndicator?.remove()
		}
	}
}

// Handle read status updates
const handleReadStatusUpdate = (data) => {
	// Only handle read status updates when viewing conversations page
	if (state.path === "/conversations" && state.cache["/conversations"]?.conversations) {
		// Find the conversation in the cache
		const conversation = state.cache["/conversations"].conversations.find(
			conv => conv.conversation_id === data.conversation_id
		)
		
		if (conversation) {
			// Update the unread count
			conversation.unread_count = data.new_unread_count
			
			// Re-render conversations to reflect the updated read status
			renderConversations(state.cache["/conversations"].conversations)
		}
	}
}

// Handle instant alerts
const handleInstantAlert = (data) => {
	// Only show alertInfo if not suppressed (user viewing different conversation)
	if (!data.suppress_ui) {
		alertInfo(data.push_data.title + "\n" + data.push_data.body)
	}
	
	// Send acknowledgment back to server if notification_id is provided
	if (data.notification_id && state.ws && state.ws.readyState === WebSocket.OPEN) {
		state.ws.send(JSON.stringify({
			type: "INSTANT_ALERT_ACK",
			notification_id: data.notification_id,
			session_uuid: state.session_uuid,
		}))
	}
}

// Send typing indicator
let typing_timeout
const sendTypingIndicator = (is_typing, conversation_id) => {
	if (state.ws && state.ws.readyState === WebSocket.OPEN && conversation_id) {
		state.ws.send(JSON.stringify({
			typing: is_typing,
			conversation_id: conversation_id,
			session_uuid: state.session_uuid,
		}))
		
		if (is_typing) {
			clearTimeout(typing_timeout)
			typing_timeout = setTimeout(() => {
				sendTypingIndicator(false, conversation_id)
			}, 3000)
		}
	}
}

// Send session_uuid
const sendSessionUuidToWebSocket = () => {
	if (state.ws && state.ws.readyState === WebSocket.OPEN) {
		state.ws.send(JSON.stringify({
			session_uuid: state.session_uuid,
		}))
	}
}
