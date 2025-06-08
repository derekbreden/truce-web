module.exports = async (req, res) => {
	if (
		!res.writableEnded &&
		req.session.user_id &&
		(req.body.topic_id_to_flag || req.body.reply_id_to_flag)
	) {
		// For post_id
		if (req.body.topic_id_to_flag) {
			await req.client.query(
				`
        INSERT INTO flagged_posts
        (user_id, post_id)
        VALUES
        ($1, $2)
        `,
				[req.session.user_id, req.body.topic_id_to_flag],
			)
		}
		// For reply_id
		if (req.body.reply_id_to_flag) {
			await req.client.query(
				`
        INSERT INTO flagged_replies
        (user_id, reply_id)
        VALUES
        ($1, $2)
        `,
				[req.session.user_id, req.body.reply_id_to_flag],
			)
			await req.client.query(
				`
        UPDATE posts
        SET
          reply_count = COALESCE(subquery.reply_count, 0),
          counts_max_create_date = NOW()
        FROM (
          SELECT
            COUNT(c.*) AS reply_count
          FROM replies c
          LEFT JOIN flagged_replies l ON l.reply_id = c.reply_id
          WHERE
            c.parent_post_id IN (
              SELECT parent_post_id FROM replies WHERE reply_id = $1
            )
            AND l.reply_id IS NULL
        ) AS subquery
        WHERE posts.post_id IN (
          SELECT parent_post_id FROM replies WHERE reply_id = $1
        )
        `,
				[req.body.reply_id_to_flag],
			)
		}
		res.end(
			JSON.stringify({
				success: true,
				user_id: req.session.user_id,
				display_name: req.session.display_name,
			}),
		)
	}
}
