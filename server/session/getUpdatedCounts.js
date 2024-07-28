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
        topic_id,
        favorite_count,
        comment_count
      FROM topics
      WHERE
        create_date > $1
        AND counts_max_create_date > $2
      `,
        [req.body.min_create_date_for_counts, req.body.min_counts_create_date],
      );
      req.results.topic_counts = topic_counts.rows;
    }
    if (req.body.has_comments) {
      const comment_counts = await req.client.query(
        `
      SELECT
        comment_id,
        favorite_count
      FROM comments
      WHERE
        create_date > $1
        AND counts_max_create_date > $2
      `,
        [req.body.min_create_date_for_counts, req.body.min_counts_create_date],
      );
      req.results.comment_counts = comment_counts.rows;
    }
  }
};
