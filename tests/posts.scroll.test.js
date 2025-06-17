const path = require("path")
const { setupTestEnvironment } = require("./testSetupHelpers.js")
const { assertEquals, runTests } = require("./testRunUtils.js")

async function testInfiniteScroll() {
	const window = await setupTestEnvironment()
	const { $ } = window

	// Verify initial posts
	assertEquals("User B's Post", $("main-content-2 posts post:last-child h2").textContent.trim(), "Last post should be User B's Post")

	// Mock scroll near bottom
	const wrapper = $("main-content-wrapper[active]")
	wrapper.scrollHeight = 2000
	wrapper.clientHeight = 500
	wrapper.scrollTop = 1100

	// Trigger scroll
	wrapper.dispatchEvent(new window.Event("scroll"))
	await new Promise(resolve => setTimeout(resolve, 0))

	// Verify new post loaded
	assertEquals("Third post loaded via scroll", $("main-content-2 posts post:last-child h2").textContent.trim(), "Should load third post")

	// Scroll again to verify no more posts load
	const last_post_title = $("main-content-2 posts post:last-child h2").textContent.trim()
	wrapper.scrollTop = wrapper.scrollHeight - 100
	wrapper.dispatchEvent(new window.Event("scroll"))
	await new Promise(resolve => setTimeout(resolve, 0))

	// Verify same last post (no new content)
	assertEquals(last_post_title, $("main-content-2 posts post:last-child h2").textContent.trim(), "No new posts should load")
}

runTests(path.basename(__filename), [testInfiniteScroll])