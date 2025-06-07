const path = require("path")
const {
	setupIntegrationTestEnvironment,
} = require("./../shared/integrationTestSetup.js")
const { assertEquals, runTests } = require("../shared/testUtils.js")

const tests = {
	testAddCommentInteraction: async () => {
		const window = await setupIntegrationTestEnvironment()
		const { state, $ } = window

		// Mock user data for logged in state
		const mockUser = {
			user_slug: "test-commenter",
			display_name: "Test Commenter",
			email: "testcommenter@example.com",
			user_id: "user-123",
			profile_picture_uuid: null,
		}

		// Setup mock API responses
		window.setMockFetchResponseForPaths({
			"/topics": {
				path: "/topics",
				topics: [
					{
						slug: "test-topic-for-comment",
						title: "Test Topic for Adding Comment",
						body: "This topic will receive a new comment.",
						user_slug: "topic-author",
						display_name: "Topic Author",
						tags: "general",
						profile_picture_uuid: null,
						display_name_index: 0,
						user_verified: false,
						note: "",
						poll_1: null,
						favorited: false,
						favorite_count: 1,
						commented: false,
						comment_count: 0,
						image_uuids: null,
						created_at: new Date().toISOString(),
						last_activity_at: new Date().toISOString(),
					},
				],
				comments: [],
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
			"/topic/test-topic-for-comment": {
				path: "/topic/test-topic-for-comment",
				topics: [
					{
						slug: "test-topic-for-comment",
						title: "Test Topic for Adding Comment",
						body: "This topic will receive a new comment.",
						user_slug: "topic-author",
						display_name: "Topic Author",
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
						commented: false,
						comment_count: 0,
						image_uuids: null,
						created_at: new Date().toISOString(),
						last_activity_at: new Date().toISOString(),
					},
				],
				comments: [],
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
		let commentSubmissionCalled = false
		let submittedCommentData = null
		let getMoreRecentCalled = false
		
		// Mock comment submission
		window.addMockFetchMatcher({
			match: (url, options) => {
				if (url === "/session" && options?.method === "POST") {
					const body = JSON.parse(options.body)
					if (body.body && body.display_name && body.path) {
						// This is a comment submission
						commentSubmissionCalled = true
						submittedCommentData = body
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
		
		// Mock the getMoreRecent fetch call (refresh with new comment)
		window.addMockFetchMatcher({
			match: (url, options) => {
				if (url === "/session" && options?.method === "POST") {
					const body = JSON.parse(options.body)
					if (body.path === "/topic/test-topic-for-comment" && 
						(body.min_create_date !== undefined || body.min_comment_create_date !== undefined)) {
						// This is getMoreRecent fetching updates
						getMoreRecentCalled = true
						return true
					}
				}
				return false
			},
			response: {
				path: "/topic/test-topic-for-comment",
				topics: [], // No new topics
				comments: [
					{
						comment_id: "new-comment-123",
						user_slug: mockUser.user_slug,
						display_name: mockUser.display_name,
						body: "This is my test comment.",
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

		// 1. Navigate to topics page
		const $joinButton = $("a[href='/topics'][big]")
		$joinButton.click()

		await new Promise((resolve) => setTimeout(resolve, 0))

		assertEquals(
			"/topics",
			state.path,
			"Path should be /topics after agreeing to terms.",
		)

		// 2. Click on the topic to navigate to detail page
		const $firstTopicElement = $("topics > topic[trimmed]")
		$firstTopicElement.click()

		await new Promise((resolve) => setTimeout(resolve, 0))

		assertEquals(
			"/topic/test-topic-for-comment",
			state.path,
			"Path should be /topic/test-topic-for-comment after clicking the topic.",
		)

		// 3. Verify initial state - no comments
		const $initialComments = $("main-content-wrapper[active] comments comment")
		assertEquals(
			null,
			$initialComments,
			"Initially, there should be no comments.",
		)

		// 4. Click the "Reply to topic" button to open comment form
		const $replyButton = $("p[add-new-comment] button")
		assertEquals(
			"Reply to topic",
			$replyButton.innerText.trim(),
			"Button should say 'Reply to topic'.",
		)

		$replyButton.click()

		await new Promise((resolve) => setTimeout(resolve, 0))

		// 5. Access comment form elements directly

		// 6. Access form elements directly
		// For logged-in users, display name is shown as wrapper, not input
		const $commentForm = $("add-new[comment]")
		const $displayNameWrapper = $commentForm[0]?.$("display-name-wrapper") || $("display-name-wrapper")
		const $bodyTextarea = $commentForm[0]?.$("textarea[body]") || $("textarea[body]") 
		const $submitButton = $commentForm[0]?.$("button[submit]") || $("button[submit]")

		// Verify display name is shown in the wrapper
		const $displayNameSpan = $displayNameWrapper[0]?.$("span") || $displayNameWrapper.$("span")
		assertEquals(
			true,
			$displayNameSpan.innerText.includes(mockUser.display_name),
			"Display name should be shown in wrapper for logged-in user.",
		)

		// 7. Enter comment text
		const testCommentText = "This is my test comment."
		$bodyTextarea.value = testCommentText
		
		// Simulate input event to update the form
		const inputEvent = new window.Event('input', { bubbles: true })
		$bodyTextarea.dispatchEvent(inputEvent)

		// 8. Submit the comment by clicking the submit button
		$submitButton.click()
		
		// 9. Immediately verify form shows "Validating..." message after submission
		const $validatingMessage = $("add-new[comment] info")
		assertEquals(
			"Validating...",
			$validatingMessage?.innerText?.trim() || "NOT_FOUND",
			"Should show 'Validating...' message immediately after submit.",
		)

		// 10. Immediately verify form controls have disabled attribute during submission
		const $disabledTextarea = $("add-new[comment] textarea[body]")
		const $disabledSubmitButton = $("add-new[comment] button[submit]")
		
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
			commentSubmissionCalled,
			"Comment submission should have been called.",
		)
		assertEquals(
			testCommentText,
			submittedCommentData.body,
			"Submitted comment body should match input.",
		)
		assertEquals(
			mockUser.display_name,
			submittedCommentData.display_name,
			"Submitted display name should match user's name.",
		)
		assertEquals(
			"/topic/test-topic-for-comment",
			submittedCommentData.path,
			"Submitted path should match current topic path.",
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
		const $validatingMessageAfterSuccess = $("add-new[comment] info")
		assertEquals(
			null,
			$validatingMessageAfterSuccess,
			"Validating message should disappear after successful submission.",
		)

		// 15. Verify comment form is removed/hidden after successful submission  
		const $commentFormAfterSuccess = $("add-new[comment]")
		assertEquals(
			null,
			$commentFormAfterSuccess,
			"Comment form should be removed after successful submission.",
		)

		// 16. Verify comment form is completely removed (no active comment form state)
		assertEquals(
			undefined,
			window.state.active_add_new_comment,
			"Active comment form state should be cleared after successful submission.",
		)

		// 17. Verify the new comment appears and has correct content after getMoreRecent
		const $newComment = $("main-content-wrapper[active] comments comment")
		const $commentAuthor = $newComment?.[0]?.$("author span") || $newComment?.$("author span")
		const $commentBody = $newComment?.[0]?.$(":scope > p > span") || $newComment?.$(":scope > p > span")
		
		assertEquals(
			mockUser.display_name,
			$commentAuthor?.innerText?.trim() || "NOT_FOUND",
			"Comment author should match submitted name.",
		)
		assertEquals(
			testCommentText,
			$commentBody?.innerText?.trim() || "NOT_FOUND",
			"Comment body should match submitted text.",
		)

	},
}

runTests(path.basename(__filename), Object.values(tests))