module.exports = async (req, res) => {
  if (
    !res.writableEnded &&
    req.session.user_id &&
    (req.body.topic_id_to_flag || req.body.comment_id_to_flag)
  ) {
    // For topic_id
    if (req.body.topic_id_to_flag) {
      await req.client.query(
        `
        INSERT INTO flagged_topics
        (user_id, topic_id)
        VALUES
        ($1, $2)
        `,
        [req.session.user_id, req.body.topic_id_to_flag],
      );
    }
    // For comment_id
    if (req.body.comment_id_to_flag) {
      await req.client.query(
        `
        INSERT INTO flagged_comments
        (user_id, comment_id)
        VALUES
        ($1, $2)
        `,
        [req.session.user_id, req.body.comment_id_to_flag],
      );
      await req.client.query(
        `
        UPDATE topics
        SET
          comment_count = COALESCE(subquery.comment_count, 0),
          counts_max_create_date = NOW()
        FROM (
          SELECT
            COUNT(c.*) AS comment_count
          FROM comments c
          LEFT JOIN flagged_comments l ON l.comment_id = c.comment_id
          WHERE
            c.parent_topic_id IN (
              SELECT parent_topic_id FROM comments WHERE comment_id = $1
            )
            AND l.comment_id IS NULL
        ) AS subquery
        WHERE topics.topic_id IN (
          SELECT parent_topic_id FROM comments WHERE comment_id = $1
        )
        `,
        [req.body.comment_id_to_flag],
      );
    }
    res.end(
      JSON.stringify({
        success: true,
        user_id: req.session.user_id,
        display_name: req.session.display_name,
      }),
    );
  }
};
