const ai = require("../ai")
const crypto = require("node:crypto")
const {
	GetObjectCommand,
	DeleteObjectCommand,
	PutObjectCommand,
	S3Client,
} = require("@aws-sdk/client-s3")
const object_client = new S3Client({
	region: "us-east-1",
})
const webpush = require("web-push")
webpush.setVapidDetails(
	"mailto:derek@truce.net",
	process.env.VAPID_PUBLIC_KEY,
	process.env.VAPID_PRIVATE_KEY,
)
const firebase = require("../firebase")
const prompts = require("../prompts")
const websocket = require("../websocket")

module.exports = async (req, res) => {
	if (
		!res.writableEnded
		&& req.session.user_id
		&& req.body.display_name
		&& req.body.body
		&& req.body.path
		&& req.body.pngs
	) {
		let post_id = 0
		if (req.body.path.startsWith("/post/")) {
			const slug = req.body.path.split("/")[2]
			const post_results = await req.client.query(
				`
        SELECT post_id as post_id
        FROM posts
        WHERE slug = $1
        `,
				[slug],
			)
			if (post_results.rows.length) {
				post_id = post_results.rows[0].post_id
			} else {
				res.end(
					JSON.stringify({
						error: "Path not found",
					}),
				)
				return
			}
		}
		if (req.body.path.startsWith("/reply")) {
			const ancestor_reply_id = req.body.path.split("/")[2]
			const ancestor_post_results = await req.client.query(
				`
        SELECT parent_post_id
        FROM replies
        WHERE reply_id = $1
        `,
				[ancestor_reply_id],
			)
			if (ancestor_post_results.rows.length) {
				post_id = ancestor_post_results.rows[0].parent_post_id
			} else {
				res.end(
					JSON.stringify({
						error: "Path not found",
					}),
				)
				return
			}
		}

		const messages = []
		const post_results = await req.client.query(
			`
      SELECT
        t.title,
        t.body,
        t.note,
        u.display_name,
        t.image_uuids
      FROM posts t
      INNER JOIN users u ON t.user_id = u.user_id
      WHERE t.post_id = $1
      ORDER BY t.create_date ASC
      `,
			[post_id],
		)
		for (const post of post_results.rows) {
			// Get base64 image urls from object store
			const pngs = post.image_uuids
				? (
						await Promise.all(
							post.image_uuids.split(",").map(async (image_uuid) => {
								try {
									const response = await object_client.send(
										new GetObjectCommand({
											Bucket: "truce.net",
											Key: `${image_uuid}.png`,
										}),
									)
									return await response.Body.transformToString()
								} catch (error) {
									console.error(error)
									return null
								}
							}),
						)
					).filter((x) => x)
				: []

			// Add a message for the post(s) being replyed on
			messages.push({
				role: "user",
				name: (post.display_name || "Anonymous").replace(/[^a-z0-9_\-]/gi, ""),
				content: [
					{ type: "text", text: post.title + "\n\n" + post.body },
					...pngs.map((png) => {
						return {
							image_url: {
								url: png,
							},
							type: "image_url",
						}
					}),
				],
			})

			// Add a message for the system response of a note or OK
			if (post.note) {
				messages.push({
					role: "system",
					content: post.note,
				})
			} else {
				messages.push({
					role: "system",
					content: "OK",
				})
			}
		}
		const ancestor_reply_ids = []
		if (req.body.parent_reply_id) {
			messages.push({
				role: "user",
				name: "Admin",
				content: "Replies:",
			})
			const reply_ancestors = await req.client.query(
				`
        SELECT
          u.display_name,
          c.body,
          c.note,
          c.reply_id,
          c.image_uuids
        FROM replies c
        INNER JOIN users u ON u.user_id = c.user_id
        WHERE
          c.reply_id = $1
          OR c.reply_id IN (
            SELECT ancestor_reply_id
            FROM reply_ancestors
            WHERE reply_id = $1
          )
        ORDER BY c.create_date ASC
        `,
				[req.body.parent_reply_id],
			)
			for (const reply_ancestor of reply_ancestors.rows) {
				// Get base64 image urls from object store
				const pngs = reply_ancestor.image_uuids
					? (
							await Promise.all(
								reply_ancestor.image_uuids
									.split(",")
									.map(async (image_uuid) => {
										try {
											const response = await object_client.send(
												new GetObjectCommand({
													Bucket: "truce.net",
													Key: `${image_uuid}.png`,
												}),
											)
											return await response.Body.transformToString()
										} catch (error) {
											console.error(error)
											return null
										}
									}),
							)
						).filter((x) => x)
					: []

				// Add a message for each ancestor in the reply chain
				messages.push({
					role: "user",
					name: reply_ancestor.display_name.replace(/[^a-z0-9_\-]/gi, ""),
					content: [
						{
							type: "text",
							text:
								reply_ancestor.display_name + ":\n" + reply_ancestor.body,
						},
						...pngs.map((png) => {
							return {
								image_url: {
									url: png,
								},
								type: "image_url",
							}
						}),
					],
				})

				// Add a message for the system response of a note or OK
				if (reply_ancestor.note) {
					messages.push({
						role: "system",
						content: reply_ancestor.note,
					})
				} else {
					messages.push({
						role: "system",
						content: "OK",
					})
				}
			}
			ancestor_reply_ids.push(...reply_ancestors.rows.map((c) => c.reply_id))
		}
		messages.push({
			role: "user",
			name: req.body.display_name.replace(/[^a-z0-9_\-]/gi, ""),
			content: [
				{ type: "text", text: req.body.display_name + ":\n" + req.body.body },
				...req.body.pngs.map((png) => {
					return {
						image_url: {
							url: png.url,
						},
						type: "image_url",
					}
				}),
			],
		})
		const ai_response = await ai.ask(
			messages,
			"common",
			prompts.common_response_format,
		)

		let ai_response_parsed = { keyword: "OK" }
		try {
			ai_response_parsed = JSON.parse(ai_response)
		} catch (e) {
			console.error("Failed to parse AI JSON", ai_response, e)
		}

		if (ai_response_parsed.keyword === "Spam") {
			res.end(
				JSON.stringify({
					error: ai_response_parsed.keyword,
				}),
			)
			return
		}
		let reply_id = req.body.reply_id
		if (ai_response_parsed.keyword === "OK") {
			if (req.body.reply_id) {
				await req.client.query(
					`
          UPDATE replies
          SET body = $1, note = NULL, create_date = NOW()
          WHERE
            reply_id = $2
            AND user_id = $3
          `,
					[req.body.body, req.body.reply_id, req.session.user_id],
				)
			} else {
				const reply_inserted = await req.client.query(
					`
          INSERT INTO replies
            (body, parent_post_id, user_id, parent_reply_id)
          VALUES
            ($1, $2, $3, $4)
          RETURNING reply_id as reply_id
          `,
					[
						req.body.body,
						post_id,
						req.session.user_id,
						req.body.parent_reply_id,
					],
				)
				reply_id = reply_inserted.rows[0].reply_id
			}
		} else {
			if (req.body.reply_id) {
				await req.client.query(
					`
          UPDATE replies
          SET body = $1, note = $2, create_date = NOW()
          WHERE
            reply_id = $3
            AND user_id = $4
          `,
					[
						req.body.body,
						`${ai_response_parsed.keyword} ${ai_response_parsed.note}`,
						req.body.reply_id,
						req.session.user_id,
					],
				)
			} else {
				const reply_inserted = await req.client.query(
					`
          INSERT INTO replies
            (body, note, parent_post_id, user_id, parent_reply_id)
          VALUES
            ($1, $2, $3, $4, $5)
          RETURNING reply_id as reply_id
          `,
					[
						req.body.body,
						`${ai_response_parsed.keyword} ${ai_response_parsed.note}`,
						post_id,
						req.session.user_id,
						req.body.parent_reply_id,
					],
				)
				reply_id = reply_inserted.rows[0].reply_id
			}
		}

		// Update the display name
		await require("./updateDisplayName")(req, res)

		// Insert all of the ancestors
		if (ancestor_reply_ids.length > 0 && !req.body.reply_id) {
			// Create a values string for the bulk insert
			const values = ancestor_reply_ids
				.map((ancestor_reply_id, index) => `($1, $${index + 2})`)
				.join(", ")

			// Execute the bulk insert query
			await req.client.query(
				`
        INSERT INTO reply_ancestors (reply_id, ancestor_reply_id)
        VALUES ${values}
        `,
				[reply_id, ...ancestor_reply_ids],
			)
		}

		// Remove existing images
		if (req.body.reply_id) {
			const existing_images = await req.client.query(
				`
        SELECT image_uuids
        FROM replies
        WHERE reply_id = $1
        `,
				[reply_id],
			)
			for (const existing_image of existing_images.rows) {
				for (const image_uuid of existing_image.image_uuids.split(",")) {
					try {
						await object_client.send(
							new DeleteObjectCommand({
								Bucket: "truce.net",
								Key: `${image_uuid}.png`,
							}),
						)
					} catch (err) {
						console.error(err)
					}
				}
			}
		}

		// Add new images
		const image_uuids = []
		for (const png of req.body.pngs) {
			const image_uuid = crypto.randomUUID()
			try {
				await object_client.send(
					new PutObjectCommand({
						Bucket: "truce.net",
						Key: `${image_uuid}.png`,
						Body: png.url,
					}),
				)
				image_uuids.push(image_uuid)
			} catch (error) {
				console.error(error)
			}
		}
		await req.client.query(
			`
      UPDATE replies
      SET image_uuids = $1
      WHERE reply_id = $2
      `,
			[image_uuids.join(","), reply_id],
		)

		// Update the post reply_count and counts_max_create_date
		await req.client.query(
			`
      UPDATE posts
      SET
        reply_count = COALESCE(subquery.reply_count, 0),
        counts_max_create_date = NOW()
      FROM (
        SELECT
          COUNT(c.*) AS reply_count
        FROM replies c
        LEFT JOIN flagged_replies l ON l.reply_id = c.reply_id
        WHERE
          c.parent_post_id = $1
          AND l.reply_id IS NULL
      ) AS subquery
      WHERE posts.post_id = $1
      `,
			[post_id],
		)

		// Respond with success so the client reloads
		res.end(
			JSON.stringify({
				success: true,
				user_id: req.session.user_id,
				display_name: req.session.display_name,
			}),
		)

		// Send push notifications
		const subscriptions = await req.client.query(
			`
      SELECT
        user_id,
        subscription_json,
        fcm_token
      FROM subscriptions
      WHERE user_id IN (
        SELECT user_id
        FROM posts
        WHERE post_id = $1
        UNION
        SELECT user_id
        FROM replies
        WHERE reply_id IN (
          SELECT ancestor_reply_id
          FROM reply_ancestors
          WHERE reply_id = $2
        )
      ) AND user_id <> $3
      AND active = TRUE
      `,
			[post_id, reply_id, req.session.user_id],
		)

		// Get user_id(s) to notify
		const user_ids_to_notify = await req.client.query(
			`
      SELECT user_id
      FROM posts
      WHERE
        post_id = $1
        AND user_id <> $3
      UNION
      SELECT user_id
      FROM replies
      WHERE
        reply_id IN (
          SELECT ancestor_reply_id
          FROM reply_ancestors
          WHERE reply_id = $2
        )
        AND user_id <> $3
      `,
			[post_id, reply_id, req.session.user_id],
		)

		// Wait for all notifications to be inserted
		for (const user_id_record of user_ids_to_notify.rows) {
			// Insert notifications records for unread notifications
			await req.client.query(
				`
        INSERT INTO reply_notifications
          (user_id, reply_id)
        VALUES
          ($1, $2)
        `,
				[user_id_record.user_id, reply_id],
			)
		}

		// Handle notifications for each user - either queue+alert or push+unread
		subscriptions.rows.forEach(async (subscription) => {
			// Check if user has any active WebSocket connection
			const has_active_websocket = websocket.hasActiveWebSocketConnection(subscription.user_id)
			
			if (has_active_websocket) {
				// User is actively viewing - mark notification as read and send instant alert
				await req.client.query(
					`
					UPDATE reply_notifications
					SET read = TRUE
					WHERE user_id = $1 AND reply_id = $2
					`,
					[subscription.user_id, reply_id]
				)
				
				// Send instant alert via WebSocket (with fallback notification data)
				const short_display_name = req.body.display_name.length > 20
					? req.body.display_name.slice(0, 20) + "..."
					: req.body.display_name
				const short_body = req.body.body.length > 50
					? req.body.body.slice(0, 50) + "..."
					: req.body.body
				
				// Get unread count for fallback notification
				const unread_count_result = await req.client.query(
					`
					SELECT COUNT(*) AS unread_count
					FROM reply_notifications
					WHERE user_id = $1 AND read = FALSE
					`,
					[subscription.user_id]
				)
				const unread_count = unread_count_result.rows[0].unread_count
				
				// Prepare fallback notification data for queuing if WebSocket fails
				const notification_data = {
					title: `${short_display_name} replied`,
					body: short_body,
					topic: `post:${post_id}`,
					unread_count: unread_count
				}
				
				websocket.sendInstantAlert(
					subscription.user_id,
					`${short_display_name} replied to a post`,
					notification_data,
					post_id // Pass post_id for UI suppression
				)
			} else {
				// User not actively viewing - send traditional push notification
				// Create data for the push
				const short_display_name =
					req.body.display_name.length > 20
						? req.body.display_name.substring(0, 20) + "..."
						: req.body.display_name
				const short_body =
					req.body.body.length > 50
						? req.body.body.substring(0, 50) + "..."
						: req.body.body
				let topic = `post:${post_id}`

				// Chrome wants unique topics ¯\_(ツ)_/¯
				if (String(subscription.subscription_json || "").match(/google/i)) {
					topic = `reply:${reply_id}`
				}

			// Get the unread count for this user id
			const unread_count_result = await req.client.query(
				`
        SELECT 
          COUNT(*) AS unread_count
        FROM reply_notifications
        WHERE
          user_id = $1
          AND read = FALSE
        `,
				[subscription.user_id],
			)
			const unread_count = unread_count_result.rows[0].unread_count

			// Send the push

			// FCM version
			if (subscription.fcm_token) {
				const message = {
					notification: {
						title: `${short_display_name} replied`,
						body: short_body,
					},
					apns: {
						payload: {
							aps: {
								badge: Number(unread_count || 0),
							},
						},
					},
					token: JSON.parse(subscription.fcm_token),
				}
				try {
					const result = await firebase.getMessaging().send(message)
				} catch (e) {
					if (e.code === "messaging/registration-token-not-registered") {
						await req.client.query(
							`
              DELETE FROM subscriptions
              WHERE fcm_token = $1
              `,
							[subscription.fcm_token],
						)
					} else {
						console.error("Unhandled FCM message:", e.message)
						console.error("Unhandled FCM code:", e.code)
					}
				}

				// Web Push version
			} else {
				webpush
					.sendNotification(
						JSON.parse(subscription.subscription_json),
						JSON.stringify({
							title: `${short_display_name} replied`,
							body: short_body,
							topic,
							unread_count,
						}),
					)
					.then((result) => {
					})
					.catch(async (error) => {
						// 410 means unsubscribed and is expected, but means we need to stop sending to that subscription_json
						if (error.statusCode === 410) {
							await req.client.query(
								`
              DELETE FROM subscriptions
              WHERE subscription_json = $1
              `,
								[subscription.subscription_json],
							)
						} else {
							console.error("Unhandled webpush error:", error)
						}
					})
			}
		}
	})

		// Send websocket update after all notifications have been inserted
		req.sendWsMessage("UPDATE", post_id)
	}
}
