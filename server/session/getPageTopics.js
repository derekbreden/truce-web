module.exports = async (req, res) => {
  if (
    !res.writableEnded &&
    (req.body.path === "/topics" || (req.body.path === "/topics_from_favorites" && req.session.user_id))
  ) {
    if (!req.body.max_comment_create_date) {
      const topic_results = await req.client.query(
        `
        SELECT
          t.create_date,
          t.topic_id,
          t.title,
          t.slug,
          LEFT(t.body, 1000) as body,
          t.poll_1,
          t.poll_2,
          t.poll_3,
          t.poll_4,
          t.poll_counts,
          t.poll_counts_estimated,
          t.note,
          t.favorite_count,
          t.comment_count,
          t.counts_max_create_date,
          CASE WHEN t.user_id = $1 THEN true ELSE false END AS edit,
          t.image_uuids,
          CASE WHEN f.user_id IS NOT NULL THEN TRUE ELSE FALSE END as favorited,
          CASE WHEN EXISTS (
            SELECT 1
            FROM comments c
            WHERE c.parent_topic_id = t.topic_id
              AND c.user_id = $1
          ) THEN TRUE ELSE FALSE END as commented,
          CASE WHEN v.user_id IS NOT NULL THEN TRUE ELSE FALSE END as voted
        FROM topics t
        LEFT JOIN favorite_topics f ON f.topic_id = t.topic_id AND f.user_id = $1
        LEFT JOIN poll_votes v ON v.topic_id = t.topic_id AND v.user_id = $1
        LEFT JOIN flagged_topics l ON l.topic_id = t.topic_id
        LEFT JOIN blocked_users b ON b.user_id_blocked = t.user_id AND b.user_id_blocking = $1
        WHERE
          (t.create_date > $2 OR $2 IS NULL)
          AND (t.create_date < $3 OR $3 IS NULL)
          AND l.topic_id IS NULL
          AND b.user_id_blocked IS NULL
          ${
            (req.body.path === "/topics_from_favorites" && req.session.user_id)
              ? `
                AND t.user_id IN (
                  SELECT t.user_id
                  FROM topics t
                  INNER JOIN favorite_topics f ON f.topic_id = t.topic_id AND f.user_id = $1
                  UNION
                  SELECT c.user_id
                  FROM comments c
                  INNER JOIN favorite_comments f ON f.comment_id = c.comment_id AND f.user_id = $1
                )
                `
              : ""
          }
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
