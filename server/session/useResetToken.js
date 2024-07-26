const bcrypt = require("bcrypt");

module.exports = async (req, res) => {
  if (
    !res.writableEnded &&
    req.session.session_id &&
    req.body.password &&
    req.body.reset_token_uuid
  ) {
    const token_found = await req.client.query(
      `
      SELECT reset_tokens.user_id
      FROM reset_tokens
      WHERE
        reset_tokens.token_uuid = $1
        AND reset_tokens.create_date > NOW() - INTERVAL '60 minutes'
      `,
      [req.body.reset_token_uuid],
    );
    if (token_found.rows.length > 0) {
      const user_id_found = token_found.rows[0].user_id;
      const password_hash = await bcrypt.hash(req.body.password, 12);
      await client.query(
        `
        UPDATE users
          SET password_hash = $1
        WHERE user_id = $2
        `,
        [password_hash, user_id_found],
      );
      res.end(
        JSON.stringify({
          success: true,
        }),
      );
    } else {
      res.end(
        JSON.stringify({
          error: "Reset link expired",
        }),
      );
    }
  }
};