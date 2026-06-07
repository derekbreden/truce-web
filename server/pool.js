const { Pool, types } = require("pg")
module.exports = {
	init() {
		this.pool = new Pool({
			connectionString: process.env.DATABASE_URL,
			ssl: { rejectUnauthorized: false },
		})

		// Override type parser to use Number instead of string (we don't care about big numbers)
		;[20, 21, 23, 700, 701, 1700].forEach((typeId) => {
			types.setTypeParser(typeId, (val) => {
				return Number(val)
			})
		})
	},
}
