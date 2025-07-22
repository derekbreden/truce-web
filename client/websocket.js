// Typing indicator state - local to this file
let typing_heartbeat_interval = null
let typing_last_activity = 0
let self_typing_inactivity_timeout = null

// Function to send typing heartbeat
const sendTypingHeartbeat = (conversation_id) => {
	if (window.ws && window.ws.readyState === 1) { // WebSocket.OPEN is 1
		window.ws.send(JSON.stringify({
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
	if (self_typing_inactivity_timeout) {
		clearTimeout(self_typing_inactivity_timeout)
		self_typing_inactivity_timeout = null
	}
}

const reconnectWs = () => {
	const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
	window.ws = new WebSocket(`${protocol}//${window.location.host}`)
	window.ws.addEventListener("message", (event) => {
		if (event.data === "UPDATE") {
			getMoreRecent()
		} else {
			const data = JSON.parse(event.data)
			if (data.type === "INSTANT_ALERT") {
				handleInstantAlert(data)
			} else if (data.type === "TYPING_INDICATOR") {
				handleTypingIndicator(data)
			} else if (data.type === "MESSAGE_READ_RECEIPT") {
				handleMessageReadReceipt(data)
			}
		}
	})
	window.ws.addEventListener("open", () => {
		window.ws.send(JSON.stringify({ 
			path: state.path,
			session_uuid: state.session_uuid,
		}))
	})
	window.ws.addEventListener("close", (event) => {
		window.ws.close()
		setTimeout(reconnectWs, 10000)
	})
}
reconnectWs()

// Update WebSocket when path changes
const updateWebSocketPath = (new_path) => {
	if (window.ws && window.ws.readyState === WebSocket.OPEN) {
		window.ws.send(JSON.stringify({ 
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
	if ((data.reply_notification_id || data.message_notification_id) && window.ws && window.ws.readyState === WebSocket.OPEN) {
		window.ws.send(JSON.stringify({
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
	if (data.conversation_id === state.active_conversation_id && data.user_id !== state.user_id) {
		// Call function in renderMessages.js to update UI
		if (typeof updateTypingIndicator === "function") {
			updateTypingIndicator(data.user_id, true)
		}
	}
}

// Handle message read receipts
const handleMessageReadReceipt = (data) => {
	// Only handle if user is currently viewing the conversation where the read receipt happened
	if (data.conversation_id === state.active_conversation_id && data.user_id !== state.user_id) {
		// Update UI to show messages as read
		if (typeof updateMessageReadStatus === "function") {
			updateMessageReadStatus()
		}
	}
}


// Send session_uuid
const sendSessionUuidToWebSocket = () => {
	if (window.ws && window.ws.readyState === WebSocket.OPEN) {
		window.ws.send(JSON.stringify({
			session_uuid: state.session_uuid,
		}))
	}
}
