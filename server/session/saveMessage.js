const ai = require("../ai")
const crypto = require("node:crypto")
const {
	DeleteObjectCommand,
	PutObjectCommand,
	S3Client,
} = require("@aws-sdk/client-s3")
const object_client = new S3Client({
	region: "us-east-1",
})
const prompts = require("../prompts")
const push = require("../push")

module.exports = async (req, res) => {
	if (
		!res.writableEnded
		&& req.session.user_id
		&& req.body.conversation_id
		&& req.body.body
		&& req.body.pngs
	) {
		// Verify user is participant in this conversation and get other participants
		const conversation_check = await req.client.query(
			`
			SELECT cp.user_id
			FROM conversation_users cp
			WHERE cp.conversation_id = $1
			`,
			[req.body.conversation_id],
		)

		if (!conversation_check.rows.length) {
			res.end(
				JSON.stringify({
					error: "Conversation not found",
				}),
			)
			return
		}

		const conversation_user_ids = conversation_check.rows.map(row => row.user_id)
		if (!conversation_user_ids.includes(req.session.user_id)) {
			res.end(
				JSON.stringify({
					error: "Access denied",
				}),
			)
			return
		}

		// Get other user for notifications
		const other_user_id = conversation_user_ids.filter(id => id !== req.session.user_id)[0]

		// AI content moderation
		const messages = []
		
		let text_to_evaluate = req.body.body
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
			"common",
			prompts.common_response_format,
		)
		
		let ai_response_parsed = { keyword: "OK" }
		try {
			ai_response_parsed = JSON.parse(ai_response)
		} catch (e) {
			console.error("Failed to parse AI JSON", ai_response, e)
		}
		
		if (ai_response_parsed.keyword === "Spam") {
			res.end(
				JSON.stringify({
					error: ai_response_parsed.keyword + (ai_response_parsed.note ? ` ${ai_response_parsed.note}` : ""),
				}),
			)
			return
		}

		let message_id = req.body.message_id
		if (req.body.message_id) {
			// Update existing message
			await req.client.query(
				`
				UPDATE messages
				SET body = $1, note = $2, create_date = NOW()
				WHERE
					message_id = $3
					AND user_id = $4
				`,
				[
					req.body.body, 
					ai_response_parsed.keyword === "OK" ? null : `${ai_response_parsed.keyword}${ai_response_parsed.note ? ` ${ai_response_parsed.note}` : ""}`,
					req.body.message_id, 
					req.session.user_id
				],
			)
		} else {
			// Insert new message
			const message_inserted = await req.client.query(
				`
				INSERT INTO messages
					(conversation_id, user_id, body, note)
				VALUES
					($1, $2, $3, $4)
				RETURNING message_id as message_id
				`,
				[
					req.body.conversation_id, 
					req.session.user_id, 
					req.body.body,
					ai_response_parsed.keyword === "OK" ? null : `${ai_response_parsed.keyword}${ai_response_parsed.note ? ` ${ai_response_parsed.note}` : ""}`
				],
			)
			message_id = message_inserted.rows[0].message_id
		}

		// Update display name
		await require("./updateDisplayName")(req, res)

		// Remove existing images if editing
		if (req.body.message_id) {
			const existing_images = await req.client.query(
				`
				SELECT image_uuids
				FROM messages
				WHERE message_id = $1
				`,
				[message_id],
			)
			for (const existing_image of existing_images.rows) {
				if (existing_image.image_uuids) {
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
			UPDATE messages
			SET image_uuids = $1
			WHERE message_id = $2
			`,
			[image_uuids.join(","), message_id],
		)

		// Update conversation's last_message_id
		await req.client.query(
			`
			UPDATE conversations
			SET last_message_id = $1
			WHERE conversation_id = $2
			`,
			[message_id, req.body.conversation_id],
		)

		// Respond with success
		res.end(
			JSON.stringify({
				success: true,
				user_id: req.session.user_id,
				display_name: req.session.display_name,
			}),
		)

		// Wait for all notifications to be inserted
		const message_notification_ids = {}
		const insert_result = await req.client.query(
			`
			INSERT INTO message_notifications
				(user_id, message_id)
			VALUES
				($1, $2)
			RETURNING notification_id
			`,
			[other_user_id, message_id],
		)
		message_notification_ids[other_user_id] = insert_result.rows[0].notification_id

		// Prepare push data
		const push_data = {
			title: `${
				req.session.display_name.length > 20
					? req.session.display_name.slice(0, 20) + "..."
					: req.session.display_name
				} replied`,
			body: req.body.body.length > 50
				? req.body.body.slice(0, 50) + "..."
				: req.body.body,
			topic: `message:${message_id}`,
		}

		// Send the push
		await push.sendPush(
			[other_user_id],
			{}, // reply_notification_ids
			message_notification_ids,
			push_data,
		)
		
		// Also notify other participants if they're viewing conversations list
		req.sendWsMessage("UPDATE", {user_id: other_user_id})
	}
}