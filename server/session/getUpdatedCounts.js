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
        t.topic_id,
        t.favorite_count,
        t.comment_count
      FROM topics t
      LEFT JOIN flagged_topics l ON l.topic_id = t.topic_id
      LEFT JOIN blocked_users b ON b.user_id_blocked = t.user_id AND b.user_id_blocking = $1
      WHERE
        t.create_date > $2
        AND t.counts_max_create_date > $3
        AND l.topic_id IS NULL
        AND b.user_id_blocked IS NULL
      `,
        [req.session.user_id || 0, req.body.min_create_date_for_counts, req.body.min_counts_create_date],
      );
      req.results.topic_counts = topic_counts.rows;
    }
    if (req.body.has_comments) {
      const comment_counts = await req.client.query(
        `
      SELECT
        c.comment_id,
        c.favorite_count
      FROM comments c
        LEFT JOIN flagged_comments l ON l.comment_id = c.comment_id
        LEFT JOIN blocked_users b ON b.user_id_blocked = c.user_id AND b.user_id_blocking = $1
      WHERE
        c.create_date > $2
        AND c.counts_max_create_date > $3
        AND l.comment_id IS NULL
        AND b.user_id_blocked IS NULL
      `,
        [req.session.user_id || 0, req.body.min_create_date_for_counts, req.body.min_counts_create_date],
      );
      req.results.comment_counts = comment_counts.rows;
    }
  }
};
