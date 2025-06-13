const path = require("path")
const {
	setupIntegrationTestEnvironment,
} = require("./clientServerTestSetup.js")
const { assertEquals, runTests } = require("../client/shared/testUtils.js")

const tests = {
	testClientServerFlow: async () => {
		const window = await setupIntegrationTestEnvironment()
		const { $ } = window
		
		// By default, clientServerTestSetup.js starts on /posts with 2 posts

		// The first listed (by create_date) default post is the user's own post
		$("main-content-2 posts post:first-child icon[more]").click()
		assertEquals(false, Boolean($("modal action[block]")), "Own post should not show block action")
		$("modal-bg").click()

		// The second listed (by create_date) default post is another user's post
		$("main-content-2 posts post:nth-child(2) icon[more]").click()
		assertEquals(true, Boolean($("modal action[block]")), "Other user's post should show block action")

		// Proof things (which have no fetch) happen instantly and no setTimeout is needed
		assertEquals(true, Boolean($("modal-bg")), "Modal is shown")
		$("modal-bg").click()
		assertEquals(false, Boolean($("modal-bg")), "Modal is closed")


		// Navigate to the topics page
		$(`footer [href="/topics"]`).click()

		// Proof things which fetch require a setTimeout of ONLY JUST ZERO
		assertEquals(
			0,
			$("main-content-wrapper topics topic")?.length || 0,
			"While loading, we do not have the topics yet",
		)
		assertEquals(
			true,
			Boolean($("posts-loading")),
			"While loading, we have a loading indicator",
		)
		await new Promise(resolve => setTimeout(resolve, 0))
		assertEquals(
			2,
			$("main-content-wrapper topics topic")?.length || 0,
			"After loading, we have 2 topics",
		)
		assertEquals(
			false,
			Boolean($("posts-loading")),
			"After loading, we do not have a loading indicator",
		)

		// Verify the default topics returned in clientServerTestup.js are shown in the DOM
		/*
			NOTE TO CLAUDE:

			How do you write code that checks innerText?
				(1) Find the DOM structure you are interested in in the code
				(2) Use a console.warn to out the innerHTML of something close
				(3) Find the actual element to get innerText from
				(4) DELETE the console.warn of innerHTML - This was for your discovery purposes ONLY

			// Dom Structure for topics from renderTopics.js:
				topic[topic=$1]
					icon
						$2
					topicname-subtitle
						topicname
							name $3
							count $4
						subtitle $5
			
			// This:
			console.warn($("main-content-wrapper topics topic:nth-child(1) topicname-subtitle").innerHTML)
			// Would output:
			// <topicname><name></name><count></count></topicname><subtitle></subtitle>

			// Which tells us, that the selector we need to find innerText is:
			$("main-content-wrapper topics topic:nth-child(1) topicname-subtitle topicname name").innerText

			// We cannot use:
			$("main-content-wrapper topics topic:nth-child(1) topicname-subtitle topicname").innerText
			// Because jsdom does not propagate innerText to the parent element

		*/
		assertEquals(
			"Religion",
			$("main-content-wrapper topics topic:nth-child(1) topicname-subtitle topicname name").innerText,
			`First topic name should be "Religion"`,
		)
		assertEquals(
			"2",
			$("main-content-wrapper topics topic:nth-child(1) topicname-subtitle topicname count").innerText,
			`First topic post count should be "2"`,
		)
	},
}

runTests(path.basename(__filename), Object.values(tests))