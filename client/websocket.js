const reconnectWs = () => {
	state.ws = new WebSocket(`wss://${window.location.host}`)
	state.ws.addEventListener("message", (event) => {
		if (event?.data === "UPDATE") {
			getMoreRecent()
		} else if (event?.data === "MESSAGE_UPDATE") {
			// Reload current conversation if we're viewing messages
			if (state.path.startsWith("/messages/")) {
				getMoreRecent()
			}
		} else if (event?.data === "CONVERSATION_UPDATE") {
			// Reload conversations list if we're viewing it
			if (state.path === "/conversations") {
				getMoreRecent()
			}
		} else {
			// Handle JSON messages (like typing indicators)
			try {
				const data = JSON.parse(event.data)
				if (data.type === "TYPING_INDICATOR") {
					handleTypingIndicator(data)
				}
			} catch (e) {
				// Not JSON, ignore
			}
		}
	})
	state.ws.addEventListener("open", () => {
		// Tell the websocket we are on a new path and send user_id for messaging
		try {
			state.ws.send(JSON.stringify({ 
				path: state.path,
				user_id: state.user_id 
			}))
		} catch (e) {
			console.error(e)
		}
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
		try {
			state.ws.send(JSON.stringify({ 
				path: newPath,
				user_id: state.user_id 
			}))
		} catch (e) {
			console.error(e)
		}
	}
}

// Handle typing indicators
const handleTypingIndicator = (data) => {
	if (state.path === `/messages/${data.conversation_id}`) {
		const typingIndicator = $("main-content-wrapper[active] typing-indicator")
		
		if (data.typing) {
			// Show typing indicator if not already present
			if (!typingIndicator) {
				const $indicator = $(
					`
					typing-indicator
						span $1 is typing...
					`,
					[data.user_id] // In real app, you'd show the user's display name
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
		try {
			state.ws.send(JSON.stringify({
				typing: isTyping,
				conversation_id: conversationId
			}))
			
			// Auto-stop typing after 3 seconds of inactivity
			if (isTyping) {
				clearTimeout(typingTimeout)
				typingTimeout = setTimeout(() => {
					sendTypingIndicator(false, conversationId)
				}, 3000)
			}
		} catch (e) {
			console.error(e)
		}
	}
}
