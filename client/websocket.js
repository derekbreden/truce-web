// Typing indicator state - local to this file
let typing_heartbeat_interval = null
let typing_last_activity = 0
let typing_timeout = null

// Function to send typing heartbeat
const sendTypingHeartbeat = (conversation_id) => {
	if (state.ws && state.ws.readyState === 1) { // WebSocket.OPEN is 1
		state.ws.send(JSON.stringify({
			type: "TYPING_HEARTBEAT",
			conversation_id: conversation_id,
			session_uuid: state.session_uuid,
		}))
	}
}

// Function to start typing heartbeats
const startTypingHeartbeats = (conversation_id) => {
	// Clear any existing interval
	if (typing_heartbeat_interval) {
		clearInterval(typing_heartbeat_interval)
		typing_heartbeat_interval = null
	}
	
	// Send initial heartbeat
	sendTypingHeartbeat(conversation_id)
	
	// Send heartbeat every 1.5 seconds
	typing_heartbeat_interval = setInterval(() => {
		sendTypingHeartbeat(conversation_id)
	}, 1500)
	
	// Update last activity time
	typing_last_activity = Date.now()
}

// Function to stop typing heartbeats
const stopTypingHeartbeats = () => {
	if (typing_heartbeat_interval) {
		clearInterval(typing_heartbeat_interval)
		typing_heartbeat_interval = null
	}
	if (typing_timeout) {
		clearTimeout(typing_timeout)
		typing_timeout = null
	}
}

const reconnectWs = () => {
	const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
	state.ws = new WebSocket(`${protocol}//${window.location.host}`)
	state.ws.addEventListener("message", (event) => {
		if (event.data === "UPDATE") {
			getMoreRecent()
		} else {
			const data = JSON.parse(event.data)
			if (data.type === "INSTANT_ALERT") {
				handleInstantAlert(data)
			} else if (data.type === "TYPING_INDICATOR") {
				handleTypingIndicator(data)
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



// Handle instant alerts
const handleInstantAlert = (data) => {
	// Only show alertInfo if not suppressed (user viewing different conversation)
	if (!data.suppress_ui) {
		alertInfo(data.push_data.title + "\n" + data.push_data.body)
	}
	
	// Send acknowledgment back to server if notification IDs are provided
	if ((data.reply_notification_id || data.message_notification_id) && state.ws && state.ws.readyState === WebSocket.OPEN) {
		state.ws.send(JSON.stringify({
			type: "INSTANT_ALERT_ACK",
			reply_notification_id: data.reply_notification_id,
			message_notification_id: data.message_notification_id,
			session_uuid: state.session_uuid,
		}))
	}
}

// Handle typing indicators
const handleTypingIndicator = (data) => {
	// Only handle if user is currently viewing the conversation where typing is happening
	if (data.conversation_id == state.active_conversation_id && data.user_id !== state.user_id) {
		// Call function in renderMessages.js to update UI
		if (typeof updateTypingIndicator === "function") {
			updateTypingIndicator(data.user_id, true)
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
