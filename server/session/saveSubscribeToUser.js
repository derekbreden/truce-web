module.exports = async (req, res) => {
  if (
    !res.writableEnded &&
    req.session.user_id &&
    req.body.subscribe_to_user_id
  ) {
    await req.client.query(
      `
      DELETE FROM subscribers
      WHERE
        user_id = $1
        AND subscribed_to_user_id = $2
      `,
      [req.session.user_id, req.body.subscribe_to_user_id],
    );
    if (!req.body.remove) {
      await req.client.query(
        `
        INSERT INTO subscribers
        (user_id, subscribed_to_user_id)
        VALUES ($1, $2)
        `,
        [req.session.user_id, req.body.subscribe_to_user_id],
      );
    }
    await req.client.query(
      `
      UPDATE users
      SET subscribed_to_users = (
        SELECT COUNT(*) as subscribed_to_users
        FROM subscribers
        WHERE user_id = $1
      )
      WHERE user_id = $1
      `,
      [req.session.user_id],
    );
    res.end(
      JSON.stringify({
        success: true,
      }),
    );
  }
};
