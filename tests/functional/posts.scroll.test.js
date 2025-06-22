const path = require("path")
const { setupTestEnvironment } = require("../testSetupHelpers.js")
const { assertEquals, runTests } = require("../testRunUtils.js")

const tests = {
	testFlow: async () => {

		// For this test only, we want more posts
		const statements = []
		for (let i = 3; i <= 50; i++) {
			statements.push([
				`INSERT INTO posts (post_id, user_id, title, body, slug, create_date, favorite_count, reply_count, counts_max_create_date, admin) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
				[
					i, // post_id
					20, // user_id (User B)
					`Post ${i}`, // title
					`Content for post ${i}`, // body
					`post-${i}`, // slug
					new Date( (new Date("2023-01-01T01:00:00.000Z")) - (i * 1000 * 60 * 60) ).toISOString(), // create_date
					0, // favorite_count
					0, // reply_count
					new Date( (new Date("2023-01-01T01:00:00.000Z")) - (i * 1000 * 60 * 60) ).toISOString(), // counts_max_create_date
					0 // admin
				]
			])
			statements.push([
				`INSERT INTO post_topics (post_id, topic_id) VALUES ($1, $2)`,
				[i, 1] // Link to topic 1
			])
			statements.push([
				`INSERT INTO post_topics (post_id, topic_id) VALUES ($1, $2)`,
				[i, 2] // Link to topic 2
			])
		}

		const window = await setupTestEnvironment({
			sql_statements_to_execute: statements,
		})
		const { $ } = window

		// Verify initial posts
		assertEquals("Post 10", $("main-content-2 posts post:last-child h2").textContent.trim(), "Last post should be Post 10")

		// Mock scroll near bottom
		const wrapper = $("main-content-wrapper[active]")
		wrapper.scrollHeight = 2000
		wrapper.clientHeight = 500
		wrapper.scrollTop = 1100

		// Trigger scroll
		wrapper.dispatchEvent(new window.Event("scroll"))
		await new Promise(resolve => setTimeout(resolve, 0))

		// Verify new post loaded
		assertEquals("Post 30", $("main-content-2 posts post:last-child h2").textContent.trim(), "Last post should be Post 30 after scroll")

		// Scroll again to verify more posts DO load
		wrapper.scrollHeight = 3000
		wrapper.scrollTop = 2100
		wrapper.dispatchEvent(new window.Event("scroll"))
		await new Promise(resolve => setTimeout(resolve, 0))
		// Verify new post loaded
		assertEquals("Post 50", $("main-content-2 posts post:last-child h2").textContent.trim(), "Last post should be Post 50 after second scroll")

		// Scroll again to verify more posts DO NOT load
		wrapper.scrollHeight = 3000
		wrapper.scrollTop = 2500
		wrapper.dispatchEvent(new window.Event("scroll"))
		await new Promise(resolve => setTimeout(resolve, 0))
		assertEquals("Post 50", $("main-content-2 posts post:last-child h2").textContent.trim(), "Last post should still be Post 50 after no more posts")

	},
}

runTests(path.basename(__filename), Object.values(tests))