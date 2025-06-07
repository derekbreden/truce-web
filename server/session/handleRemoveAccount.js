const crypto = require("node:crypto")
const { DeleteObjectCommand, S3Client } = require("@aws-sdk/client-s3")
const object_client = new S3Client({
	region: "us-east-1",
})

module.exports = async (req, res) => {
	if (!res.writableEnded && req.session.user_id && req.body.remove_account) {
		// Delete images
		const images = await req.client.query(
			`
      SELECT image_uuids
      FROM replies
      WHERE user_id = $1
      UNION
      SELECT image_uuids
      FROM posts
      WHERE user_id = $1
      `,
			[req.session.user_id],
		)
		for (const existing_image of images.rows) {
			for (const image_uuid of existing_image.image_uuids.split(",")) {
				try {
					await object_client.send(
						new DeleteObjectCommand({
							Bucket: "truce.net",
							Key: `${image_uuid}.png`,
						}),
					)
				} catch (err) {
					console.error(err)
				}
			}
		}
		const profile_image = await req.client.query(
			`
      SELECT profile_picture_uuid
      FROM users
      WHERE user_id = $1
      `,
			[req.session.user_id],
		)
		if (profile_image.rows[0].profile_picture_uuid) {
			try {
				await object_client.send(
					new DeleteObjectCommand({
						Bucket: "truce.net",
						Key: `${profile_image.rows[0].profile_picture_uuid}.png`,
					}),
				)
			} catch (err) {
				console.error(err)
			}
		}

		// Delete comment ancestors
		await req.client.query(
			`
      DELETE FROM reply_ancestors
      WHERE reply_id IN (
        SELECT reply_id
        FROM replies
        WHERE user_id = $1
      )
      `,
			[req.session.user_id],
		)

		// Delete favorites
		await req.client.query(
			`
      DELETE FROM favorite_posts WHERE user_id = $1
      `,
			[req.session.user_id],
		)
		await req.client.query(
			`
      DELETE FROM favorite_replies WHERE user_id = $1
      `,
			[req.session.user_id],
		)
		await req.client.query(
			`
      DELETE FROM blocked_users WHERE user_id_blocking = $1 OR user_id_blocked = $1
      `,
			[req.session.user_id],
		)

		// Delete polls
		await req.client.query(
			`
      DELETE FROM post_poll_votes
      WHERE post_id IN (
        SELECT post_id
        FROM posts
        WHERE user_id = $1
      )
      `,
			[req.session.user_id],
		)
		await req.client.query(
			`
      DELETE FROM post_poll_votes
      WHERE user_id = $1
      `,
			[req.session.user_id],
		)
		await req.client.query(
			`
      DELETE FROM subscribers
      WHERE user_id = $1
      OR subscribed_to_user_id = $1
      `,
			[req.session.user_id],
		)

		// Sessions
		await req.client.query(
			`
      DELETE FROM sessions WHERE session_id IN (
        SELECT session_id
        FROM user_sessions
        WHERE user_id = $1
      )
      `,
			[req.session.user_id],
		)
		await req.client.query(
			`
      DELETE FROM user_sessions WHERE user_id = $1
      `,
			[req.session.user_id],
		)

		// Comments / Topics / User
		await req.client.query(
			`
      DELETE FROM replies WHERE user_id = $1
      `,
			[req.session.user_id],
		)
		await req.client.query(
			`
      DELETE FROM posts WHERE user_id = $1
      `,
			[req.session.user_id],
		)
		await req.client.query(
			`
      DELETE FROM users WHERE user_id = $1
      `,
			[req.session.user_id],
		)

		// Update favorite and comment count columns on comments and topics
		await req.client.query(
			`
      UPDATE replies
      SET
        favorite_count = COALESCE(fav_counts.favorite_count, 0),
        counts_max_create_date = NOW()
      FROM (
        SELECT
          c.reply_id,
          COUNT(fc.reply_id) AS favorite_count
        FROM replies c
        LEFT JOIN favorite_replies fc ON c.reply_id = fc.reply_id
        GROUP BY c.reply_id
      ) AS fav_counts
      WHERE replies.reply_id = fav_counts.reply_id
      `,
		)
		await req.client.query(
			`
      UPDATE posts
      SET
        favorite_count = COALESCE(fav_counts.favorite_count, 0),
        counts_max_create_date = NOW()
      FROM (
        SELECT
          t.post_id,
          COUNT(ft.post_id) AS favorite_count
        FROM posts t
        LEFT JOIN favorite_posts ft ON t.post_id = ft.post_id
        GROUP BY t.post_id
      ) AS fav_counts
      WHERE posts.post_id = fav_counts.post_id
      `,
		)
		await req.client.query(
			`
      UPDATE posts
      SET
        comment_count = COALESCE(comment_counts.comment_count, 0),
        counts_max_create_date = NOW()
      FROM (
        SELECT
          t.post_id,
          SUM(
            CASE
              WHEN l.reply_id IS NULL AND c.reply_id IS NOT NULL
                THEN 1
              ELSE 0
            END
          ) AS comment_count
        FROM posts t
        LEFT JOIN replies c ON t.post_id = c.parent_post_id
        LEFT JOIN flagged_replies l ON l.reply_id = c.reply_id
        GROUP BY t.post_id
      ) AS comment_counts
      WHERE posts.post_id = comment_counts.post_id
      `,
		)

		// Also sign out
		req.session.session_uuid = crypto.randomUUID()
		const insert_session = await req.client.query(
			`
      INSERT INTO sessions (session_uuid)
      VALUES ($1) returning session_id
      `,
			[req.session.session_uuid],
		)
		req.session.session_id = insert_session.rows[0].session_id

		// Set the cookie like a sane person
		res.setHeader(
			"Set-Cookie",
			`session_uuid=${req.session.session_uuid}; HttpOnly; Secure; Path=/session; Max-Age=315360000`,
		)

		// Respond success
		res.end(
			JSON.stringify({
				success: true,
				session_uuid: req.session.session_uuid,
			}),
		)
	}
}
