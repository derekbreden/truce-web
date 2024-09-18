module.exports = async (req, res) => {
  if (
    !res.writableEnded &&
    ((req.body.path === "/favorites" && req.session.user_id) ||
      (req.body.path?.substr(0, 6) === "/user/" &&
        req.body.path?.split("/")[3] === "comments"))
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
          NULL as poll_1,
          NULL as poll_2,
          NULL as poll_3,
          NULL as poll_4,
          NULL as poll_counts,
          NULL as poll_counts_estimated,
          c.note,
          NULL as slug,
          c.favorite_count,
          NULL as comment_count,
          c.counts_max_create_date,
          c.user_id,
          c.parent_comment_id,
          c.parent_topic_id,
          CASE WHEN fc.user_id IS NOT NULL THEN TRUE ELSE FALSE END as favorited,
          fc.create_date as favorite_create_date,
          CASE WHEN c.user_id = $1 THEN true ELSE false END AS edit,
          c.image_uuids,
          FALSE as commented,
          FALSE as voted,
          'comment' AS type,
          '' AS tags
        FROM comments c
        LEFT JOIN favorite_comments fc ON c.comment_id = fc.comment_id AND fc.user_id = $1
        LEFT JOIN flagged_comments l ON l.comment_id = c.comment_id
        LEFT JOIN blocked_users b ON b.user_id_blocked = c.user_id AND b.user_id_blocking = $1
        WHERE
          l.comment_id IS NULL
          AND b.user_id_blocked IS NULL
        UNION
        SELECT
          t.topic_id AS id,
          t.create_date,
          t.title,
          LEFT(t.body, 1000) as body,
          t.poll_1,
          t.poll_2,
          t.poll_3,
          t.poll_4,
          t.poll_counts,
          t.poll_counts_estimated,
          t.note,
          t.slug,
          t.favorite_count,
          t.comment_count,
          t.counts_max_create_date,
          t.user_id,
          NULL as parent_comment_id,
          NULL as parent_topic_id,
          CASE WHEN ft.user_id IS NOT NULL THEN TRUE ELSE FALSE END as favorited,
          ft.create_date as favorite_create_date,
          CASE WHEN t.user_id = $1 THEN true ELSE false END AS edit,
          t.image_uuids,
          CASE WHEN EXISTS (
            SELECT 1
            FROM comments c
            WHERE c.parent_topic_id = t.topic_id
              AND c.user_id = $1
          ) THEN TRUE ELSE FALSE END as commented,
          CASE WHEN v.user_id IS NOT NULL THEN TRUE ELSE FALSE END as voted,
          'topic' AS type,
          (
            SELECT STRING_AGG(ts.tag_name, ',')
            FROM topic_tags tt
            INNER JOIN tags ts ON ts.tag_id = tt.tag_id
            WHERE tt.topic_id = t.topic_id
          ) as tags
        FROM topics t
        LEFT JOIN favorite_topics ft ON t.topic_id = ft.topic_id AND ft.user_id = $1
        LEFT JOIN poll_votes v ON v.topic_id = t.topic_id AND v.user_id = $1
        LEFT JOIN flagged_topics l ON l.topic_id = t.topic_id
        LEFT JOIN blocked_users b ON b.user_id_blocked = t.user_id AND b.user_id_blocking = $1
        WHERE
          l.topic_id IS NULL
          AND b.user_id_blocked IS NULL
      )
      SELECT 
        combined.id,
        combined.create_date,
        combined.title,
        combined.body,
        combined.poll_1,
        combined.poll_2,
        combined.poll_3,
        combined.poll_4,
        combined.poll_counts,
        combined.poll_counts_estimated,
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
        combined.voted,
        combined.favorite_create_date,
        u.user_id,
        u.display_name,
        CASE WHEN u.display_name = '' THEN u.user_id ELSE u.display_name_index END as display_name_index,
        CASE WHEN (u.slug = '' OR u.slug IS NULL) THEN u.user_id::VARCHAR ELSE u.slug END as user_slug,
        u.profile_picture_uuid,
        CASE WHEN u.email <> '' AND u.email IS NOT NULL THEN true ELSE false END AS user_verified,
        pt.title AS parent_topic_title,
        pt.slug AS parent_topic_slug,
        pc.comment_id AS parent_comment_id,
        pc.body AS parent_comment_body,
        pc.note AS parent_comment_note,
        pcu.display_name AS parent_comment_display_name,
        pcu.display_name_index AS parent_comment_display_name_index,
        CASE WHEN pcu.slug = '' THEN pcu.user_id::VARCHAR ELSE pcu.slug END as parent_comment_user_slug,
        pcu.profile_picture_uuid AS parent_comment_profile_picture_uuid,
        CASE WHEN pcf.user_id IS NOT NULL THEN TRUE ELSE FALSE END as parent_comment_favorited,
        combined.tags,
        combined.favorited
      FROM combined
      LEFT JOIN users u ON combined.user_id = u.user_id
      LEFT JOIN topics pt ON combined.parent_topic_id = pt.topic_id
      LEFT JOIN users pu ON pt.user_id = pu.user_id
      LEFT JOIN comments pc ON combined.parent_comment_id = pc.comment_id
      LEFT JOIN users pcu ON pc.user_id = pcu.user_id
      LEFT JOIN favorite_comments pcf ON combined.id = pcf.comment_id AND pcf.user_id = $1
      LEFT JOIN flagged_comments l ON l.comment_id = pc.comment_id
      LEFT JOIN blocked_users b ON b.user_id_blocked = pc.user_id AND b.user_id_blocking = $1
      WHERE
        l.comment_id IS NULL
        AND b.user_id_blocked IS NULL
        ${
          req.body.path === "/favorites"
            ? `
              AND combined.favorited = TRUE
              AND (combined.favorite_create_date < $2 OR $2 IS NULL)
              AND (combined.favorite_create_date > $3 OR $3 IS NULL)
              ORDER BY combined.favorite_create_date DESC
            `
            : ``
        }
        ${
          req.body.path.substr(0, 6) === "/user/" &&
          req.body.path.split("/")[3] === "comments"
            ? `
              AND combined.type = 'comment'
              AND (combined.create_date < $2 OR $2 IS NULL)
              AND (combined.create_date > $3 OR $3 IS NULL)

              AND ${Number(req.body.path.split("/")[2]) ? `u.user_id = $4` : `u.slug = $4`}
              ORDER BY combined.create_date DESC
            `
            : ``
        }
      LIMIT 30;
      `,
      [
        req.session.user_id || 0,
        req.body.max_create_date || null,
        req.body.min_create_date || null,
        req.body.path.substr(0, 6) === "/user/"
          ? req.body.path.split("/")[2]
          : undefined,
      ].filter((x) => x !== undefined),
    );
    req.results.activities.push(...activity_results.rows);
  }
};
