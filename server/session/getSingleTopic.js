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
          u.user_id,
          u.display_name,
          CASE WHEN u.display_name = '' THEN u.user_id ELSE u.display_name_index END as display_name_index,
          CASE WHEN (u.slug = '' OR u.slug IS NULL) THEN u.user_id::VARCHAR ELSE u.slug END as user_slug,
          u.profile_picture_uuid,
          CASE WHEN u.email <> '' AND u.email IS NOT NULL THEN true ELSE false END AS user_verified,
          t.slug,
          t.body,
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
          CASE WHEN v.user_id IS NOT NULL THEN TRUE ELSE FALSE END as voted,
          (
            SELECT STRING_AGG(ts.tag_name, ',')
            FROM topic_tags tt
            INNER JOIN tags ts ON ts.tag_id = tt.tag_id
            WHERE tt.topic_id = t.topic_id
          ) as tags
        FROM topics t
        LEFT JOIN users u ON u.user_id = t.user_id
        LEFT JOIN favorite_topics f ON f.topic_id = t.topic_id AND f.user_id = $1
        LEFT JOIN poll_votes v ON v.topic_id = t.topic_id AND v.user_id = $1
        LEFT JOIN flagged_topics l ON l.topic_id = t.topic_id
        LEFT JOIN blocked_users b ON b.user_id_blocked = t.user_id AND b.user_id_blocking = $1
        WHERE
          t.slug = $2
          AND (t.create_date > $3 OR $3 IS NULL)
          AND l.topic_id IS NULL
          AND b.user_id_blocked IS NULL
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
          u.user_id,
          u.display_name,
          u.display_name_index,
          CASE WHEN (u.slug = '' OR u.slug IS NULL) THEN u.user_id::VARCHAR ELSE u.slug END as user_slug,
          u.profile_picture_uuid,
          CASE WHEN u.email <> '' AND u.email IS NOT NULL THEN true ELSE false END AS user_verified,
          CASE WHEN c.user_id = $1 THEN true ELSE false END AS edit,
          c.image_uuids,
          CASE WHEN f.user_id IS NOT NULL THEN TRUE ELSE FALSE END as favorited
        FROM comments c
        INNER JOIN users u ON c.user_id = u.user_id
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
          u.user_id,
          u.display_name,
          u.display_name_index,
          CASE WHEN (u.slug = '' OR u.slug IS NULL) THEN u.user_id::VARCHAR ELSE u.slug END as user_slug,
          u.profile_picture_uuid,
          CASE WHEN u.email <> '' AND u.email IS NOT NULL THEN true ELSE false END AS user_verified,
          CASE WHEN c.user_id = $1 THEN true ELSE false END AS edit,
          c.image_uuids,
          CASE WHEN f.user_id IS NOT NULL THEN TRUE ELSE FALSE END as favorited
        FROM comments c
        INNER JOIN users u ON c.user_id = u.user_id
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
