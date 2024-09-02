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
    const update_result = await req.client.query(
      `
      UPDATE users
      SET display_name_index = (
        SELECT max(display_name_index)
        FROM users
        WHERE lower(display_name) = lower($1)
      ) + 1
      WHERE user_id = $2
      RETURNING display_name_index
      `,
      [req.body.display_name, req.session.user_id],
    );
    req.session.display_name = req.body.display_name;
    req.session.display_name_index = update_result.rows[0].display_name_index;
    let slug = req.body.display_name.replace(/ /g, "_").toLowerCase();
    if (update_result.rows[0].display_name_index > 0) {
      slug = `${slug}_${update_result.rows[0].display_name_index}`;
    }
    await req.client.query(
      `
      UPDATE users
      SET slug = $1
      WHERE user_id = $2
      `,
      [slug, req.session.user_id],
    );
  }
};
