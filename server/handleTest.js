const pool = require("./pool");

module.exports = async (req, res) => {
  try {
    req.client = await pool.pool.connect();

    const user_found = await req.client.query(
      `
      SELECT user_id
      FROM users
      WHERE lower(email) = ($1)
      `,
      ["testemail@testemail.com"],
    );
    if (user_found.rows.length) {
      await req.client.query(
        `
        DELETE FROM sessions WHERE session_id IN (
          SELECT session_id
          FROM user_sessions
          WHERE user_id = $1
        )
        `,
        [user_found.rows[0].user_id],
      );
      await req.client.query(
        `
        DELETE FROM user_sessions WHERE user_id = $1
        `,
        [user_found.rows[0].user_id],
      );
      await req.client.query(
        `
        DELETE FROM comment_ancestors WHERE comment_id IN (
          SELECT comment_id
          FROM comments
          WHERE user_id = $1
        )
        `,
        [user_found.rows[0].user_id],
      );
      await req.client.query(
        `
        DELETE FROM comments WHERE user_id = $1
        `,
        [user_found.rows[0].user_id],
      );
      await req.client.query(
        `
        DELETE FROM topics WHERE user_id = $1
        `,
        [user_found.rows[0].user_id],
      );
      await req.client.query(
        `
        DELETE FROM users WHERE user_id = $1
        `,
        [user_found.rows[0].user_id],
      );
    }
    res.end(JSON.stringify({ success: true }));
  } catch (err) {
    console.error("Test error", err);
    res.end(JSON.stringify({ error: "Database error" }));
  } finally {
    req.client.release();
  }
};