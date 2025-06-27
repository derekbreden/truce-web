const path = require("path")
const {
	setupTestEnvironment,
} = require("../testSetupHelpers.js")
const { assertEquals, runTests } = require("../testRunUtils.js")

const tests = {
	testFlow: async () => {

		// Create a conversation with many messages for testing infinite scroll
		const statements = []
		
		// Create conversation between User A (10) and User B (20)
		statements.push([
			`INSERT INTO conversations (conversation_id, create_date) VALUES ($1, $2)`,
			[1, new Date("2023-01-01T00:00:00.000Z")]
		])
		
		// Add users to conversation
		statements.push([
			`INSERT INTO conversation_users (conversation_id, user_id) VALUES ($1, $2)`,
			[1, 10]
		])
		statements.push([
			`INSERT INTO conversation_users (conversation_id, user_id) VALUES ($1, $2)`,
			[1, 20]
		])
		
		// Create a valid image UUID for testing
		const crypto = require("crypto")
		const test_image_uuid = crypto.randomUUID()
		
		// Create 60 messages in the conversation, some with images
		for (let i = 1; i <= 60; i++) {
			const create_date = new Date(new Date("2023-02-01T00:00:00.000Z") - ((61 - i) * 1000 * 60))
			const has_image = i % 10 === 0
			
			statements.push([
				`INSERT INTO messages (message_id, conversation_id, user_id, body, create_date, image_uuids) VALUES ($1, $2, $3, $4, $5, $6)`,
				[i, 1, i % 2 === 0 ? 10 : 20, `Message ${i} from ${i % 2 === 0 ? "User A" : "User B"}`, create_date, has_image ? test_image_uuid : null]
			])
		}
		
		// Update conversation with the last message
		statements.push([
			`UPDATE conversations SET last_message_id = $1 WHERE conversation_id = $2`,
			[60, 1]
		])


		// Load image data for S3 mock
		const fs = require("fs")
		const processed_data_file = path.join(__dirname, "../data", "1024_base64.txt")
		const valid_png_base64 = await fs.promises.readFile(processed_data_file, "utf8")
		
		const window = await setupTestEnvironment({
			sql_statements_to_execute: statements,
			beforeParse: (window) => {
				// Pre-populate S3 mock storage
				global._s3_mock_storage = global._s3_mock_storage || {}
				global._s3_mock_storage[test_image_uuid + ".png"] = valid_png_base64
			}
		})
		const { $ } = window
		
		$("footer a[href='/conversations']").click()
		await new Promise(resolve => setTimeout(resolve, 0))
	},
}

runTests(path.basename(__filename), Object.values(tests))