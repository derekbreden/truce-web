const path = require("path")
const {
	setupTestEnvironment,
} = require("../testSetupHelpers.js")
const { assertEquals, runTests } = require("../testRunUtils.js")
const { captureVisual } = require("../testVisualHelpers.js")

const tests = {
	captureNavigationArrows: async () => {
		const window = await setupTestEnvironment()
		const { $ } = window

		// Navigate to a specific post to trigger back/forward arrows
		$("main-content-2 posts post:first-child h2").click()
		await new Promise(resolve => setTimeout(resolve, 0))

		// Should now be on individual post page with navigation arrows
		if (process.env.CAPTURE_VISUALS) {
			captureVisual(window, "navigation-arrows")
		}
	},

	captureNotificationExpandArrows: async () => {
		const window = await setupTestEnvironment()
		const { $ } = window

		// Navigate to notifications page
		$("footer a[href='/notifications']").click()
		await new Promise(resolve => setTimeout(resolve, 0))

		// Should show notifications with expand-right arrows
		if (process.env.CAPTURE_VISUALS) {
			captureVisual(window, "notification-expand-arrows")
		}
	},

	captureReplyExpandArrows: async () => {
		const window = await setupTestEnvironment()
		const { $ } = window

		// Navigate to a post that should have replies
		$("main-content-2 posts post:first-child h2").click()
		await new Promise(resolve => setTimeout(resolve, 0))

		// Navigate to replies section if it exists
		const $repliesButton = $("tab-wrapper [replies]")
		if ($repliesButton) {
			$repliesButton.click()
			await new Promise(resolve => setTimeout(resolve, 0))
		}

		// Look for expand/collapse arrows in reply threads
		if (process.env.CAPTURE_VISUALS) {
			captureVisual(window, "reply-expand-arrows")
		}
	},

	captureExpandDirections: async () => {
		const window = await setupTestEnvironment()
		const { $ } = window

		// Try to find a page with various expand directions
		// First check notifications for expand-right
		$("footer a[href='/notifications']").click()
		await new Promise(resolve => setTimeout(resolve, 0))

		if (process.env.CAPTURE_VISUALS) {
			captureVisual(window, "expand-directions-notifications")
		}

		// Navigate to posts and look for other expand directions
		$("footer a[href='/posts']").click()
		await new Promise(resolve => setTimeout(resolve, 0))

		// Go to first post
		$("main-content-2 posts post:first-child h2").click()
		await new Promise(resolve => setTimeout(resolve, 0))

		if (process.env.CAPTURE_VISUALS) {
			captureVisual(window, "expand-directions-post")
		}
	},

	captureBackForwardStates: async () => {
		const window = await setupTestEnvironment()
		const { $ } = window

		// Start at posts
		$("footer a[href='/posts']").click()
		await new Promise(resolve => setTimeout(resolve, 0))

		// Navigate to a post to create back arrow
		$("main-content-2 posts post:first-child h2").click()
		await new Promise(resolve => setTimeout(resolve, 0))

		// Capture back arrow state
		if (process.env.CAPTURE_VISUALS) {
			captureVisual(window, "back-arrow-state")
		}

		// Navigate to user profile to potentially get forward arrows
		const $userProfile = $("post author")
		assertEquals(true, Boolean($userProfile), "Should find post author element")
		
		$userProfile.click()
		await new Promise(resolve => setTimeout(resolve, 0))

		if (process.env.CAPTURE_VISUALS) {
			captureVisual(window, "user-profile-arrows")
		}
	}
}

runTests(path.basename(__filename), Object.values(tests))