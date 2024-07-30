module.exports = async (req, res) => {
  if (
    !res.writableEnded &&
    req.session.user_id &&
    (req.body.topic_id_to_block || req.body.comment_id_to_block)
  ) {
    let user_id_blocked = 0;
    // For topic_id
    if (req.body.topic_id_to_block) {
      const topic_result = await req.client.query(
        `
        SELECT user_id FROM topics WHERE topic_id = $1;
        `,
        [req.body.topic_id_to_block],
      );
      if (topic_result.rows.length > 0) {
        user_id_blocked = topic_result.rows[0].user_id;
      }
    }
    // For comment_id
    if (req.body.comment_id_to_block) {
      const comment_result = await req.client.query(
        `
        SELECT user_id FROM comments WHERE comment_id = $1;
        `,
        [req.body.comment_id_to_block],
      );
      if (comment_result.rows.length > 0) {
        user_id_blocked = comment_result.rows[0].user_id;
      }
    }
    await req.client.query(
      `
      INSERT INTO blocked_users
      (user_id_blocked, user_id_blocking)
      VALUES
      ($1, $2)
      `,
      [ user_id_blocked, req.session.user_id ],
    );
    res.end(
      JSON.stringify({
        success: true,
        user_id: req.session.user_id,
        display_name: req.session.display_name,
      }),
    );
  }
};

