const crypto = require("node:crypto")
const { WebSocketServer } = require("ws")
const pool = require("./pool")

module.exports = {
	pending_push_notifications: {},
	async init(server) {
		const wss = new WebSocketServer({ server })
		this.ws_active = this.ws_active || {}
		wss.on("connection", (ws) => {
			const ws_uuid = crypto.randomUUID()
			this.ws_active[ws_uuid] = ws
			ws.on("error", () => {
				if (ws.user_id) {
					this.flushPendingPushNotifications(ws.user_id)
				}
				delete this.ws_active[ws_uuid]
			})
			ws.on("close", () => {
				if (ws.user_id) {
					this.flushPendingPushNotifications(ws.user_id)
				}
				delete this.ws_active[ws_uuid]
			})
			ws.on("message", async (buffer) => {
				const pool_client = await pool.pool.connect()
				const message = JSON.parse(buffer.toString())
				
				// Handle user authentication for messaging
				if (message.session_uuid) {
					if (ws.session_uuid !== message.session_uuid) {
						ws.session_uuid = message.session_uuid
						const session_results = await pool_client.query(
							`
							SELECT
								users.user_id
							FROM sessions
							LEFT JOIN user_sessions ON sessions.session_id = user_sessions.session_id
							LEFT JOIN users ON user_sessions.user_id = users.user_id
							WHERE sessions.session_uuid = $1
							`,
							[message.session_uuid],
						)
						ws.user_id = session_results.rows.length
							? session_results.rows[0].user_id
							: null
					}
				}

				// Handle instant alert acknowledgments
				if (message.type === "INSTANT_ALERT_ACK" && ws.user_id) {
					const reply_notification_id = message.reply_notification_id || null
					const message_notification_id = message.message_notification_id || null
					this.acknowledgeNotification(ws.user_id, reply_notification_id, message_notification_id)
				}

				// Handle a path change message
				if (message.path) {
					delete ws.active_post_id

					// Posts
					if (message.path.startsWith("/post/")) {
						const post = await pool_client.query(
							`
								SELECT post_id
								FROM posts
								WHERE slug = $1
							`,
							[message.path.split("/")[2]],
						)
						ws.active_post_id = post.rows.length
							? post.rows[0].post_id
							: false
					
					// Replies
					} else if (message.path.startsWith("/reply/")) {
						const reply = await pool_client.query(
							`
								SELECT parent_post_id
								FROM replies
								WHERE reply_id = $1
							`,
							[message.path.split("/")[2]],
						)
						ws.active_post_id = reply.rows.length
							? reply.rows[0].parent_post_id
							: false
					}
				}
				pool_client.release()
			})
			ws.send("UPDATE")
		})
	},
	sendMessage(message, options) {
		Object.keys(this.ws_active).forEach((ws_uuid) => {

			// post_id
			if (options.post_id) {
				if (
					!this.ws_active[ws_uuid].active_post_id
					|| this.ws_active[ws_uuid].active_post_id === options.post_id
				) {
					this.ws_active[ws_uuid].send(message)
				}
			}

			// user_id
			if (options.user_id) {
				if (
					!this.ws_active[ws_uuid].user_id
					|| this.ws_active[ws_uuid].user_id === options.user_id
				) {
					this.ws_active[ws_uuid].send(message)
				}
			}

			// conversation_id
			// if (options.conversation_id) {
			// 	if (
			// 		!this.ws_active[ws_uuid].active_conversation_id
			// 		|| this.ws_active[ws_uuid].active_conversation_id === options.conversation_id
			// 	) {
			// 		this.ws_active[ws_uuid].send(message)
			// 	}
			// }
		})
	},
	queuePushNotification(user_id, push_data) {
		if (!this.pending_push_notifications[user_id]) {
			this.pending_push_notifications[user_id] = []
		}
		this.pending_push_notifications[user_id].push({
			push_data,
		})
	},
	async flushPendingPushNotifications(user_id) {
		const queued_notifications = this.pending_push_notifications[user_id]
		if (queued_notifications && queued_notifications.length > 0) {
			delete this.pending_push_notifications[user_id]
			
			// Mark notifications as unread since user didn't get instant alert
			const pool = require("./pool")
			const pool_client = await pool.pool.connect()
			
			for (const notification of queued_notifications) {
				// Mark notifications as unread based on what's in the push_data
				if (notification.push_data.reply_notification_id) {
					await pool_client.query(
						`
						UPDATE reply_notifications
						SET read = FALSE
						WHERE notification_id = $1
						`,
						[notification.push_data.reply_notification_id]
					)
				}
				if (notification.push_data.message_notification_id) {
					await pool_client.query(
						`
						UPDATE message_notifications
						SET read = FALSE
						WHERE notification_id = $1
						`,
						[notification.push_data.message_notification_id]
					)
				}
				
				// Create proper notification arrays for push
				const reply_notification_ids = {}
				const message_notification_ids = {}
				
				if (notification.push_data.reply_notification_id) {
					reply_notification_ids[user_id] = notification.push_data.reply_notification_id
				}
				if (notification.push_data.message_notification_id) {
					message_notification_ids[user_id] = notification.push_data.message_notification_id
				}
				
				require("./push").sendPush(
					[user_id],
					reply_notification_ids,
					message_notification_ids,
					notification.push_data,
				)
			}
			
			pool_client.release()
		}
		return []
	},
	hasActiveWebSocketConnection(user_id) {
		// Check if user has ANY active WebSocket connection
		return Object.values(this.ws_active).some(ws => 
			ws.user_id === user_id
		)
	},
	sendInstantAlert(user_id, push_data) {
		// Queue the notification - it will be removed upon acknowledgment
		this.queuePushNotification(user_id, push_data)

		// Find the active webSocket for the user_id
		Object.keys(this.ws_active).forEach((ws_uuid) => {
			if (this.ws_active[ws_uuid].user_id === user_id) {
				this.ws_active[ws_uuid].send(
					JSON.stringify({
						type: "INSTANT_ALERT", 
						push_data: push_data,
						reply_notification_id: push_data.reply_notification_id,
						message_notification_id: push_data.message_notification_id,
					})
				)
			}
		})
	},
	acknowledgeNotification(user_id, reply_notification_id, message_notification_id) {
		if (this.pending_push_notifications[user_id]) {
			// Remove the specific notification from the queue
			this.pending_push_notifications[user_id] = this.pending_push_notifications[user_id].filter(
				notification => {
					// Check if this notification matches what we're acknowledging
					if (reply_notification_id && notification.push_data.reply_notification_id === reply_notification_id) {
						return false // Remove this notification
					}
					if (message_notification_id && notification.push_data.message_notification_id === message_notification_id) {
						return false // Remove this notification
					}
					return true // Keep this notification
				}
			)

			// Clean up empty queues
			if (this.pending_push_notifications[user_id].length === 0) {
				delete this.pending_push_notifications[user_id]
			}
		}
	},
}
