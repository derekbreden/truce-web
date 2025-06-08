// const pool = require("../pool")
// const sleep = (ms) => {
//   return new Promise((resolve) => setTimeout(resolve, ms))
// }
// const ai = require("../ai")
// const prompts = require("../prompts")
// const { GetObjectCommand, S3Client } = require("@aws-sdk/client-s3")
// const object_client = new S3Client({
//   region: "us-east-1",
// })

module.exports = async (req, res) => {
	if (
		!res.writableEnded &&
		(req.body.path === "/topics" ||
			req.body.path === "/topics/all" ||
			req.body.path === "/posts" ||
			req.body.path === "/posts/all" ||
			req.body.path?.substr(0, 5) === "/tag/" ||
			req.body.path?.substr(0, 6) === "/user/")
	) {
		if (!req.body.max_comment_create_date) {
			const topic_results = await req.client.query(
				`
        SELECT
          p.create_date,
          p.post_id as topic_id,
          p.title,
          u.user_id,
          u.display_name,
          CASE WHEN u.display_name = '' THEN u.user_id ELSE u.display_name_index END as display_name_index,
          CASE WHEN (u.slug = '' OR u.slug IS NULL) THEN u.user_id::VARCHAR ELSE u.slug END as user_slug,
          u.profile_picture_uuid,
          CASE WHEN u.email <> '' AND u.email IS NOT NULL THEN true ELSE false END AS user_verified,
          p.slug,
          LEFT(p.body, 1000) as body,
          p.poll_1,
          p.poll_2,
          p.poll_3,
          p.poll_4,
          p.poll_counts,
          p.poll_counts_estimated,
          p.note,
          p.favorite_count,
          p.comment_count,
          p.counts_max_create_date,
          CASE WHEN p.user_id = $1 THEN true ELSE false END AS edit,
          p.image_uuids,
          CASE WHEN f.user_id IS NOT NULL THEN TRUE ELSE FALSE END as favorited,
          CASE WHEN EXISTS (
            SELECT 1
            FROM replies r
            WHERE r.parent_post_id = p.post_id
              AND r.user_id = $1
          ) THEN TRUE ELSE FALSE END as commented,
          CASE WHEN v.user_id IS NOT NULL THEN TRUE ELSE FALSE END as voted,
          (
            SELECT STRING_AGG(ts.tag_name, ',')
            FROM post_tags pt
            INNER JOIN tags ts ON ts.tag_id = pt.tag_id
            WHERE pt.post_id = p.post_id
          ) as tags
        FROM posts p
        LEFT JOIN users u ON u.user_id = p.user_id
        LEFT JOIN favorite_posts f ON f.post_id = p.post_id AND f.user_id = $1
        LEFT JOIN post_poll_votes v ON v.post_id = p.post_id AND v.user_id = $1
        LEFT JOIN flagged_posts l ON l.post_id = p.post_id
        LEFT JOIN blocked_users b ON b.user_id_blocked = p.user_id AND b.user_id_blocking = $1
        WHERE
          (p.create_date > $2 OR $2 IS NULL)
          AND (p.create_date < $3 OR $3 IS NULL)
          AND l.post_id IS NULL
          AND b.user_id_blocked IS NULL
          ${
						req.body.path.substr(0, 5) === "/tag/"
							? `
                AND p.post_id IN (
                  SELECT post_id
                  FROM post_tags
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
                AND p.user_id IN (
                  SELECT user_id
                  FROM users
                  WHERE 
                    ${
											Number(req.body.path.split("/")[2])
												? `user_id = $4`
												: `slug = $4`
										}
                )
                `
							: ""
					}
          ${
						(req.body.path === "/topics" || req.body.path === "/posts") &&
						Number(req.session.subscribed_to_users) > 0
							? `
                AND p.user_id IN (
                  SELECT subscribed_to_user_id
                  FROM subscribers
                  WHERE user_id = $1
                )
                `
							: ""
					}
        ORDER BY p.create_date DESC
        LIMIT 20
        `,
				[
					req.session.user_id || 0,
					req.body.min_topic_create_date || null,
					req.body.max_topic_create_date || null,
					req.body.path.substr(0, 5) === "/tag/"
						? req.body.path.substr(5)
						: req.body.path.substr(0, 6) === "/user/"
							? req.body.path.split("/")[2]
							: undefined,
				].filter((x) => x !== undefined),
			)
			req.results.path = req.body.path
			req.results.topics.push(...topic_results.rows)

			//       let delayed = 0
			//       topic_results.rows.forEach(async (topic) => {
			//         delayed += 2000
			//         await sleep(delayed)

			//         const client = await pool.pool.connect()
			//         try {
			//           const messages = []

			//           let text_to_evaluate = topic.title + "\n\n" + topic.body
			//           let poll_counts = ""
			//           if (topic.poll_1) {
			//             text_to_evaluate = `${topic.title}

			// ${topic.body}

			// A) ${topic.poll_1}
			// B) ${topic.poll_2}`
			//             if (topic.poll_3) {
			//               text_to_evaluate += `\nC) ${topic.poll_3}`
			//             }
			//             if (topic.poll_4) {
			//               text_to_evaluate += `\nD) ${topic.poll_4}`
			//             }
			//             poll_counts = "0,0,0,0"
			//           }

			//           const pngs = []
			//           for (const image_uuid of topic.image_uuids
			//             .split(",")
			//             .filter((x) => x)) {
			//             if (image_uuid) {
			//               console.warn(image_uuid)
			//               try {
			//                 const response = await object_client.send(
			//                   new GetObjectCommand({
			//                     Bucket: "truce.net",
			//                     Key: `${image_uuid}.png`,
			//                   }),
			//                 )
			//                 const base64_string = await response.Body.transformToString()
			//                 pngs.push(base64_string)
			//               } catch (err) {
			//                 console.error(err)
			//               }
			//             }
			//           }
			//           messages.push({
			//             role: "user",
			//             name:
			//               (topic.display_name || "Anonymous").replace(
			//                 /[^a-z0-9_\-]/gi,
			//                 "",
			//               ) || "Anonymous",
			//             content: [
			//               { type: "text", text: text_to_evaluate },
			//               ...pngs.map((png) => {
			//                 return {
			//                   image_url: {
			//                     url: png,
			//                   },
			//                   type: "image_url",
			//                 }
			//               }),
			//             ],
			//           })

			//           // Get the relevant tags
			//           const ai_tags_response = await ai.ask(
			//             messages,
			//             "tags",
			//             prompts.tags_response_format,
			//           )
			//           let ai_tags_response_parsed = []
			//           try {
			//             ai_tags_response_parsed = JSON.parse(ai_tags_response)
			//           } catch (e) {
			//             console.error("Failed to parse AI JSON", ai_tags_response, e)
			//           }
			//           console.warn(topic.title, ai_tags_response_parsed.tags)

			//           await client.query(
			//             `
			//           DELETE FROM topic_tags
			//           WHERE topic_id = $1
			//           `,
			//             [topic.topic_id],
			//           )

			//           const tag_id_query = await client.query(
			//             `
			//             SELECT tag_id, tag_name FROM tags
			//           `,
			//           )
			//           const tag_ids = tag_id_query.rows.reduce((acc, row) => {
			//             acc[row.tag_name] = row.tag_id
			//             return acc
			//           }, {})
			//           for (const tag of ai_tags_response_parsed.tags) {
			//             if (
			//               ai_tags_response_parsed.tags.includes("polls") &&
			//               tag === "asks"
			//             ) {
			//               continue
			//             }
			//             if (tag_ids[tag]) {
			//               await client.query(
			//                 `
			//               INSERT INTO topic_tags
			//                 (topic_id, tag_id)
			//               VALUES
			//                 ($1, $2)
			//               `,
			//                 [topic.topic_id, tag_ids[tag]],
			//               )
			//             } else {
			//               console.error("Unable to find tag", tag)
			//             }
			//           }
			//         } finally {
			//           client.release()
			//         }
			//       })
		}
	}
}
