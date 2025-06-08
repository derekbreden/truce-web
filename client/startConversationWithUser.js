const startConversationWithUser = async (user_id) => {
	try {
		// First, try to find an existing conversation with this user
		const response = await fetch("/session", {
			method: "POST",
			body: JSON.stringify({
				action: "createConversation",
				participant_user_ids: [user_id]
			}),
		})

		const data = await response.json()

		if (data.error) {
			alertError(data.error)
			return
		}

		if (data.success && data.conversation_id) {
			// Navigate to the conversation
			goToPath(`/messages/${data.conversation_id}`)
		} else {
			alertError("Unable to start conversation")
		}
	} catch (error) {
		console.error("Error starting conversation:", error)
		alertError("Network error starting conversation")
	}
}