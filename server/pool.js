const { Pool } = require("pg");
module.exports = {
  init(){
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  },
};