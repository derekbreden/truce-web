// One-time data migration: CockroachDB -> Render PostgreSQL.
//
// Usage:
//   SOURCE_DATABASE_URL="postgresql://...cockroachlabs.cloud:26257/truce?sslmode=verify-full" \
//   DEST_DATABASE_URL="postgresql://...render.com/truce_db" \
//   node migration/migrate-data.js
//
// - Applies migration/schema.sql to the destination (DROP + CREATE), then copies
//   every table, then resets IDENTITY sequences to MAX(id), then verifies row counts.
// - Source is read-only. Whole run is one transaction on the destination: any error
//   rolls back and leaves the destination empty.
// - Timestamps are transferred as raw strings (no timezone reinterpretation) and
//   bigints stay strings, so values are byte-for-byte preserved.

const fs = require("fs")
const path = require("path")
const { Pool, types } = require(path.join(__dirname, "..", "node_modules", "pg"))

// Preserve values exactly: timestamps as raw text (no tz math), bigints as strings.
types.setTypeParser(1114, (v) => v) // timestamp without time zone
types.setTypeParser(1184, (v) => v) // timestamp with time zone

const SOURCE = process.env.SOURCE_DATABASE_URL
const DEST = process.env.DEST_DATABASE_URL
if (!SOURCE || !DEST) {
	console.error("Set SOURCE_DATABASE_URL and DEST_DATABASE_URL")
	process.exit(1)
}

// No FK constraints in the source, so order is irrelevant.
const TABLES = [
	"sessions", "users", "user_sessions", "reset_tokens", "subscriptions",
	"blocked_users", "subscribers", "replies", "reply_ancestors", "favorite_posts",
	"favorite_replies", "flagged_posts", "flagged_replies", "post_poll_votes",
	"reply_notifications", "posts", "topics", "post_topics", "message_notifications",
	"conversations", "conversation_users", "messages",
]

// table -> IDENTITY column whose sequence must be reset after explicit-id inserts.
const IDENTITY = {
	sessions: "session_id", users: "user_id", reset_tokens: "token_id",
	subscriptions: "subscription_id", blocked_users: "blocked_id",
	subscribers: "subscriber_id", replies: "reply_id",
	favorite_posts: "favorite_post_id", favorite_replies: "favorite_reply_id",
	flagged_posts: "flagged_post_id", flagged_replies: "flagged_reply_id",
	post_poll_votes: "poll_vote_id", reply_notifications: "notification_id",
	posts: "post_id", topics: "topic_id", message_notifications: "notification_id",
	conversations: "conversation_id", messages: "message_id",
}

const chunk = (arr, n) => {
	const out = []
	for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n))
	return out
}

;(async () => {
	const source = new Pool({ connectionString: SOURCE })
	const dest = new Pool({ connectionString: DEST, ssl: { rejectUnauthorized: false } })
	const s = await source.connect()
	const d = await dest.connect()
	try {
		console.log("Applying schema.sql to destination...")
		const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8")
		await d.query("BEGIN")
		await d.query(schema)

		for (const t of TABLES) {
			const cols = (await d.query(
				"SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position",
				[t],
			)).rows.map((r) => r.column_name)
			const collist = cols.map((c) => `"${c}"`).join(", ")
			const src = await s.query(`SELECT ${collist} FROM "${t}"`)
			let inserted = 0
			for (const rows of chunk(src.rows, 200)) {
				const values = []
				const tuples = rows.map((row, ri) => {
					const ph = cols.map((c, ci) => `$${ri * cols.length + ci + 1}`)
					for (const c of cols) values.push(row[c])
					return `(${ph.join(",")})`
				})
				await d.query(`INSERT INTO "${t}" (${collist}) VALUES ${tuples.join(",")}`, values)
				inserted += rows.length
			}
			console.log(`  copied ${t}: ${inserted}`)
		}

		console.log("Resetting IDENTITY sequences...")
		for (const [t, col] of Object.entries(IDENTITY)) {
			const m = (await d.query(`SELECT MAX("${col}")::bigint AS m FROM "${t}"`)).rows[0].m
			if (m !== null) {
				await d.query("SELECT setval(pg_get_serial_sequence($1, $2), $3, true)", [t, col, m])
			}
		}

		await d.query("COMMIT")
		console.log("Committed.\n")
	} catch (e) {
		await d.query("ROLLBACK").catch(() => {})
		console.error("MIGRATION FAILED:", e.message)
		s.release(); d.release(); await source.end(); await dest.end()
		process.exit(1)
	}

	console.log("Verification (source vs dest row counts):")
	let allOk = true
	for (const t of TABLES) {
		const sc = Number((await s.query(`SELECT count(*) AS n FROM "${t}"`)).rows[0].n)
		const dc = Number((await d.query(`SELECT count(*) AS n FROM "${t}"`)).rows[0].n)
		const ok = sc === dc
		if (!ok) allOk = false
		console.log(`  ${ok ? "OK " : "!! "} ${t}: source=${sc} dest=${dc}`)
	}
	s.release(); d.release(); await source.end(); await dest.end()
	console.log(allOk ? "\nALL TABLES MATCH ✅" : "\nROW COUNT MISMATCH ❌")
	process.exit(allOk ? 0 : 1)
})().catch((e) => { console.error("FATAL", e); process.exit(1) })
