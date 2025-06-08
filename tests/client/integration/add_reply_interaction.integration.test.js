const path = require("path")
const {
	setupIntegrationTestEnvironment,
} = require("./../shared/integrationTestSetup.js")
const { assertEquals, runTests } = require("../shared/testUtils.js")

const tests = {
	testAddReplyInteraction: async () => {
		const window = await setupIntegrationTestEnvironment()
		const { state, $ } = window

		// Mock user data for logged in state
		const mockUser = {
			user_slug: "test-replyer",
			display_name: "Test Replyer",
			email: "testreplyer@example.com",
			user_id: "user-123",
			profile_picture_uuid: null,
		}

		// Setup mock API responses
		window.setMockFetchResponseForPaths({
			"/posts": {
				path: "/posts",
				posts: [
					{
						slug: "test-post-for-reply",
						title: "Test Post for Adding Reply",
						body: "This post will receive a new reply.",
						user_slug: "post-author",
						display_name: "Post Author",
						tags: "general",
						profile_picture_uuid: null,
						display_name_index: 0,
						user_verified: false,
						note: "",
						poll_1: null,
						favorited: false,
						favorite_count: 1,
						replyed: false,
						reply_count: 0,
						image_uuids: null,
						created_at: new Date().toISOString(),
						last_activity_at: new Date().toISOString(),
					},
				],
				replies: [],
				activities: [],
				notifications: [],
				user_slug: mockUser.user_slug,
				subscribed_to_users: 0,
				user_id: mockUser.user_id,
				email: mockUser.email,
				display_name: mockUser.display_name,
				profile_picture_uuid: mockUser.profile_picture_uuid,
				display_name_index: 0,
				has_more: false,
			},
			"/post/test-post-for-reply": {
				path: "/post/test-post-for-reply",
				posts: [
					{
						slug: "test-post-for-reply",
						title: "Test Post for Adding Reply",
						body: "This post will receive a new reply.",
						user_slug: "post-author",
						display_name: "Post Author",
						tags: "general",
						profile_picture_uuid: null,
						display_name_index: 0,
						user_verified: false,
						note: "",
						poll_1: null,
						poll_2: null,
						poll_3: null,
						poll_4: null,
						poll_5: null,
						poll_counts: "0,0,0,0,0",
						user_poll_choice: null,
						favorited: false,
						favorite_count: 1,
						replyed: false,
						reply_count: 0,
						image_uuids: null,
						created_at: new Date().toISOString(),
						last_activity_at: new Date().toISOString(),
					},
				],
				replies: [],
				activities: [],
				notifications: [],
				user_slug: mockUser.user_slug,
				subscribed_to_users: 0,
				user_id: mockUser.user_id,
				email: mockUser.email,
				display_name: mockUser.display_name,
				profile_picture_uuid: mockUser.profile_picture_uuid,
				display_name_index: 0,
			},
		})

		// Clear any previous matchers and track API calls
		window.clearMockFetchMatchers()
		let replySubmissionCalled = false
		let submittedReplyData = null
		let getMoreRecentCalled = false
		
		// Mock reply submission
		window.addMockFetchMatcher({
			match: (url, options) => {
				if (url === "/session" && options?.method === "POST") {
					const body = JSON.parse(options.body)
					if (body.body && body.display_name && body.path) {
						// This is a reply submission
						replySubmissionCalled = true
						submittedReplyData = body
						return true
					}
				}
				return false
			},
			response: {
				success: true,
				user_id: mockUser.user_id,
				display_name: mockUser.display_name,
			}
		})
		
		// Mock the getMoreRecent fetch call (refresh with new reply)
		window.addMockFetchMatcher({
			match: (url, options) => {
				if (url === "/session" && options?.method === "POST") {
					const body = JSON.parse(options.body)
					if (body.path === "/post/test-post-for-reply" && 
						(body.min_create_date !== undefined || body.min_reply_create_date !== undefined)) {
						// This is getMoreRecent fetching updates
						getMoreRecentCalled = true
						return true
					}
				}
				return false
			},
			response: {
				path: "/post/test-post-for-reply",
				posts: [], // No new posts
				replies: [
					{
						reply_id: "new-reply-123",
						user_slug: mockUser.user_slug,
						display_name: mockUser.display_name,
						body: "This is my test reply.",
						created_at: new Date().toISOString(),
						profile_picture_uuid: null,
						display_name_index: 0,
						user_verified: false,
						note: "",
						favorited: false,
						favorite_count: 0,
						edit: true,
						image_uuids: null,
					},
				],
				activities: [],
				notifications: [],
				user_slug: mockUser.user_slug,
				subscribed_to_users: 0,
				user_id: mockUser.user_id,
				email: mockUser.email,
				display_name: mockUser.display_name,
				profile_picture_uuid: mockUser.profile_picture_uuid,
				display_name_index: 0,
			}
		})

		// 1. Navigate to posts page
		const $joinButton = $("a[href='/posts'][big]")
		$joinButton.click()

		await new Promise((resolve) => setTimeout(resolve, 0))

		assertEquals(
			"/posts",
			state.path,
			"Path should be /posts after agreeing to terms.",
		)

		// 2. Click on the post to navigate to detail page
		const $firstPostElement = $("posts > post[trimmed]")
		$firstPostElement.click()

		await new Promise((resolve) => setTimeout(resolve, 0))

		assertEquals(
			"/post/test-post-for-reply",
			state.path,
			"Path should be /post/test-post-for-reply after clicking the post.",
		)

		// 3. Verify initial state - no replies
		const $initialReplies = $("main-content-wrapper[active] replies reply")
		assertEquals(
			null,
			$initialReplies,
			"Initially, there should be no replies.",
		)

		// 4. Click the "Reply to post" button to open reply form
		const $replyButton = $("p[add-new-reply] button")
		assertEquals(
			"Reply to post",
			$replyButton.innerText.trim(),
			"Button should say 'Reply to post'.",
		)

		$replyButton.click()

		await new Promise((resolve) => setTimeout(resolve, 0))

		// 5. Access reply form elements directly

		// 6. Access form elements directly
		// For logged-in users, display name is shown as wrapper, not input
		const $replyForm = $("add-new[reply]")
		const $displayNameWrapper = $replyForm[0]?.$("display-name-wrapper") || $("display-name-wrapper")
		const $bodyTextarea = $replyForm[0]?.$("textarea[body]") || $("textarea[body]") 
		const $submitButton = $replyForm[0]?.$("button[submit]") || $("button[submit]")

		// Verify display name is shown in the wrapper
		const $displayNameSpan = $displayNameWrapper[0]?.$("span") || $displayNameWrapper.$("span")
		assertEquals(
			true,
			$displayNameSpan.innerText.includes(mockUser.display_name),
			"Display name should be shown in wrapper for logged-in user.",
		)

		// 7. Enter reply text
		const testReplyText = "This is my test reply."
		$bodyTextarea.value = testReplyText
		
		// Simulate input event to update the form
		const inputEvent = new window.Event('input', { bubbles: true })
		$bodyTextarea.dispatchEvent(inputEvent)

		// 8. Submit the reply by clicking the submit button
		$submitButton.click()
		
		// 9. Immediately verify form shows "Validating..." message after submission
		const $validatingMessage = $("add-new[reply] info")
		assertEquals(
			"Validating...",
			$validatingMessage?.innerText?.trim() || "NOT_FOUND",
			"Should show 'Validating...' message immediately after submit.",
		)

		// 10. Immediately verify form controls have disabled attribute during submission
		const $disabledTextarea = $("add-new[reply] textarea[body]")
		const $disabledSubmitButton = $("add-new[reply] button[submit]")
		
		assertEquals(
			true,
			$disabledTextarea?.hasAttribute("disabled") || false,
			"Textarea should have disabled attribute during submission.",
		)
		assertEquals(
			true,
			$disabledSubmitButton?.hasAttribute("disabled") || false,
			"Submit button should have disabled attribute during submission.",
		)

		await new Promise((resolve) => setTimeout(resolve, 0))

		// 11. Verify the fetch was called with correct data
		assertEquals(
			true,
			replySubmissionCalled,
			"Reply submission should have been called.",
		)
		assertEquals(
			testReplyText,
			submittedReplyData.body,
			"Submitted reply body should match input.",
		)
		assertEquals(
			mockUser.display_name,
			submittedReplyData.display_name,
			"Submitted display name should match user's name.",
		)
		assertEquals(
			"/post/test-post-for-reply",
			submittedReplyData.path,
			"Submitted path should match current post path.",
		)

		// 12. Wait for both fetch calls to complete (submission + refresh)
		await new Promise((resolve) => setTimeout(resolve, 100)) // Give both fetches time to complete
		
		// 13. Verify getMoreRecent was called
		assertEquals(
			true,
			getMoreRecentCalled,
			"getMoreRecent should have been called after successful submission.",
		)
		
		// 14. Verify "Validating..." message disappears after successful submission
		const $validatingMessageAfterSuccess = $("add-new[reply] info")
		assertEquals(
			null,
			$validatingMessageAfterSuccess,
			"Validating message should disappear after successful submission.",
		)

		// 15. Verify reply form is removed/hidden after successful submission  
		const $replyFormAfterSuccess = $("add-new[reply]")
		assertEquals(
			null,
			$replyFormAfterSuccess,
			"Reply form should be removed after successful submission.",
		)

		// 16. Verify reply form is completely removed (no active reply form state)
		assertEquals(
			undefined,
			window.state.active_add_new_reply,
			"Active reply form state should be cleared after successful submission.",
		)

		// 17. Verify the new reply appears and has correct content after getMoreRecent
		const $newReply = $("main-content-wrapper[active] replies reply")
		const $replyAuthor = $newReply?.[0]?.$("author span") || $newReply?.$("author span")
		const $replyBody = $newReply?.[0]?.$(":scope > p > span") || $newReply?.$(":scope > p > span")
		
		assertEquals(
			mockUser.display_name,
			$replyAuthor?.innerText?.trim() || "NOT_FOUND",
			"Reply author should match submitted name.",
		)
		assertEquals(
			testReplyText,
			$replyBody?.innerText?.trim() || "NOT_FOUND",
			"Reply body should match submitted text.",
		)

	},
}

runTests(path.basename(__filename), Object.values(tests))