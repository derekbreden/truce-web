module.exports = async (req, res) => {
	// Handle both direct API calls with conversation_id and path-based navigation to /messages/{id}
	let conversation_id = req.body.conversation_id
	
	if (!conversation_id && req.body.path && req.body.path.startsWith("/messages/")) {
		conversation_id = Number(req.body.path.split("/")[2])
	}
	
	if (
		!res.writableEnded
		&& req.session.user_id
		&& conversation_id
	) {
		// Verify user is participant in this conversation
		const conversation_check = await req.client.query(
			`
			SELECT conversation_id
			FROM conversation_users
			WHERE conversation_id = $1 AND user_id = $2
			`,
			[conversation_id, req.session.user_id],
		)

		if (!conversation_check.rows.length) {
			res.end(
				JSON.stringify({
					error: "Conversation not found or access denied",
				}),
			)
			return
		}

		const messages_result = await req.client.query(
			`
			SELECT * FROM (
				SELECT
					m.create_date,
					m.message_id,
					m.body,
					m.note,
					m.image_uuids,
					m.user_id,
					u.display_name,
					u.display_name_index,
					CASE WHEN (u.slug = '' OR u.slug IS NULL) THEN u.user_id::VARCHAR ELSE u.slug END as user_slug,
					u.profile_picture_uuid,
					CASE WHEN u.email <> '' AND u.email IS NOT NULL THEN true ELSE false END AS user_verified,
					CASE WHEN m.user_id = $2 THEN true ELSE false END AS edit,
					mn.notification_id,
					mn.read as notification_read,
					mn.seen as notification_seen
				FROM messages m
				INNER JOIN users u ON m.user_id = u.user_id
				LEFT JOIN blocked_users b ON b.user_id_blocked = m.user_id AND b.user_id_blocking = $2
				LEFT JOIN message_notifications mn ON mn.message_id = m.message_id AND mn.user_id = $2
				WHERE
					m.conversation_id = $1
					AND (
						m.create_date > $3 OR $3 IS NULL
					)
					AND (
						m.create_date < $4 OR $4 IS NULL
					)
					AND b.user_id_blocked IS NULL
				ORDER BY m.create_date DESC
				LIMIT 20
			) AS recent_messages
			ORDER BY create_date ASC
			`,
			[
				conversation_id,
				req.session.user_id,
				req.body.min_message_create_date ? new Date(req.body.min_message_create_date) : null,
				req.body.max_message_create_date ? new Date(req.body.max_message_create_date) : null,
			],
		)

		// Get conversation metadata for the response
		const conversation_result = await req.client.query(
			`
			SELECT
				c.conversation_id,
				c.create_date,
				c.last_message_id,
				ou.user_id as other_user_id,
				ou.display_name as other_user_name,
				ou.display_name_index as other_user_display_name_index,
				CASE WHEN (ou.slug = '' OR ou.slug IS NULL) THEN ou.user_id::VARCHAR ELSE ou.slug END as other_user_slug,
				ou.profile_picture_uuid as other_user_picture,
				CASE WHEN ou.email <> '' AND ou.email IS NOT NULL THEN true ELSE false END as other_user_verified
			FROM conversations c
			INNER JOIN conversation_users cp ON c.conversation_id = cp.conversation_id AND cp.user_id != $2
			INNER JOIN users ou ON cp.user_id = ou.user_id
			LEFT JOIN blocked_users b ON b.user_id_blocked = ou.user_id AND b.user_id_blocking = $2
			WHERE
				c.conversation_id = $1
				AND b.user_id_blocked IS NULL
			`,
			[conversation_id, req.session.user_id],
		)

		req.results.messages.push(...messages_result.rows)
		req.results.conversation = conversation_result.rows[0] || null
		req.results.path = `/messages/${conversation_id}`
	}
}