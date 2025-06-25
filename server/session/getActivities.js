module.exports = async (req, res) => {
	if (
		!res.writableEnded
		&& ((req.body.path === "/favorites" && req.session.user_id)
			|| (req.body.path?.startsWith("/user/")
				&& (req.body.path?.split("/")[3] === "replies" || req.body.path?.split("/")[3] === "replies")))
	) {
		req.results.path = req.body.path
		const activity_results = await req.client.query(
			`
      WITH combined AS (
        SELECT 
          c.reply_id AS id,
          c.create_date,
          NULL AS title,
          c.body,
          NULL as poll_1,
          NULL as poll_2,
          NULL as poll_3,
          NULL as poll_4,
          NULL as poll_counts,
          NULL as poll_counts_estimated,
          c.note,
          NULL as slug,
          c.favorite_count,
          NULL as reply_count,
          c.counts_max_create_date,
          c.user_id,
          c.parent_reply_id,
          c.parent_post_id,
          CASE WHEN fc.user_id IS NOT NULL THEN TRUE ELSE FALSE END as favorited,
          fc.create_date as favorite_create_date,
          CASE WHEN c.user_id = $1 THEN true ELSE false END AS edit,
          c.image_uuids,
          FALSE as replyed,
          FALSE as voted,
          'reply' AS type,
          '' AS topics
        FROM replies c
        LEFT JOIN favorite_replies fc ON c.reply_id = fc.reply_id AND fc.user_id = $1
        LEFT JOIN flagged_replies l ON l.reply_id = c.reply_id
        LEFT JOIN blocked_users b ON b.user_id_blocked = c.user_id AND b.user_id_blocking = $1
        WHERE
          l.reply_id IS NULL
          AND b.user_id_blocked IS NULL
        UNION
        SELECT
          t.post_id AS id,
          t.create_date,
          t.title,
          LEFT(t.body, 1000) as body,
          t.poll_1,
          t.poll_2,
          t.poll_3,
          t.poll_4,
          t.poll_counts,
          t.poll_counts_estimated,
          t.note,
          t.slug,
          t.favorite_count,
          t.reply_count,
          t.counts_max_create_date,
          t.user_id,
          NULL as parent_reply_id,
          NULL as parent_post_id,
          CASE WHEN ft.user_id IS NOT NULL THEN TRUE ELSE FALSE END as favorited,
          ft.create_date as favorite_create_date,
          CASE WHEN t.user_id = $1 THEN true ELSE false END AS edit,
          t.image_uuids,
          CASE WHEN EXISTS (
            SELECT 1
            FROM replies c
            WHERE c.parent_post_id = t.post_id
              AND c.user_id = $1
          ) THEN TRUE ELSE FALSE END as replyed,
          CASE WHEN v.user_id IS NOT NULL THEN TRUE ELSE FALSE END as voted,
          'post' AS type,
          (
            SELECT STRING_AGG(ts.topic_name, ',')
            FROM post_topics tt
            INNER JOIN topics ts ON ts.topic_id = tt.topic_id
            WHERE tt.post_id = t.post_id
          ) as topics
        FROM posts t
        LEFT JOIN favorite_posts ft ON t.post_id = ft.post_id AND ft.user_id = $1
        LEFT JOIN post_poll_votes v ON v.post_id = t.post_id AND v.user_id = $1
        LEFT JOIN flagged_posts l ON l.post_id = t.post_id
        LEFT JOIN blocked_users b ON b.user_id_blocked = t.user_id AND b.user_id_blocking = $1
        WHERE
          l.post_id IS NULL
          AND b.user_id_blocked IS NULL
      )
      SELECT 
        combined.id,
        combined.create_date,
        combined.title,
        combined.body,
        combined.poll_1,
        combined.poll_2,
        combined.poll_3,
        combined.poll_4,
        combined.poll_counts,
        combined.poll_counts_estimated,
        combined.note,
        combined.slug,
        combined.favorite_count,
        combined.reply_count,
        combined.counts_max_create_date,
        combined.type,
        combined.edit,
        combined.image_uuids,
        TRUE as favorited,
        combined.replyed,
        combined.voted,
        combined.favorite_create_date,
        u.user_id,
        u.display_name,
        CASE WHEN u.display_name = '' THEN u.user_id ELSE u.display_name_index END as display_name_index,
        CASE WHEN (u.slug = '' OR u.slug IS NULL) THEN u.user_id::VARCHAR ELSE u.slug END as user_slug,
        u.profile_picture_uuid,
        CASE WHEN u.email <> '' AND u.email IS NOT NULL THEN true ELSE false END AS user_verified,
        pt.title AS parent_post_title,
        pt.slug AS parent_post_slug,
        pc.reply_id AS parent_reply_id,
        pc.body AS parent_reply_body,
        pc.note AS parent_reply_note,
        pcu.display_name AS parent_reply_display_name,
        pcu.display_name_index AS parent_reply_display_name_index,
        CASE WHEN pcu.slug = '' THEN pcu.user_id::VARCHAR ELSE pcu.slug END as parent_reply_user_slug,
        pcu.profile_picture_uuid AS parent_reply_profile_picture_uuid,
        CASE WHEN pcf.user_id IS NOT NULL THEN TRUE ELSE FALSE END as parent_reply_favorited,
        combined.topics,
        combined.favorited
      FROM combined
      LEFT JOIN users u ON combined.user_id = u.user_id
      LEFT JOIN posts pt ON combined.parent_post_id = pt.post_id
      LEFT JOIN users pu ON pt.user_id = pu.user_id
      LEFT JOIN replies pc ON combined.parent_reply_id = pc.reply_id
      LEFT JOIN users pcu ON pc.user_id = pcu.user_id
      LEFT JOIN favorite_replies pcf ON combined.id = pcf.reply_id AND pcf.user_id = $1
      LEFT JOIN flagged_replies l ON l.reply_id = pc.reply_id
      LEFT JOIN blocked_users b ON b.user_id_blocked = pc.user_id AND b.user_id_blocking = $1
      WHERE
        l.reply_id IS NULL
        AND b.user_id_blocked IS NULL
        ${
	req.body.path === "/favorites"
		? `
              AND combined.favorited = TRUE
              AND (combined.favorite_create_date < $2 OR $2 IS NULL)
              AND (combined.favorite_create_date > $3 OR $3 IS NULL)
              ORDER BY combined.favorite_create_date DESC
            `
		: ``
}
        ${
	req.body.path.startsWith("/user/")
					&& req.body.path.split("/")[3] === "replies"
		? `
              AND combined.type = 'reply'
              AND (combined.create_date < $2 OR $2 IS NULL)
              AND (combined.create_date > $3 OR $3 IS NULL)

              AND ${Number(req.body.path.split("/")[2]) ? `u.user_id = $4` : `u.slug = $4`}
              ORDER BY combined.create_date DESC
            `
		: ``
}
      LIMIT 30
      `,
			[
				req.session.user_id || 0,
				req.body.max_create_date ? new Date(req.body.max_create_date) : null,
				req.body.min_create_date ? new Date(req.body.min_create_date) : null,
				req.body.path.startsWith("/user/")
					? req.body.path.split("/")[2]
					: undefined,
			].filter((x) => x !== undefined),
		)
		req.results.activities.push(...activity_results.rows)
	}
}
