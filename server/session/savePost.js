const ai = require("../ai")
const prompts = require("../prompts")
const crypto = require("node:crypto")
const {
	DeleteObjectCommand,
	PutObjectCommand,
	S3Client,
} = require("@aws-sdk/client-s3")
const object_client = new S3Client({
	region: "us-east-1",
})

module.exports = async (req, res) => {
	if (
		!res.writableEnded &&
		req.session.user_id &&
		req.body.title &&
		req.body.pngs &&
		(req.body.body || req.body.pngs.length) &&
		req.body.path
	) {
		const messages = []

		let text_to_evaluate = req.body.title + "\n\n" + req.body.body
		let poll_counts = ""
		if (req.body.poll_1) {
			text_to_evaluate = `${req.body.title}

${req.body.body}

A) ${req.body.poll_1}
B) ${req.body.poll_2}`
			if (req.body.poll_3) {
				text_to_evaluate += `\nC) ${req.body.poll_3}`
			}
			if (req.body.poll_4) {
				text_to_evaluate += `\nD) ${req.body.poll_4}`
			}
			poll_counts = "0,0,0,0"
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
					}
				}),
			],
		})
		const ai_response = await ai.ask(
			messages,
			req.body.poll_1 ? "poll" : "common",
			req.body.poll_1
				? prompts.poll_response_format
				: prompts.common_response_format,
		)
		let ai_response_parsed = { keyword: "OK" }
		try {
			ai_response_parsed = JSON.parse(ai_response)
		} catch (e) {
			console.error("Failed to parse AI JSON", ai_response, e)
		}
		if (ai_response_parsed.keyword !== "Spam") {
			let slug = req.body.title
				.replace(/[^a-z0-9 ]/gi, "")
				.replace(/ {1,}/g, "_")
			// If slug exists, add a uuid to it
			const slug_exists = await req.client.query(
				`
        SELECT slug FROM posts WHERE slug = $1
        `,
				[slug],
			)
			if (slug_exists.rows.length > 0) {
				slug = (slug + "-" + crypto.randomUUID()).replace(/\-/g, "_")
			}
			let post_id = 0
			// Update existing
			if (req.body.post_id) {
				await req.client.query(
					`
          UPDATE posts
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
            post_id = $10
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
						req.body.post_id,
						req.session.user_id,
					],
				)
				post_id = req.body.post_id

				// Add new
			} else {
				const post_result = await req.client.query(
					`
          INSERT INTO posts
            (title, slug, body, poll_1, poll_2, poll_3, poll_4, poll_counts, note, user_id)
          VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING post_id as post_id
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
				)
				post_id = post_result.rows[0].post_id
			}

			// Remove existing images
			if (req.body.post_id) {
				const existing_images = await req.client.query(
					`
          SELECT image_uuids
          FROM posts
          WHERE post_id = $1
          `,
					[post_id],
				)
				for (const existing_image of existing_images.rows) {
					for (const image_uuid of existing_image.image_uuids.split(",")) {
						try {
							await object_client.send(
								new DeleteObjectCommand({
									Bucket: "truce.net",
									Key: `${image_uuid}.png`,
								}),
							)
						} catch (err) {
							console.error(err)
						}
					}
				}
			}

			// Add new images
			const image_uuids = []
			for (const png of req.body.pngs) {
				const image_uuid = crypto.randomUUID()
				try {
					await object_client.send(
						new PutObjectCommand({
							Bucket: "truce.net",
							Key: `${image_uuid}.png`,
							Body: png.url,
						}),
					)
					image_uuids.push(image_uuid)
				} catch (error) {
					console.error(error)
				}
			}
			await req.client.query(
				`
        UPDATE posts
        SET image_uuids = $1
        WHERE post_id = $2
        `,
				[image_uuids.join(","), post_id],
			)

			// Remove existing poll votes
			if (req.body.post_id) {
				await req.client.query(
					`
          DELETE FROM post_poll_votes
          WHERE post_id = $1
          `,
					[post_id],
				)
			}

			// Get the relevant topics
			const ai_topics_response = await ai.ask(
				messages,
				"topics",
				prompts.topics_response_format,
			)
			let ai_topics_response_parsed = []
			try {
				ai_topics_response_parsed = JSON.parse(ai_topics_response)
			} catch (e) {
				console.error("Failed to parse AI JSON", ai_topics_response, e)
			}

			await req.client.query(
				`
        DELETE FROM post_topics
        WHERE post_id = $1
        `,
				[post_id],
			)

			const topic_id_query = await req.client.query(
				`
          SELECT topic_id, topic_name FROM topics
        `,
			)
			const topic_ids = topic_id_query.rows.reduce((acc, row) => {
				acc[row.topic_name] = row.topic_id
				return acc
			}, {})
			for (const topic of ai_topics_response_parsed.topics) {
				if (ai_topics_response_parsed.topics.includes("polls") && topic === "asks") {
					continue
				}
				if (topic_ids[topic]) {
					await req.client.query(
						`
            INSERT INTO post_topics
              (post_id, topic_id)
            VALUES
              ($1, $2)
            `,
						[post_id, topic_ids[topic]],
					)
				} else {
					console.error("Unable to find topic", topic)
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
									}
								}),
							],
						},
					],
					"poll_estimate",
					prompts.poll_estimate_response_format,
				)
				try {
					const results = JSON.parse(ai_poll_response)
					const total_votes = 1000 * results.response_rate
					const estimated = [
						Math.round(total_votes * results.choice_a) || 0,
						Math.round(total_votes * results.choice_b) || 0,
						Math.round(total_votes * results.choice_c) || 0,
						Math.round(total_votes * results.choice_d) || 0,
					]
					await req.client.query(
						`
            UPDATE posts
            SET
              poll_counts_estimated = $1,
              counts_max_create_date = NOW()
            WHERE post_id = $2
            `,
						[estimated.join(","), post_id],
					)
				} catch (e) {
					console.error("Error poll response:", e)
				}
			}

			// Send websocket update
			req.sendWsMessage("UPDATE", post_id)

			// Respond with success so the client reloads
			res.end(
				JSON.stringify({
					success: true,
					slug,
					user_id: req.session.user_id,
					display_name: req.session.display_name,
				}),
			)
		} else {
			res.end(
				JSON.stringify({
					error: `${ai_response_parsed.keyword} ${ai_response_parsed.note}`,
				}),
			)
		}
	}
}
