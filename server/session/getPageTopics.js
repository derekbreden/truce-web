module.exports = async (req, res) => {
  if (!res.writableEnded && req.body.path === "/topics") {
    if (!req.body.max_comment_create_date) {
      const topic_results = await req.client.query(
        `
        SELECT
          t.create_date,
          t.topic_id,
          t.title,
          t.slug,
          LEFT(t.body, 1000) as body,
          t.note,
          t.favorite_count,
          t.comment_count,
          t.counts_max_create_date,
          CASE WHEN t.user_id = $1 THEN true ELSE false END AS edit,
          STRING_AGG(DISTINCT i.image_uuid, ',') as image_uuids,
          CASE WHEN MAX(f.user_id) IS NOT NULL THEN TRUE ELSE FALSE END as favorited,
          CASE WHEN MAX(c.user_id) IS NOT NULL THEN TRUE ELSE FALSE END as commented
        FROM topics t
        LEFT JOIN topic_images i ON t.topic_id = i.topic_id
        LEFT JOIN favorite_topics f ON f.topic_id = t.topic_id AND f.user_id = $1
        LEFT JOIN comments c ON c.parent_topic_id = t.topic_id AND c.user_id = $1
        LEFT JOIN flagged_topics l ON l.topic_id = t.topic_id
        LEFT JOIN blocked_users b ON b.user_id_blocked = t.user_id AND b.user_id_blocking = $1
        WHERE
          (t.create_date > $2 OR $2 IS NULL)
          AND (t.create_date < $3 OR $3 IS NULL)
          AND l.topic_id IS NULL
          AND b.user_id_blocked IS NULL
        GROUP BY
          t.create_date,
          t.topic_id,
          t.title,
          t.slug,
          LEFT(t.body, 1000),
          t.note,
          t.favorite_count,
          t.comment_count,
          t.counts_max_create_date,
          CASE WHEN t.user_id = $1 THEN true ELSE false END
        ORDER BY t.create_date DESC
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
  }
};
