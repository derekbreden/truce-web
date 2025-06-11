module.exports = async (req, res) => {
	if (
		!res.writableEnded
		&& req.session.user_id
		&& req.body.post_id
		&& req.body.poll_choice
	) {
		// Save new vote
		await req.client.query(
			`
      INSERT INTO post_poll_votes
      (post_id, user_id, poll_choice)
      VALUES
      ($1, $2, $3)
      `,
			[req.body.post_id, req.session.user_id, req.body.poll_choice],
		)

		// Get counts for this post_id
		const poll_counts_query = await req.client.query(
			`
      SELECT
        poll_choice,
        count(*) as count
      FROM
        post_poll_votes
      WHERE
        post_id = $1
      GROUP BY
        poll_choice
      `,
			[req.body.post_id],
		)
		const poll_counts = [0, 0, 0, 0]
		for (const row of poll_counts_query.rows) {
			poll_counts[row.poll_choice - 1] = row.count
		}

		// Update post
		await req.client.query(
			`
      UPDATE posts
      SET
        poll_counts = $1,
        counts_max_create_date = NOW()
      WHERE
        post_id = $2
      `,
			[poll_counts.join(","), req.body.post_id],
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
