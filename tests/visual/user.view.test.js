const path = require("path")
const {
	setupTestEnvironment,
} = require("../testSetupHelpers.js")
const { assertEquals, runTests } = require("../testRunUtils.js")

const tests = {
	testFlow: async () => {
		const statements = []
		
		// Delete all favorites to ensure we test what not favorited looks like here too
		statements.push([
			`DELETE FROM favorite_posts`,
			[]
		])
		statements.push([
			`DELETE FROM favorite_replies`,
			[]
		])

		
		// Create a valid image UUID for testing
		const crypto = require("crypto")
		const test_image_uuid = crypto.randomUUID()
		statements.push([
			`UPDATE users SET profile_picture_uuid = $1`,
			[test_image_uuid]
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

		$old("posts post:nth-child(1) author").click()
		await new Promise(resolve => setTimeout(resolve, 0))
	},
}

runTests(path.basename(__filename), Object.values(tests))