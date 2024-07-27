module.exports = async (req, res) => {
  if (!res.writableEnded && req.body.path === "/topics") {
    if (!req.body.max_comment_create_date) {
      const topic_results = await req.client.query(
        `
        SELECT
          a.create_date,
          a.topic_id,
          a.title,
          a.slug,
          LEFT(a.body, 1000) as body,
          a.note,
          a.comment_count,
          a.comment_count_max_create_date,
          CASE WHEN a.user_id = $1 THEN true ELSE false END AS edit,
          STRING_AGG(DISTINCT i.image_uuid, ',') as image_uuids
        FROM topics a
        LEFT JOIN topic_images i ON a.topic_id = i.topic_id
        WHERE
          (a.create_date > $2 OR $2 IS NULL)
          AND (a.create_date < $3 OR $3 IS NULL)
        GROUP BY
          a.create_date,
          a.topic_id,
          a.title,
          a.slug,
          LEFT(a.body, 1000),
          a.note,
          a.comment_count,
          a.comment_count_max_create_date,
          CASE WHEN a.user_id = $1 THEN true ELSE false END
        ORDER BY a.create_date DESC
        LIMIT 20
        `,
        [
          req.session.user_id || 0,
          req.body.min_topic_create_date || null,
          req.body.max_topic_create_date || null,
        ],
      );
      req.results.topics.push(...topic_results.rows);
    }
  
    // Get updated comment counts when requested
    if (
      req.body.min_topic_create_date_for_comment_count
      && req.body.min_comment_count_create_date
    ) {
      const topic_comment_counts = await req.client.query(
        `
        SELECT
          topic_id,
          comment_count
        FROM topics
        WHERE
          create_date > $1
          AND comment_count_max_create_date > $2
        `,
        [req.body.min_topic_create_date_for_comment_count, req.body.min_comment_count_create_date ]
      );
      req.results.topic_comment_counts = topic_comment_counts.rows;
    }
  }
};
