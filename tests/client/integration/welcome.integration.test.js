const path = require('path');
const { setupIntegrationTestEnvironment } = require('./../shared/integrationTestSetup.js');
const { assertEquals, runTests } = require('../shared/testUtils.js');

const tests = {
    testInitialPageShowsWelcomeOrTerms: () => {
        const window = setupIntegrationTestEnvironment();

        // Mock for initial load of "/" path
        window.setMockFetchResponses([
            {
                requestMatcher: (url, options) => {
                    if (url !== "/session") return false;
                    try {
                        const body = JSON.parse(options.body);
                        return body.path === "/" && !body.min_topic_create_date; // Initial load
                    } catch (e) { return false; }
                },
                status: 200,
                responseBody: {
                    path: "/",
                    topics: [], comments: [], activities: [], notifications: [],
                    user_slug: null, subscribed_to_users: 0, user_id: null, email: null,
                    display_name: null, profile_picture_uuid: null, display_name_index: 0,
                    has_more: false
                }
            }
        ]);

        // The welcome header is specifically <h2 welcome><span>Terms and conditions</span></h2>
        const welcomeHeaderSpan = window.document.querySelector('h2[welcome] span');

        assertEquals(true, !!welcomeHeaderSpan, "Welcome header span should exist.");
        if (welcomeHeaderSpan) {
            assertEquals("Terms and conditions", welcomeHeaderSpan.innerText.trim(), "Initial page should display 'Terms and conditions' in the welcome header span.");
        }

        // Corrected selector for the "Join the Discussion" button
        const joinButton = window.document.querySelector('a[href="/topics"][big]');
        assertEquals(true, !!joinButton, "Initial page should have a 'Join the Discussion' button.");
        if (joinButton) {
            assertEquals("Join the Discussion", joinButton.innerText.trim(), "Button text should be 'Join the Discussion'.");
        }
    },

    testAgreeingToTermsNavigatesToNextPageAndSetsLocalStorage: async () => {
        const window = setupIntegrationTestEnvironment();

        // Setup mock API responses for this test
        window.setMockFetchResponses([
            { // Mock for the initial fetch when path is "/"
                requestMatcher: (url, options) => {
                    if (url !== "/session") return false;
                    try {
                        const body = JSON.parse(options.body);
                        return body.path === "/" && !body.min_topic_create_date;
                    } catch (e) { return false; }
                },
                status: 200,
                responseBody: {
                    path: "/",
                    topics: [], comments: [], activities: [], notifications: [],
                    user_slug: null, subscribed_to_users: 0, user_id: null, email: null,
                    display_name: null, profile_picture_uuid: null, display_name_index: 0,
                    has_more: false
                }
            },
            { // Mock for the fetch when path is "/topics" (after click)
                requestMatcher: (url, options) => {
                    if (url !== "/session") return false;
                    try {
                        const body = JSON.parse(options.body);
                        return body.path === "/topics" && !body.min_topic_create_date;
                    } catch (e) { return false; }
                },
                status: 200,
                responseBody: {
                    path: "/topics",
                    topics: [], // Empty topics list is fine for this test's assertions
                    comments: [], activities: [], notifications: [],
                    user_slug: null, subscribed_to_users: 0, user_id: null, email: null,
                    display_name: null, profile_picture_uuid: null, display_name_index: 0,
                    has_more: false
                }
            }
        ]);

        // Corrected selector for the "Join the Discussion" button
        const joinButton = window.document.querySelector('a[href="/topics"][big]');
        assertEquals(true, !!joinButton, "Agree button should exist on the page.");
        if (!joinButton) return; // Stop test if button not found

        // Simulate a click
        joinButton.click();

        await new Promise(resolve => setTimeout(resolve, 0));
        await new Promise(resolve => setTimeout(resolve, 0));

        // 1. Verify terms are no longer visible
        const welcomeHeaderSpanAfterClick = window.document.querySelector('h2[welcome] span');
        assertEquals(null, welcomeHeaderSpanAfterClick, "Welcome header span should NOT be present after agreeing to terms.");

        // 2. Verify localStorage item is set
        // The client-side code uses `localStorage.setItem(`${window.local_storage_key}:agreed`, true);`
        // window.local_storage_key is set based on referrer or userAgent. In JSDOM, it defaults.
        // The goToPath function refers to it as 'agreed' not 'truce_terms_agreed'
        const termsAgreed = window.localStorage.getItem(window.local_storage_key ? `${window.local_storage_key}:agreed` : 'trucev1:agreed');
        assertEquals("true", termsAgreed, `localStorage '${window.local_storage_key || 'trucev1'}:agreed' should be set to 'true'.`);

        // 3. Verify new content is loaded (e.g., topics list)
        const topicsWrapper = window.document.querySelector('topics');
        assertEquals(true, !!topicsWrapper, "Topics wrapper element should be present after agreeing to terms.");

        // Further check: The last_root_path in localStorage should be updated to /topics
        // The client-side goToPath function updates this.
        const lastRootPath = window.localStorage.getItem(window.local_storage_key ? `${window.local_storage_key}:last_root_path` : 'trucev1:last_root_path');
        assertEquals("/topics", lastRootPath, "localStorage 'last_root_path' should be set to '/topics'.");
    }
};

runTests(path.basename(__filename), Object.values(tests));
