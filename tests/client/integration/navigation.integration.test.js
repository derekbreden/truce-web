const path = require('path');
const { loadAllClientScripts } = require('../shared/testHelpers.js');
const { assertEquals, runTests } = require('../shared/testUtils.js');

const tests = {
    testNavigateToFirstTopicDetail: async () => {
        const window = loadAllClientScripts();

        // Initial check for window.state
        assertEquals(true, !!window.state, "window.state should be defined after loadAllClientScripts.");
        if (!window.state) return; // Guard against further errors if state is not defined

        const { document, state } = window; // Destructure after checking window.state

        assertEquals(true, typeof state.path === 'string', "state.path should be a string.");

        // Check if a known SVG icon can be queried before renderTopic is called
        const testIconSvg = window.$("icons icon[more] svg");
        assertEquals(true, !!testIconSvg, "Test query for 'icons icon[more] svg' should find an element.");
        if (testIconSvg) {
            assertEquals("svg", testIconSvg.tagName?.toLowerCase(), "The found element should be an SVG tag.");
        }


        // 1. Agree to terms to navigate to /topics
        const joinButton = document.querySelector('a[href="/topics"][big]');
        assertEquals(true, !!joinButton, "Agree button should exist on the welcome page.");
        if (!joinButton) return;
        joinButton.click();

        // Wait for navigation and rendering (increased delay for page load)
        await new Promise(resolve => setTimeout(resolve, 200));

        // Verify navigation to /topics
        assertEquals("/topics", state.path, "Path should be /topics after agreeing to terms.");
        const topicsWrapper = document.querySelector('topics'); // Element that wraps all topics
        assertEquals(true, !!topicsWrapper, "Topics wrapper element should be present on /topics page.");

        // Mock that topics have loaded (in a real scenario, startSession would fetch and render them)
        // For this test, we'll assume renderTopics has been called and populated topics
        // We need at least one topic to click on. Let's simulate a minimal topic structure.
        // This is a simplification; ideally, test data would be served.
        if (topicsWrapper && !topicsWrapper.querySelector('topic[trimmed]')) {
            const mockTopicData = {
                slug: "test-topic-1",
                title: "Test Topic 1",
                body: "Short body",
                user_slug: "user1",
                display_name: "User One",
                tags: "politics", // Changed from "general" to an existing icon tag
                profile_picture_uuid: null,
                display_name_index: 0,
                user_verified: false,
                note: "",
                poll_1: null,
                favorited: false,
                favorite_count: 0,
                commented: false,
                comment_count: 0,
                image_uuids: null
            };
            // We need to load renderTopic to manually render one for the test to proceed
            const renderTopic = window.renderTopic; // Assumes renderTopic is globally available after loadAllClientScripts
            if (renderTopic) {
                 const $mockTopic = renderTopic(mockTopicData);
                 topicsWrapper.appendChild($mockTopic);
            } else {
                console.error("renderTopic function not found on window object. Skipping part of test.");
                // Potentially fail the test here or make it inconclusive
                assertEquals(true, false, "renderTopic function is required for this test and was not found.");
                return;
            }
        }

        // 2. Find and click the first topic link/element
        const firstTopicElement = document.querySelector('topics > topic[trimmed]');
        assertEquals(true, !!firstTopicElement, "First topic element with [trimmed] attribute should be found on the /topics page.");
        if (!firstTopicElement) return;

        // Simulate click on the topic element itself, which should trigger navigation
        firstTopicElement.click();

        // Wait for navigation and rendering
        await new Promise(resolve => setTimeout(resolve, 200));

        // 3. Assert navigation to the topic detail path
        // The exact slug might be hard to predict if topics are dynamic,
        // so check if path starts with /topic/ and is not /topics
        assertEquals(true, state.path.startsWith('/topic/'), `Path should start with /topic/ after clicking a topic. Actual path: ${state.path}`);
        assertEquals(false, state.path === '/topics', `Path should no longer be /topics. Actual path: ${state.path}`);

        // To get the specific slug for a more precise check, we'd ideally get it from the mock data.
        // For this example, we'll assume the first topic rendered was 'test-topic-1'
        const expectedTopicPath = "/topic/test-topic-1";
        assertEquals(expectedTopicPath, state.path, `Path should be '${expectedTopicPath}' after clicking the first topic.`);

        // 4. Assert that topic detail specific elements are rendered
        // Check for the <comments> wrapper, indicating comments can be loaded/displayed
        const commentsWrapper = document.querySelector('main-content-wrapper[active] comments');
        assertEquals(true, !!commentsWrapper, "Comments wrapper element should be present on the topic detail page.");

        // Check that the main topic display is no longer 'trimmed' (if it was the same element being re-rendered)
        // Or, more simply, check if a full topic body indicative element exists.
        // renderTopic uses markdownToElements. Let's assume a <p> tag will be part of the body.
        const topicBodyIndicator = document.querySelector('main-content-wrapper[active] topic p');
        assertEquals(true, !!topicBodyIndicator, "A <p> tag (indicator of topic body) should be present in the main content of the topic detail page.");
    }
};

runTests(path.basename(__filename), Object.values(tests));
