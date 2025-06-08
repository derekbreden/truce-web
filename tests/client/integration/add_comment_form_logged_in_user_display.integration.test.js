const path = require("path")
const {
	setupIntegrationTestEnvironment,
} = require("./../shared/integrationTestSetup.js")
const { assertEquals, runTests } = require("../shared/testUtils.js")

const tests = {
	testLoggedInUserSeesDisplayNamePrefilledInAddCommentForm: async () => {
		const window = await setupIntegrationTestEnvironment()
		const { state, $ } = window

		// 1. Define Mock User and Topic Data
		const mockUser = {
			user_slug: "test-user",
			display_name: "Test User Name",
			email: "testuser@example.com",
			user_id: "user-id-123",
			profile_picture_uuid: "test-pic-uuid",
		}

		const mockTopic = {
			topic_id: "topic-id-789",
			slug: "test-topic-slug",
			title: "Test Topic Title",
			body: "This is the body of the test topic.",
			user_slug: "another-user",
			display_name: "Topic Author Name",
			tags: "general",
			comment_count: 0,
			favorite_count: 0,
			favorited: false,
			commented: false,
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
				topics: [mockTopic],
				comments: [],
				activities: [],
				notifications: [],
				subscribed_to_users: 0,
				display_name_index: 0,
				has_more: false,
				tag: null,
			},
			[`/post/${mockTopic.slug}`]: {
				path: `/post/${mockTopic.slug}`,
				user_id: mockUser.user_id,
				email: mockUser.email,
				user_slug: mockUser.user_slug,
				display_name: mockUser.display_name,
				profile_picture_uuid: mockUser.profile_picture_uuid,
				topics: [mockTopic],
				comments: [],
				activities: [],
				notifications: [],
				subscribed_to_users: 0,
				display_name_index: 0,
				has_more: false,
				tag: null,
			},
		})

		// 3. Simulate Navigation
		const $joinButton = $(`a[href="/posts"][big]`)
		$joinButton.click()
		await new Promise((resolve) => setTimeout(resolve, 0))
		assertEquals(
			"/posts",
			state.path,
			"After clicking 'Join', path should be /posts.",
		)
		assertEquals(
			mockUser.user_id,
			state.user_id,
			"state.user_id should be set from /posts mock. Actual: " + state.user_id,
		)

		const $topicLinkElement = $(`topic[trimmed] h2`)
		$topicLinkElement.click()
		await new Promise((resolve) => setTimeout(resolve, 0))
		assertEquals(
			`/post/${mockTopic.slug}`,
			state.path,
			`After clicking topic, path should be /post/${mockTopic.slug}.`,
		)
		assertEquals(
			mockUser.user_id,
			state.user_id,
			`state.user_id should be set from /post/${mockTopic.slug} mock. Actual: ${state.user_id}`,
		)

		// 4. Locate and click the "Reply to topic" button
		const $replyButton = $(`p[add-new-comment] button[alt]`)
		$replyButton.click()
		await new Promise((resolve) => setTimeout(resolve, 0))

		// 5. Assertions for the "add new comment" form
		const $addNewCommentForm = $(`add-new[comment]`)

		const $displayNameWrapper = $addNewCommentForm.$(`display-name-wrapper`)

		const $displayNameText = $displayNameWrapper.$(`b span`)
		assertEquals(
			mockUser.display_name + ":",
			$displayNameText.innerText.trim(),
			`Add comment form: Display name should be '${mockUser.display_name}:'. Actual: '${$displayNameText.innerText.trim()}'`,
		)

		const $profilePictureImg = $displayNameWrapper.$(
			`profile-picture img[src='/image/${mockUser.profile_picture_uuid}']`,
		)
		assertEquals(
			`/image/${mockUser.profile_picture_uuid}`,
			$profilePictureImg.getAttribute("src"),
			"Profile picture src should match mock user.",
		)

		const $bodyTextarea = $addNewCommentForm.$(`textarea[body]`)
		assertEquals(
			"Reply",
			$bodyTextarea.getAttribute("placeholder"),
			"Body textarea placeholder should be 'Reply'.",
		)

		const $submitButton = $addNewCommentForm.$(`button[submit]`)
		assertEquals(
			"Add reply",
			$submitButton.innerText.trim(),
			"Submit button text should be 'Add reply'.",
		)

		const $cancelButton = $addNewCommentForm.$(`button[alt][cancel]`)
		assertEquals(
			"Cancel",
			$cancelButton.innerText.trim(),
			"Cancel button text should be 'Cancel'.",
		)
	},
}

runTests(path.basename(__filename), Object.values(tests))
