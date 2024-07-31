module.exports = async (req, res) => {
  if (
    !res.writableEnded &&
    req.body.path &&
    req.body.path.substr(0, 7) === "/topic/"
  ) {
    const slug = req.body.path.substr(7);
    let topic_id = "";

    if (!req.body.max_comment_create_date) {
      const topic_results = await req.client.query(
        `
        SELECT
          t.create_date,
          t.topic_id,
          t.title,
          t.slug,
          t.body,
          t.note,
          t.favorite_count,
          t.comment_count,
          t.counts_max_create_date,
          CASE WHEN t.user_id = $1 THEN true ELSE false END AS edit,
          STRING_AGG(DISTINCT i.image_uuid, ',') AS image_uuids,
          CASE WHEN MAX(f.user_id) IS NOT NULL THEN TRUE ELSE FALSE END as favorited,
          CASE WHEN MAX(c.user_id) IS NOT NULL THEN TRUE ELSE FALSE END as commented
        FROM topics t
        LEFT JOIN topic_images i ON t.topic_id = i.topic_id
        LEFT JOIN favorite_topics f ON f.topic_id = t.topic_id AND f.user_id = $1
        LEFT JOIN comments c ON c.parent_topic_id = t.topic_id AND c.user_id = $1
        LEFT JOIN flagged_topics l ON l.topic_id = t.topic_id
        LEFT JOIN blocked_users b ON b.user_id_blocked = t.user_id AND b.user_id_blocking = $1
        WHERE
          t.slug = $2
          AND (t.create_date > $3 OR $3 IS NULL)
          AND l.topic_id IS NULL
          AND b.user_id_blocked IS NULL
        GROUP BY
          t.create_date,
          t.topic_id,
          t.title,
          t.slug,
          t.body,
          t.favorite_count,
          t.comment_count,
          t.counts_max_create_date,
          CASE WHEN t.user_id = $1 THEN true ELSE false END
        `,
        [
          req.session.user_id || 0,
          slug,
          req.body.min_topic_create_date || null,
        ],
      );
      req.results.topics.push(...topic_results.rows);
      // We set path here to ensure the path goes to a default if there are no results
      if (topic_results.rows.length) {
        req.results.path = `/topic/${slug}`;
        topic_id = topic_results.rows[0].topic_id;
      }
    }

    // Also get the topic_id if the topic was not updated
    if (!topic_id) {
      const topic_id_result = await req.client.query(
        `
        SELECT t.topic_id
        FROM topics t
        LEFT JOIN flagged_topics l ON l.topic_id = t.topic_id
        LEFT JOIN blocked_users b ON b.user_id_blocked = t.user_id AND b.user_id_blocking = $1
        WHERE t.slug = $2 AND l.topic_id IS NULL AND b.user_id_blocked IS NULL
        `,
        [req.session.user_id || 0, slug],
      );
      if (topic_id_result.rows.length) {
        req.results.path = `/topic/${slug}`;
        topic_id = topic_id_result.rows[0].topic_id;
      }
    }

    // Get the comments
    if (topic_id) {
      const root_comments = await req.client.query(
        `
        SELECT
          c.create_date,
          c.comment_id,
          c.body,
          c.note,
          c.parent_comment_id,
          c.favorite_count,
          c.counts_max_create_date,
          u.display_name,
          u.display_name_index,
          CASE WHEN c.user_id = $1 THEN true ELSE false END AS edit,
          STRING_AGG(DISTINCT i.image_uuid, ',') AS image_uuids,
          CASE WHEN MAX(f.user_id) IS NOT NULL THEN TRUE ELSE FALSE END as favorited
        FROM comments c
        INNER JOIN users u ON c.user_id = u.user_id
        LEFT JOIN comment_images i ON c.comment_id = i.comment_id
        LEFT JOIN favorite_comments f ON f.comment_id = c.comment_id AND f.user_id = $1
        LEFT JOIN flagged_comments l ON l.comment_id = c.comment_id
        LEFT JOIN blocked_users b ON b.user_id_blocked = c.user_id AND b.user_id_blocking = $1
        WHERE
          c.parent_topic_id = $2
          AND c.parent_comment_id IS NULL
          AND (c.create_date > $3 OR $3 IS NULL)
          AND (c.create_date < $4 OR $4 IS NULL)
          AND l.comment_id IS NULL
          AND b.user_id_blocked IS NULL
        GROUP BY
          c.create_date,
          c.comment_id,
          c.body,
          c.note,
          c.parent_comment_id,
          c.favorite_count,
          c.counts_max_create_date,
          u.display_name,
          u.display_name_index
        ORDER BY c.create_date DESC
        LIMIT 10
        `,
        [
          req.session.user_id || 0,
          topic_id,
          req.body.min_comment_create_date || null,
          req.body.max_comment_create_date || null,
        ],
      );
      const reply_comments = await req.client.query(
        `
        SELECT
          c.create_date,
          c.comment_id,
          c.body,
          c.note,
          c.parent_comment_id,
          c.favorite_count,
          c.counts_max_create_date,
          u.display_name,
          u.display_name_index,
          CASE WHEN c.user_id = $1 THEN true ELSE false END AS edit,
          STRING_AGG(DISTINCT i.image_uuid, ',') AS image_uuids,
          CASE WHEN MAX(f.user_id) IS NOT NULL THEN TRUE ELSE FALSE END as favorited
        FROM comments c
        INNER JOIN users u ON c.user_id = u.user_id
        LEFT JOIN comment_images i ON c.comment_id = i.comment_id
        LEFT JOIN favorite_comments f ON f.comment_id = c.comment_id AND f.user_id = $1
        LEFT JOIN flagged_comments l ON l.comment_id = c.comment_id
        LEFT JOIN blocked_users b ON b.user_id_blocked = c.user_id AND b.user_id_blocking = $1
        WHERE
          c.parent_topic_id = $2
          AND (
            c.comment_id IN (
              SELECT comment_id
              FROM comment_ancestors
              WHERE ancestor_id = ANY($3::int[])
            )
            OR (
              c.create_date > $4 AND $4 IS NOT NULL
              AND c.parent_comment_id IS NOT NULL
            )
          )
          AND l.comment_id IS NULL
          AND b.user_id_blocked IS NULL
        GROUP BY
          c.create_date,
          c.comment_id,
          c.body,
          c.note,
          c.parent_comment_id,
          c.favorite_count,
          c.counts_max_create_date,
          u.display_name,
          u.display_name_index
        ORDER BY c.create_date ASC
        LIMIT 10
        `,
        [
          req.session.user_id || 0,
          topic_id,
          root_comments.rows.map((c) => c.comment_id),
          req.body.min_comment_create_date || null,
        ],
      );
      req.results.comments.push(...root_comments.rows);
      req.results.comments.push(...reply_comments.rows);
    }
  }
};
