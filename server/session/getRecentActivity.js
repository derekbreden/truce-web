module.exports = async (req, res) => {
  if (!res.writableEnded && req.body.path === "/recent") {
    req.results.path = req.body.path;
    const activity_results = await req.client.query(
      `
      WITH combined AS (
        SELECT 
          c.comment_id AS id,
          c.create_date,
          NULL AS title,
          c.body,
          c.note,
          NULL as slug,
          c.favorite_count,
          NULL as comment_count,
          c.counts_max_create_date,
          c.user_id,
          c.parent_comment_id,
          c.parent_topic_id,
          CASE WHEN c.user_id = $1 THEN true ELSE false END AS edit,
          c.image_uuids,
          CASE WHEN f.user_id IS NOT NULL THEN TRUE ELSE FALSE END as favorited,
          'comment' AS type
        FROM comments c
        LEFT JOIN favorite_comments f ON f.comment_id = c.comment_id AND f.user_id = $1
        LEFT JOIN flagged_comments l ON l.comment_id = c.comment_id
        LEFT JOIN blocked_users b ON b.user_id_blocked = c.user_id AND b.user_id_blocking = $1
        WHERE
          l.comment_id IS NULL
          AND b.user_id_blocked IS NULL
      )
      SELECT 
        combined.id,
        combined.create_date,
        combined.title,
        combined.body,
        combined.note,
        combined.slug,
        combined.favorite_count,
        combined.comment_count,
        combined.counts_max_create_date,
        combined.type,
        combined.edit,
        combined.image_uuids,
        combined.favorited,
        u.display_name,
        u.display_name_index,
        u.profile_picture_uuid,
        pa.title AS parent_topic_title,
        pa.slug AS parent_topic_slug,
        pc.comment_id AS parent_comment_id,
        pc.body AS parent_comment_body,
        pc.note AS parent_comment_note,
        pcu.display_name AS parent_comment_display_name,
        pcu.display_name_index AS parent_comment_display_name_index,
        pcu.profile_picture_uuid AS parent_comment_profile_picture_uuid
      FROM combined
      LEFT JOIN users u ON combined.user_id = u.user_id
      LEFT JOIN topics pa ON combined.parent_topic_id = pa.topic_id
      LEFT JOIN users pu ON pa.user_id = pu.user_id
      LEFT JOIN comments pc ON combined.parent_comment_id = pc.comment_id
      LEFT JOIN users pcu ON pc.user_id = pcu.user_id
      LEFT JOIN flagged_comments l ON l.comment_id = pc.comment_id
      LEFT JOIN blocked_users b ON b.user_id_blocked = pc.user_id AND b.user_id_blocking = $1
      WHERE
        (combined.create_date < $2 OR $2 IS NULL)
        AND (combined.create_date > $3 OR $3 IS NULL)
        AND l.comment_id IS NULL
        AND b.user_id_blocked IS NULL
      ORDER BY combined.create_date DESC
      LIMIT 30;
      `,
      [
        req.session.user_id || 0,
        req.body.max_create_date || null,
        req.body.min_create_date || null,
      ],
    );
    req.results.activities.push(...activity_results.rows);
  }
};
