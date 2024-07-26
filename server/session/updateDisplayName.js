module.exports = async (req, res) => {
  const update_result = await req.client.query(
    `
    UPDATE users
    SET
      display_name = $1,
      display_name_index = -1
    WHERE
      user_id = $2
      AND display_name <> $1
    RETURNING user_id
    `,
    [req.body.display_name, req.session.user_id],
  );
  if (update_result.rows.length) {
    await req.client.query(
      `
      UPDATE users
      SET display_name_index = (
        SELECT max(display_name_index)
        FROM users
        WHERE lower(display_name) = lower($1)
      ) + 1
      WHERE user_id = $2
      `,
      [req.body.display_name, req.session.user_id],
    );
  }
};