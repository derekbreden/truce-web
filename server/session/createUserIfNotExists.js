module.exports = async (req, res) => {
  if (
    !req.writableEnded &&
    req.session.session_id &&
    !req.session.user_id &&
    (req.body.display_name || req.body.title)
  ) {
    const user_inserted = await req.client.query(
      `
      INSERT INTO users
        (email, display_name)
      VALUES
        ($1, $2)
      RETURNING user_id;
      `,
      ["", ""],
    );
    await req.client.query(
      `
      INSERT INTO user_sessions
        (user_id, session_id)
      VALUES
        ($1, $2)
      `,
      [user_inserted.rows[0].user_id, req.session.session_id],
    );
    req.session.user_id = user_inserted.rows[0].user_id;
  }
};