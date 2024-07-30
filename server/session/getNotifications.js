module.exports = async (req, res) => {
  if (!res.writableEnded && req.session.user_id) {
    // Updating an array of notification_ids that are read and seen
    if (req.body.mark_as_read) {
      await req.client.query(
        `
        UPDATE notifications
        SET read = TRUE, seen = TRUE, create_date = NOW()
        WHERE notification_id = ANY($1::int[]) AND user_id = $2
        `,
        [req.body.mark_as_read, req.session.user_id],
      );
      res.end(JSON.stringify({ success: true }));
    }

    // Update all notifications as read and seen
    if (req.body.mark_all_as_read) {
      await req.client.query(
        `
        UPDATE notifications
        SET read = TRUE, seen = TRUE, create_date = NOW()
        WHERE
          user_id = $1
          AND (read = FALSE OR seen = FALSE)
        `,
        [req.session.user_id],
      );
      res.end(JSON.stringify({ success: true }));
    }

    // Updating all notifications as seen
    if (req.body.mark_all_as_seen) {
      await req.client.query(
        `
        UPDATE notifications
        SET seen = TRUE
        WHERE
          user_id = $1
          AND seen = FALSE
        `,
        [req.session.user_id],
      );
      res.end(JSON.stringify({ success: true }));
    }

    // Returning the unread_count and unseen_count
    if (req.body?.path === "/unread_count_unseen_count") {
      const counts = await req.client.query(
        `
        SELECT 
          SUM(CASE WHEN read = FALSE THEN 1 ELSE 0 END) AS unread_count,
          SUM(CASE WHEN seen = FALSE THEN 1 ELSE 0 END) AS unseen_count
        FROM notifications
        WHERE user_id = $1
        `,
        [req.session.user_id],
      );

      // Special case for exactly 1 unseen, we want to load that comment_id and notification_id
      let comment_id = null;
      let notification_id = null;
      if (counts.rows[0].unseen_count === "1") {
        const comment = await req.client.query(
          `
          SELECT comment_id, notification_id
          FROM notifications
          WHERE user_id = $1
          AND seen = FALSE
          ORDER BY create_date DESC
          `,
          [req.session.user_id],
        );
        comment_id = comment.rows[0].comment_id;
        notification_id = comment.rows[0].notification_id;
      }

      // Return the counts (and maybe a comment_id/notification_id)
      res.end(
        JSON.stringify({
          unread_count: counts.rows[0].unread_count,
          unseen_count: counts.rows[0].unseen_count,
          comment_id,
          notification_id,
        }),
      );

      // Returning the complete notifications list
    } else if (req.body?.path === "/notifications") {
      req.results.path = "/notifications";
      const notifications_unread = await req.client.query(
        `
        SELECT
          n.notification_id,
          n.read,
          n.seen,
          n.create_date,
          u.display_name,
          u.display_name_index,
          c.comment_id,
          LEFT(c.body, 51) as body,
          LEFT(c.note, 21) as note,
          LEFT(a.title, 21) as title,
          CASE
            WHEN c.parent_comment_id is NULL THEN 'topic'
            WHEN p.user_id = $1 THEN 'comment'
            ELSE 'topic_comment'
          END AS reply_type
        FROM notifications n
        INNER JOIN comments c ON c.comment_id = n.comment_id
        LEFT JOIN comments p ON p.comment_id = c.parent_comment_id
        INNER JOIN users u ON u.user_id = c.user_id
        INNER JOIN topics a ON a.topic_id = c.parent_topic_id
        LEFT JOIN flagged_comments l ON l.comment_id = c.comment_id
        LEFT JOIN blocked_users b ON b.user_id_blocked = c.user_id AND b.user_id_blocking = $1
        LEFT JOIN flagged_comments l2 ON l2.comment_id = p.comment_id
        LEFT JOIN blocked_users b2 ON b2.user_id_blocked = p.user_id AND b2.user_id_blocking = $1
        LEFT JOIN flagged_topics l3 ON l3.topic_id = a.topic_id
        LEFT JOIN blocked_users b3 ON b3.user_id_blocked = a.user_id AND b3.user_id_blocking = $1
        WHERE
          n.user_id = $1
          AND read = FALSE
          AND (n.create_date < $2 OR $2 IS NULL)
          AND (n.create_date > $3 OR $3 IS NULL)
          AND l.comment_id IS NULL
          AND b.user_id_blocked IS NULL
          AND l2.comment_id IS NULL
          AND b2.user_id_blocked IS NULL
          AND l3.topic_id IS NULL
          AND b3.user_id_blocked IS NULL
        ORDER BY n.create_date DESC
        LIMIT 30
        `,
        [
          req.session.user_id,
          req.body.max_notification_unread_create_date || null,
          req.body.min_notification_unread_create_date || null,
        ],
      );
      const notifications_read = await req.client.query(
        `
        SELECT
          n.notification_id,
          n.read,
          n.seen,
          n.create_date,
          u.display_name,
          u.display_name_index,
          c.comment_id,
          LEFT(c.body, 51) as body,
          LEFT(c.note, 21) as note,
          LEFT(a.title, 21) as title,
          CASE
            WHEN c.parent_comment_id is NULL THEN 'topic'
            WHEN p.user_id = $1 THEN 'comment'
            ELSE 'topic_comment'
          END AS reply_type
        FROM notifications n
        INNER JOIN comments c ON c.comment_id = n.comment_id
        LEFT JOIN comments p ON p.comment_id = c.parent_comment_id
        INNER JOIN users u ON u.user_id = c.user_id
        INNER JOIN topics a ON a.topic_id = c.parent_topic_id
        LEFT JOIN flagged_comments l ON l.comment_id = c.comment_id
        LEFT JOIN blocked_users b ON b.user_id_blocked = c.user_id AND b.user_id_blocking = $1
        LEFT JOIN flagged_comments l2 ON l2.comment_id = p.comment_id
        LEFT JOIN blocked_users b2 ON b2.user_id_blocked = p.user_id AND b2.user_id_blocking = $1
        LEFT JOIN flagged_topics l3 ON l3.topic_id = a.topic_id
        LEFT JOIN blocked_users b3 ON b3.user_id_blocked = a.user_id AND b3.user_id_blocking = $1
        WHERE
          n.user_id = $1
          AND read = TRUE
          AND (n.create_date < $2 OR $2 IS NULL)
          AND (n.create_date > $3 OR $3 IS NULL)
          AND l.comment_id IS NULL
          AND b.user_id_blocked IS NULL
          AND l2.comment_id IS NULL
          AND b2.user_id_blocked IS NULL
          AND l3.topic_id IS NULL
          AND b3.user_id_blocked IS NULL
        ORDER BY n.create_date DESC
        LIMIT 30
        `,
        [
          req.session.user_id,
          req.body.max_notification_read_create_date || null,
          req.body.min_notification_read_create_date || null,
        ],
      );
      req.results.notifications = [
        ...notifications_unread.rows,
        ...notifications_read.rows,
      ];
    }
  }
};
