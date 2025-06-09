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
			}
		}
	})
	state.ws.addEventListener("open", () => {
		state.ws.send(JSON.stringify({ 
			path: state.path,
			user_id: state.user_id 
		}))
	})
	state.ws.addEventListener("close", (event) => {
		state.ws.close()
		setTimeout(reconnectWs, 10000)
	})
}
reconnectWs()

// Update WebSocket when path changes
const updateWebSocketPath = (newPath) => {
	if (state.ws && state.ws.readyState === WebSocket.OPEN) {
		state.ws.send(JSON.stringify({ 
			path: newPath,
			user_id: state.user_id 
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
				let displayName = data.user_id // fallback
				if (conversation && conversation.participants) {
					const participant = conversation.participants.find(p => p.user_id === data.user_id)
					if (participant) {
						displayName = participant.display_name
					}
				}
				
				const $indicator = $(
					`
					typing-indicator
						span $1 is typing...
					`,
					[displayName]
				)
				$("main-content-wrapper[active] messages").appendChild($indicator)
			}
		} else {
			// Remove typing indicator
			typingIndicator?.remove()
		}
	}
}

// Send typing indicator
let typingTimeout
const sendTypingIndicator = (isTyping, conversationId) => {
	if (state.ws && state.ws.readyState === WebSocket.OPEN && conversationId) {
		state.ws.send(JSON.stringify({
			typing: isTyping,
			conversation_id: conversationId
		}))
		
		if (isTyping) {
			clearTimeout(typingTimeout)
			typingTimeout = setTimeout(() => {
				sendTypingIndicator(false, conversationId)
			}, 3000)
		}
	}
}
