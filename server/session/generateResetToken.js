const email = require("../email");
const crypto = require("node:crypto");

module.exports = async (req, res) => {
  if (!req.writableEnded && req.session.session_id && req.body.email && !req.body.password) {
    const user_found = await req.client.query(
      `
      SELECT user_id
      FROM users
      WHERE lower(email) = lower($1)
      `,
      [req.body.email],
    );
    if (user_found.rows.length > 0) {
      const token_uuid = crypto.randomUUID();
      await req.client.query(
        `
        INSERT INTO reset_tokens
          (user_id, token_uuid)
        VALUES
          ($1, $2)
        `,
        [user_found.rows[0].user_id, token_uuid],
      );
      const token_url = `https://truce.net/reset/${token_uuid}`;
      email.send(
        req.body.email,
        "Reset your password on Truce.net",
        `A password reset request was made for your email on Truce.net

To reset your password, please open the link below:
${token_url}

This link will expire after 30 minutes.

If you did not request this, please ignore this email.`,
        `
<p>A password reset request was made for your email on Truce.net</p>
<p>To reset your password, please click the link below:</p>
<p><a href="${token_url}">${token_url}</a></p>
<p>This link will expire after 30 minutes.</p>
<p>If you did not request this, please ignore this email.</p>
              `,
      );
    }
    res.end(
      JSON.stringify({
        success: true,
      }),
    );
  }
};