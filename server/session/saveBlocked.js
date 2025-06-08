module.exports = async (req, res) => {
	if (
		!res.writableEnded &&
		req.session.user_id &&
		(req.body.post_id_to_block || req.body.reply_id_to_block)
	) {
		let user_id_blocked = 0
		// For post_id
		if (req.body.post_id_to_block) {
			const post_result = await req.client.query(
				`
        SELECT user_id FROM posts WHERE post_id = $1
        `,
				[req.body.post_id_to_block],
			)
			if (post_result.rows.length > 0) {
				user_id_blocked = post_result.rows[0].user_id
			}
		}
		// For reply_id
		if (req.body.reply_id_to_block) {
			const reply_result = await req.client.query(
				`
        SELECT user_id FROM replies WHERE reply_id = $1
        `,
				[req.body.reply_id_to_block],
			)
			if (reply_result.rows.length > 0) {
				user_id_blocked = reply_result.rows[0].user_id
			}
		}
		await req.client.query(
			`
      INSERT INTO blocked_users
      (user_id_blocked, user_id_blocking)
      VALUES
      ($1, $2)
      `,
			[user_id_blocked, req.session.user_id],
		)
		res.end(
			JSON.stringify({
				success: true,
				user_id: req.session.user_id,
				display_name: req.session.display_name,
			}),
		)
	}
}
