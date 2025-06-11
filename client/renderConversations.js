const renderConversation = (conversation) => {
	const last_message_body = conversation.last_message_body || "No messages yet"
	const short_body = last_message_body.length > 60 
		? last_message_body.slice(0, 60) + "..." 
		: last_message_body

	// Get other participants (exclude current user)
	const other_participants = conversation.participants
		.filter(participant => Number(participant.user_id) !== Number(state.user_id))
	const participant_names = other_participants.map(participant => 
		renderName(participant.display_name, participant.display_name_index || 0)
	).join(", ")

	const time_ago = conversation.last_message_date 
		? new Date(conversation.last_message_date).toLocaleString()
		: new Date(conversation.create_date).toLocaleString()

	const unread_count = Number(conversation.unread_count)

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
			unread_count > 0,
			participant_names,
			time_ago,
			short_body,
			unread_count > 0 ? $(
				`
				unread-count $1
				`,
				[unread_count]
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
					all-clear-wrapper
						p Nothing to see here
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