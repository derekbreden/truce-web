const startConversationWithUser = (user_id) => {
	fetch("/session", {
		method: "POST",
		body: JSON.stringify({
			action: "createConversation",
			participant_user_ids: [user_id]
		}),
	})
	.then(response => response.json())
	.then(data => {
		if (data.error) {
			alertError(data.error)
			return
		}

		if (data.success && data.conversation_id) {
			goToPath(`/messages/${data.conversation_id}`)
		} else {
			alertError("Unable to start conversation")
		}
	})
	.catch(error => {
		console.error("Error starting conversation:", error)
		alertError("Network error starting conversation")
	})
}