const crypto = require("node:crypto");

module.exports = async (req, res) => {
  if (!req.writableEnded && (!req.session.session_uuid || req.body.logout)) {
    req.session.session_uuid = crypto.randomUUID();
    const insert_session = await req.client.query(
      `
      INSERT INTO sessions (session_uuid)
      VALUES ($1) returning session_id;
      `,
      [req.session.session_uuid],
    );
    req.session.session_id = insert_session.rows[0].session_id;

    // Set the cookie like a sane person
    res.setHeader(
      "Set-Cookie",
      `session_uuid=${req.session.session_uuid}; HttpOnly; Secure; Path=/session; Max-Age=315360000`,
    );

    // Workaround for replit Webview not supporting Set-Cookie
    req.results.session_uuid = req.session.session_uuid;
    // END Workaround
  }
};
