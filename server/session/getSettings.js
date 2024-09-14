module.exports = async (req, res) => {
  if (!res.writableEnded && req.body.path && req.body.path === "/settings") {
    const users = await req.client.query(
      `
      SELECT
        u.user_id,
        u.display_name,
        u.display_name_index,
        CASE WHEN (u.slug = '' OR u.slug IS NULL) THEN u.user_id::VARCHAR ELSE u.slug END as user_slug,
        u.profile_picture_uuid,
        TRUE as subscribed
      FROM
        users u
      INNER JOIN subscribers s ON
        u.user_id = s.subscribed_to_user_id
      WHERE
        s.user_id = $1
      `,
      [req.session.user_id || 0],
    );
    req.results.users = users.rows;
  }
};
