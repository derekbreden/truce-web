const crypto = require("node:crypto")
const { WebSocketServer } = require("ws")
const pool = require("./pool")
const { sendWsMessage } = require("./server")

module.exports = {
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
					if (message.path) {
						try {
							client = await pool.pool.connect()

							if (message.path.substr(0, 7) === "/topic/") {
								const topic = await client.query(
									`
                    SELECT post_id
                    FROM posts
                    WHERE slug = $1
                  `,
									[message.path.substr(7)],
								)
								this.ws_active[ws_uuid].active_post_id = topic.rows.length
									? topic.rows[0].post_id
									: false
							} else if (message.path.substr(0, 9) === "/comment/") {
								const comment = await client.query(
									`
                    SELECT parent_post_id
                    FROM replies
                    WHERE comment_id = $1
                  `,
									[message.path.substr(9)],
								)
								this.ws_active[ws_uuid].active_post_id = comment.rows.length
									? comment.rows[0].parent_post_id
									: false
							} else {
								delete this.ws_active[ws_uuid].active_post_id
							}
						} catch (err) {
							console.error("Websocket error", err)
							try {
								delete this.ws_active[ws_uuid].active_post_id
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
}
