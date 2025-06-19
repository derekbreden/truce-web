const crypto = require("node:crypto")
const { WebSocketServer } = require("ws")
const pool = require("./pool")

module.exports = {
	pending_push_notifications: {},
	clearConnectionProperties(ws_uuid) {
		if (this.ws_active[ws_uuid]) {
			delete this.ws_active[ws_uuid].active_post_id
			delete this.ws_active[ws_uuid].active_conversation_id
		}
	},
	async init(server) {
		const wss = new WebSocketServer({ server })
		this.ws_active = this.ws_active || {}
		wss.on("connection", (ws) => {
			const ws_uuid = crypto.randomUUID()
			this.ws_active[ws_uuid] = ws
			ws.on("error", () => {
				// Flush any pending notifications for this user before cleanup
				const user_id = this.ws_active[ws_uuid]?.user_id
				if (user_id) {
					delete this.ws_active[ws_uuid].user_id
					this.flushPendingPushNotifications(user_id)
				}
				delete this.ws_active[ws_uuid]
			})
			ws.on("close", () => {
				// Flush any pending notifications for this user before cleanup
				const user_id = this.ws_active[ws_uuid]?.user_id
				if (user_id) {
					delete this.ws_active[ws_uuid].user_id
					this.flushPendingPushNotifications(user_id)
				}
				delete this.ws_active[ws_uuid]
			})
			ws.on("message", async (buffer) => {
				if (this.ws_active[ws_uuid]) {
					const pool_client = await pool.pool.connect()
					const message = JSON.parse(buffer.toString())
					
					// Handle user authentication for messaging
					if (message.session_uuid) {
						if (this.ws_active[ws_uuid].session_uuid !== message.session_uuid) {
							this.ws_active[ws_uuid].session_uuid = message.session_uuid
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
							if (this.ws_active[ws_uuid]) {
								this.ws_active[ws_uuid].user_id = session_results.rows.length
									? session_results.rows[0].user_id
									: null
							}
						}
					}
					
					
					// Handle instant alert acknowledgments
					if (message.type === "INSTANT_ALERT_ACK" && message.notification_id && this.ws_active[ws_uuid].user_id) {
						this.acknowledgeNotification(this.ws_active[ws_uuid].user_id, message.notification_id)
					}
					
					if (message.path) {
						if (message.path.startsWith("/post/")) {
							const post = await pool_client.query(
								`
									SELECT post_id
									FROM posts
									WHERE slug = $1
								`,
								[message.path.split("/")[2]],
							)
							this.clearConnectionProperties(ws_uuid)
							if (this.ws_active[ws_uuid]) {
								this.ws_active[ws_uuid].active_post_id = post.rows.length
									? post.rows[0].post_id
									: false
							}
						} else if (message.path.startsWith("/reply/")) {
							const reply = await pool_client.query(
								`
									SELECT parent_post_id
									FROM replies
									WHERE reply_id = $1
								`,
								[message.path.split("/")[2]],
							)
							this.clearConnectionProperties(ws_uuid)
							if (this.ws_active[ws_uuid]) {
								this.ws_active[ws_uuid].active_post_id = reply.rows.length
									? reply.rows[0].parent_post_id
									: false
							}
						} else if (message.path.startsWith("/messages/")) {
							// Handle conversation tracking for messaging
							const conversation_id = message.path.split("/")[2]
							
							if (conversation_id && this.ws_active[ws_uuid].user_id) {
								// Verify user is participant in this conversation
								const conversation = await pool_client.query(
									`
										SELECT conversation_id
										FROM conversation_participants
										WHERE conversation_id = $1 AND user_id = $2
									`,
									[conversation_id, this.ws_active[ws_uuid].user_id],
								)
								if (conversation.rows.length) {
									this.ws_active[ws_uuid].active_conversation_id = Number(conversation_id)
								}
							}
							if (this.ws_active[ws_uuid]) {
								delete this.ws_active[ws_uuid].active_post_id
							}
						} else if (message.path === "/conversations") {
							this.clearConnectionProperties(ws_uuid)
						} else {
							this.clearConnectionProperties(ws_uuid)
						}
					}
					pool_client.release()
				}
			})
			ws.send("UPDATE")
		})
	},
	sendMessage(message, post_id) {
		Object.keys(this.ws_active).forEach((ws_uuid) => {
			if (
				!this.ws_active[ws_uuid].active_post_id
				|| this.ws_active[ws_uuid].active_post_id === post_id
			) {
				this.ws_active[ws_uuid].send(message)
			}
		})
	},
	sendMessageToConversation(message, conversation_id) {
		Object.keys(this.ws_active).forEach((ws_uuid) => {
			if (this.ws_active[ws_uuid].active_conversation_id === conversation_id) {
				this.ws_active[ws_uuid].send(message)
			}
		})
	},
	sendMessageToUser(message, user_id) {
		Object.keys(this.ws_active).forEach((ws_uuid) => {
			if (this.ws_active[ws_uuid].user_id === user_id) {
				this.ws_active[ws_uuid].send(message)
			}
		})
	},
	sendMessageToUsers(message, user_ids) {
		Object.keys(this.ws_active).forEach((ws_uuid) => {
			if (user_ids.includes(this.ws_active[ws_uuid].user_id)) {
				this.ws_active[ws_uuid].send(message)
			}
		})
	},
	queuePushNotification(user_id, notification_id, push_data) {
		if (!this.pending_push_notifications[user_id]) {
			this.pending_push_notifications[user_id] = []
		}
		this.pending_push_notifications[user_id].push({
			notification_id,
			push_data,
		})
	},
	flushPendingPushNotifications(user_id) {
		const queued_notifications = this.pending_push_notifications[user_id]
		if (queued_notifications && queued_notifications.length > 0) {
			delete this.pending_push_notifications[user_id]
			for (const notification of queued_notifications) {
				const notification_ids = {}
				notification_ids[user_id] = notification.notification_id
				require("./push").sendPush(
					[user_id],
					notification_ids,
					notification.push_data,
				)
			}
		}
		return []
	},
	isUserActivelyViewing(user_id, conversation_id) {
		// Check if user has an active WebSocket connection viewing this conversation
		return Object.values(this.ws_active).some(ws => 
			ws.user_id === user_id && 
			ws.active_conversation_id === Number(conversation_id)
		)
	},
	hasActiveWebSocketConnection(user_id) {
		// Check if user has ANY active WebSocket connection
		return Object.values(this.ws_active).some(ws => 
			ws.user_id === user_id
		)
	},
	isUserActivelyViewingPost(user_id, post_id) {
		// Check if user has an active WebSocket connection viewing this post
		return Object.values(this.ws_active).some(ws => 
			ws.user_id === user_id && 
			ws.active_post_id === Number(post_id)
		)
	},
	sendInstantAlert(user_id, notification_id, push_data) {
		// Queue the notification - it will be removed upon acknowledgment
		this.queuePushNotification(user_id, notification_id, push_data)

		// Find the active webSocket for the user_id
		Object.keys(this.ws_active).forEach((ws_uuid) => {
			if (this.ws_active[ws_uuid].user_id === user_id) {
				this.ws_active[ws_uuid].send(
					JSON.stringify({
						type: "INSTANT_ALERT", 
						push_data: push_data,
						notification_id: notification_id,
					})
				)
			}
		})
	},
	acknowledgeNotification(user_id, notification_id) {
		if (this.pending_push_notifications[user_id]) {
			// Remove the specific notification from the queue
			this.pending_push_notifications[user_id] = this.pending_push_notifications[user_id].filter(
				notification => notification.notification_id !== notification_id
			)

			// Clean up empty queues
			if (this.pending_push_notifications[user_id].length === 0) {
				delete this.pending_push_notifications[user_id]
			}
		}
	},
}
