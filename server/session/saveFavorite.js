module.exports = async (req, res) => {
	if (
		!res.writableEnded
		&& req.session.user_id
		&& (req.body.post_id_to_favorite || req.body.reply_id_to_favorite)
	) {
		// Remove the favorite
		if (req.body.was_favorited) {
			// For post_id
			if (req.body.post_id_to_favorite) {
				await req.client.query(
					`
          DELETE FROM favorite_posts
          WHERE
            user_id = $1
            AND post_id = $2
          `,
					[req.session.user_id, req.body.post_id_to_favorite],
				)
				await req.client.query(
					`
          UPDATE posts
          SET
            favorite_count = COALESCE(subquery.favorite_count, 0),
            counts_max_create_date = NOW()
          FROM (
            SELECT
              COUNT(f.*) AS favorite_count
            FROM favorite_posts f
            LEFT JOIN flagged_posts l ON l.post_id = f.post_id
            WHERE f.post_id = $1
          ) AS subquery
          WHERE posts.post_id = $1
          `,
					[req.body.post_id_to_favorite],
				)
			}

			// For reply_id
			if (req.body.reply_id_to_favorite) {
				await req.client.query(
					`
          DELETE FROM favorite_replies
          WHERE
            user_id = $1
            AND reply_id = $2
          `,
					[req.session.user_id, req.body.reply_id_to_favorite],
				)
				await req.client.query(
					`
          UPDATE replies
          SET
            favorite_count = COALESCE(subquery.favorite_count, 0),
            counts_max_create_date = NOW()
          FROM (
            SELECT
              COUNT(f.*) AS favorite_count
            FROM favorite_replies f
            LEFT JOIN flagged_replies l ON l.reply_id = f.reply_id
            WHERE f.reply_id = $1
          ) AS subquery
          WHERE replies.reply_id = $1
          `,
					[req.body.reply_id_to_favorite],
				)
			}

			// Add the favorite
		} else {
			// For post_id
			if (req.body.post_id_to_favorite) {
				await req.client.query(
					`
          INSERT INTO favorite_posts
          (user_id, post_id)
          VALUES
          ($1, $2)
          `,
					[req.session.user_id, req.body.post_id_to_favorite],
				)
				await req.client.query(
					`
          UPDATE posts
          SET
            favorite_count = COALESCE(subquery.favorite_count, 0),
            counts_max_create_date = NOW()
          FROM (
            SELECT
              COUNT(f.*) AS favorite_count
            FROM favorite_posts f
            LEFT JOIN flagged_posts l ON l.post_id = f.post_id
            WHERE f.post_id = $1
          ) AS subquery
          WHERE posts.post_id = $1
          `,
					[req.body.post_id_to_favorite],
				)
			}

			// For reply_id
			if (req.body.reply_id_to_favorite) {
				await req.client.query(
					`
          INSERT INTO favorite_replies
          (user_id, reply_id)
          VALUES
          ($1, $2)
          `,
					[req.session.user_id, req.body.reply_id_to_favorite],
				)
				await req.client.query(
					`
          UPDATE replies
          SET
            favorite_count = COALESCE(subquery.favorite_count, 0),
            counts_max_create_date = NOW()
          FROM (
            SELECT
              COUNT(f.*) AS favorite_count
            FROM favorite_replies f
            LEFT JOIN flagged_replies l ON l.reply_id = f.reply_id
            WHERE f.reply_id = $1
          ) AS subquery
          WHERE replies.reply_id = $1
          `,
					[req.body.reply_id_to_favorite],
				)
			}
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
