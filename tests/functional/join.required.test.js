const path = require("path")
const {
	setupTestEnvironment,
} = require("../testSetupHelpers.js")
const { assertEquals, runTests } = require("../testRunUtils.js")

const tests = {
	testFlow: async () => {
		const window = await setupTestEnvironment({
			beforeParse: (window) => {
				window.localStorage.removeItem("trucev1:session_uuid")
				window.localStorage.removeItem("trucev1:agreed") 
				window.localStorage.removeItem("trucev1:last_root_path")
			}
		})
		const { $ } = window

		$("footer a[href='/posts']").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		assertEquals("Please tap \"Join the Discussion\" to agree to these terms.", 
					 $("modal-wrapper modal[info] info").textContent.trim(), 
					 "Should show modal with expected text")

		$("modal-wrapper modal-bg").click()
		await new Promise(resolve => setTimeout(resolve, 0))

		$("hamburger").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		assertEquals("Please tap \"Join the Discussion\" to agree to these terms.", 
					 $("modal-wrapper modal[info] info").textContent.trim(), 
					 "Should show modal again when trying to open menu")

		$("modal-wrapper modal-bg").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		$("a[big][href=\"/posts\"]").click()
		await new Promise(resolve => setTimeout(resolve, 0))

		assertEquals("User A's Post", $("post:nth-child(1) h2").textContent.trim(), "Should see first post title")
		assertEquals("User B's Post", $("post:nth-child(2) h2").textContent.trim(), "Should see second post title")

		assertEquals("true", window.localStorage.getItem("trucev1:agreed"), "Should have agreed flag set")
	}
}

runTests(path.basename(__filename), Object.values(tests))