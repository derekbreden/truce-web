const ai = require("../ai");
const crypto = require("node:crypto");
const {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} = require("@aws-sdk/client-s3");
const object_client = new S3Client({
  region: "us-east-1",
});

module.exports = async (req, res) => {
  if (
    !res.writableEnded &&
    req.session.user_id &&
    req.body.title &&
    req.body.body &&
    req.body.path &&
    req.body.pngs
  ) {
    const messages = [];

    messages.push({
      role: "user",
      name: (req.session.display_name || "Anonymous").replace(
        /[^a-z0-9_\-]/g,
        "",
      ),
      content: [
        { type: "text", text: req.body.title + "\n\n" + req.body.body },
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
    if (ai_response_text !== "Spam") {
      let slug = req.body.title
        .replace(/[^a-z0-9 ]/gi, "")
        .replace(/ {1,}/g, "_");
      // If slug exists, add a uuid to it
      const slug_exists = await req.client.query(
        `
        SELECT slug FROM topics WHERE slug = $1
        `,
        [ slug ]
      );
      if (slug_exists.rows.length > 0) {
        slug = (slug + "-" + crypto.randomUUID()).replace(/\-/g, "_");
      }
      let topic_id = 0;
      // Update existing
      if (req.body.topic_id) {
        await req.client.query(
          `
          UPDATE topics
          SET
            title = $1,
            slug = $2,
            body = $3,
            note = $4,
            create_date = NOW()
          WHERE
            topic_id = $5
            AND user_id = $6
          `,
          [
            req.body.title,
            slug,
            req.body.body,
            ai_response_text.replace(/[^a-z\-]/ig, "") === "OK" ? null : ai_response_text,
            req.body.topic_id,
            req.session.user_id,
          ],
        );
        topic_id = req.body.topic_id;

        // Add new
      } else {
        const topic_result = await req.client.query(
          `
          INSERT INTO topics
            (title, slug, body, note, user_id)
          VALUES
            ($1, $2, $3, $4, $5)
          RETURNING topic_id;
          `,
          [
            req.body.title,
            slug,
            req.body.body,
            ai_response_text.replace(/[^a-z\-]/ig, "") === "OK" ? null : ai_response_text,
            req.session.user_id,
          ],
        );
        topic_id = topic_result.rows[0].topic_id;
      }

      // Remove existing images
      if (req.body.topic_id) {
        const existing_images = await req.client.query(
          `
          DELETE FROM topic_images
          WHERE topic_id = $1
          RETURNING image_uuid
          `,
          [topic_id],
        );
        for (const existing_image of existing_images.rows) {
          try {
            await object_client.send(
              new DeleteObjectCommand({
                Bucket: "truce.net",
                Key: `${existing_image.image_uuid}.png`,
              }),
            );
          } catch (err) {
            console.error(err);
          }
        }
      }

      // Add new images
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
          await req.client.query(
            `
            INSERT INTO topic_images
              (topic_id, image_uuid)
            VALUES
              ($1, $2)
            `,
            [topic_id, image_uuid],
          );
        } catch (error) {
          console.error(error);
        }
      }

      // Send websocket update
      req.sendWsMessage("UPDATE", topic_id);

      // Respond with success so the client reloads
      res.end(
        JSON.stringify({
          success: true,
          slug,
        }),
      );
    } else {
      res.end(
        JSON.stringify({
          error: ai_response_text,
        }),
      );
    }
  }
};
