module.exports = async (req, res) => {
	if (
		!res.writableEnded &&
		req.session.session_id &&
		!req.session.user_id &&
		(req.body.display_name ||
			req.body.title ||
			req.body.post_id_to_favorite ||
			req.body.reply_id_to_favorite ||
			req.body.post_id_to_block ||
			req.body.reply_id_to_block ||
			req.body.post_id_to_flag ||
			req.body.reply_id_to_flag ||
			(req.body.post_id && req.body.poll_choice) ||
			req.body.subscribe_to_user_id)
	) {
		const user_inserted = await req.client.query(
			`
      INSERT INTO users
        (email, display_name)
      VALUES
        ($1, $2)
      RETURNING user_id
      `,
			["", ""],
		)
		await req.client.query(
			`
      INSERT INTO user_sessions
        (user_id, session_id)
      VALUES
        ($1, $2)
      `,
			[user_inserted.rows[0].user_id, req.session.session_id],
		)
		req.session.user_id = user_inserted.rows[0].user_id
		req.session.user_slug = user_inserted.rows[0].user_id
		req.session.subscribed_to_users = "0"
	}
}
