module.exports = async (req, res) => {
  if (!req.writableEnded && req.session.user_id && req.body.subscription) {
    if (req.body.remove) {
      await req.client.query(
        `
        DELETE FROM subscriptions
        WHERE
          user_id = $1
          AND subscription_json = $2
        `,
        [req.session.user_id, JSON.stringify(req.body.subscription)],
      );
    } else {
      const existing = await req.client.query(
        `
        SELECT subscription_id FROM subscriptions
        WHERE
          user_id = $1
          AND subscription_json = $2
        `,
        [req.session.user_id, JSON.stringify(req.body.subscription)],
      );
      if (!existing.rows.length) {
        await req.client.query(
          `
          INSERT INTO subscriptions (user_id, subscription_json)
          VALUES ($1, $2)
          `,
          [req.session.user_id, JSON.stringify(req.body.subscription)],
        );
      }
    }
    res.end(
      JSON.stringify({
        success: true,
      }),
    );
  }
  if (!req.writableEnded && req.session.user_id && req.body.fcm_subscription) {
    if (req.body.deactivate) {
      const update_result = await req.client.query(
        `
        UPDATE subscriptions
        SET active = FALSE
        WHERE
          user_id = $1
          AND fcm_token = $2
        RETURNING subscription_id
        `,
        [req.session.user_id, JSON.stringify(req.body.fcm_subscription)],
      );
      if (!update_result.rows.length) {
        await req.client.query(
          `
          INSERT INTO subscriptions (user_id, fcm_token, active)
          VALUES ($1, $2, FALSE)
          `,
          [req.session.user_id, JSON.stringify(req.body.fcm_subscription)],
        );
      }
      res.end(
        JSON.stringify({
          success: true,
        }),
      );
    } else if (req.body.reactivate) {
      const update_result = await req.client.query(
        `
        UPDATE subscriptions
        SET active = TRUE
        WHERE
          user_id = $1
          AND fcm_token = $2
        RETURNING subscription_id
        `,
        [req.session.user_id, JSON.stringify(req.body.fcm_subscription)],
      );
      if (!update_result.rows.length) {
        await req.client.query(
          `
          INSERT INTO subscriptions (user_id, fcm_token, active)
          VALUES ($1, $2, TRUE)
          `,
          [req.session.user_id, JSON.stringify(req.body.fcm_subscription)],
        );
      }
      res.end(
        JSON.stringify({
          success: true,
        }),
      );
    } else {
      const existing = await req.client.query(
        `
        SELECT
          subscription_id,
          active
        FROM subscriptions
        WHERE
          user_id = $1
          AND fcm_token = $2
        `,
        [req.session.user_id, JSON.stringify(req.body.fcm_subscription)],
      );
      if (existing.rows.length) {
        res.end(
          JSON.stringify({
            success: true,
            deactivated: !existing.rows[0].active,
          }),
        );
      } else {
        await req.client.query(
          `
          INSERT INTO subscriptions (user_id, fcm_token)
          VALUES ($1, $2)
          `,
          [req.session.user_id, JSON.stringify(req.body.fcm_subscription)],
        );
        res.end(
          JSON.stringify({
            success: true,
          }),
        );
      }
    }
  }
};
