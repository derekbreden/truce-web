const path = require("path")
const { setupIntegrationTestEnvironment } = require("./../shared/integrationTestSetup.js")
const { assertEquals, runTests } = require("../shared/testUtils.js")

const tests = {
    testActivitiesPageDisplaysCorrectly: async () => {
        const window = setupIntegrationTestEnvironment({
            constsToExpose: ["goToPath", "loadingPage", "renderPage"]
        })
        const { state, $ } = window

        // 1. Mock API responses for initial navigation
        window.setMockFetchResponseForPaths({
            "/": {
                path: "/",
                topics: [], comments: [], activities: [], notifications: [],
                user_slug: null, subscribed_to_users: 0, user_id: null, email: null,
                display_name: null, profile_picture_uuid: null, display_name_index: 0,
                has_more: false
            },
            "/topics": {
                path: "/topics",
                topics: [], comments: [], activities: [], notifications: [],
                user_slug: null, subscribed_to_users: 0, user_id: null, email: null,
                display_name: null, profile_picture_uuid: null, display_name_index: 0,
                has_more: false
            }
        })

        // 2. Actions: Navigate from Welcome to Topics page
        const $joinButton = $(`a[href="/topics"][big]`)
        assertEquals(true, Boolean($joinButton), "Agree button (Join the Discussion) should exist on the welcome page.")
        $joinButton.click()
        await new Promise(resolve => setTimeout(resolve, 0)) // Wait for DOM updates and navigation

        assertEquals("/topics", state.path, "Path should be /topics after agreeing to terms.")

        // 3. Mock API response for Activities page (empty state)
        window.setMockFetchResponseForPaths({
            "/activities": {
                path: "/activities",
                activities: [], // Initially empty
                topics: [], comments: [], notifications: [],
                user_slug: null, subscribed_to_users: 0, user_id: null, email: null,
                display_name: null, profile_picture_uuid: null, display_name_index: 0,
                has_more: false // Assuming 'has_more' might apply to activities
            }
        })

        // 4. Navigate to Activities Page
        window.goToPath("/activities")
        await new Promise(resolve => setTimeout(resolve, 0)) // Wait for DOM updates and navigation

        assertEquals("/activities", state.path, "Path should be /activities after direct navigation.")

        // Assertions for page structure (empty state)
        const $mainContentWrapper = $("main-content-wrapper[active]")
        assertEquals(true, Boolean($mainContentWrapper), "Main content wrapper for activities page should be active.")
        const $mainContent = $mainContentWrapper.$("main-content")
        assertEquals(true, Boolean($mainContent), "Main content area should exist within the active wrapper.")

        // No specific "Activities" title element is consistently rendered in a predictable place for /activities.
        // The content itself (list of activities) serves as the indicator.
        // So, we'll skip a dedicated page title assertion for "/activities" page itself.

        const $activitiesContainer = $mainContent.$("activities")
        assertEquals(true, Boolean($activitiesContainer), "Activities container (<activities>) should exist on the activities page.")
        assertEquals(0, $activitiesContainer.children.length, "Activities container should have 0 child elements when activities are empty.")

        // --- Test with activity data ---

        const mockActivities = [
            {
                // Topic activity fields
                type: "topic",
                slug: "test-activity-topic-1",
                title: "Activity Topic Title 1",
                body: "Body of activity topic 1",
                user_slug: "activity-user-1",
                display_name: "Activity User One",
                tags: "general",
                comment_count: 0,
                favorite_count: 0,
                favorited: false,
                commented: false,
                create_date: "2023-10-26T10:00:00Z",
                profile_picture_uuid: null,
                display_name_index: 0,
                user_verified: false,
                note: "",
                poll_1: null,
                image_uuids: null
            },
            {
                // Comment activity fields
                type: "comment",
                id: "activity-comment-1",
                parent_topic_title: "Parent Topic for Comment Activity",
                parent_topic_slug: "parent-topic-comment-activity",
                body: "This is an activity for a new comment.",
                user_slug: "activity-user-2",
                display_name: "Activity User Two",
                create_date: "2023-10-26T11:00:00Z", // Newer, so should appear first
                profile_picture_uuid: null,
                display_name_index: 0,
                user_verified: false,
                note: "",
                topic_id: "topic-for-comment-activity",
                parent_comment_body: null,
                parent_comment_display_name: null,
                parent_comment_display_name_index: null,
                parent_comment_user_slug: null,
                parent_comment_profile_picture_uuid: null,
                parent_comment_note: null
            }
        ];

        window.setMockFetchResponseForPaths({
            "/activities": {
                path: "/activities",
                activities: mockActivities, // Use the mock data
                topics: [], comments: [], notifications: [],
                user_slug: null, subscribed_to_users: 0, user_id: null, email: null,
                display_name: null, profile_picture_uuid: null, display_name_index: 0,
                has_more: false
            }
        });

        // Reload page content for /activities by simulating fetch and renderPage
        if (state.path === "/activities") {
            // Simulate the data loading process that client/index.js would do
            const response = await window.fetch("/session", {
                method: "POST",
                body: JSON.stringify({ path: "/activities" }) // Ensure this matches expected payload for the mock
            });
            const data = await response.json();
            window.renderPage(data); // Manually call renderPage
            await new Promise(resolve => setTimeout(resolve, 0)); // Wait for render
        } else {
            // Fallback if somehow not on /activities (should not happen due to prior asserts)
            window.goToPath("/activities");
            await new Promise(resolve => setTimeout(resolve, 0));
            // If we took this fallback, we'd need to repeat the fetch/renderPage here too
            // For simplicity, assuming the test flow ensures we are on /activities
        }

        const $activitiesContainerWithData = $("main-content-wrapper[active] main-content activities");
        assertEquals(true, Boolean($activitiesContainerWithData), "Activities container should exist after loading data.");
        if (!$activitiesContainerWithData) return; // Guard against further errors if this fails

        assertEquals(mockActivities.length, $activitiesContainerWithData.children.length, "Should render the correct number of activity items.");

        // Assertions for the comment activity (should appear first due to create_date)
        const $commentActivity = $activitiesContainerWithData.$("activity[comment]");
        assertEquals(true, Boolean($commentActivity), "Comment activity element should be present.");
        if ($commentActivity) {
            // renderActivities > renderCommentActivity > h2 for parent topic title
            const $topicTitle = $commentActivity.$("h2");
            assertEquals("Parent Topic for Comment Activity", $topicTitle?.innerText.trim(), "Comment activity's parent topic title mismatch.");

            // renderActivities > renderCommentActivity > renderComment > p > span for body
            const $commentBody = $commentActivity.$("comment p > span");
            assertEquals("This is an activity for a new comment.", $commentBody?.innerText.trim(), "Comment activity body text mismatch.");

            // renderActivities > renderCommentActivity > renderComment > author > span for author
            const $commentAuthor = $commentActivity.$("comment author span");
            assertEquals("Activity User Two", $commentAuthor?.innerText.trim(), "Comment activity author name mismatch.");
        }

        // Assertions for the topic activity (should appear second)
        const $topicActivity = $activitiesContainerWithData.$("activity[topic]");
        assertEquals(true, Boolean($topicActivity), "Topic activity element should be present.");
        if ($topicActivity) {
            const $titleElement = $topicActivity.$("topic h2");
            assertEquals(true, Boolean($titleElement), "Topic activity H2 title element should exist.");
            if ($titleElement) {
                const titleText = $titleElement.firstChild?.textContent?.trim();
                assertEquals("Activity Topic Title 1", titleText, "Topic activity title text mismatch.");
            }

            // renderActivities > renderTopicActivity > renderTopic > author > span for author
            const $author = $topicActivity.$("topic author span");
            assertEquals("Activity User One", $author?.innerText.trim(), "Topic activity author name mismatch.");
        }
    }
}

runTests(path.basename(__filename), Object.values(tests))
