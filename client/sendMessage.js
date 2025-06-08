// Generic send function for messaging actions
const send = (data, action) => {
	return fetch("/session", {
		method: "POST",
		body: JSON.stringify({
			...data,
			action: action,
			path: state.path
		})
	})
	.then(response => response.json())
	.then(result => {
		if (result.error) {
			throw new Error(result.error)
		}
		return result
	})
}

// Start a new conversation with a user
const startConversationWithUser = (userId) => {
	showMessageModal([userId])
}

// Reply to an existing conversation 
const replyToConversation = (conversationId) => {
	showMessageModal(null, conversationId)
}

// Mark message as read
const markMessageAsRead = (messageId) => {
	return send({
		message_id: messageId
	}, "markMessageAsRead")
}