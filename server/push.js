const firebase = require("./firebase")
const webpush = require("web-push")
webpush.setVapidDetails(
	"mailto:derek@truce.net",
	process.env.VAPID_PUBLIC_KEY,
	process.env.VAPID_PRIVATE_KEY,
)
const pool = require("./pool")
const websocket = require("./websocket.js")

module.exports = {
	async sendPush(user_ids, reply_notification_ids, message_notification_ids, push_data) {

		// Get DB connection
		const pool_client = await pool.pool.connect()

		// Keep track of user details
		const user_details = {}

		// Async await for each user_id checking websocket connections
		for (const user_id of user_ids) {
			user_details[user_id] = {}

			// Check active websocket
			const has_active_websocket = websocket.hasActiveWebSocketConnection(user_id)
			if (has_active_websocket) {
				user_details[user_id].has_active_websocket = true

				// Mark notifications as read since user will see instant alert
				if (reply_notification_ids[user_id]) {
					await pool_client.query(
						`
						UPDATE reply_notifications
						SET read = TRUE
						WHERE user_id = $1 AND notification_id = $2
						`,
						[user_id, reply_notification_ids[user_id]]
					)
				}
				if (message_notification_ids[user_id]) {
					await pool_client.query(
						`
						UPDATE message_notifications
						SET read = TRUE
						WHERE user_id = $1 AND notification_id = $2
						`,
						[user_id, message_notification_ids[user_id]]
					)
				}
				
				const alert_data = { ...push_data }
				alert_data.reply_notification_id = reply_notification_ids[user_id]
				alert_data.message_notification_id = message_notification_ids[user_id]
				websocket.sendInstantAlert(
					user_id,
					alert_data,
				)

			} else {
				// If we are in this code
			}
			const unread_count_result = await pool_client.query(
				`
				SELECT sum(unread_count) AS unread_count
				FROM (
					-- Count unread reply notifications
					SELECT 
						COUNT(*) AS unread_count
					FROM reply_notifications
					WHERE
						user_id = $1
						AND read = FALSE
					-- Count unread message notifications
					UNION
					SELECT 
						COUNT(*) AS unread_count
					FROM message_notifications
					WHERE
						user_id = $1
						AND read = FALSE
				) AS counts
				`,
				[user_id],
			)
			user_details[user_id].unread_count = unread_count_result.rows[0].unread_count || 0
		}

		// Get all possible push subscriptions for the user_ids
		const subscriptions = await pool_client.query(
			`
      SELECT
        user_id,
        subscription_json,
        fcm_token
      FROM subscriptions
      WHERE
				user_id = ANY($1)
      	AND active = TRUE
      `,
			[user_ids],
		)

		// Handle notifications for each user - either queue+alert or push+unread
		for (const subscription of subscriptions.rows) {

			// Skip if the user has an active websocket connection
			if (user_details[subscription.user_id].has_active_websocket) {
				return
			}

			// FCM version
			if (subscription.fcm_token) {
				const message = {
					notification: {
						title: push_data.title,
						body: push_data.body,
					},
					apns: {
						payload: {
							aps: {
								badge: Number(user_details[subscription.user_id].unread_count || 0),
							},
						},
					},
					token: JSON.parse(subscription.fcm_token),
				}
				try {
					await firebase.getMessaging().send(message)
				} catch (e) {
					if (e.code === "messaging/registration-token-not-registered") {
						await pool_client.query(
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
				await webpush
					.sendNotification(
						JSON.parse(subscription.subscription_json),
						JSON.stringify({
							title: push_data.title,
							body: push_data.body,
							topic: push_data.topic,
							unread_count: Number(user_details[subscription.user_id].unread_count || 0),
						}),
					)
					.catch(async (error) => {
						console.error("WebPush error:", error)
						// 410 means unsubscribed and is expected, but means we need to stop sending to that subscription_json
						if (error.statusCode === 410) {
							await pool_client.query(
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

		// Release the DB connection
		pool_client.release()
	}
}