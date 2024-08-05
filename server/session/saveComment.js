const ai = require("../ai");
const crypto = require("node:crypto");
const {
  GetObjectCommand,
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} = require("@aws-sdk/client-s3");
const object_client = new S3Client({
  region: "us-east-1",
});
const webpush = require("web-push");
webpush.setVapidDetails(
  "mailto:derek@truce.net",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY,
);
const fcm_admin = require("firebase-admin");
const { initializeApp } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");
const fcm_app = initializeApp({
  credential: fcm_admin.credential.cert(
    JSON.parse(process.env.FIREBASE_CREDENTIAL),
  ),
});
const fcm_messaging = getMessaging(fcm_app);

module.exports = async (req, res) => {
  if (
    !res.writableEnded &&
    req.session.user_id &&
    req.body.display_name &&
    req.body.body &&
    req.body.path &&
    req.body.pngs
  ) {
    let topic_id = 0;
    if (req.body.path.substr(0, 7) === "/topic/") {
      const slug = req.body.path.substr(7);
      const topic_results = await req.client.query(
        `
        SELECT topic_id
        FROM topics
        WHERE slug = $1
        `,
        [slug],
      );
      if (topic_results.rows.length) {
        topic_id = topic_results.rows[0].topic_id;
      } else {
        res.end(
          JSON.stringify({
            error: "Path not found",
          }),
        );
        return;
      }
    }
    if (req.body.path.substr(0, 8) === "/comment") {
      const ancestor_comment_id = req.body.path.substr(9);
      const ancestor_topic_results = await req.client.query(
        `
        SELECT parent_topic_id
        FROM comments
        WHERE comment_id = $1
        `,
        [ancestor_comment_id],
      );
      if (ancestor_topic_results.rows.length) {
        topic_id = ancestor_topic_results.rows[0].parent_topic_id;
      } else {
        res.end(
          JSON.stringify({
            error: "Path not found",
          }),
        );
        return;
      }
    }

    const messages = [];
    const topic_results = await req.client.query(
      `
      SELECT
        t.title,
        t.body,
        t.note,
        u.display_name,
        t.image_uuids
      FROM topics t
      INNER JOIN users u ON t.user_id = u.user_id
      WHERE t.topic_id = $1
      ORDER BY t.create_date ASC
      `,
      [topic_id],
    );
    for (const topic of topic_results.rows) {
      // Get base64 image urls from object store
      const pngs = topic.image_uuids
        ? (
            await Promise.all(
              topic.image_uuids.split(",").map(async (image_uuid) => {
                try {
                  const response = await object_client.send(
                    new GetObjectCommand({
                      Bucket: "truce.net",
                      Key: `${image_uuid}.png`,
                    }),
                  );
                  return await response.Body.transformToString();
                } catch (error) {
                  console.error(error);
                  return null;
                }
              }),
            )
          ).filter((x) => x)
        : [];

      // Add a message for the topic(s) being commented on
      messages.push({
        role: "user",
        name: (topic.display_name || "Anonymous").replace(/[^a-z0-9_\-]/gi, ""),
        content: [
          { type: "text", text: topic.title + "\n\n" + topic.body },
          ...pngs.map((png) => {
            return {
              image_url: {
                url: png,
              },
              type: "image_url",
            };
          }),
        ],
      });

      // Add a message for the system response of a note or OK
      if (topic.note) {
        messages.push({
          role: "system",
          content: topic.note,
        });
      } else {
        messages.push({
          role: "system",
          content: "OK",
        });
      }
    }
    const ancestor_ids = [];
    if (req.body.parent_comment_id) {
      messages.push({
        role: "user",
        name: "Admin",
        content: "Comments:",
      });
      const comment_ancestors = await req.client.query(
        `
        SELECT
          u.display_name,
          c.body,
          c.note,
          c.comment_id,
          c.image_uuids
        FROM comments c
        INNER JOIN users u ON u.user_id = c.user_id
        WHERE
          c.comment_id = $1
          OR c.comment_id IN (
            SELECT ancestor_id
            FROM comment_ancestors
            WHERE comment_id = $1
          )
        ORDER BY c.create_date ASC
        `,
        [req.body.parent_comment_id],
      );
      for (const comment_ancestor of comment_ancestors.rows) {
        // Get base64 image urls from object store
        const pngs = comment_ancestor.image_uuids
          ? (
              await Promise.all(
                comment_ancestor.image_uuids
                  .split(",")
                  .map(async (image_uuid) => {
                    try {
                      const response = await object_client.send(
                        new GetObjectCommand({
                          Bucket: "truce.net",
                          Key: `${image_uuid}.png`,
                        }),
                      );
                      return await response.Body.transformToString();
                    } catch (error) {
                      console.error(error);
                      return null;
                    }
                  }),
              )
            ).filter((x) => x)
          : [];

        // Add a message for each ancestor in the comment chain
        messages.push({
          role: "user",
          name: comment_ancestor.display_name.replace(/[^a-z0-9_\-]/gi, ""),
          content: [
            {
              type: "text",
              text:
                comment_ancestor.display_name + ":\n" + comment_ancestor.body,
            },
            ...pngs.map((png) => {
              return {
                image_url: {
                  url: png,
                },
                type: "image_url",
              };
            }),
          ],
        });

        // Add a message for the system response of a note or OK
        if (comment_ancestor.note) {
          messages.push({
            role: "system",
            content: comment_ancestor.note,
          });
        } else {
          messages.push({
            role: "system",
            content: "OK",
          });
        }
      }
      ancestor_ids.push(...comment_ancestors.rows.map((c) => c.comment_id));
    }
    messages.push({
      role: "user",
      name: req.body.display_name.replace(/[^a-z0-9_\-]/gi, ""),
      content: [
        { type: "text", text: req.body.display_name + ":\n" + req.body.body },
        ...req.body.pngs.map((png) => {
          return {
            image_url: {
              url: png.url,
            },
            type: "image_url",
          };
        }),
      ],
    });
    const ai_response_text = await ai.ask(messages, "common");
    if (ai_response_text === "Spam") {
      res.end(
        JSON.stringify({
          error: ai_response_text,
        }),
      );
      return;
    }
    let comment_id = req.body.comment_id;
    if (ai_response_text.replace(/[^a-z\-]/gi, "") === "OK") {
      if (req.body.comment_id) {
        await req.client.query(
          `
          UPDATE comments
          SET body = $1, note = NULL, create_date = NOW()
          WHERE
            comment_id = $2
            AND user_id = $3
          `,
          [req.body.body, req.body.comment_id, req.session.user_id],
        );
      } else {
        const comment_inserted = await req.client.query(
          `
          INSERT INTO comments
            (body, parent_topic_id, user_id, parent_comment_id)
          VALUES
            ($1, $2, $3, $4)
          RETURNING comment_id
          `,
          [
            req.body.body,
            topic_id,
            req.session.user_id,
            req.body.parent_comment_id,
          ],
        );
        comment_id = comment_inserted.rows[0].comment_id;
      }
    } else {
      if (req.body.comment_id) {
        await req.client.query(
          `
          UPDATE comments
          SET body = $1, note = $2, create_date = NOW()
          WHERE
            comment_id = $3
            AND user_id = $4
          `,
          [
            req.body.body,
            ai_response_text,
            req.body.comment_id,
            req.session.user_id,
          ],
        );
      } else {
        const comment_inserted = await req.client.query(
          `
          INSERT INTO comments
            (body, note, parent_topic_id, user_id, parent_comment_id)
          VALUES
            ($1, $2, $3, $4, $5)
          RETURNING comment_id
          `,
          [
            req.body.body,
            ai_response_text,
            topic_id,
            req.session.user_id,
            req.body.parent_comment_id,
          ],
        );
        comment_id = comment_inserted.rows[0].comment_id;
      }
    }

    // Update the display name
    await require("./updateDisplayName")(req, res);

    // Insert all of the ancestors
    if (ancestor_ids.length > 0 && !req.body.comment_id) {
      // Create a values string for the bulk insert
      const values = ancestor_ids
        .map((ancestor_id, index) => `($1, $${index + 2})`)
        .join(", ");

      // Execute the bulk insert query
      await req.client.query(
        `
        INSERT INTO comment_ancestors (comment_id, ancestor_id)
        VALUES ${values}
        `,
        [comment_id, ...ancestor_ids],
      );
    }

    // Remove existing images
    if (req.body.comment_id) {
      const existing_images = await req.client.query(
        `
        SELECT image_uuids
        FROM comments
        WHERE comment_id = $1
        `,
        [comment_id],
      );
      for (const existing_image of existing_images.rows) {
        for (const image_uuid of existing_image.image_uuids.split(",")) {
          try {
            await object_client.send(
              new DeleteObjectCommand({
                Bucket: "truce.net",
                Key: `${image_uuid}.png`,
              }),
            );
          } catch (err) {
            console.error(err);
          }
        }
      }
    }

    // Add new images
    const image_uuids = [];
    for (const png of req.body.pngs) {
      const image_uuid = crypto.randomUUID();
      try {
        await object_client.send(
          new PutObjectCommand({
            Bucket: "truce.net",
            Key: `${image_uuid}.png`,
            Body: png.url,
          }),
        );
        image_uuids.push(image_uuid);
      } catch (error) {
        console.error(error);
      }
    }
    await req.client.query(
      `
      UPDATE comments
      SET image_uuids = $1
      WHERE comment_id = $2
      `,
      [image_uuids.join(","), comment_id],
    );

    // Update the topic comment_count and counts_max_create_date
    await req.client.query(
      `
      UPDATE topics
      SET
        comment_count = COALESCE(subquery.comment_count, 0),
        counts_max_create_date = NOW()
      FROM (
        SELECT
          COUNT(c.*) AS comment_count
        FROM comments c
        LEFT JOIN flagged_comments l ON l.comment_id = c.comment_id
        WHERE
          c.parent_topic_id = $1
          AND l.comment_id IS NULL
      ) AS subquery
      WHERE topics.topic_id = $1
      `,
      [topic_id],
    );

    // Respond with success so the client reloads
    res.end(
      JSON.stringify({
        success: true,
        user_id: req.session.user_id,
        display_name: req.session.display_name,
      }),
    );

    // Send push notifications
    const subscriptions = await req.client.query(
      `
      SELECT
        user_id,
        subscription_json,
        fcm_token
      FROM subscriptions
      WHERE user_id IN (
        SELECT user_id
        FROM topics
        WHERE topic_id = $1
        UNION
        SELECT user_id
        FROM comments
        WHERE comment_id IN (
          SELECT ancestor_id
          FROM comment_ancestors
          WHERE comment_id = $2
        )
      ) AND user_id <> $3
      AND active = TRUE
      `,
      [topic_id, comment_id, req.session.user_id],
    );

    // Get user_id(s) to notify
    const user_ids_to_notify = await req.client.query(
      `
      SELECT user_id
      FROM topics
      WHERE
        topic_id = $1
        AND user_id <> $3
      UNION
      SELECT user_id
      FROM comments
      WHERE
        comment_id IN (
          SELECT ancestor_id
          FROM comment_ancestors
          WHERE comment_id = $2
        )
        AND user_id <> $3
      `,
      [topic_id, comment_id, req.session.user_id],
    );

    // Wait for all notifications to be inserted
    for (const user_id_record of user_ids_to_notify.rows) {
      // Insert notifications records for unread notifications
      await req.client.query(
        `
        INSERT INTO notifications
          (user_id, comment_id)
        VALUES
          ($1, $2)
        `,
        [user_id_record.user_id, comment_id],
      );
    }

    // Trigger all pushes
    subscriptions.rows.forEach(async (subscription) => {
      // Create data for the push
      const short_display_name =
        req.body.display_name.length > 20
          ? req.body.display_name.substr(0, 20) + "..."
          : req.body.display_name;
      const short_body =
        req.body.body.length > 50
          ? req.body.body.substr(0, 50) + "..."
          : req.body.body;
      let tag = `topic:${topic_id}`;

      // Chrome wants unique tags ¯\_(ツ)_/¯
      if (String(subscription.subscription_json || "").match(/google/i)) {
        tag = `comment:${comment_id}`;
      }

      // Get the unread count for this user id
      const unread_count_result = await req.client.query(
        `
        SELECT 
          COUNT(*) AS unread_count
        FROM notifications
        WHERE
          user_id = $1
          AND read = FALSE
        `,
        [subscription.user_id],
      );
      const unread_count = unread_count_result.rows[0].unread_count;

      // Send the push

      // FCM version
      if (subscription.fcm_token) {
        const message = {
          notification: {
            title: `${short_display_name} replied`,
            body: short_body,
          },
          apns: {
            payload: {
              aps: {
                badge: Number(unread_count || 0),
              },
            },
          },
          token: JSON.parse(subscription.fcm_token),
        };
        try {
          const result = await fcm_messaging.send(message);
          console.log(result);
        } catch (e) {
          console.log(e.message);
          console.log(e.code);
          if (e.code === "messaging/registration-token-not-registered") {
            console.log("Unsubscribing", subscription.fcm_token);
            await req.client.query(
              `
              DELETE FROM subscriptions
              WHERE fcm_token = $1
              `,
              [subscription.fcm_token],
            );
          }
        }

        // Web Push version
      } else {
        webpush
          .sendNotification(
            JSON.parse(subscription.subscription_json),
            JSON.stringify({
              title: `${short_display_name} replied`,
              body: short_body,
              tag,
              unread_count,
            }),
          )
          .then(console.log)
          .catch(async (error) => {
            // 410 means unsubscribed and is expected, but means we need to stop sending to that subscription_json
            if (error.statusCode === 410) {
              console.log("Unsubscribing", subscription.subscription_json);
              await req.client.query(
                `
              DELETE FROM subscriptions
              WHERE subscription_json = $1
              `,
                [subscription.subscription_json],
              );
            } else {
              console.error(error);
            }
          });
      }
    });

    // Send websocket update after all notifications have been inserted
    req.sendWsMessage("UPDATE", topic_id);
  }
};
