module.exports = async (req, res) => {
	if (!res.writableEnded && req.session.user_id) {
		// Updating arrays of notification_ids that are read and seen by type
		if (req.body.mark_reply_notifications_as_read) {

			await req.client.query(
				`
        UPDATE reply_notifications
        SET read = TRUE, seen = TRUE, create_date = NOW()
        WHERE notification_id = ANY($1::int[]) AND user_id = $2
        `,
				[req.body.mark_reply_notifications_as_read, req.session.user_id],
			)
			res.end(JSON.stringify({ success: true }))
		}
		
		if (req.body.mark_message_notifications_as_read) {
			// Get conversation_id before updating notifications
			const conversation_result = await req.client.query(
				`
				SELECT DISTINCT m.conversation_id
				FROM message_notifications mn
				INNER JOIN messages m ON m.message_id = mn.message_id
				WHERE mn.notification_id = ANY($1::int[]) AND mn.user_id = $2
				`,
				[req.body.mark_message_notifications_as_read, req.session.user_id],
			)
			
			await req.client.query(
				`
        UPDATE message_notifications
        SET read = TRUE, seen = TRUE, create_date = NOW()
        WHERE notification_id = ANY($1::int[]) AND user_id = $2
        `,
				[req.body.mark_message_notifications_as_read, req.session.user_id],
			)
			
			// Send read receipt via WebSocket for each conversation
			conversation_result.rows.forEach(row => {
				req.sendWsMessage(JSON.stringify({
					type: "MESSAGE_READ_RECEIPT",
					conversation_id: row.conversation_id,
					user_id: req.session.user_id
				}), { conversation_id: row.conversation_id })
			})
			
			res.end(JSON.stringify({ success: true }))
		}

		// Update all notifications as read and seen
		if (req.body.mark_all_as_read) {
			await req.client.query(
				`
        UPDATE reply_notifications
        SET read = TRUE, seen = TRUE, create_date = NOW()
        WHERE
          user_id = $1
          AND (read = FALSE OR seen = FALSE)
        `,
				[req.session.user_id],
			)
			await req.client.query(
				`
        UPDATE message_notifications
        SET read = TRUE, seen = TRUE, create_date = NOW()
        WHERE
          user_id = $1
          AND (read = FALSE OR seen = FALSE)
        `,
				[req.session.user_id],
			)
			res.end(JSON.stringify({ success: true }))
		}

		// Updating all notifications as seen
		if (req.body.mark_all_as_seen) {
			await req.client.query(
				`
        UPDATE reply_notifications
        SET seen = TRUE
        WHERE
          user_id = $1
          AND seen = FALSE
        `,
				[req.session.user_id],
			)
			await req.client.query(
				`
        UPDATE message_notifications
        SET seen = TRUE
        WHERE
          user_id = $1
          AND seen = FALSE
        `,
				[req.session.user_id],
			)
			res.end(JSON.stringify({ success: true }))
		}

		// Returning the unread_count and unseen_count
		if (req.body?.path === "/unread_count_unseen_count") {
			const counts = await req.client.query(
				`
        WITH combined_notifications AS (
          SELECT read, seen 
          FROM reply_notifications 
          WHERE user_id = $1
          UNION ALL
          SELECT read, seen 
          FROM message_notifications 
          WHERE user_id = $1
        )
        SELECT 
          SUM(CASE WHEN read = FALSE THEN 1 ELSE 0 END) AS unread_count,
          SUM(CASE WHEN seen = FALSE THEN 1 ELSE 0 END) AS unseen_count
        FROM combined_notifications
        `,
				[req.session.user_id],
			)

			// Special case for exactly 1 unseen, we want to load that reply_id/conversation_id and notification_id
			let reply_id = null
			let conversation_id = null
			let notification_id = null
			if (counts.rows[0].unseen_count === "1") {
				const unseen = await req.client.query(
					`
          WITH combined_unseen AS (
            SELECT 'reply' as type, reply_id, NULL as conversation_id, notification_id, create_date
            FROM reply_notifications
            WHERE user_id = $1 AND seen = FALSE
            UNION ALL
            SELECT 'message' as type, NULL as reply_id, 
                   (SELECT conversation_id FROM messages WHERE message_id = mn.message_id) as conversation_id,
                   notification_id, create_date
            FROM message_notifications mn
            WHERE user_id = $1 AND seen = FALSE
          )
          SELECT type, reply_id, conversation_id, notification_id
          FROM combined_unseen
          ORDER BY create_date DESC
          LIMIT 1
          `,
					[req.session.user_id],
				)
				if (unseen.rows[0]) {
					reply_id = unseen.rows[0].reply_id
					conversation_id = unseen.rows[0].conversation_id
					notification_id = unseen.rows[0].notification_id
				}
			}

			// Return the counts (and maybe a reply_id/conversation_id/notification_id)
			res.end(
				JSON.stringify({
					unread_count: counts.rows[0].unread_count,
					unseen_count: counts.rows[0].unseen_count,
					reply_id,
					conversation_id,
					notification_id,
				}),
			)

			// Returning the complete notifications list
		} else if (req.body?.path === "/notifications") {

			req.results.path = "/notifications"
			const notifications_unread = await req.client.query(
				`
        WITH combined_unread AS (
          SELECT
            n.notification_id,
            n.read,
            n.seen,
            n.create_date,
            u.display_name,
            u.display_name_index,
            c.reply_id,
            LEFT(c.body, 51) as body,
            LEFT(c.note, 21) as note,
            LEFT(a.title, 21) as title,
            CASE
              WHEN c.parent_reply_id is NULL THEN 'post'
              WHEN p.user_id = $1 THEN 'reply'
              ELSE 'post_reply'
            END AS reply_type,
            NULL as conversation_id,
            NULL as message_id,
            'reply' as notification_type
          FROM reply_notifications n
          INNER JOIN replies c ON c.reply_id = n.reply_id
          LEFT JOIN replies p ON p.reply_id = c.parent_reply_id
          INNER JOIN users u ON u.user_id = c.user_id
          INNER JOIN posts a ON a.post_id = c.parent_post_id
          LEFT JOIN flagged_replies l ON l.reply_id = c.reply_id
          LEFT JOIN blocked_users b ON b.user_id_blocked = c.user_id AND b.user_id_blocking = $1
          LEFT JOIN flagged_replies l2 ON l2.reply_id = p.reply_id
          LEFT JOIN blocked_users b2 ON b2.user_id_blocked = p.user_id AND b2.user_id_blocking = $1
          LEFT JOIN flagged_posts l3 ON l3.post_id = a.post_id
          LEFT JOIN blocked_users b3 ON b3.user_id_blocked = a.user_id AND b3.user_id_blocking = $1
          WHERE
            n.user_id = $1
            AND n.read = FALSE
            AND (n.create_date < $2 OR $2 IS NULL)
            AND (n.create_date > $3 OR $3 IS NULL)
            AND l.reply_id IS NULL
            AND b.user_id_blocked IS NULL
            AND l2.reply_id IS NULL
            AND b2.user_id_blocked IS NULL
            AND l3.post_id IS NULL
            AND b3.user_id_blocked IS NULL
          UNION ALL
          SELECT
            n.notification_id,
            n.read,
            n.seen,
            n.create_date,
            u.display_name,
            u.display_name_index,
            NULL as reply_id,
            LEFT(m.body, 51) as body,
            NULL as note,
            NULL as title,
            NULL as reply_type,
            m.conversation_id,
            m.message_id,
            'message' as notification_type
          FROM message_notifications n
          INNER JOIN messages m ON m.message_id = n.message_id
          INNER JOIN conversations conv ON conv.conversation_id = m.conversation_id
          INNER JOIN users u ON u.user_id = m.user_id
          LEFT JOIN blocked_users b ON b.user_id_blocked = m.user_id AND b.user_id_blocking = $1
          WHERE
            n.user_id = $1
            AND n.read = FALSE
            AND (n.create_date < $2 OR $2 IS NULL)
            AND (n.create_date > $3 OR $3 IS NULL)
            AND b.user_id_blocked IS NULL
            AND EXISTS (
              SELECT 1 FROM conversation_users cp 
              WHERE cp.conversation_id = conv.conversation_id AND cp.user_id = $1
            )
        )
        SELECT * FROM combined_unread
        ORDER BY create_date DESC
        LIMIT 30
        `,
				[
					req.session.user_id,
					req.body.max_notification_unread_create_date ? new Date(req.body.max_notification_unread_create_date) : null,
					req.body.min_notification_unread_create_date ? new Date(req.body.min_notification_unread_create_date) : null,
				],
			)
			const notifications_read = await req.client.query(
				`
        WITH combined_read AS (
          SELECT
            n.notification_id,
            n.read,
            n.seen,
            n.create_date,
            u.display_name,
            u.display_name_index,
            c.reply_id,
            LEFT(c.body, 51) as body,
            LEFT(c.note, 21) as note,
            LEFT(a.title, 21) as title,
            CASE
              WHEN c.parent_reply_id is NULL THEN 'post'
              WHEN p.user_id = $1 THEN 'reply'
              ELSE 'post_reply'
            END AS reply_type,
            NULL as conversation_id,
            NULL as message_id,
            'reply' as notification_type
          FROM reply_notifications n
          INNER JOIN replies c ON c.reply_id = n.reply_id
          LEFT JOIN replies p ON p.reply_id = c.parent_reply_id
          INNER JOIN users u ON u.user_id = c.user_id
          INNER JOIN posts a ON a.post_id = c.parent_post_id
          LEFT JOIN flagged_replies l ON l.reply_id = c.reply_id
          LEFT JOIN blocked_users b ON b.user_id_blocked = c.user_id AND b.user_id_blocking = $1
          LEFT JOIN flagged_replies l2 ON l2.reply_id = p.reply_id
          LEFT JOIN blocked_users b2 ON b2.user_id_blocked = p.user_id AND b2.user_id_blocking = $1
          LEFT JOIN flagged_posts l3 ON l3.post_id = a.post_id
          LEFT JOIN blocked_users b3 ON b3.user_id_blocked = a.user_id AND b3.user_id_blocking = $1
          WHERE
            n.user_id = $1
            AND n.read = TRUE
            AND (n.create_date < $2 OR $2 IS NULL)
            AND (n.create_date > $3 OR $3 IS NULL)
            AND l.reply_id IS NULL
            AND b.user_id_blocked IS NULL
            AND l2.reply_id IS NULL
            AND b2.user_id_blocked IS NULL
            AND l3.post_id IS NULL
            AND b3.user_id_blocked IS NULL
          UNION ALL
          SELECT
            n.notification_id,
            n.read,
            n.seen,
            n.create_date,
            u.display_name,
            u.display_name_index,
            NULL as reply_id,
            LEFT(m.body, 51) as body,
            NULL as note,
            NULL as title,
            NULL as reply_type,
            m.conversation_id,
            m.message_id,
            'message' as notification_type
          FROM message_notifications n
          INNER JOIN messages m ON m.message_id = n.message_id
          INNER JOIN conversations conv ON conv.conversation_id = m.conversation_id
          INNER JOIN users u ON u.user_id = m.user_id
          LEFT JOIN blocked_users b ON b.user_id_blocked = m.user_id AND b.user_id_blocking = $1
          WHERE
            n.user_id = $1
            AND n.read = TRUE
            AND (n.create_date < $2 OR $2 IS NULL)
            AND (n.create_date > $3 OR $3 IS NULL)
            AND b.user_id_blocked IS NULL
            AND EXISTS (
              SELECT 1 FROM conversation_users cp 
              WHERE cp.conversation_id = conv.conversation_id AND cp.user_id = $1
            )
        )
        SELECT * FROM combined_read
        ORDER BY create_date DESC
        LIMIT 30
        `,
				[
					req.session.user_id,
					req.body.max_notification_read_create_date ? new Date(req.body.max_notification_read_create_date) : null,
					req.body.min_notification_read_create_date ? new Date(req.body.min_notification_read_create_date) : null,
				],
			)
			req.results.notifications = [
				...notifications_unread.rows,
				...notifications_read.rows,
			]
		}
	}
}
