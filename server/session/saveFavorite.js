module.exports = async (req, res) => {
  if (
    !res.writableEnded &&
    req.session.user_id &&
    (req.body.topic_id_to_favorite || req.body.comment_id_to_favorite)
  ) {
    // Remove the favorite
    if (req.body.was_favorited) {
      // For topic_id
      if (req.body.topic_id_to_favorite) {
        await req.client.query(
          `
          DELETE FROM favorite_topics
          WHERE
            user_id = $1
            AND topic_id = $2
          `,
          [req.session.user_id, req.body.topic_id_to_favorite],
        );
        await req.client.query(
          `
          UPDATE topics
          SET
            favorite_count = COALESCE(subquery.favorite_count, 0),
            counts_max_create_date = NOW()
          FROM (
            SELECT
              COUNT(*) AS favorite_count
            FROM favorite_topics
            WHERE topic_id = $1
          ) AS subquery
          WHERE topics.topic_id = $1
          `,
          [req.body.topic_id_to_favorite],
        );
      }

      // For comment_id
      if (req.body.comment_id_to_favorite) {
        await req.client.query(
          `
          DELETE FROM favorite_comments
          WHERE
            user_id = $1
            AND comment_id = $2
          `,
          [req.session.user_id, req.body.comment_id_to_favorite],
        );
        await req.client.query(
          `
          UPDATE comments
          SET
            favorite_count = COALESCE(subquery.favorite_count, 0),
            counts_max_create_date = NOW()
          FROM (
            SELECT
              COUNT(*) AS favorite_count
            FROM favorite_comments
            WHERE comment_id = $1
          ) AS subquery
          WHERE comments.comment_id = $1
          `,
          [req.body.comment_id_to_favorite],
        );
      }

      // Add the favorite
    } else {
      // For topic_id
      if (req.body.topic_id_to_favorite) {
        await req.client.query(
          `
          INSERT INTO favorite_topics
          (user_id, topic_id)
          VALUES
          ($1, $2)
          `,
          [req.session.user_id, req.body.topic_id_to_favorite],
        );
        await req.client.query(
          `
          UPDATE topics
          SET
            favorite_count = COALESCE(subquery.favorite_count, 0),
            counts_max_create_date = NOW()
          FROM (
            SELECT
              COUNT(*) AS favorite_count
            FROM favorite_topics
            WHERE topic_id = $1
          ) AS subquery
          WHERE topics.topic_id = $1
          `,
          [req.body.topic_id_to_favorite],
        );
      }

      // For comment_id
      if (req.body.comment_id_to_favorite) {
        await req.client.query(
          `
          INSERT INTO favorite_comments
          (user_id, comment_id)
          VALUES
          ($1, $2)
          `,
          [req.session.user_id, req.body.comment_id_to_favorite],
        );
        await req.client.query(
          `
          UPDATE comments
          SET
            favorite_count = COALESCE(subquery.favorite_count, 0),
            counts_max_create_date = NOW()
          FROM (
            SELECT
              COUNT(*) AS favorite_count
            FROM favorite_comments
            WHERE comment_id = $1
          ) AS subquery
          WHERE comments.comment_id = $1
          `,
          [req.body.comment_id_to_favorite],
        );
      }
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

