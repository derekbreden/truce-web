module.exports = async (req, res) => {
	if (
		!res.writableEnded &&
		req.body.path &&
		(req.body.path.substr(0, 9) === "/reply/" || req.body.path.substr(0, 7) === "/reply/")
	) {
		const reply_id = req.body.path.substr(0, 9) === "/reply/" ? req.body.path.substr(9) : req.body.path.substr(7)
		const reply_results = await req.client.query(
			`
      WITH root_reply AS (
        SELECT reply_id
        FROM replies
        WHERE
          parent_reply_id IS NULL
          AND reply_id IN (
            SELECT ancestor_id AS reply_id
            FROM reply_ancestors
            WHERE reply_id = $1
            UNION
            SELECT $1 as reply_id
          )
      )
      SELECT
        c.create_date,
        c.reply_id,
        c.body,
        c.note,
        c.favorite_count,
        c.parent_reply_id,
        u.user_id,
        u.display_name,
        u.display_name_index,
        CASE WHEN (u.slug = '' OR u.slug IS NULL) THEN u.user_id::VARCHAR ELSE u.slug END as user_slug,
        u.profile_picture_uuid,
        CASE WHEN u.email <> '' AND u.email IS NOT NULL THEN true ELSE false END AS user_verified,
        CASE WHEN c.user_id = $2 THEN true ELSE false END AS edit,
        c.image_uuids,
        CASE WHEN f.user_id IS NOT NULL THEN TRUE ELSE FALSE END as favorited
      FROM replies c
      INNER JOIN users u ON c.user_id = u.user_id
      LEFT JOIN favorite_replies f ON f.reply_id = c.reply_id AND f.user_id = $2
      LEFT JOIN flagged_replies l ON l.reply_id = c.reply_id
      LEFT JOIN blocked_users b ON b.user_id_blocked = c.user_id AND b.user_id_blocking = $2
      WHERE
        (
          c.reply_id IN (
            SELECT reply_id FROM root_reply
          ) OR c.reply_id IN (
            SELECT reply_id
            FROM reply_ancestors
            WHERE ancestor_id IN (
              SELECT reply_id FROM root_reply
            )
          )
        ) AND (
          c.create_date > $3 OR $3 IS NULL
        )
        AND l.reply_id IS NULL
        AND b.user_id_blocked IS NULL
      ORDER BY c.create_date ASC
      `,
			[
				reply_id,
				req.session.user_id || 0,
				req.body.min_reply_create_date || null,
			],
		)
		if (reply_results.rows.length) {
			const topic_result = await req.client.query(
				`
        SELECT t.title, t.slug
        FROM posts t
        LEFT JOIN flagged_posts l ON l.post_id = t.post_id
        LEFT JOIN blocked_users b ON b.user_id_blocked = t.user_id AND b.user_id_blocking = $1
        WHERE t.post_id IN (
          SELECT parent_post_id
          FROM replies
          WHERE reply_id = $2
        )
        AND l.post_id IS NULL
        AND b.user_id_blocked IS NULL
        `,
				[req.session.user_id || 0, reply_id],
			)
			req.results.parent_topic = {
				title: topic_result.rows[0].title,
				slug: topic_result.rows[0].slug,
			}
			req.results.path = `/reply/${reply_id}`
			req.results.replies.push(...reply_results.rows)
		}

		// We set path there to ensure the path goes to a default if there are no results
		// But, now that we are checking for most recent, the path is also good if a min_reply_create_date was passed
		if (req.body.min_reply_create_date) {
			req.results.path = `/reply/${reply_id}`
		}
	}
}
