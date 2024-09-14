module.exports = async (req, res) => {
  if (
    !res.writableEnded &&
    req.body.path &&
    req.body.path.substr(0, 6) === "/user/"
  ) {
    const user = await req.client.query(
      `
      SELECT
        u.user_id,
        u.display_name,
        u.display_name_index,
        u.slug as user_slug,
        u.profile_picture_uuid,
        CASE WHEN s.user_id IS NULL THEN false ELSE true END AS subscribed
      FROM
        users u
      LEFT JOIN subscribers s ON
        u.user_id = s.subscribed_to_user_id
        AND s.user_id = $1
      WHERE
        ${Number(req.body.path.split("/")[2]) ? `u.user_id = $2` : `u.slug = $2`}
      `,
      [req.session.user_id || 0, req.body.path.split("/")[2]],
    );
    req.results.user = user.rows[0] || {};
    if (req.body.path.split("/")[3] === "subscribers") {
      const users = await req.client.query(
        `
        SELECT
          u.user_id,
          u.display_name,
          u.display_name_index,
          u.slug as user_slug,
          u.profile_picture_uuid,
          CASE WHEN s2.user_id IS NULL THEN false ELSE true END AS subscribed
        FROM
          users u
        INNER JOIN subscribers s ON
          u.user_id = s.user_id
        LEFT JOIN subscribers s2 ON
          u.user_id = s2.subscribed_to_user_id
          AND s2.user_id = $1
        WHERE
          s.subscribed_to_user_id = $2
        `,
        [req.session.user_id || 0, user.rows[0].user_id],
      );
      req.results.users = users.rows;
    }
    if (req.body.path.split("/")[3] === "subscribed_to_users") {
      const users = await req.client.query(
        `
        SELECT
          u.user_id,
          u.display_name,
          u.display_name_index,
          u.slug as user_slug,
          u.profile_picture_uuid,
          CASE WHEN s2.user_id IS NULL THEN false ELSE true END AS subscribed
        FROM
          users u
        INNER JOIN subscribers s ON
          u.user_id = s.subscribed_to_user_id
        LEFT JOIN subscribers s2 ON
          u.user_id = s2.subscribed_to_user_id
          AND s2.user_id = $1
        WHERE
          s.user_id = $2
        `,
        [req.session.user_id || 0, user.rows[0].user_id],
      );
      req.results.users = users.rows;
    }
  }
};
