const renderConversation = (conversation) => {
	const last_message_body = conversation.last_message_body || "No messages yet"
	const short_body = last_message_body.length > 60 
		? last_message_body.slice(0, 60) + "..." 
		: last_message_body

	// Get other user (1-to-1 messaging)
	const other_user_name = conversation.other_user_name || "Unknown User"
	const participant_names = renderName(other_user_name, 0)

	const time_ago = conversation.last_message_date 
		? new Date(conversation.last_message_date).toLocaleString()
		: new Date(conversation.create_date).toLocaleString()

	const unread_count = Number(conversation.unread_count)

	const $conversation = $(
		`
		conversation[unread=$1]
			conversation-info
				participants-row
					other-user-name $2
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
					post[conversations-empty]
						h2[conversations-empty]
							span Messages
							icon
								$1
						p[conversations-empty]
							span Click the
							$2
							span on a user's profile to start a conversation with them.
					`,
					[
						$("icons icon[mail] svg").cloneNode(true),
						$("icons icon[mail] svg").cloneNode(true)
					]
				)
			)
		} else {
			$("main-content-wrapper[active] main-content conversations").replaceChildren(
				...$conversations
			)
		}
	}
}