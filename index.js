// Server
const pool = require("./server/pool");
const email = require("./server/email");
const ai = require("./server/ai");
const schema = require("./server/schema");
const server = require("./server/server");


// Init
(async () => {
  pool.init();
  email.init();
  ai.init();
  await schema.init();
  await server.init();
})();