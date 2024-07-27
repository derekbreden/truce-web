const http = require("node:http");
const fs = require("node:fs/promises");

module.exports = {
  handleRequest(req, res) {
    // Path is always useful
    req.path = req.url.split("/").join("").split("?")[0];

    // Helper for sending a websocket message
    req.sendWsMessage = this.sendWsMessage.bind(this);

    // Always get the body sent
    req.body = "";
    req.on("readable", () => {
      req.body += req.read() || "";
    });
    req.on("end", async () => {
      try {
        // PATH session
        if (req.path === "session") {
          await require("./handleSession")(req, res);
          return;
        }

        // Path image
        if (req.path.substr(0, 5) === "image" && req.path.length > 20) {
          await require("./handleImage")(req, res);
          return;
        }

        // Path mp3
        if (req.path.substr(0, 3) === "mp3" && req.path.length > 20) {
          await require("./handleMp3")(req, res);
          return;
        }

        // PATH test
        if (req.path === "test_cleanup") {
          await require("./handleTest")(req, res);
          return;
        }

        // PATH for files
        res.statusCode = 200;
        let filename = "index.html";
        let content_type = "text/html; charset=utf-8";
        let encoding = "utf-8";
        if (this.resources.indexOf(req.path) > -1) {
          filename = "resources/" + req.path;
          if (!req.path.endsWith(".js")) {
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          }
        }
        const extension = filename.split(".").pop();
        const content_types = {
          ico: "image/x-icon",
          png: "image/png",
          svg: "image/svg+xml",
          xml: "application/xml",
          gif: "image/gif",
          webmanifest: "application/manifest+json",
          ttf: "font/ttf",
          js: "text/javascript",
        };
        const encodings = {
          ico: "binary",
          png: "binary",
          gif: "binary",
          ttf: "binary",
        };
        if (content_types[extension]) {
          content_type = content_types[extension];
        }
        if (encodings[extension]) {
          encoding = encodings[extension];
        }

        res.setHeader("Content-Type", content_type);
        const data = await fs.readFile(filename, encoding);

        // Handle Server Side Includes for .html files
        if (extension === "html") {
          const parseData = async (data) => {
            const lines = data.split("\n");
            for (const line of lines) {
              if (line.indexOf('<!--#include file="') > -1) {
                const file = line.split('"')[1];

                // Tests are skipped when not on the test path
                const dir = file.split("/")[0];
                if (dir === "tests" && req.path !== "test") {
                  continue;
                }

                const file_content = await fs.readFile(file, encoding);
                await parseData(file_content);
              } else {
                res.write(line + "\n", encoding);
              }
            }
          };
          await parseData(data);
          res.end("", encoding);

          // Return any other file as is
        } else {
          res.end(data, encoding);
        }
      } catch ($error) {
        console.error($error);
        res.end("Error reading file\n");
      }
    });
  },
  async init() {
    const hostname = "0.0.0.0";
    const port = 3000;

    this.resources = [];
    this.resources = await fs.readdir("resources");

    // Our normal http server
    const server = http.createServer(this.handleRequest.bind(this));

    // Our websocket server
    require("./websocket").init(server);

    // Start listening
    server.listen(port, hostname, () => {
      console.log(`Server running at http://${hostname}:${port}/`);
    });
    server.on("error", (err) => {
      console.error(err);
    });
  },
  sendWsMessage(message, topic_id) {
    require("./websocket").sendMessage(message, topic_id);
  },
};
