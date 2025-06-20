module.exports = async (req, res) => {
	if (
		!res.writableEnded
		&& req.session.user_id
		&& req.body.participant_user_ids
		&& Array.isArray(req.body.participant_user_ids)
	) {
		// Ensure current user is included in participants
		const all_participant_ids = [...new Set([req.session.user_id, ...req.body.participant_user_ids])]
		
		// Validate all participants exist and none are blocked
		const participants_check = await req.client.query(
			`
			SELECT user_id
			FROM users
			WHERE user_id = ANY($1)
			`,
			[all_participant_ids],
		)

		if (participants_check.rows.length !== all_participant_ids.length) {
			res.end(
				JSON.stringify({
					error: "One or more participants not found",
				}),
			)
			return
		}

		// Check for blocked relationships
		const other_user_ids = all_participant_ids.filter(id => id !== req.session.user_id)
		const blocked_check = await req.client.query(
			`
			SELECT user_id_blocked
			FROM blocked_users
			WHERE 
				(user_id_blocking = $1 AND user_id_blocked = ANY($2))
				OR (user_id_blocked = $1 AND user_id_blocking = ANY($2))
			`,
			[req.session.user_id, other_user_ids],
		)

		if (blocked_check.rows.length > 0) {
			res.end(
				JSON.stringify({
					error: "Cannot create conversation with blocked user",
				}),
			)
			return
		}

		// Check if conversation already exists between these participants
		const existing_conversation = await req.client.query(
			`
			SELECT c.conversation_id
			FROM conversations c
			WHERE c.conversation_id IN (
				SELECT conversation_id
				FROM conversation_users
				WHERE user_id = ANY($1)
				GROUP BY conversation_id
				HAVING COUNT(DISTINCT user_id) = $2 AND COUNT(DISTINCT user_id) = (
					SELECT COUNT(*)
					FROM conversation_users cp2
					WHERE cp2.conversation_id = conversation_id
				)
			)
			`,
			[all_participant_ids, all_participant_ids.length],
		)

		if (existing_conversation.rows.length > 0) {
			res.end(
				JSON.stringify({
					success: true,
					conversation_id: existing_conversation.rows[0].conversation_id,
					existing: true,
				}),
			)
			return
		}

		// Create new conversation
		const conversation_result = await req.client.query(
			`
			INSERT INTO conversations DEFAULT VALUES
			RETURNING conversation_id
			`,
		)

		// Insert participants
		const conversation_id = conversation_result.rows[0].conversation_id
		for (const user_id of all_participant_ids) {
			await req.client.query(
				`
				INSERT INTO conversation_users (conversation_id, user_id)
				VALUES ($1, $2)
				`,
				[conversation_id, user_id],
			)
		}

		res.end(
			JSON.stringify({
				success: true,
				conversation_id: conversation_id,
				existing: false,
			}),
		)
	}
}