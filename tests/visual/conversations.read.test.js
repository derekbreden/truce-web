const path = require("path")
const {
	setupTestEnvironment,
} = require("../testSetupHelpers.js")
const { assertEquals, runTests } = require("../testRunUtils.js")

const tests = {
	testFlow: async () => {

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
		const create_date = new Date(new Date("2023-02-01T00:00:00.000Z") - (1000 * 60))
		statements.push([
			`INSERT INTO messages (message_id, conversation_id, user_id, body, create_date, image_uuids) VALUES ($1, $2, $3, $4, $5, $6)`,
			[60, 1, 10, `Message 60 from User A`, create_date, test_image_uuid]
		])
		
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
		const { $old } = window
		
		$old("footer a[href='/conversations']").click()
		await new Promise(resolve => setTimeout(resolve, 0))
	},
}

runTests(path.basename(__filename), Object.values(tests))