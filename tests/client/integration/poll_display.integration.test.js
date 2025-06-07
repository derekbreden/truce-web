const path = require("path")
const {
	setupIntegrationTestEnvironment,
} = require("./../shared/integrationTestSetup.js")
const { assertEquals, runTests } = require("../shared/testUtils.js")

const tests = {
	testPollDisplayBasic: async () => {
		const window = await setupIntegrationTestEnvironment()
		const { state, $ } = window

		// Mock initial fetch responses for "/" and "/topics"
		// The /topics response will include a topic with poll data.
		window.setMockFetchResponseForPaths({
			"/": { path: "/", topics: [], comments: [], activities: [], notifications: [] },
			"/topics": {
				path: "/topics",
				topics: [
					{
						topic_id: 1,
						slug: "poll-topic-1",
						title: "Topic with a Poll",
						body: "This topic has a poll.",
						user_slug: "testuser",
						display_name: "Test User",
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
				comments: [],
				activities: [],
				notifications: [],
				user: {},
				tag: {},
				subscribed_to_users: 0,
			},
		})

		// 1. Agree to terms to navigate to /topics
		const $joinButton = $(`a[href="/topics"][big]`)
		$joinButton.click()
		await new Promise((resolve) => setTimeout(resolve, 0)) // Wait for DOM updates

		// Verify navigation to /topics
		assertEquals(
			"/topics",
			state.path,
			"Path should be /topics after clicking 'Join the Discussion'.",
		)

		// Find the topic element
		const $topicElement = $(`topic[trimmed]`) // Assuming topics on /topics have 'trimmed' attribute
		assertEquals(true, Boolean($topicElement), "Topic element should be present.")

		// Assert Poll Wrapper Exists
		const $pollWrapper = $topicElement.$("poll-wrapper")
		assertEquals(true, Boolean($pollWrapper), "Poll wrapper element should be present.")

		// Assert Poll Options Text
		// When topic.edit is false and topic.voted is false, options are inside poll-vote-wrapper
		const $pollVoteWrapper = $pollWrapper.$("poll-vote-wrapper");
		assertEquals(true, Boolean($pollVoteWrapper), "Poll vote wrapper should be present when user has not voted.");

		const $pollOption1 = $pollVoteWrapper.$("poll-1") // Corrected selector
		assertEquals("Option A", $pollOption1.innerText.trim(), "Poll option 1 text should be 'Option A'.")

		const $pollOption2 = $pollVoteWrapper.$("poll-2") // Corrected selector
		assertEquals("Option B", $pollOption2.innerText.trim(), "Poll option 2 text should be 'Option B'.")

		// Assert that elements for poll_3 and poll_4 are not present as they are null in mock data
		const $pollOption3 = $pollVoteWrapper.$("poll-3") // Corrected selector
		assertEquals(false, Boolean($pollOption3), "Poll option 3 element should not be present in poll-vote-wrapper if its value is null.")

		const $pollOption4 = $pollVoteWrapper.$("poll-4") // Corrected selector
		assertEquals(false, Boolean($pollOption4), "Poll option 4 element should not be present in poll-vote-wrapper if its value is null.")

		// Assert Poll Results Sections are NOT present (since user hasn't voted and edit is false)
		// client/renderTopic.js removes these if topic.edit is false and topic.voted is false
		const $pollCountsActual = $pollWrapper.$("poll-counts-actual")
		assertEquals(false, Boolean($pollCountsActual), "Actual poll counts element should NOT be present when user has not voted.")

		const $pollResultsActualText = $pollWrapper.$("p[results][actual]")
		assertEquals(false, Boolean($pollResultsActualText), "Actual results text element should NOT be present when user has not voted.")

		const $pollCountsEstimated = $pollWrapper.$("poll-counts-estimated")
		assertEquals(false, Boolean($pollCountsEstimated), "Estimated poll counts element should NOT be present when user has not voted.")

		const $pollResultsEstimatedText = $pollWrapper.$("p[results][estimated]")
		assertEquals(false, Boolean($pollResultsEstimatedText), "Estimated results text element should NOT be present when user has not voted.")

	},
}

runTests(path.basename(__filename), Object.values(tests))
