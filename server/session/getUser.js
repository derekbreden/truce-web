module.exports = async (req, res) => {
  if (!res.writableEnded && req.body.path && req.body.path.substr(0, 6) === "/user/") {
    const user = await req.client.query(
      `
      SELECT
        user_id,
        display_name,
        display_name_index,
        slug,
        profile_picture_uuid
      FROM
        users
      WHERE
        ${
          Number(req.body.path.substr(6))
            ? `user_id = $1`
            : `slug = $1`
        }
      `,
      [req.body.path.substr(6)],
    );
    req.results.user = user.rows[0] || {};
  }
};
