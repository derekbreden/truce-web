const crypto = require("node:crypto")
const { WebSocketServer } = require("ws")
const pool = require("./pool")

module.exports = {
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
									if (conversation.rows.length && 
											conversation.rows[0].participant_user_ids.includes(this.ws_active[ws_uuid].user_id)) {
										this.ws_active[ws_uuid].active_conversation_id = parseInt(conversation_id)
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
		console.log(`Found ${Object.keys(this.ws_active).length} total clients`)
		Object.keys(this.ws_active).forEach((ws_uuid) => {
			if (
				!this.ws_active[ws_uuid].active_post_id ||
				this.ws_active[ws_uuid].active_post_id === post_id
			) {
				console.log(`Sending message to ${ws_uuid} for ${post_id}`)
				this.ws_active[ws_uuid].send(message)
			}
		})
	},
	sendMessageToConversation(message, conversation_id) {
		console.log(`Found ${Object.keys(this.ws_active).length} total clients`)
		Object.keys(this.ws_active).forEach((ws_uuid) => {
			if (this.ws_active[ws_uuid].active_conversation_id === conversation_id) {
				console.log(`Sending message to ${ws_uuid} for conversation ${conversation_id}`)
				this.ws_active[ws_uuid].send(message)
			}
		})
	},
	sendMessageToUser(message, user_id) {
		console.log(`Found ${Object.keys(this.ws_active).length} total clients`)
		Object.keys(this.ws_active).forEach((ws_uuid) => {
			if (this.ws_active[ws_uuid].user_id === user_id) {
				console.log(`Sending message to ${ws_uuid} for user ${user_id}`)
				this.ws_active[ws_uuid].send(message)
			}
		})
	},
	sendMessageToUsers(message, user_ids) {
		console.log(`Found ${Object.keys(this.ws_active).length} total clients`)
		Object.keys(this.ws_active).forEach((ws_uuid) => {
			if (user_ids.includes(this.ws_active[ws_uuid].user_id)) {
				console.log(`Sending message to ${ws_uuid} for users ${user_ids.join(', ')}`)
				this.ws_active[ws_uuid].send(message)
			}
		})
	},
	sendTypingIndicator(isTyping, conversation_id, from_user_id) {
		console.log(`Sending typing indicator (${isTyping}) for conversation ${conversation_id} from user ${from_user_id}`)
		Object.keys(this.ws_active).forEach((ws_uuid) => {
			// Send to users viewing this conversation, but not the sender
			if (this.ws_active[ws_uuid].active_conversation_id === conversation_id && 
					this.ws_active[ws_uuid].user_id !== from_user_id) {
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
}
