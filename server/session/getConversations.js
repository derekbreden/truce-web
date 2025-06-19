module.exports = async (req, res) => {
	if (
		!res.writableEnded
		&& req.session.user_id
		&& req.body.path === "/conversations"
	) {
		// Get all conversations where user is a participant
		const conversations_result = await req.client.query(
			`
			SELECT
				c.conversation_id,
				c.create_date,
				c.last_message_id,
				lm.body as last_message_body,
				lm.create_date as last_message_date,
				lm.sender_user_id as last_message_sender_id,
				lmu.display_name as last_message_sender_name,
				CASE WHEN (lmu.slug = '' OR lmu.slug IS NULL) THEN lmu.user_id::VARCHAR ELSE lmu.slug END as last_message_sender_slug,
				lmu.profile_picture_uuid as last_message_sender_picture,
				CASE WHEN lmu.email <> '' AND lmu.email IS NOT NULL THEN true ELSE false END AS last_message_sender_verified,
				ou.user_id as other_user_id,
				ou.display_name as other_user_name,
				CASE WHEN (ou.slug = '' OR ou.slug IS NULL) THEN ou.user_id::VARCHAR ELSE ou.slug END as other_user_slug,
				ou.profile_picture_uuid as other_user_picture,
				CASE WHEN ou.email <> '' AND ou.email IS NOT NULL THEN true ELSE false END as other_user_verified,
				COUNT(DISTINCT CASE WHEN mn.read = false THEN mn.notification_id END) as unread_count
			FROM conversations c
			INNER JOIN conversation_participants cp1 ON c.conversation_id = cp1.conversation_id AND cp1.user_id = $1
			INNER JOIN conversation_participants cp2 ON c.conversation_id = cp2.conversation_id AND cp2.user_id != $1
			INNER JOIN users ou ON cp2.user_id = ou.user_id
			LEFT JOIN messages lm ON c.last_message_id = lm.message_id
			LEFT JOIN users lmu ON lm.sender_user_id = lmu.user_id
			LEFT JOIN blocked_users b ON b.user_id_blocked = ou.user_id AND b.user_id_blocking = $1
			LEFT JOIN message_notifications mn ON mn.user_id = $1 
				AND mn.message_id IN (
					SELECT message_id 
					FROM messages 
					WHERE conversation_id = c.conversation_id
				)
			WHERE
				b.user_id_blocked IS NULL
				AND (
					COALESCE(lm.create_date, c.create_date) > $2 OR $2 IS NULL
				)
				AND (
					COALESCE(lm.create_date, c.create_date) < $3 OR $3 IS NULL
				)
			GROUP BY 
				c.conversation_id, 
				c.create_date, 
				c.last_message_id,
				lm.body,
				lm.create_date,
				lm.sender_user_id,
				lmu.display_name,
				lmu.slug,
				lmu.user_id,
				lmu.profile_picture_uuid,
				lmu.email,
				ou.user_id,
				ou.display_name,
				ou.slug,
				ou.profile_picture_uuid,
				ou.email
			ORDER BY 
				COALESCE(lm.create_date, c.create_date) DESC
			LIMIT 50
			`,
			[
				req.session.user_id,
				req.body.min_conversation_last_activity_date ? new Date(req.body.min_conversation_last_activity_date) : null,
				req.body.max_conversation_create_date ? new Date(req.body.max_conversation_create_date) : null,
			],
		)

		// Get total unread message count across all conversations
		const total_unread_result = await req.client.query(
			`
			SELECT COUNT(*) as total_unread
			FROM message_notifications mn
			INNER JOIN messages m ON mn.message_id = m.message_id
			INNER JOIN conversations c ON m.conversation_id = c.conversation_id
			LEFT JOIN blocked_users b ON b.user_id_blocked = m.sender_user_id AND b.user_id_blocking = $1
			WHERE
				mn.user_id = $1
				AND mn.read = FALSE
				AND b.user_id_blocked IS NULL
			`,
			[req.session.user_id],
		)

		req.results.conversations.push(...conversations_result.rows)
		req.results.total_unread = Number(total_unread_result.rows[0].total_unread)
		req.results.path = "/conversations"
	}
}