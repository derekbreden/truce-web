const renderConversation = (conversation) => {
	const lastMessageBody = conversation.last_message_body || "No messages yet"
	const shortBody = lastMessageBody.length > 60 
		? lastMessageBody.substr(0, 60) + "..." 
		: lastMessageBody

	// Get other participants (exclude current user)
	const otherParticipants = conversation.participants.filter(p => p.user_id !== state.user_id)
	const participantNames = otherParticipants.map(p => 
		renderName(p.display_name, p.display_name_index || 0)
	).join(", ")

	const timeAgo = conversation.last_message_date 
		? new Date(conversation.last_message_date).toLocaleString()
		: new Date(conversation.create_date).toLocaleString()

	const unreadCount = parseInt(conversation.unread_count) || 0

	const $conversation = $(
		`
		conversation[unread=$1]
			conversation-info
				participants-row
					participants-names $2
					time-ago $3
				message-preview $4
				$5
		`,
		[
			unreadCount > 0,
			participantNames,
			timeAgo,
			shortBody,
			unreadCount > 0 ? $(
				`
				unread-count $1
				`,
				[unreadCount]
			) : ""
		]
	)

	$conversation.on("click", () => {
		goToPath(`/messages/${conversation.conversation_id}`)
	})

	return $conversation
}

const renderConversations = (conversations) => {
	const skip_conversations = state.path !== "/conversations"

	beforeDomUpdate()
	if (!$("main-content-wrapper[active] conversations")) {
		$("main-content-wrapper[active] main-content").appendChild(
			$(
				`
				conversations
				`
			)
		)
	}

	if (!skip_conversations) {
		const $conversations = conversations.map(renderConversation)
		
		if ($conversations.length === 0) {
			$("main-content-wrapper[active] main-content conversations").appendChild(
				$(
					`
					empty-state
						icon mail
						h3 No conversations yet
						p Start a conversation by messaging someone from their profile
					`
				)
			)
		} else {
			$("main-content-wrapper[active] main-content conversations").replaceChildren(
				...$conversations
			)
		}
	}
}