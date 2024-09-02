// const ai = require("../ai");
// const prompts = require("../prompts");
// const { GetObjectCommand, S3Client } = require("@aws-sdk/client-s3");
// const object_client = new S3Client({
//   region: "us-east-1",
// });

module.exports = async (req, res) => {
  if (
    !res.writableEnded &&
    (req.body.path === "/topics" ||
      req.body.path?.substr(0, 5) === "/tag/" ||
      req.body.path?.substr(0, 6) === "/user/")
  ) {
    if (!req.body.max_comment_create_date) {
      const topic_results = await req.client.query(
        `
        SELECT
          t.create_date,
          t.topic_id,
          t.title,
          u.display_name,
          CASE WHEN u.display_name = '' THEN u.user_id ELSE u.display_name_index END as display_name_index,
          CASE WHEN u.slug = '' THEN u.user_id::VARCHAR ELSE u.slug END as user_slug,
          u.profile_picture_uuid,
          t.slug,
          LEFT(t.body, 1000) as body,
          t.poll_1,
          t.poll_2,
          t.poll_3,
          t.poll_4,
          t.poll_counts,
          t.poll_counts_estimated,
          t.note,
          t.favorite_count,
          t.comment_count,
          t.counts_max_create_date,
          CASE WHEN t.user_id = $1 THEN true ELSE false END AS edit,
          t.image_uuids,
          CASE WHEN f.user_id IS NOT NULL THEN TRUE ELSE FALSE END as favorited,
          CASE WHEN EXISTS (
            SELECT 1
            FROM comments c
            WHERE c.parent_topic_id = t.topic_id
              AND c.user_id = $1
          ) THEN TRUE ELSE FALSE END as commented,
          CASE WHEN v.user_id IS NOT NULL THEN TRUE ELSE FALSE END as voted,
          (
            SELECT STRING_AGG(ts.tag_name, ',')
            FROM topic_tags tt
            INNER JOIN tags ts ON ts.tag_id = tt.tag_id
            WHERE tt.topic_id = t.topic_id
          ) as tags
        FROM topics t
        LEFT JOIN users u ON u.user_id = t.user_id
        LEFT JOIN favorite_topics f ON f.topic_id = t.topic_id AND f.user_id = $1
        LEFT JOIN poll_votes v ON v.topic_id = t.topic_id AND v.user_id = $1
        LEFT JOIN flagged_topics l ON l.topic_id = t.topic_id
        LEFT JOIN blocked_users b ON b.user_id_blocked = t.user_id AND b.user_id_blocking = $1
        WHERE
          (t.create_date > $2 OR $2 IS NULL)
          AND (t.create_date < $3 OR $3 IS NULL)
          AND l.topic_id IS NULL
          AND b.user_id_blocked IS NULL
          ${
            req.body.path.substr(0, 5) === "/tag/"
              ? `
                AND t.topic_id IN (
                  SELECT topic_id
                  FROM topic_tags
                  WHERE tag_id = (
                    SELECT tag_id
                    FROM tags
                    WHERE tag_name = $4
                  )
                )
                `
              : ""
          }
          ${
            req.body.path.substr(0, 6) === "/user/"
              ? `
                AND t.user_id IN (
                  SELECT user_id
                  FROM users
                  WHERE 
                    ${
                      Number(req.body.path.substr(6))
                        ? `user_id = $4`
                        : `slug = $4`
                    }
                )
                `
              : ""
          }
        ORDER BY t.create_date DESC
        LIMIT 20
        `,
        [
          req.session.user_id || 0,
          req.body.min_topic_create_date || null,
          req.body.max_topic_create_date || null,
          req.body.path.substr(0, 5) === "/tag/"
            ? req.body.path.substr(5)
            : req.body.path.substr(0, 6) === "/user/"
              ? req.body.path.substr(6)
              : undefined,
        ].filter(x => x !== undefined),
      );
      req.results.path = req.body.path;
      req.results.topics.push(...topic_results.rows);

      //       topic_results.rows.forEach(async (topic) => {

      //         const messages = [];

      //         let text_to_evaluate = topic.title + "\n\n" + topic.body;
      //         let poll_counts = "";
      //         if (topic.poll_1) {
      //           text_to_evaluate = `${topic.title}

      // ${topic.body}

      // A) ${topic.poll_1}
      // B) ${topic.poll_2}`;
      //           if (topic.poll_3) {
      //             text_to_evaluate += `\nC) ${topic.poll_3}`;
      //           }
      //           if (topic.poll_4) {
      //             text_to_evaluate += `\nD) ${topic.poll_4}`;
      //           }
      //           poll_counts = "0,0,0,0";
      //         }

      //         const pngs = [];
      //         console.warn(topic.image_uuids.split(",").filter(x => x))
      //         for (const image_uuid of topic.image_uuids.split(",").filter(x => x)) {
      //           if (image_uuid) {
      //             console.warn(image_uuid)
      //             try {
      //               const response = await object_client.send(
      //                 new GetObjectCommand({
      //                   Bucket: "truce.net",
      //                   Key: `${image_uuid}.png`,
      //                 }),
      //               );
      //               const base64_string = await response.Body.transformToString();
      //               pngs.push(base64_string);

      //             } catch (err) {
      //               console.error(err);
      //             }
      //           }
      //         }
      //         messages.push({
      //           role: "user",
      //           name: (topic.display_name || "Anonymous").replace(
      //             /[^a-z0-9_\-]/g,
      //             "",
      //           ),
      //           content: [
      //             { type: "text", text: text_to_evaluate },
      //             ...pngs.map((png) => {
      //               return {
      //                 image_url: {
      //                   url: png,
      //                 },
      //                 type: "image_url",
      //               };
      //             }),
      //           ],
      //         });

      //         // Get the relevant tags
      //         const ai_tags_response = await ai.ask(
      //           messages,
      //           "tags",
      //           prompts.tags_response_format,
      //         );
      //         let ai_tags_response_parsed = [];
      //         try {
      //           ai_tags_response_parsed = JSON.parse(ai_tags_response);
      //         } catch (e) {
      //           console.error("Failed to parse AI JSON", ai_tags_response, e);
      //         }

      //         await req.client.query(
      //           `
      //           DELETE FROM topic_tags
      //           WHERE topic_id = $1
      //           `,
      //           [topic.topic_id],
      //         );

      //         const tag_id_query = await req.client.query(
      //           `
      //             SELECT tag_id, tag_name FROM tags
      //           `,
      //         );
      //         const tag_ids = tag_id_query.rows.reduce((acc, row) => {
      //           acc[row.tag_name] = row.tag_id;
      //           return acc;
      //         }, {})
      //         for (const tag of ai_tags_response_parsed.tags) {
      //           if (ai_tags_response_parsed.tags.includes("polls") && tag === "asks") {
      //             continue;
      //           }
      //           if (tag_ids[tag]) {
      //             await req.client.query(
      //               `
      //               INSERT INTO topic_tags
      //                 (topic_id, tag_id)
      //               VALUES
      //                 ($1, $2)
      //               `,
      //               [
      //                 topic.topic_id,
      //                 tag_ids[tag],
      //               ],
      //             );
      //           } else {
      //             console.error("Unable to find tag", tag)
      //           }
      //         }
      //       })
    }
  }
};
