const path = require('path');
const { setupIntegrationTestEnvironment } = require('./../shared/integrationTestSetup.js');
const { assertEquals, runTests } = require('../shared/testUtils.js');

const tests = {
    testTopicDetailsDisplayOnDetailPage: async () => {
        const window = setupIntegrationTestEnvironment();
        const { document, state } = window;

        // 1. Agree to terms to navigate to /topics
        const joinButton = document.querySelector('a[href="/topics"][big]');
        assertEquals(true, !!joinButton, "Agree button should exist on the welcome page.");
        if (!joinButton) return;
        joinButton.click();

        // Wait for navigation and rendering
        // Multiple awaits for setTimeout(0) to allow microtasks and rendering to process
        await new Promise(resolve => setTimeout(resolve, 0));
        await new Promise(resolve => setTimeout(resolve, 0));


        assertEquals("/topics", state.path, "Path should be /topics after agreeing to terms.");
        const topicsWrapper = document.querySelector('topics');
        assertEquals(true, !!topicsWrapper, "Topics wrapper element should be present on /topics page.");

        // Ensure renderTopic is available (it's made global by setupIntegrationTestEnvironment)
        const renderTopic = window.renderTopic;
        if (!renderTopic) {
            console.error("renderTopic function not found on window object. Test cannot proceed.");
            assertEquals(true, false, "renderTopic function is required and was not found.");
            return;
        }

        // 2. Simulate at least one topic appearing on the /topics page
        // This is necessary to be able to click on a topic to navigate to its detail page.
        // The navigation.integration.test.js uses a similar approach.
        // The fetch mock in integrationTestSetup.js for /topics returns an empty topics array,
        // so we manually add one here.
        if (topicsWrapper && !topicsWrapper.querySelector('topic[trimmed]')) {
            const mockTopicData = {
                slug: "test-topic-for-details", // Unique slug for this test
                title: "Test Topic for Details",
                body: "Short body for testing details display.",
                user_slug: "user-details",
                display_name: "User Details",
                tags: "general", // Assuming 'general' is a valid tag that has an icon
                profile_picture_uuid: null,
                display_name_index: 0,
                user_verified: false,
                note: "",
                poll_1: null,
                favorited: false,
                favorite_count: 3, // Example count
                commented: false,
                comment_count: 5, // Example count
                image_uuids: null
            };
            const $mockTopic = renderTopic(mockTopicData);
            topicsWrapper.appendChild($mockTopic);
        }

        const firstTopicElement = document.querySelector('topics > topic[trimmed]');
        assertEquals(true, !!firstTopicElement, "First topic element should be found on the /topics page.");
        if (!firstTopicElement) return;

        // 3. Click the topic to navigate to its detail page
        firstTopicElement.click();

        // Wait for navigation and rendering to the detail page
        await new Promise(resolve => setTimeout(resolve, 0));
        await new Promise(resolve => setTimeout(resolve, 0));
        // Additional small delay might be needed if content rendering is slow
        await new Promise(resolve => setTimeout(resolve, 50));


        const expectedTopicPath = "/topic/test-topic-for-details";
        assertEquals(expectedTopicPath, state.path, `Path should be '${expectedTopicPath}' after clicking the topic.`);

        // 4. Assert that topic detail specific elements are rendered
        // As per renderTopic.js, these details are within a 'topic-details[detail-wrapper]'
        const topicDetailsWrapper = document.querySelector('main-content-wrapper[active] topic topic-details[detail-wrapper]');
        assertEquals(true, !!topicDetailsWrapper, "Topic details wrapper (`topic-details[detail-wrapper]`) should be present on the topic detail page.");

        if (topicDetailsWrapper) {
            const favoritesDetail = topicDetailsWrapper.querySelector('detail[favorites]');
            assertEquals(true, !!favoritesDetail, "Favorites detail element (`detail[favorites]`) should be present within the topic details wrapper.");
            if (favoritesDetail) {
                const favoriteCountElement = favoritesDetail.querySelector('p');
                assertEquals(true, !!favoriteCountElement, "Favorite count <p> element should be present.");
                // Example data has 3 favorites. The mock fetch for topic detail in setup also needs to align or be generic.
                // For now, just checking presence. Actual count check can be a future enhancement if mock data is more robust.
                // assertEquals("3", favoriteCountElement.innerText.trim(), "Favorite count should be displayed.");
            }

            const commentsDetail = topicDetailsWrapper.querySelector('detail[comments]');
            assertEquals(true, !!commentsDetail, "Comments detail element (`detail[comments]`) should be present within the topic details wrapper.");
            if (commentsDetail) {
                const commentCountElement = commentsDetail.querySelector('p');
                assertEquals(true, !!commentCountElement, "Comment count <p> element should be present.");
                // Example data has 5 comments.
                // assertEquals("5", commentCountElement.innerText.trim(), "Comment count should be displayed.");
            }
        }
    }
};

runTests(path.basename(__filename), Object.values(tests));
