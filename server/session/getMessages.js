module.exports = async (req, res) => {
	// Handle both direct API calls with conversation_id and path-based navigation to /messages/{id}
	let conversation_id = req.body.conversation_id
	
	if (!conversation_id && req.body.path && req.body.path.startsWith("/messages/")) {
		conversation_id = Number(req.body.path.split("/")[2])
	}
	
	if (
		!res.writableEnded &&
		req.session.user_id &&
		conversation_id
	) {
		// Verify user is participant in this conversation
		const conversation_check = await req.client.query(
			`
			SELECT participant_user_ids
			FROM conversations
			WHERE conversation_id = $1
			`,
			[conversation_id],
		)

		if (
			!conversation_check.rows.length ||
			!conversation_check.rows[0].participant_user_ids.includes(req.session.user_id)
		) {
			res.end(
				JSON.stringify({
					error: "Conversation not found or access denied",
				}),
			)
			return
		}

		// Get messages in conversation, excluding blocked users
		const participant_user_ids = conversation_check.rows[0].participant_user_ids
		const other_user_ids = participant_user_ids.filter(id => id !== req.session.user_id)

		const messages_result = await req.client.query(
			`
			SELECT
				m.create_date,
				m.message_id,
				m.body,
				m.image_uuids,
				m.sender_user_id,
				u.display_name,
				u.display_name_index,
				CASE WHEN (u.slug = '' OR u.slug IS NULL) THEN u.user_id::VARCHAR ELSE u.slug END as user_slug,
				u.profile_picture_uuid,
				CASE WHEN u.email <> '' AND u.email IS NOT NULL THEN true ELSE false END AS user_verified,
				CASE WHEN m.sender_user_id = $2 THEN true ELSE false END AS edit
			FROM messages m
			INNER JOIN users u ON m.sender_user_id = u.user_id
			LEFT JOIN blocked_users b ON b.user_id_blocked = m.sender_user_id AND b.user_id_blocking = $2
			WHERE
				m.conversation_id = $1
				AND (
					m.create_date > $3 OR $3 IS NULL
				)
				AND b.user_id_blocked IS NULL
			ORDER BY m.create_date ASC
			`,
			[
				conversation_id,
				req.session.user_id,
				req.body.min_message_create_date ? new Date(req.body.min_message_create_date) : null,
			],
		)

		// Get conversation metadata for the response
		const conversation_result = await req.client.query(
			`
			SELECT
				c.conversation_id,
				c.create_date,
				c.last_message_id,
				array_agg(
					json_build_object(
						'user_id', u.user_id,
						'display_name', u.display_name,
						'user_slug', CASE WHEN (u.slug = '' OR u.slug IS NULL) THEN u.user_id::VARCHAR ELSE u.slug END,
						'profile_picture_uuid', u.profile_picture_uuid,
						'user_verified', CASE WHEN u.email <> '' AND u.email IS NOT NULL THEN true ELSE false END
					)
				) as participants
			FROM conversations c
			CROSS JOIN unnest(c.participant_user_ids) AS participant_id
			INNER JOIN users u ON u.user_id = participant_id
			LEFT JOIN blocked_users b ON b.user_id_blocked = u.user_id AND b.user_id_blocking = $2
			WHERE
				c.conversation_id = $1
				AND b.user_id_blocked IS NULL
			GROUP BY c.conversation_id, c.create_date, c.last_message_id
			`,
			[conversation_id, req.session.user_id],
		)

		req.results.messages.push(...messages_result.rows)
		req.results.conversation = conversation_result.rows[0] || null
		req.results.path = `/messages/${conversation_id}`
	}
}