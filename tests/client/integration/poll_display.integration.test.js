const path = require("path")
const {
	setupIntegrationTestEnvironment,
} = require("./../shared/integrationTestSetup.js")
const { assertEquals, runTests } = require("../shared/testUtils.js")

const tests = {
	testPollDisplayBasic: async () => {
		const window = await setupIntegrationTestEnvironment()
		const { state, $ } = window

		// Mock initial fetch responses for "/" and "/posts"
		// The /posts response will include a post with poll data.
		window.setMockFetchResponseForPaths({
			"/": { path: "/", posts: [], replies: [], activities: [], notifications: [] },
			"/posts": {
				path: "/posts",
				posts: [
					{
						post_id: 1,
						slug: "poll-post-1",
						title: "Post with a Poll",
						body: "This post has a poll.",
						user_slug: "testuser",
						display_name: "Test User",
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
						poll_1: "Option A",
						poll_2: "Option B",
						poll_3: "", // No third option for simplicity
						poll_4: "", // No fourth option for simplicity
						poll_counts: "0,0,0,0", // No votes yet
						poll_counts_estimated: "0,0,0,0", // No estimated votes yet
						voted: false, // User has not voted
						edit: false // User cannot edit
					},
				],
				replies: [],
				activities: [],
				notifications: [],
				user: {},
				topic: {},
				subscribed_to_users: 0,
			},
		})

		// 1. Agree to terms to navigate to /posts
		const $joinButton = $(`a[href="/posts"][big]`)
		$joinButton.click()
		await new Promise((resolve) => setTimeout(resolve, 0)) // Wait for DOM updates

		// Verify navigation to /posts
		assertEquals(
			"/posts",
			state.path,
			"Path should be /posts after clicking 'Join the Discussion'.",
		)

		// Find the post element
		const $postElement = $(`post[trimmed]`) // Assuming posts on /posts have 'trimmed' attribute
		// Assert Poll Wrapper Exists
		const $pollWrapper = $postElement.$("poll-wrapper")
		// Assert Poll Options Text
		// When post.edit is false and post.voted is false, options are inside poll-vote-wrapper
		const $pollVoteWrapper = $pollWrapper.$("poll-vote-wrapper");
		const $pollOption1 = $pollVoteWrapper.$("poll-1") // Corrected selector
		assertEquals("Option A", $pollOption1.innerText.trim(), "Poll option 1 text should be 'Option A'.")

		const $pollOption2 = $pollVoteWrapper.$("poll-2") // Corrected selector
		assertEquals("Option B", $pollOption2.innerText.trim(), "Poll option 2 text should be 'Option B'.")

		// Assert that elements for poll_3 and poll_4 are not present as they are null in mock data
		assertEquals(null, $pollVoteWrapper.$("poll-3"), "Poll option 3 element should not be present in poll-vote-wrapper if its value is null.")
		assertEquals(null, $pollVoteWrapper.$("poll-4"), "Poll option 4 element should not be present in poll-vote-wrapper if its value is null.")

		// Assert Poll Results Sections are NOT present (since user hasn't voted and edit is false)
		// client/renderPost.js removes these if post.edit is false and post.voted is false
		assertEquals(null, $pollWrapper.$("poll-counts-actual"), "Actual poll counts element should NOT be present when user has not voted.")
		assertEquals(null, $pollWrapper.$("p[results][actual]"), "Actual results text element should NOT be present when user has not voted.")
		assertEquals(null, $pollWrapper.$("poll-counts-estimated"), "Estimated poll counts element should NOT be present when user has not voted.")
		assertEquals(null, $pollWrapper.$("p[results][estimated]"), "Estimated results text element should NOT be present when user has not voted.")

	},
}

runTests(path.basename(__filename), Object.values(tests))
