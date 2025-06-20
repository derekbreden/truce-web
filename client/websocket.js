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


// Send session_uuid
const sendSessionUuidToWebSocket = () => {
	if (state.ws && state.ws.readyState === WebSocket.OPEN) {
		state.ws.send(JSON.stringify({
			session_uuid: state.session_uuid,
		}))
	}
}
