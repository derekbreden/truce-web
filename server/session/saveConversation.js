module.exports = async (req, res) => {
	if (
		!res.writableEnded
		&& req.session.user_id
		&& req.body.other_user_id
	) {

		// Check if conversation already exists between these participants
		const existing_conversation = await req.client.query(
			`
			SELECT c.conversation_id
			FROM conversations c
			WHERE c.conversation_id IN (
				SELECT conversation_id
				FROM conversation_users
				WHERE user_id = $1
				OR user_id = $2
				GROUP BY conversation_id
				HAVING COUNT(DISTINCT user_id) = 2
			)
			`,
			[req.session.user_id, req.body.other_user_id],
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
		await req.client.query(
			`
			INSERT INTO conversation_users (conversation_id, user_id)
			VALUES ($1, $2), ($1, $3);
			`,
			[conversation_id, req.body.other_user_id, req.session.user_id],
		)

		res.end(
			JSON.stringify({
				success: true,
				conversation_id: conversation_id,
				existing: false,
			}),
		)
	}
}