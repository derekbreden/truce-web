module.exports = async (req, res) => {
  if (!req.writableEnded && req.body.reset_token_uuid) {
    const user_found = await req.client.query(
      `
      SELECT reset_tokens.user_id, users.email, user_sessions.session_id
      FROM reset_tokens
      INNER JOIN users ON reset_tokens.user_id = users.user_id
      LEFT JOIN sessions ON sessions.session_uuid = $1
      LEFT JOIN user_sessions ON user_sessions.user_id = users.user_id AND user_sessions.session_id = sessions.session_id
      WHERE
        reset_tokens.token_uuid = $2
        AND reset_tokens.create_date > NOW() - INTERVAL '60 minutes'
      `,
      [req.session.session_uuid, req.body.reset_token_uuid],
    );

    if (user_found.rows.length > 0) {
      if (!user_found.rows[0].session_id) {
        await req.client.query(
          `
          INSERT INTO user_sessions
            (user_id, session_id)
          VALUES
            ($1, $2)
          `,
          [user_found.rows[0].user_id, req.session.session_id],
        );
      }
      req.results.email = user_found.rows[0].email;
      res.end(JSON.stringify(req.results));
    } else {
      req.results.error = "Reset link expired";
      res.end(JSON.stringify(req.results));
    }
  }
};
