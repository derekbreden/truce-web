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
          a.favorite_count,
          a.comment_count,
          a.counts_max_create_date,
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
          a.favorite_count,
          a.comment_count,
          a.counts_max_create_date,
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
  
    // Get updated counts when requested
    if (
      req.body.min_create_date_for_counts
      && req.body.min_counts_create_date
    ) {
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
        [req.body.min_create_date_for_counts, req.body.min_counts_create_date ]
      );
      req.results.topic_counts = topic_counts.rows;
    }
  }
};
