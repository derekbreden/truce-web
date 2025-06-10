const path = require("path")
const {
	setupIntegrationTestEnvironment,
} = require("./../shared/integrationTestSetup.js")
const { assertEquals, runTests } = require("../shared/testUtils.js")

const tests = {
	testLoggedInUserSeesDisplayNamePrefilledInAddReplyForm: async () => {
		const window = await setupIntegrationTestEnvironment()
		const { state, $ } = window

		// 1. Define Mock User and Post Data
		const mockUser = {
			user_slug: "test-user",
			display_name: "Test User Name",
			email: "testuser@example.com",
			user_id: "user-id-123",
			profile_picture_uuid: "test-pic-uuid",
		}

		const mockPost = {
			post_id: "post-id-789",
			slug: "test-post-slug",
			title: "Test Post Title",
			body: "This is the body of the test post.",
			user_slug: "another-user",
			display_name: "Post Author Name",
			topics: "general",
			reply_count: 0,
			favorite_count: 0,
			favorited: false,
			replyed: false,
			image_uuids: null,
			profile_picture_uuid: null,
			display_name_index: 0,
			user_verified: false,
			note: "",
			poll_1: null,
			create_date: "2023-10-26T10:00:00Z",
		}

		// 2. Mock API responses
		window.setMockFetchResponseForPaths({
			"/posts": {
				path: "/posts",
				user_id: mockUser.user_id,
				email: mockUser.email,
				user_slug: mockUser.user_slug,
				display_name: mockUser.display_name,
				profile_picture_uuid: mockUser.profile_picture_uuid,
				posts: [mockPost],
				replies: [],
				activities: [],
				notifications: [],
				subscribed_to_users: 0,
				display_name_index: 0,
				has_more: false,
				topic: null,
			},
			[`/post/${mockPost.slug}`]: {
				path: `/post/${mockPost.slug}`,
				user_id: mockUser.user_id,
				email: mockUser.email,
				user_slug: mockUser.user_slug,
				display_name: mockUser.display_name,
				profile_picture_uuid: mockUser.profile_picture_uuid,
				posts: [mockPost],
				replies: [],
				activities: [],
				notifications: [],
				subscribed_to_users: 0,
				display_name_index: 0,
				has_more: false,
				topic: null,
			},
		})

		// 3. Simulate Navigation
		const $joinButton = $(`a[href="/posts"][big]`)
		$joinButton.click()
		await new Promise((resolve) => setTimeout(resolve, 0))
		assertEquals(
			"/posts",
			state.path,
			`After clicking "Join", path should be /posts.`,
		)
		assertEquals(
			mockUser.user_id,
			state.user_id,
			"state.user_id should be set from /posts mock. Actual: " + state.user_id,
		)

		const $postLinkElement = $(`post[trimmed] h2`)
		$postLinkElement.click()
		await new Promise((resolve) => setTimeout(resolve, 0))
		assertEquals(
			`/post/${mockPost.slug}`,
			state.path,
			`After clicking post, path should be /post/${mockPost.slug}.`,
		)
		assertEquals(
			mockUser.user_id,
			state.user_id,
			`state.user_id should be set from /post/${mockPost.slug} mock. Actual: ${state.user_id}`,
		)

		// 4. Locate and click the "Reply to post" button
		const $replyButton = $(`p[add-new-reply] button[alt]`)
		$replyButton.click()
		await new Promise((resolve) => setTimeout(resolve, 0))

		// 5. Assertions for the "add new reply" form
		const $addNewReplyForm = $(`add-new[reply]`)

		const $displayNameWrapper = $addNewReplyForm.$(`display-name-wrapper`)

		const $displayNameText = $displayNameWrapper.$(`b span`)
		assertEquals(
			mockUser.display_name + ":",
			$displayNameText.innerText.trim(),
			`Add reply form: Display name should be "${mockUser.display_name}:". Actual: "${$displayNameText.innerText.trim()}"`,
		)

		const $profilePictureImg = $displayNameWrapper.$(
			`profile-picture img[src="/image/${mockUser.profile_picture_uuid}"]`,
		)
		assertEquals(
			`/image/${mockUser.profile_picture_uuid}`,
			$profilePictureImg.getAttribute("src"),
			"Profile picture src should match mock user.",
		)

		const $bodyTextarea = $addNewReplyForm.$(`textarea[body]`)
		assertEquals(
			"Reply",
			$bodyTextarea.getAttribute("placeholder"),
			`Body textarea placeholder should be "Reply".`,
		)

		const $submitButton = $addNewReplyForm.$(`button[submit]`)
		assertEquals(
			"Add reply",
			$submitButton.innerText.trim(),
			`Submit button text should be "Add reply".`,
		)

		const $cancelButton = $addNewReplyForm.$(`button[alt][cancel]`)
		assertEquals(
			"Cancel",
			$cancelButton.innerText.trim(),
			`Cancel button text should be "Cancel".`,
		)
	},
}

runTests(path.basename(__filename), Object.values(tests))
