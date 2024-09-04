module.exports = async (req, res) => {
  if (!res.writableEnded && req.body.path && req.body.path.substr(0, 6) === "/user/") {
    const user = await req.client.query(
      `
      SELECT
        u.user_id,
        u.display_name,
        u.display_name_index,
        u.slug,
        u.profile_picture_uuid,
        CASE WHEN s.user_id IS NULL THEN false ELSE true END AS subscribed
      FROM
        users u
      LEFT JOIN subscribers s ON
        u.user_id = s.subscribed_to_user_id
        AND s.user_id = $1
      WHERE
        ${
          Number(req.body.path.substr(6))
            ? `u.user_id = $2`
            : `u.slug = $2`
        }
      `,
      [
        req.session.user_id || 0,
        req.body.path.substr(6)
      ],
    );
    req.results.user = user.rows[0] || {};
  }
};
