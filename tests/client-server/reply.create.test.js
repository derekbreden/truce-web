const path = require("path")
const {
	setupIntegrationTestEnvironment,
} = require("./clientServerTestSetup.js")
const { assertEquals, runTests } = require("../client/shared/testUtils.js")

/*
DETAILED PLAN FOR TWO-USER NOTIFICATION CREATION TEST:

CRITICAL REALIZATION: This change affects ALL tests, not just this one!

1. Major refactoring of user system:
   - Change DEFAULT user for ALL tests from user_id=1 to user_id=10
   - Change DEFAULT session from "test-session-uuid-123" to "user-a-session-123"
   - User A: user_id=10, session_uuid="user-a-session-123", display_name="User A"
   - User B: user_id=20, session_uuid="user-b-session-456", display_name="User B"

2. Database mock changes needed:
   - Update ALL post titles to indicate ownership: "User A's Post", "User B's Post", etc.
   - Update ALL mock data to use new user_ids (10, 20, etc. instead of 1, 2, etc.)
   - Ensure notifications are user-specific
   - Posts table returns same posts for all users, but edit permissions vary by user_id

3. Impact on existing tests:
   - ALL tests need to be verified/updated for new user_ids
   - Default localStorage setup needs to change to "user-a-session-123"
   - Any test expecting "Test User" needs to expect "User A" instead
   - Any test expecting user_id 1 needs to expect user_id 10

4. Test flow for THIS specific test:
   - Setup User A environment, navigate to /notifications, check baseline (1 unread)
   - Setup User B environment, navigate to User A's post, create reply
   - Back to User A environment, navigate to /notifications, verify new notification (2 unread)

5. Implementation steps:
   - Update default session UUID in clientServerTestSetup.js
   - Update sessionValidation mock to remove old "test-session-uuid-123"
   - Update ALL post mock data with new user_ids and clear titles
   - Update ALL notification mock data with new user_ids
   - Run ALL tests to find and fix breakages
   - Then implement the two-user notification test
*/

const tests = {
	testClientServerFlow: async () => {
		const window = await setupIntegrationTestEnvironment()
		const { $ } = window
		
		// Start at /posts and navigate to single post (like single-post.simple.test.js)
		$("main-content-2 posts post:first-child").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Verify we're on the single post page
		assertEquals(
			"/post/user-as-post",
			window.state.path,
			"Should navigate to single post path",
		)
		
		// Click the "Reply to post" button to show the reply form
		$("p[add-new-reply] button")[0].click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Fill in the reply form
		$("add-new[reply] textarea[body]").value = "Newly Created Reply Content"
		
		// Submit the reply
		$("add-new[reply] button[submit]").click()
		await new Promise(resolve => setTimeout(resolve, 100))
		
		// Verify the new reply is rendered instantly (getMoreRecent was triggered)
		assertEquals(
			"Newly Created Reply Content",
			$("reply p span")[0]?.innerText,
			"New reply should be rendered with correct content",
		)
	},
}

runTests(path.basename(__filename), Object.values(tests))