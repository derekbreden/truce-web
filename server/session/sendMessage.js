const crypto = require("node:crypto")
const {
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

module.exports = async (req, res) => {
	if (
		!res.writableEnded &&
		req.session.user_id &&
		req.body.conversation_id &&
		req.body.body &&
		req.body.pngs
	) {
		// Verify user is participant in this conversation
		const conversation_check = await req.client.query(
			`
			SELECT participant_user_ids
			FROM conversations
			WHERE conversation_id = $1
			`,
			[req.body.conversation_id],
		)

		if (
			!conversation_check.rows.length ||
			!conversation_check.rows[0].participant_user_ids.includes(req.session.user_id)
		) {
			res.end(
				JSON.stringify({
					error: "Conversation not found or access denied",
				}),
			)
			return
		}

		// Check for blocked users
		const participant_user_ids = conversation_check.rows[0].participant_user_ids
		const other_user_ids = participant_user_ids.filter(id => id !== req.session.user_id)
		
		const blocked_check = await req.client.query(
			`
			SELECT user_id_blocked
			FROM blocked_users
			WHERE 
				(user_id_blocking = $1 AND user_id_blocked = ANY($2))
				OR (user_id_blocked = $1 AND user_id_blocking = ANY($2))
			`,
			[req.session.user_id, other_user_ids],
		)

		if (blocked_check.rows.length > 0) {
			res.end(
				JSON.stringify({
					error: "Cannot send message to blocked user",
				}),
			)
			return
		}

		let message_id = req.body.message_id
		if (req.body.message_id) {
			// Update existing message
			await req.client.query(
				`
				UPDATE messages
				SET body = $1, create_date = NOW()
				WHERE
					message_id = $2
					AND sender_user_id = $3
				`,
				[req.body.body, req.body.message_id, req.session.user_id],
			)
		} else {
			// Insert new message
			const message_inserted = await req.client.query(
				`
				INSERT INTO messages
					(conversation_id, sender_user_id, body)
				VALUES
					($1, $2, $3)
				RETURNING message_id as message_id
				`,
				[req.body.conversation_id, req.session.user_id, req.body.body],
			)
			message_id = message_inserted.rows[0].message_id
		}

		// Update display name
		await require("./updateDisplayName")(req, res)

		// Remove existing images if editing
		if (req.body.message_id) {
			const existing_images = await req.client.query(
				`
				SELECT image_uuids
				FROM messages
				WHERE message_id = $1
				`,
				[message_id],
			)
			for (const existing_image of existing_images.rows) {
				if (existing_image.image_uuids) {
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
			UPDATE messages
			SET image_uuids = $1
			WHERE message_id = $2
			`,
			[image_uuids.join(","), message_id],
		)

		// Update conversation's last_message_id
		await req.client.query(
			`
			UPDATE conversations
			SET last_message_id = $1
			WHERE conversation_id = $2
			`,
			[message_id, req.body.conversation_id],
		)

		// Respond with success
		res.end(
			JSON.stringify({
				success: true,
				user_id: req.session.user_id,
				display_name: req.session.display_name,
			}),
		)

		// Send push notifications to other participants
		const subscriptions = await req.client.query(
			`
			SELECT
				user_id,
				subscription_json,
				fcm_token
			FROM subscriptions
			WHERE user_id = ANY($1) AND user_id <> $2
			AND active = TRUE
			`,
			[other_user_ids, req.session.user_id],
		)

		// Insert notifications for other participants
		for (const user_id of other_user_ids) {
			await req.client.query(
				`
				INSERT INTO message_notifications
					(user_id, message_id)
				VALUES
					($1, $2)
				`,
				[user_id, message_id],
			)
		}

		// Send push notifications
		subscriptions.rows.forEach(async (subscription) => {
			const short_display_name =
				req.session.display_name.length > 20
					? req.session.display_name.slice(0, 20) + "..."
					: req.session.display_name
			const short_body =
				req.body.body.length > 50
					? req.body.body.slice(0, 50) + "..."
					: req.body.body

			// Get the unread count for this user id
			const unread_count_result = await req.client.query(
				`
				SELECT 
					COUNT(*) AS unread_count
				FROM message_notifications
				WHERE
					user_id = $1
					AND read = FALSE
				`,
				[subscription.user_id],
			)
			const unread_count = unread_count_result.rows[0].unread_count

			// FCM version
			if (subscription.fcm_token) {
				const message = {
					notification: {
						title: `${short_display_name} sent a message`,
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
						console.log("Unsubscribing", subscription.fcm_token)
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
							title: `${short_display_name} sent a message`,
							body: short_body,
							topic: `conversation:${req.body.conversation_id}`,
							unread_count,
						}),
					)
					.then((result) => {
						// console.log(result)
					})
					.catch(async (error) => {
						// 410 means unsubscribed and is expected, but means we need to stop sending to that subscription_json
						if (error.statusCode === 410) {
							console.log("Unsubscribing", subscription.subscription_json)
							await req.client.query(
								`
								DELETE FROM subscriptions
								WHERE subscription_json = $1
								`,
								[subscription.subscription_json],
							)
						} else {
							console.error(error)
						}
					})
			}
		})

		// Send websocket update for real-time messaging
		req.sendWsMessageToConversation("MESSAGE_UPDATE", req.body.conversation_id)
		
		// Also notify other participants if they're viewing conversations list
		req.sendWsMessageToUsers("CONVERSATION_UPDATE", other_user_ids)
	}
}