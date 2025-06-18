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


		res.end(
			JSON.stringify({
				success: true,
			}),
		)
	}
}