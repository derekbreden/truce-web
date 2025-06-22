const path = require("path")
const {
	setupTestEnvironment,
} = require("../testSetupHelpers.js")
const { assertEquals, runTests } = require("../testRunUtils.js")
const { captureVisual } = require("../testVisualHelpers.js")

const tests = {
	// Note: Users page accessed differently (not via footer) - TODO: investigate navigation
	
	capturePostsList: async () => {
		const window = await setupTestEnvironment()
		const { $ } = window
		
		// By default, testSetupHelpers.js starts on /posts with 2 posts
		// This gives us a clean posts list without modals
		
		assertEquals("/posts", window.state.path, "Should start on posts page")
		
		// Capture clean posts list state
		if (process.env.CAPTURE_VISUALS) {
			captureVisual(window, "posts-list-baseline")
		}
	},
	
	captureConversationsList: async () => {
		const window = await setupTestEnvironment()
		const { $ } = window
		
		// Navigate to conversations page - clean state
		$("footer a[href='/conversations']").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		assertEquals("/conversations", window.state.path, "Should navigate to conversations page")
		
		// Capture clean conversations list state
		if (process.env.CAPTURE_VISUALS) {
			captureVisual(window, "conversations-list-baseline")
		}
	},
	
	captureNotificationsList: async () => {
		const window = await setupTestEnvironment()
		const { $ } = window
		
		// Navigate to notifications page - clean state
		$("footer a[notifications]").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		assertEquals("/notifications", window.state.path, "Should navigate to notifications page")
		
		// Capture clean notifications list state
		if (process.env.CAPTURE_VISUALS) {
			captureVisual(window, "notifications-list-baseline")
		}
	},
	
	captureTopicsList: async () => {
		const window = await setupTestEnvironment()
		const { $ } = window
		
		// Navigate to topics page - clean state
		$("footer a[href='/topics']").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		assertEquals("/topics", window.state.path, "Should navigate to topics page")
		
		// Capture clean topics list state
		if (process.env.CAPTURE_VISUALS) {
			captureVisual(window, "topics-list-baseline")
		}
	}
}

runTests(path.basename(__filename), Object.values(tests))