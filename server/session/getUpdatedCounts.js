module.exports = async (req, res) => {
	if (
		!res.writableEnded &&
		req.body.min_create_date_for_counts &&
		req.body.min_counts_create_date
	) {
		if (req.body.has_topics) {
			const topic_counts = await req.client.query(
				`
        SELECT
          t.post_id as topic_id,
          t.favorite_count,
          t.poll_counts,
          t.comment_count
        FROM posts t
        LEFT JOIN flagged_posts l ON l.post_id = t.post_id
        LEFT JOIN blocked_users b ON b.user_id_blocked = t.user_id AND b.user_id_blocking = $1
        WHERE
          t.create_date > $2
          AND t.counts_max_create_date > $3
          AND l.post_id IS NULL
          AND b.user_id_blocked IS NULL
        `,
				[
					req.session.user_id || 0,
					req.body.min_create_date_for_counts,
					req.body.min_counts_create_date,
				],
			)
			req.results.topic_counts = topic_counts.rows
		}
		if (req.body.has_comments) {
			const comment_counts = await req.client.query(
				`
        SELECT
          c.reply_id,
          c.favorite_count
        FROM replies c
          LEFT JOIN flagged_replies l ON l.reply_id = c.reply_id
          LEFT JOIN blocked_users b ON b.user_id_blocked = c.user_id AND b.user_id_blocking = $1
        WHERE
          c.create_date > $2
          AND c.counts_max_create_date > $3
          AND l.reply_id IS NULL
          AND b.user_id_blocked IS NULL
        `,
				[
					req.session.user_id || 0,
					req.body.min_create_date_for_counts,
					req.body.min_counts_create_date,
				],
			)
			req.results.comment_counts = comment_counts.rows
		}
	}
}
