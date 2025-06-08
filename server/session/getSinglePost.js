module.exports = async (req, res) => {
	if (
		!res.writableEnded &&
		req.body.path &&
		req.body.path.startsWith("/post/")
	) {
		const slug = req.body.path.split("/")[2]
		let post_id = ""

		if (!req.body.max_reply_create_date) {
			const post_results = await req.client.query(
				`
        SELECT
          p.create_date,
          p.post_id as post_id,
          p.title,
          u.user_id,
          u.display_name,
          CASE WHEN u.display_name = '' THEN u.user_id ELSE u.display_name_index END as display_name_index,
          CASE WHEN (u.slug = '' OR u.slug IS NULL) THEN u.user_id::VARCHAR ELSE u.slug END as user_slug,
          u.profile_picture_uuid,
          CASE WHEN u.email <> '' AND u.email IS NOT NULL THEN true ELSE false END AS user_verified,
          p.slug,
          p.body,
          p.poll_1,
          p.poll_2,
          p.poll_3,
          p.poll_4,
          p.poll_counts,
          p.poll_counts_estimated,
          p.note,
          p.favorite_count,
          p.reply_count,
          p.counts_max_create_date,
          CASE WHEN p.user_id = $1 THEN true ELSE false END AS edit,
          p.image_uuids,
          CASE WHEN f.user_id IS NOT NULL THEN TRUE ELSE FALSE END as favorited,
          CASE WHEN EXISTS (
            SELECT 1
            FROM replies r
            WHERE r.parent_post_id = p.post_id
              AND r.user_id = $1
          ) THEN TRUE ELSE FALSE END as replyed,
          CASE WHEN v.user_id IS NOT NULL THEN TRUE ELSE FALSE END as voted,
          (
            SELECT STRING_AGG(ts.topic_name, ',')
            FROM post_topics pt
            INNER JOIN topics ts ON ts.topic_id = pt.topic_id
            WHERE pt.post_id = p.post_id
          ) as topics
        FROM posts p
        LEFT JOIN users u ON u.user_id = p.user_id
        LEFT JOIN favorite_posts f ON f.post_id = p.post_id AND f.user_id = $1
        LEFT JOIN post_poll_votes v ON v.post_id = p.post_id AND v.user_id = $1
        LEFT JOIN flagged_posts l ON l.post_id = p.post_id
        LEFT JOIN blocked_users b ON b.user_id_blocked = p.user_id AND b.user_id_blocking = $1
        WHERE
          p.slug = $2
          AND (p.create_date > $3 OR $3 IS NULL)
          AND l.post_id IS NULL
          AND b.user_id_blocked IS NULL
        `,
				[
					req.session.user_id || 0,
					slug,
					req.body.min_post_create_date ? new Date(req.body.min_post_create_date) : null,
				],
			)
			req.results.posts.push(...post_results.rows)
			// We set path here to ensure the path goes to a default if there are no results
			if (post_results.rows.length) {
				req.results.path = `/post/${slug}`
				post_id = post_results.rows[0].post_id
			}
		}

		// Also get the post_id if the post was not updated
		if (!post_id) {
			const post_id_result = await req.client.query(
				`
        SELECT p.post_id as post_id
        FROM posts p
        LEFT JOIN flagged_posts l ON l.post_id = p.post_id
        LEFT JOIN blocked_users b ON b.user_id_blocked = p.user_id AND b.user_id_blocking = $1
        WHERE p.slug = $2 AND l.post_id IS NULL AND b.user_id_blocked IS NULL
        `,
				[req.session.user_id || 0, slug],
			)
			if (post_id_result.rows.length) {
				req.results.path = `/post/${slug}`
				post_id = post_id_result.rows[0].post_id
			}
		}

		// Get the replies
		if (post_id) {
			const root_replies = await req.client.query(
				`
        SELECT
          r.create_date,
          r.reply_id as reply_id,
          r.body,
          r.note,
          r.parent_reply_id as parent_reply_id,
          r.favorite_count,
          r.counts_max_create_date,
          u.user_id,
          u.display_name,
          u.display_name_index,
          CASE WHEN (u.slug = '' OR u.slug IS NULL) THEN u.user_id::VARCHAR ELSE u.slug END as user_slug,
          u.profile_picture_uuid,
          CASE WHEN u.email <> '' AND u.email IS NOT NULL THEN true ELSE false END AS user_verified,
          CASE WHEN r.user_id = $1 THEN true ELSE false END AS edit,
          r.image_uuids,
          CASE WHEN f.user_id IS NOT NULL THEN TRUE ELSE FALSE END as favorited
        FROM replies r
        INNER JOIN users u ON r.user_id = u.user_id
        LEFT JOIN favorite_replies f ON f.reply_id = r.reply_id AND f.user_id = $1
        LEFT JOIN flagged_replies l ON l.reply_id = r.reply_id
        LEFT JOIN blocked_users b ON b.user_id_blocked = r.user_id AND b.user_id_blocking = $1
        WHERE
          r.parent_post_id = $2
          AND r.parent_reply_id IS NULL
          AND (r.create_date > $3 OR $3 IS NULL)
          AND (r.create_date < $4 OR $4 IS NULL)
          AND l.reply_id IS NULL
          AND b.user_id_blocked IS NULL
        ORDER BY r.create_date DESC
        LIMIT 10
        `,
				[
					req.session.user_id || 0,
					post_id,
					req.body.min_reply_create_date ? new Date(req.body.min_reply_create_date) : null,
					req.body.max_reply_create_date ? new Date(req.body.max_reply_create_date) : null,
				],
			)
			const reply_replies = await req.client.query(
				`
        SELECT
          r.create_date,
          r.reply_id as reply_id,
          r.body,
          r.note,
          r.parent_reply_id as parent_reply_id,
          r.favorite_count,
          r.counts_max_create_date,
          u.user_id,
          u.display_name,
          u.display_name_index,
          CASE WHEN (u.slug = '' OR u.slug IS NULL) THEN u.user_id::VARCHAR ELSE u.slug END as user_slug,
          u.profile_picture_uuid,
          CASE WHEN u.email <> '' AND u.email IS NOT NULL THEN true ELSE false END AS user_verified,
          CASE WHEN r.user_id = $1 THEN true ELSE false END AS edit,
          r.image_uuids,
          CASE WHEN f.user_id IS NOT NULL THEN TRUE ELSE FALSE END as favorited
        FROM replies r
        INNER JOIN users u ON r.user_id = u.user_id
        LEFT JOIN favorite_replies f ON f.reply_id = r.reply_id AND f.user_id = $1
        LEFT JOIN flagged_replies l ON l.reply_id = r.reply_id
        LEFT JOIN blocked_users b ON b.user_id_blocked = r.user_id AND b.user_id_blocking = $1
        WHERE
          r.parent_post_id = $2
          AND (
            r.reply_id IN (
              SELECT reply_id
              FROM reply_ancestors
              WHERE ancestor_reply_id = ANY($3::int[])
            )
            OR (
              r.create_date > $4 AND $4 IS NOT NULL
              AND r.parent_reply_id IS NOT NULL
            )
          )
          AND l.reply_id IS NULL
          AND b.user_id_blocked IS NULL
        ORDER BY r.create_date ASC
        LIMIT 10
        `,
				[
					req.session.user_id || 0,
					post_id,
					root_replies.rows.map((c) => c.reply_id),
					req.body.min_reply_create_date ? new Date(req.body.min_reply_create_date) : null,
				],
			)
			req.results.replies.push(...root_replies.rows)
			req.results.replies.push(...reply_replies.rows)
		}
	}
}
