const path = require("path")
const {
	setupIntegrationTestEnvironment,
} = require("./../shared/integrationTestSetup.js")
const { assertEquals, runTests } = require("../shared/testUtils.js")

const tests = {
	testImageModalDisplayOnImageClick: async () => {
		const window = await setupIntegrationTestEnvironment()
		const { state, $ } = window

		// Setup mock API responses with topic containing images
		window.setMockFetchResponseForPaths({
			"/posts": {
				path: "/posts",
				posts: [
					{
						slug: "test-topic-with-images",
						title: "Test Post with Images",
						body: "This topic contains images for testing modal functionality.",
						user_slug: "user-images",
						display_name: "User Images",
						tags: "general",
						profile_picture_uuid: null,
						display_name_index: 0,
						user_verified: false,
						note: "",
						poll_1: null,
						favorited: false,
						favorite_count: 2,
						replyed: false,
						reply_count: 3,
						image_uuids: "test-image-uuid-1,test-image-uuid-2",
						created_at: new Date().toISOString(),
						last_activity_at: new Date().toISOString(),
					},
				],
				replies: [],
				activities: [],
				notifications: [],
				user_slug: null,
				subscribed_to_users: 0,
				user_id: null,
				email: null,
				display_name: null,
				profile_picture_uuid: null,
				display_name_index: 0,
				has_more: false,
			},
			"/post/test-topic-with-images": {
				path: "/post/test-topic-with-images",
				posts: [
					{
						slug: "test-topic-with-images",
						title: "Test Post with Images",
						body: "This topic contains images for testing modal functionality.",
						user_slug: "user-images",
						display_name: "User Images",
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
						favorite_count: 2,
						replyed: false,
						reply_count: 3,
						image_uuids: "test-image-uuid-1,test-image-uuid-2",
						created_at: new Date().toISOString(),
						last_activity_at: new Date().toISOString(),
					},
				],
				replies: [],
				activities: [],
				notifications: [],
				user_slug: null,
				subscribed_to_users: 0,
				user_id: null,
				email: null,
				display_name: null,
				profile_picture_uuid: null,
				display_name_index: 0,
			},
		})

		// 1. Navigate to posts page
		const $joinButton = $(`a[href="/posts"][big]`)
		$joinButton.click()

		await new Promise((resolve) => setTimeout(resolve, 0))
		await new Promise((resolve) => setTimeout(resolve, 0))

		assertEquals(
			"/posts",
			state.path,
			"Path should be /posts after agreeing to terms.",
		)

		// 2. Click on the topic to navigate to detail page
		const $firstPostElement = $("posts > topic[trimmed]")
		$firstPostElement.click()

		await new Promise((resolve) => setTimeout(resolve, 0))

		assertEquals(
			"/post/test-topic-with-images",
			state.path,
			"Path should be /post/test-topic-with-images after clicking the topic.",
		)

		// 3. Verify images are rendered in the topic detail page
		const $topic = $("main-content-wrapper[active] topic")
		assertEquals(
			true,
			Boolean($topic),
			"Post element should exist on detail page.",
		)

		// 4. Get the first image element
		const $allImages = $("topic p[img] img")
		const $firstImage = $allImages[0] // Get first element from NodeList
		assertEquals(
			true,
			Boolean($firstImage),
			"First image element should exist.",
		)
		// Use src property - JSDOM returns full URL so we need to check the end
		assertEquals(
			true,
			$firstImage.src.endsWith("/image/test-image-uuid-1"),
			"First image should have correct src attribute.",
		)

		// 6. Verify no modal exists initially
		const $initialModal = $("body modal[image]")
		assertEquals(
			null,
			$initialModal,
			"No image modal should exist initially.",
		)

		// 7. Click on the first image to open the modal
		$firstImage.click()

		await new Promise((resolve) => setTimeout(resolve, 0))

		// 8. Verify image modal is displayed
		const $imageModal = $("body modal[image]")
		assertEquals(
			true,
			Boolean($imageModal),
			"Image modal should be displayed after clicking image.",
		)

		// 9. Verify modal structure and content
		const $modalImage = $imageModal.$("p[img] img")
		assertEquals(
			true,
			Boolean($modalImage),
			"Modal should contain an image element.",
		)
		assertEquals(
			true,
			$modalImage.src.endsWith("/image/test-image-uuid-1"),
			"Modal image should have correct src attribute.",
		)

		// 10. Verify modal has close button
		const $closeButton = $imageModal.$("button[close]")
		assertEquals(
			true,
			Boolean($closeButton),
			"Modal should have a close button.",
		)
		assertEquals(
			"Done",
			$closeButton.innerText.trim(),
			"Close button should have 'Done' text.",
		)

		// 11. Verify modal has background overlay
		const $modalBg = $("body modal-bg")
		assertEquals(
			true,
			Boolean($modalBg),
			"Modal should have background overlay.",
		)

		// 12. Test closing modal via close button
		$closeButton.click()

		await new Promise((resolve) => setTimeout(resolve, 0))

		const $modalAfterClose = $("body modal[image]")
		assertEquals(
			null,
			$modalAfterClose,
			"Image modal should be removed after clicking close button.",
		)

		// 13. Test opening modal again and closing via background click
		$firstImage.click()

		await new Promise((resolve) => setTimeout(resolve, 0))

		const $reopenedModal = $("body modal[image]")
		assertEquals(
			true,
			Boolean($reopenedModal),
			"Image modal should be displayed again after clicking image.",
		)

		// Click background to close
		const $modalBgForClose = $("body modal-bg")
		$modalBgForClose.click()

		await new Promise((resolve) => setTimeout(resolve, 0))

		const $modalAfterBgClose = $("body modal[image]")
		assertEquals(
			null,
			$modalAfterBgClose,
			"Image modal should be removed after clicking background.",
		)
	},
}

runTests(path.basename(__filename), Object.values(tests))