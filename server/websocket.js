const crypto = require("node:crypto");
const { WebSocketServer } = require("ws");
const pool = require("./pool");
const { sendWsMessage } = require("./server");

module.exports = {
  init(server) {
    const wss = new WebSocketServer({ server });
    this.ws_active = {};
    wss.on("connection", (ws) => {
      const ws_uuid = crypto.randomUUID();
      this.ws_active[ws_uuid] = ws;
      ws.on("error", () => {
        delete this.ws_active[ws_uuid];
      });
      ws.on("close", () => {
        delete this.ws_active[ws_uuid];
      });
      ws.on("message", async (buffer) => {
        if (this.ws_active[ws_uuid]) {
          const message = JSON.parse(buffer.toString());
          if (message.path) {
            try {
              client = await pool.pool.connect();

              if (message.path.substr(0, 7) === "/topic/") {
                const topic = await client.query(
                  `
                    SELECT topic_id
                    FROM topics
                    WHERE slug = $1
                  `,
                  [message.path.substr(7)],
                );
                this.ws_active[ws_uuid].active_topic_id = topic.rows.length
                  ? topic.rows[0].topic_id
                  : false;
              } else if (message.path.substr(0, 9) === "/comment/") {
                const comment = await client.query(
                  `
                    SELECT parent_topic_id
                    FROM comments
                    WHERE comment_id = $1
                  `,
                  [message.path.substr(9)],
                );
                this.ws_active[ws_uuid].active_topic_id = comment.rows.length
                  ? comment.rows[0].parent_topic_id
                  : false;
              } else {
                delete this.ws_active[ws_uuid].active_topic_id;
              }
            } catch (err) {
              console.error("Websocket error", err);
              delete this.ws_active[ws_uuid].active_topic_id;
            } finally {
              client.release();
            }
          }
        }
      });
      ws.send("UPDATE");
    });
  },
  sendMessage(message, topic_id) {
    console.log(`Found ${Object.keys(this.ws_active).length} total clients`);
    Object.keys(this.ws_active).forEach((ws_uuid) => {
      if (
        !this.ws_active[ws_uuid].active_topic_id ||
        this.ws_active[ws_uuid].active_topic_id === topic_id
      ) {
        console.log(`Sending message to ${ws_uuid} for ${topic_id}`)
        this.ws_active[ws_uuid].send(message);
      }
    });
  },
};
