module.exports = async (req, res) => {
	if (!res.writableEnded && req.body.path === "/topics") {
		req.results.path = req.body.path
		const topics = await req.client.query(
			`
      SELECT
        ts.topic_name,
        ts.subtitle,
        COUNT(tt.topic_id) AS posts
      FROM
        topics ts
        LEFT JOIN post_topics tt ON ts.topic_id = tt.topic_id
      GROUP BY
        ts.topic_id,
        ts.topic_name,
        ts.subtitle
      ORDER BY ts.topic_id ASC
      `,
		)
		req.results.topics = topics.rows
	}

	if (
		!res.writableEnded &&
		req.body.path &&
		req.body.path.substr(0, 7) === "/topic/"
	) {
		const topic = await req.client.query(
			`
      SELECT
        ts.topic_name,
        ts.subtitle
      FROM
        topics ts
      WHERE
        ts.topic_name = $1
      `,
			[req.body.path.substr(7)],
		)
		req.results.topic = topic.rows[0] || {}
	}
}
