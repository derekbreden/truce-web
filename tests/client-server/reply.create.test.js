const path = require("path")
const {
	setupIntegrationTestEnvironment,
} = require("./clientServerTestSetup.js")
const { assertEquals, runTests } = require("../client/shared/testUtils.js")

/*
TWO-USER NOTIFICATION CREATION TEST IMPLEMENTATION PLAN:

CURRENT STATE: All client-server tests pass with new user system
- User A (user_id=10, session="user-a-session-123") - Default user, owns "User A's Post"
- User B (user_id=20, session="user-b-session-456") - Reply creator, owns "User B's Post"
- notifications.simple.test.js restored and passing with 2 unread + 1 read notifications

REMAINING WORK: Implement the actual two-user notification flow test

TEST FLOW:
1. User A checks baseline notifications (expects 2 unread notifications)
2. User B creates reply to User A's post (triggers notification creation)
3. User A checks notifications again (expects 3 unread notifications, with new one first)

TECHNICAL IMPLEMENTATION:

1. Setup User A environment (default - no beforeParse needed):
   - Navigate to /notifications page
   - Verify current unread count is "Unread (2)"
   - Verify 2 existing baseline notifications from User B

2. Setup User B environment using beforeParse:
   - Call setupIntegrationTestEnvironment with beforeParse to override localStorage
   - Set session UUID to "user-b-session-456" to become User B
   - Navigate to User A's post (/post/user-as-post)
   - Create reply with specific content like "Reply from User B to User A"
   - Verify reply appears (existing reply creation logic)

3. Back to User A environment (fresh setupIntegrationTestEnvironment call):
   - Navigate to /notifications page again  
   - Verify unread count is now "Unread (3)"
   - Verify first notification is the new reply from User B
   - Verify remaining 2 notifications are the original baseline notifications

DATABASE MOCK CHANGES NEEDED:

1. Update notifications mock in clientServerTestSetup.js:
   - Add state tracking for "reply created by User B to User A's post"
   - When User A queries notifications after reply creation, return updated list
   - New notification should have notification_id=103 (avoiding conflict with 102 used by read notification)
   - Update unread_count from 2 to 3 when reply was created

2. Update saveReply mock to track cross-user reply creation:
   - When User B (user_id=20) creates reply to post owned by User A (user_id=10)
   - Mark that notification should be created for User A
   - Add session state tracking similar to postCreatedInThisSession

3. No changes needed to existing posts, singlePost, or other mocks

IMPLEMENTATION STRUCTURE:
- Three distinct setupIntegrationTestEnvironment calls for three test phases
- Use sessionState tracking to coordinate notification state between phases
- Specific assertions on notification content and ordering
- Clean test that follows the pattern of existing client-server tests

This test will verify the complete notification creation workflow across users.
*/

const tests = {
	testClientServerFlow: async () => {
		// Phase 1: User A checks baseline notifications (2 unread)
		const window_user_a = await setupIntegrationTestEnvironment()
		const { $: $a } = window_user_a
		
		$a("footer a[href='/notifications']").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		assertEquals(
			"Unread (2)",
			$a("main-content notifications h3").innerText.trim(),
			"User A should have 2 unread notifications initially",
		)
		
		assertEquals(
			"User B",
			$a("main-content notifications notification:nth-child(2) b:first-child").innerText,
			"First notification should be from User B",
		)
		
		assertEquals(
			`"First notification for User A"`,
			$a("main-content notifications notification:nth-child(2) i").innerText,
			"First notification should show correct content",
		)
		
		// Phase 2: User B creates reply to User A's post
		const window_user_b = await setupIntegrationTestEnvironment({
			beforeParse: (window) => {
				window.localStorage.setItem("trucev1:session_uuid", "user-b-session-456")
			}
		})
		const { $: $b } = window_user_b
		
		// Navigate to User A's post
		$b("main-content-2 posts post:first-child").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		assertEquals(
			"/post/user-as-post",
			window_user_b.state.path,
			"User B should navigate to User A's post",
		)
		
		// Click the reply button (first p[add-new-reply] element's button)
		$b("main-content-2 replies p[add-new-reply]:first-child button").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		$b("add-new[reply] textarea[body]").value = "Reply from User B to User A"
		
		$b("add-new[reply] button[submit]").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		
		// Check the newly created reply (should be the 3rd child after p and expand-wrapper)
		assertEquals(
			"Newly Created Reply Content",
			$b("main-content-2 replies reply:nth-child(3) p span").innerText,
			"User B's reply should be rendered with mock content",
		)
		
		// Phase 3: User A navigates away and back to trigger getMoreRecent()
		// Navigate away from notifications
		$a("footer a[href='/posts']").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		// Navigate back to notifications
		$a("footer a[href='/notifications']").click()
		await new Promise(resolve => setTimeout(resolve, 0))
		
		assertEquals(
			"Unread (3)",
			$a("main-content notifications h3").innerText.trim(),
			"User A should have 3 unread notifications after User B's reply",
		)
		
		// Check new notification is first (most recent)
		assertEquals(
			"User B",
			$a("main-content notifications notification:nth-child(2) b:first-child").innerText,
			"New notification should be from User B",
		)
		
		assertEquals(
			`"Reply from User B to User A"`,
			$a("main-content notifications notification:nth-child(2) i").innerText,
			"New notification should show User B's reply content",
		)
		
		// Verify original notifications are still there
		assertEquals(
			"User B",
			$a("main-content notifications notification:nth-child(3) b:first-child").innerText,
			"Second notification should still be from User B",
		)
		
		assertEquals(
			`"First notification for User A"`,
			$a("main-content notifications notification:nth-child(3) i").innerText,
			"Second notification should show original content",
		)
	},
}

runTests(path.basename(__filename), Object.values(tests))