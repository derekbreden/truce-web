const bcrypt = require("bcrypt");

module.exports = async (req, res) => {
  if (
    !res.writableEnded &&
    req.session.session_id &&
    req.body.email &&
    req.body.password
  ) {
    const user_found = await req.client.query(
      `
      SELECT password_hash, user_id
      FROM users
      WHERE lower(email) = lower($1)
      `,
      [req.body.email],
    );
    if (user_found.rows.length > 0) {
      const password_hash = user_found.rows[0].password_hash;
      const password_match = await bcrypt.compare(
        req.body.password,
        password_hash.toString(),
      );
      if (password_match) {
        await req.client.query(
          `
          INSERT INTO user_sessions
            (user_id, session_id)
          VALUES
            ($1, $2)
          `,
          [user_found.rows[0].user_id, req.session.session_id],
        );
        res.end(
          JSON.stringify({
            success: true,
            signed_in: true,
          }),
        );
      } else {
        res.end(
          JSON.stringify({
            error: "Incorrect password",
          }),
        );
      }
    } else {
      const make_admin = process.env["ROOT_EMAIL"] === req.body.email;
      const password_hash = await bcrypt.hash(req.body.password, 12);

      // If they posted a comment first, they may have a user_id already
      if (req.session.user_id) {
        await req.client.query(
          `
          UPDATE users
          SET
            email = lower($1),
            password_hash = $2,
            admin = $3
          WHERE user_id = $4
          `,
          [req.body.email, password_hash, make_admin, req.session.user_id],
        );

        // Otherwise, create a new user tied to their session
      } else {
        const user_inserted = await req.client.query(
          `
          INSERT INTO users
            (email, password_hash, display_name, admin)
          VALUES
            (lower($1), $2, $3, $4)
          RETURNING user_id
          `,
          [req.body.email, password_hash, "", make_admin],
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
      }

      // Return success so the client reloads
      res.end(
        JSON.stringify({
          success: true,
          created_account: true,
        }),
      );
    }
  }
};
