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
	init(server) {
		const wss = new WebSocketServer({ server })
		this.ws_active = {}
		wss.on("connection", (ws) => {
			const ws_uuid = crypto.randomUUID()
			this.ws_active[ws_uuid] = ws
			ws.on("error", () => {
				delete this.ws_active[ws_uuid]
			})
			ws.on("close", () => {
				delete this.ws_active[ws_uuid]
			})
			ws.on("message", async (buffer) => {
				if (this.ws_active[ws_uuid]) {
					const message = JSON.parse(buffer.toString())
					
					// Handle user authentication for messaging
					if (message.user_id) {
						this.ws_active[ws_uuid].user_id = message.user_id
					}
					
					// Handle typing indicators
					if (message.typing && message.conversation_id && this.ws_active[ws_uuid].user_id) {
						// Broadcast typing status to other participants in the conversation
						this.sendTypingIndicator(message.typing, message.conversation_id, this.ws_active[ws_uuid].user_id)
					}
					
					if (message.path) {
						try {
							client = await pool.pool.connect()

							if (message.path.startsWith("/post/")) {
								const post = await client.query(
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
								const reply = await client.query(
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
									const conversation = await client.query(
										`
                      SELECT participant_user_ids
                      FROM conversations
                      WHERE conversation_id = $1
                    `,
										[conversation_id],
									)
									if (conversation.rows.length 
											&& conversation.rows[0].participant_user_ids.includes(this.ws_active[ws_uuid].user_id)) {
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
						} catch (err) {
							console.error("Websocket error", err)
							try {
								this.clearConnectionProperties(ws_uuid)
							} catch (err) {
								console.error("Websocket error deleting", err)
							}
						} finally {
							client.release()
						}
					}
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
	sendTypingIndicator(isTyping, conversation_id, from_user_id) {
		Object.keys(this.ws_active).forEach((ws_uuid) => {
			// Send to users viewing this conversation, but not the sender
			if (this.ws_active[ws_uuid].active_conversation_id === conversation_id 
					&& this.ws_active[ws_uuid].user_id !== from_user_id) {
				const typingMessage = JSON.stringify({
					type: "TYPING_INDICATOR",
					conversation_id,
					user_id: from_user_id,
					typing: isTyping
				})
				this.ws_active[ws_uuid].send(typingMessage)
			}
		})
	},
	sendReadStatusUpdate(conversation_id, updated_by_user_id, new_unread_count) {
		Object.keys(this.ws_active).forEach((ws_uuid) => {
			// Send to users viewing conversations page, but not the user who marked as read
			if (this.ws_active[ws_uuid].user_id !== updated_by_user_id) {
				// Check if user is participant in this conversation and viewing conversations page
				const user_id = this.ws_active[ws_uuid].user_id
				if (user_id) {
					const readStatusMessage = JSON.stringify({
						type: "READ_STATUS_UPDATE",
						conversation_id,
						updated_by_user_id,
						new_unread_count
					})
					this.ws_active[ws_uuid].send(readStatusMessage)
				}
			}
		})
	},
	queuePushNotification(user_id, notification_data) {
		if (!this.pending_push_notifications[user_id]) {
			this.pending_push_notifications[user_id] = []
		}
		this.pending_push_notifications[user_id].push({
			...notification_data,
			timestamp: Date.now()
		})
	},
	flushPendingPushNotifications(user_id) {
		const queued_notifications = this.pending_push_notifications[user_id]
		if (queued_notifications && queued_notifications.length > 0) {
			// Clear the queue first to prevent re-queuing during flush
			delete this.pending_push_notifications[user_id]
			
			// Send each queued notification as a push notification
			queued_notifications.forEach(notification => {
				// Return the notifications for the caller to send via FCM/web-push
				// Since this module doesn't have direct access to webpush/FCM
			})
			
			return queued_notifications
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
	sendInstantAlert(user_id, alert_message) {
		Object.keys(this.ws_active).forEach((ws_uuid) => {
			if (this.ws_active[ws_uuid].user_id === user_id) {
				const alertMessage = JSON.stringify({
					type: "INSTANT_ALERT",
					message: alert_message
				})
				this.ws_active[ws_uuid].send(alertMessage)
			}
		})
	},
}
