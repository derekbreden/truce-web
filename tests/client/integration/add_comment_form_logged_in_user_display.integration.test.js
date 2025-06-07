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
			"/topics": {
				path: "/topics",
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
			[`/topic/${mockTopic.slug}`]: {
				path: `/topic/${mockTopic.slug}`,
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
		const $joinButton = $(`a[href="/topics"][big]`)
		$joinButton.click()
		await new Promise((resolve) => setTimeout(resolve, 0))
		assertEquals(
			"/topics",
			state.path,
			"After clicking 'Join', path should be /topics.",
		)
		assertEquals(
			mockUser.user_id,
			state.user_id,
			"state.user_id should be set from /topics mock. Actual: " + state.user_id,
		)

		const $topicLinkElement = $(`topic[trimmed] h2`)
		assertEquals(
			true,
			Boolean($topicLinkElement),
			`Topics page: Clickable topic titled '${mockTopic.title}' should be found.`,
		)
		$topicLinkElement.click()
		await new Promise((resolve) => setTimeout(resolve, 0))
		assertEquals(
			`/topic/${mockTopic.slug}`,
			state.path,
			`After clicking topic, path should be /topic/${mockTopic.slug}.`,
		)
		assertEquals(
			mockUser.user_id,
			state.user_id,
			`state.user_id should be set from /topic/${mockTopic.slug} mock. Actual: ${state.user_id}`,
		)

		// 4. Locate and click the "Reply to topic" button
		const $replyButton = $(`p[add-new-comment] button[alt]`)
		assertEquals(
			true,
			Boolean($replyButton),
			"Topic detail page: 'Reply to topic' button should exist.",
		)
		$replyButton.click()
		await new Promise((resolve) => setTimeout(resolve, 0))

		// 5. Assertions for the "add new comment" form
		const $addNewCommentForm = $(`add-new[comment]`)
		assertEquals(
			true,
			Boolean($addNewCommentForm),
			"Topic detail page: 'add-new[comment]' form should appear after clicking 'Reply to topic'.",
		)

		const $displayNameWrapper = $addNewCommentForm
			? $addNewCommentForm.$(`display-name-wrapper`)
			: null
		assertEquals(
			true,
			Boolean($displayNameWrapper),
			"Add comment form: 'display-name-wrapper' should be present for logged-in user. State display_name: " +
				state.display_name,
		)

		const $displayNameText = $displayNameWrapper
			? $displayNameWrapper.$(`b span`)
			: null
		assertEquals(
			mockUser.display_name + ":",
			$displayNameText.innerText.trim(),
			`Add comment form: Display name should be '${mockUser.display_name}:'. Actual: '${$displayNameText.innerText.trim()}'`,
		)

		const $profilePictureImg = $displayNameWrapper
			? $displayNameWrapper.$(
					`profile-picture img[src='/image/${mockUser.profile_picture_uuid}']`,
				)
			: null
		const $profilePictureSvg = $displayNameWrapper
			? $displayNameWrapper.$(`profile-picture svg`)
			: null
		assertEquals(
			true,
			Boolean($profilePictureImg) || Boolean($profilePictureSvg),
			"Add comment form: Profile picture (img or svg) should be present. Img found: " +
				Boolean($profilePictureImg) +
				", Svg found: " +
				Boolean($profilePictureSvg),
		)
		assertEquals(
			`/image/${mockUser.profile_picture_uuid}`,
			$profilePictureImg.getAttribute("src"),
			"Profile picture src should match mock user.",
		)

		const $bodyTextarea = $addNewCommentForm
			? $addNewCommentForm.$(`textarea[body]`)
			: null
		assertEquals(
			true,
			Boolean($bodyTextarea),
			"Add comment form: Comment body textarea should be present.",
		)
		assertEquals(
			"Comment",
			$bodyTextarea.getAttribute("placeholder"),
			"Body textarea placeholder should be 'Comment'.",
		)

		const $submitButton = $addNewCommentForm
			? $addNewCommentForm.$(`button[submit]`)
			: null
		assertEquals(
			true,
			Boolean($submitButton),
			"Add comment form: Submit button should be present.",
		)
		assertEquals(
			"Add comment",
			$submitButton.innerText.trim(),
			"Submit button text should be 'Add comment'.",
		)

		const $cancelButton = $addNewCommentForm
			? $addNewCommentForm.$(`button[alt][cancel]`)
			: null
		assertEquals(
			true,
			Boolean($cancelButton),
			"Add comment form: Cancel button should be present.",
		)
		assertEquals(
			"Cancel",
			$cancelButton.innerText.trim(),
			"Cancel button text should be 'Cancel'.",
		)
	},
}

runTests(path.basename(__filename), Object.values(tests))
