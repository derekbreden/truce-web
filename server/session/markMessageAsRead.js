module.exports = async (req, res) => {
	if (
		!res.writableEnded
		&& req.session.user_id
		&& req.body.message_id
	) {
		// Mark the specific message notification as read
		await req.client.query(
			`
			UPDATE message_notifications
			SET read = TRUE
			WHERE
				user_id = $1
				AND message_id = $2
			`,
			[req.session.user_id, req.body.message_id],
		)

		// Get conversation ID and calculate new unread count for WebSocket update
		const message_info = await req.client.query(
			`
			SELECT m.conversation_id
			FROM messages m
			WHERE m.message_id = $1
			`,
			[req.body.message_id]
		)

		if (message_info.rows.length > 0) {
			const conversation_id = message_info.rows[0].conversation_id

			// Count remaining unread messages for this user in this conversation
			const unread_count_result = await req.client.query(
				`
				SELECT COUNT(*) as unread_count
				FROM message_notifications mn
				INNER JOIN messages m ON mn.message_id = m.message_id
				WHERE mn.user_id = $1 
					AND m.conversation_id = $2 
					AND mn.read = FALSE
				`,
				[req.session.user_id, conversation_id]
			)

			const new_unread_count = Number(unread_count_result.rows[0].unread_count)

			// Send WebSocket update to notify other users of read status change
			require("../websocket").sendReadStatusUpdate(
				conversation_id,
				req.session.user_id,
				new_unread_count
			)
		}

		res.end(
			JSON.stringify({
				success: true,
			}),
		)
	}
}