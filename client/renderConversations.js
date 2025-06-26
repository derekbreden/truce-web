const renderConversation = (conversation) => {
	let last_message_preview = conversation.last_message_body ?? "No messages yet"
	
	// For image-only messages, show empty preview since thumbnails will be displayed
	if (conversation.last_message_image_uuids && !conversation.last_message_body) {
		last_message_preview = ""
	}
	
	const short_body = last_message_preview.length > 60 
		? last_message_preview.slice(0, 60) + "..." 
		: last_message_preview

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
			renderName(conversation.other_user_name, conversation.other_user_display_name_index),
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

	// Add thumbnail images following the same pattern as renderPost.js
	if (conversation.last_message_image_uuids) {
		const image_uuids = conversation.last_message_image_uuids.split(",").filter(uuid => uuid).reverse()
		for (const image_uuid of image_uuids) {
			const $image = $(
				`
				p[img][total-images=$1]
					img[src=$2]
				`,
				[image_uuids.length, "/image/" + image_uuid],
			)
			// Don't bind image click for thumbnails in conversation list
			$conversation.$("participants-row").after($image)
		}
	}

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
			$("post[conversations-empty]")?.remove()
			$("main-content-wrapper[active] main-content conversations").appendChild(
				$(
					`
					post[line-after][conversations-empty]
						h2[conversations-empty]
							span Messages
							icon[mail]
						p[conversations-empty]
							span Click the
							icon[mail][inline]
							span on a user's profile to start a conversation with them.
					`,
					[]
				)
			)
		} else {
			$("post[conversations-empty]")?.remove()
			$("main-content-wrapper[active] main-content conversations").replaceChildren(
				...$conversations
			)
		}
	}
}