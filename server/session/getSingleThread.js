module.exports = async (req, res) => {
  if (
    !res.writableEnded &&
    req.body.path &&
    req.body.path.substr(0, 8) === "/comment"
  ) {
    const comment_id = req.body.path.substr(9);
    const comment_results = await req.client.query(
      `
      WITH root_comment AS (
        SELECT comment_id
        FROM comments
        WHERE
          parent_comment_id IS NULL
          AND comment_id IN (
            SELECT ancestor_id AS comment_id
            FROM comment_ancestors
            WHERE comment_id = $1
            UNION
            SELECT $1 as comment_id
          )
      )
      SELECT
        c.create_date,
        c.comment_id,
        c.body,
        c.note,
        c.favorite_count,
        c.parent_comment_id,
        u.display_name,
        u.display_name_index,
        CASE WHEN c.user_id = $2 THEN true ELSE false END AS edit,
        STRING_AGG(i.image_uuid, ',') AS image_uuids,
        CASE WHEN MAX(f.user_id) IS NOT NULL THEN TRUE ELSE FALSE END as favorited
      FROM comments c
      INNER JOIN users u ON c.user_id = u.user_id
      LEFT JOIN comment_images i ON c.comment_id = i.comment_id
      LEFT JOIN favorite_comments f ON f.comment_id = c.comment_id AND f.user_id = $2
      WHERE
        (
          c.comment_id IN (
            SELECT comment_id FROM root_comment
          ) OR c.comment_id IN (
            SELECT comment_id
            FROM comment_ancestors
            WHERE ancestor_id IN (
              SELECT comment_id FROM root_comment
            )
          )
        ) AND (
          c.create_date > $3 OR $3 IS NULL
        )
      GROUP BY
        c.create_date,
        c.comment_id,
        c.body,
        c.note,
        c.favorite_count,
        c.parent_comment_id,
        u.display_name,
        u.display_name_index,
        CASE WHEN c.user_id = $2 THEN true ELSE false END
      ORDER BY c.create_date ASC
      `,
      [
        comment_id,
        req.session.user_id || 0,
        req.body.min_comment_create_date || null,
      ],
    );
    if (comment_results.rows.length) {
      const topic_result = await req.client.query(
        `
        SELECT title, slug
        FROM topics
        WHERE topic_id IN (
          SELECT parent_topic_id
          FROM comments
          WHERE comment_id = $1
        )
        `,
        [comment_id],
      );
      req.results.parent_topic = {
        title: topic_result.rows[0].title,
        slug: topic_result.rows[0].slug,
      };
      req.results.path = `/comment/${comment_id}`;
      req.results.comments.push(...comment_results.rows);
    }

    // We set path there to ensure the path goes to a default if there are no results
    // But, now that we are checking for most recent, the path is also good if a min_comment_create_date was passed
    if (req.body.min_comment_create_date) {
      req.results.path = `/comment/${comment_id}`;
    }
  }
};
