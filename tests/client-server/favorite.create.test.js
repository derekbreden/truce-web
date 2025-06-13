const path = require("path")
const {
	setupIntegrationTestEnvironment,
} = require("./clientServerTestSetup.js")
const { assertEquals, runTests } = require("../client/shared/testUtils.js")

const tests = {
	testClientServerFlow: async () => {
		const window = await setupIntegrationTestEnvironment()
		const { $ } = window
		
		// Step A: Go to favorites page and check default cached favorite
		$("hamburger").click()
		$(`menu a[href="/favorites"]`).click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Verify the existing favorited post is "Other User's Post"
		assertEquals(
			"Other User's Post",
			$("main-content-wrapper activities activity[post]:first-child post h2").textContent.trim(),
			"First favorite should be 'Other User's Post' from default cache",
		)
		
		// Step B: Go back to posts and favorite "My Post"
		$("hamburger").click()
		$(`menu a[href="/posts"]`).click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		
		// Find "My Post" (first post) and click its favorite button
		assertEquals(
			"My Post",
			$("main-content-2 posts post:first-child h2").textContent.trim(),
			"First post should be 'My Post'",
		)
		
		// Click the favorite button on "My Post"
		$("main-content-2 posts post:first-child detail[favorites]").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Step C: Go back to favorites and verify new favorite appears first
		$("hamburger").click()
		$(`menu a[href="/favorites"]`).click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Verify "My Post" now appears first in favorites (getMoreRecent was triggered)
		assertEquals(
			"My Post",
			$("main-content-wrapper activities activity[post]:first-child post h2").textContent.trim(),
			"Newly favorited 'My Post' should now appear first in favorites",
		)
	},
}

runTests(path.basename(__filename), Object.values(tests))