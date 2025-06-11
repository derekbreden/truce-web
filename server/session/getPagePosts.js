module.exports = async (req, res) => {
	if (
		!res.writableEnded
		&& (req.body.path === "/posts"
			|| req.body.path === "/posts/all"
			|| req.body.path?.startsWith("/topic/")
			|| req.body.path?.startsWith("/user/"))
	) {
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
          LEFT(p.body, 1000) as body,
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
          (p.create_date > $2 OR $2 IS NULL)
          AND (p.create_date < $3 OR $3 IS NULL)
          AND l.post_id IS NULL
          AND b.user_id_blocked IS NULL
          ${
						req.body.path.startsWith("/topic/")
							? `
                AND p.post_id IN (
                  SELECT post_id
                  FROM post_topics
                  WHERE topic_id = (
                    SELECT topic_id
                    FROM topics
                    WHERE topic_name = $4
                  )
                )
                `
							: ""
					}
          ${
						req.body.path.startsWith("/user/")
							? `
                AND p.user_id IN (
                  SELECT user_id
                  FROM users
                  WHERE 
                    ${
											Number(req.body.path.split("/")[2])
												? `user_id = $4`
												: `slug = $4`
										}
                )
                `
							: ""
					}
          ${
						(req.body.path === "/posts" || req.body.path === "/posts")
						&& Number(req.session.subscribed_to_users) > 0
							? `
                AND p.user_id IN (
                  SELECT subscribed_to_user_id
                  FROM subscribers
                  WHERE user_id = $1
                )
                `
							: ""
					}
        ORDER BY p.create_date DESC
        LIMIT 20
        `,
				[
					req.session.user_id || 0,
					req.body.min_post_create_date ? new Date(req.body.min_post_create_date) : null,
					req.body.max_post_create_date ? new Date(req.body.max_post_create_date) : null,
					req.body.path.startsWith("/topic/")
						? req.body.path.split("/")[2]
						: req.body.path.startsWith("/user/")
							? req.body.path.split("/")[2]
							: undefined,
				].filter((x) => x !== undefined),
			)
			req.results.path = req.body.path
			req.results.posts.push(...post_results.rows)
		}
	}
}
