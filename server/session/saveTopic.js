const ai = require("../ai");
const prompts = require("../prompts");
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
    req.body.pngs &&
    (req.body.body || req.body.pngs.length) &&
    req.body.path
  ) {
    const messages = [];

    let text_to_evaluate = req.body.title + "\n\n" + req.body.body;
    let poll_counts = "";
    if (req.body.poll_1) {
      text_to_evaluate = `${req.body.title}

${req.body.body}

A) ${req.body.poll_1}
B) ${req.body.poll_2}`;
      if (req.body.poll_3) {
        text_to_evaluate += `\nC) ${req.body.poll_3}`;
      }
      if (req.body.poll_4) {
        text_to_evaluate += `\nD) ${req.body.poll_4}`;
      }
      poll_counts = "0,0,0,0";
    }
    messages.push({
      role: "user",
      name: (req.session.display_name || "Anonymous").replace(
        /[^a-z0-9_\-]/g,
        "",
      ),
      content: [
        { type: "text", text: text_to_evaluate },
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
    const ai_response = await ai.ask(
      messages,
      req.body.poll_1 ? "poll" : "common",
      req.body.poll_1
        ? prompts.poll_response_format
        : prompts.common_response_format,
    );
    let ai_response_parsed = { keyword: "OK" };
    try {
      ai_response_parsed = JSON.parse(ai_response);
    } catch (e) {
      console.error("Failed to parse AI JSON", ai_response, e);
    }
    if (ai_response_parsed.keyword !== "Spam") {
      let slug = req.body.title
        .replace(/[^a-z0-9 ]/gi, "")
        .replace(/ {1,}/g, "_");
      // If slug exists, add a uuid to it
      const slug_exists = await req.client.query(
        `
        SELECT slug FROM topics WHERE slug = $1
        `,
        [slug],
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
            poll_1 = $4,
            poll_2 = $5,
            poll_3 = $6,
            poll_4 = $7,
            poll_counts = $8,
            note = $9,
            counts_max_create_date = NOW(),
            create_date = NOW()
          WHERE
            topic_id = $10
            AND user_id = $11
          `,
          [
            req.body.title,
            slug,
            req.body.body,
            req.body.poll_1 || "",
            req.body.poll_2 || "",
            req.body.poll_3 || "",
            req.body.poll_4 || "",
            poll_counts,
            ai_response_parsed.keyword === "OK"
              ? null
              : `${ai_response_parsed.keyword} ${ai_response_parsed.note}`,
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
            (title, slug, body, poll_1, poll_2, poll_3, poll_4, poll_counts, note, user_id)
          VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING topic_id;
          `,
          [
            req.body.title,
            slug,
            req.body.body,
            req.body.poll_1 || "",
            req.body.poll_2 || "",
            req.body.poll_3 || "",
            req.body.poll_4 || "",
            poll_counts,
            ai_response_parsed.keyword === "OK"
              ? null
              : `${ai_response_parsed.keyword} ${ai_response_parsed.note}`,
            req.session.user_id,
          ],
        );
        topic_id = topic_result.rows[0].topic_id;
      }

      // Remove existing images
      if (req.body.topic_id) {
        const existing_images = await req.client.query(
          `
          SELECT image_uuids
          FROM topics
          WHERE topic_id = $1
          `,
          [topic_id],
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
        UPDATE topics
        SET image_uuids = $1
        WHERE topic_id = $2
        `,
        [image_uuids.join(","), topic_id],
      );

      // Remove existing poll votes
      if (req.body.topic_id) {
        await req.client.query(
          `
          DELETE FROM poll_votes
          WHERE topic_id = $1
          `,
          [topic_id],
        );
      }

      // Get the relevant tags
      const ai_tags_response = await ai.ask(
        messages,
        "tags",
        prompts.tags_response_format,
      );
      let ai_tags_response_parsed = [];
      try {
        ai_tags_response_parsed = JSON.parse(ai_tags_response);
      } catch (e) {
        console.error("Failed to parse AI JSON", ai_tags_response, e);
      }

      await req.client.query(
        `
        DELETE FROM topic_tags
        WHERE topic_id = $1
        `,
        [topic_id],
      );

      const tag_id_query = await req.client.query(
        `
          SELECT tag_id, tag_name FROM tags
        `,
      );
      const tag_ids = tag_id_query.rows.reduce((acc, row) => {
        acc[row.tag_name] = row.tag_id;
        return acc;
      }, {})
      for (const tag of ai_tags_response_parsed.tags) {
        if (ai_tags_response_parsed.tags.includes("polls") && tag === "asks") {
          continue;
        }
        if (tag_ids[tag]) {
          await req.client.query(
            `
            INSERT INTO topic_tags
              (topic_id, tag_id)
            VALUES
              ($1, $2)
            `,
            [
              topic_id,
              tag_ids[tag],
            ],
          );
        } else {
          console.error("Unable to find tag", tag)
        }
      }
      

      // Get estimated poll response
      if (req.body.poll_1) {
        const ai_poll_response = await ai.ask(
          [
            {
              role: "user",
              name: (req.session.display_name || "Anonymous").replace(
                /[^a-z0-9_\-]/gi,
                "",
              ),
              content: [
                { type: "text", text: text_to_evaluate },
                ...req.body.pngs.map((png) => {
                  return {
                    image_url: {
                      url: png.url,
                    },
                    type: "image_url",
                  };
                }),
              ],
            },
          ],
          "poll_estimate",
          prompts.poll_estimate_response_format,
        );
        try {
          const results = JSON.parse(ai_poll_response);
          const total_votes = 1000 * results.response_rate;
          const estimated = [
            Math.round(total_votes * results.choice_a) || 0,
            Math.round(total_votes * results.choice_b) || 0,
            Math.round(total_votes * results.choice_c) || 0,
            Math.round(total_votes * results.choice_d) || 0,
          ];
          await req.client.query(
            `
            UPDATE topics
            SET
              poll_counts_estimated = $1,
              counts_max_create_date = NOW()
            WHERE topic_id = $2
            `,
            [estimated.join(","), topic_id],
          );
        } catch (e) {
          console.error("Error poll response:", e);
        }
      }

      // Send websocket update
      req.sendWsMessage("UPDATE", topic_id);

      // Respond with success so the client reloads
      res.end(
        JSON.stringify({
          success: true,
          slug,
          user_id: req.session.user_id,
          display_name: req.session.display_name,
        }),
      );
    } else {
      res.end(
        JSON.stringify({
          error: `${ai_response_parsed.keyword} ${ai_response_parsed.note}`,
        }),
      );
    }
  }
};
