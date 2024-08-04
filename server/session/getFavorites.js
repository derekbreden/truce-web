module.exports = async (req, res) => {
  if (
    !res.writableEnded &&
    req.body.path === "/favorites" &&
    req.session.user_id
  ) {
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
          fc.user_id as favorite_user_id,
          fc.create_date as favorite_create_date,
          CASE WHEN c.user_id = $1 THEN true ELSE false END AS edit,
          STRING_AGG(DISTINCT i.image_uuid, ',') as image_uuids,
          FALSE as commented,
          'comment' AS type
        FROM comments c
        INNER JOIN favorite_comments fc ON c.comment_id = fc.comment_id
        LEFT JOIN comment_images i ON c.comment_id = i.comment_id
        LEFT JOIN flagged_comments l ON l.comment_id = c.comment_id
        LEFT JOIN blocked_users b ON b.user_id_blocked = c.user_id AND b.user_id_blocking = $1
        WHERE
          l.comment_id IS NULL
          AND b.user_id_blocked IS NULL
        GROUP BY
          c.comment_id,
          c.create_date,
          c.body,
          c.note,
          c.favorite_count,
          c.counts_max_create_date,
          c.user_id,
          c.parent_comment_id,
          c.parent_topic_id,
          fc.user_id,
          fc.create_date,
          CASE WHEN c.user_id = $1 THEN true ELSE false END
        UNION
        SELECT
          t.topic_id AS id,
          t.create_date,
          t.title,
          LEFT(t.body, 1000) as body,
          t.note,
          t.slug,
          t.favorite_count,
          t.comment_count,
          t.counts_max_create_date,
          t.user_id,
          NULL as parent_comment_id,
          NULL as parent_topic_id,
          ft.user_id as favorite_user_id,
          ft.create_date as favorite_create_date,
          CASE WHEN t.user_id = $1 THEN true ELSE false END AS edit,
          STRING_AGG(DISTINCT i.image_uuid, ',') as image_uuids,
          CASE WHEN MAX(c.user_id) IS NOT NULL THEN TRUE ELSE FALSE END as commented,
          'topic' AS type
        FROM topics t
        INNER JOIN favorite_topics ft ON t.topic_id = ft.topic_id
        LEFT JOIN topic_images i ON t.topic_id = i.topic_id
        LEFT JOIN comments c ON c.parent_topic_id = t.topic_id AND c.user_id = $1
        LEFT JOIN flagged_topics l ON l.topic_id = t.topic_id
        LEFT JOIN blocked_users b ON b.user_id_blocked = t.user_id AND b.user_id_blocking = $1
        WHERE
          l.topic_id IS NULL
          AND b.user_id_blocked IS NULL
        GROUP BY
          t.topic_id,
          t.create_date,
          t.title,
          LEFT(t.body, 1000),
          t.note,
          t.slug,
          t.favorite_count,
          t.comment_count,
          t.counts_max_create_date,
          t.user_id,
          ft.user_id,
          ft.create_date,
          CASE WHEN t.user_id = $1 THEN true ELSE false END
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
        TRUE as favorited,
        combined.commented,
        combined.favorite_create_date,
        u.display_name,
        u.display_name_index,
        pt.title AS parent_topic_title,
        pt.slug AS parent_topic_slug,
        pc.body AS parent_comment_body,
        pc.note AS parent_comment_note,
        pcu.display_name AS parent_comment_display_name,
        pcu.display_name_index AS parent_comment_display_name_index
      FROM combined
      LEFT JOIN users u ON combined.user_id = u.user_id
      LEFT JOIN topics pt ON combined.parent_topic_id = pt.topic_id
      LEFT JOIN users pu ON pt.user_id = pu.user_id
      LEFT JOIN comments pc ON combined.parent_comment_id = pc.comment_id
      LEFT JOIN users pcu ON pc.user_id = pcu.user_id
      LEFT JOIN flagged_comments l ON l.comment_id = pc.comment_id
      LEFT JOIN blocked_users b ON b.user_id_blocked = pc.user_id AND b.user_id_blocking = $1
      WHERE
        combined.favorite_user_id = $1
        AND (combined.favorite_create_date < $2 OR $2 IS NULL)
        AND (combined.favorite_create_date > $3 OR $3 IS NULL)
        AND l.comment_id IS NULL
        AND b.user_id_blocked IS NULL
      ORDER BY combined.favorite_create_date DESC
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
