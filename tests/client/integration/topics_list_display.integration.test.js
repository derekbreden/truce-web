const path = require("path")
const { setupIntegrationTestEnvironment } = require("./../shared/integrationTestSetup.js")
const { assertEquals, runTests } = require("../shared/testUtils.js")

const testTopicsListDisplaysFetchedTopics = async () => {
    const { window } = await setupIntegrationTestEnvironment()
    const { state, $ } = window

    // Simulate agreeing to terms to navigate to /topics
    const $joinButton = $(`a[href="/topics"][big]`)

    window.setMockFetchResponseForPaths({
      "/topics": {
            success: true,
            path: "/topics",
            topics: [
                { "slug": "tech-trends", "title": "Tech Trends 2024", "body": "Exploring upcoming tech.\n\nThis is the first topic.", "user_slug": "jdoe", "display_name": "John Doe", "tags": "work", "comment_count": 5, "favorite_count": 10, "favorited": false, "commented": false, "image_uuids": null, "profile_picture_uuid": null, "display_name_index": 0, "user_verified": false, "note": "", "poll_1": null },
                { "slug": "science-discoveries", "title": "Science Discoveries", "body": "Latest in science.\n\nThis is the second topic.", "user_slug": "jane", "display_name": "Jane Roe", "tags": "science", "comment_count": 3, "favorite_count": 7, "favorited": true, "commented": false, "image_uuids": null, "profile_picture_uuid": null, "display_name_index": 0, "user_verified": true, "note": "", "poll_1": null }
            ],
            comments: [],
            activities: [],
            notifications: [],
            user: {},
            tag: {},
            subscribed_to_users: 0
      },
    })

    $joinButton.click()

    // Wait for navigation and rendering (all setTimeouts in the page will respond instantly)
    await new Promise(resolve => setTimeout(resolve, 0))

    assertEquals(state.path, "/topics", "State path should be /topics after navigation")

    const $topicsWrapper = $("topics")
    assertEquals($topicsWrapper !== null, true, "<topics> wrapper element should be present")

    const $renderedTopicElements = $topicsWrapper.querySelectorAll("topic")
    assertEquals($renderedTopicElements.length, 2, "Should render 2 topic elements based on mock data")

    // Assert content of the first topic
    const $firstTopic = $renderedTopicElements[0]

    const $firstTitle = $firstTopic.querySelector("h2")
    assertEquals($firstTitle && $firstTitle.textContent.trim(), "Tech Trends 2024", "First topic title mismatch")

    const $firstBodySpan = $firstTopic.querySelector("p > span") // Target the span inside the first p
    assertEquals($firstBodySpan !== null, true, "First topic body span should exist")

    // Assert content of the second topic
    const $secondTopic = $renderedTopicElements[1]

    const $secondTitle = $secondTopic.querySelector("h2")
    assertEquals($secondTitle && $secondTitle.textContent.trim(), "Science Discoveries", "Second topic title mismatch")

    const $secondBodySpan = $secondTopic.querySelector("p > span") // Target the span inside the first p
    assertEquals($secondBodySpan !== null, true, "Second topic body span should exist")
}

const tests = {
    testTopicsListDisplaysFetchedTopics
    // Add other tests here if any in the future
}

runTests(path.basename(__filename), Object.values(tests))
