const path = require("path")
const { setupIntegrationTestEnvironment } = require("./../shared/integrationTestSetup.js")
const { assertEquals, runTests } = require("../shared/testUtils.js")

const tests = {
    testFavoritesPageDisplaysCorrectlyAfterNavigation: async () => {
        const window = setupIntegrationTestEnvironment()
        const { state, $ } = window

        // 1. Mock API responses
        window.setMockFetchResponseForPaths({
            "/": { // For initial welcome page
                path: "/",
                topics: [], comments: [], activities: [], notifications: [],
                user_slug: null, subscribed_to_users: 0, user_id: null, email: null,
                display_name: null, profile_picture_uuid: null, display_name_index: 0,
                has_more: false
            },
            "/topics": { // For navigation after agreeing to terms
                path: "/topics",
                topics: [], comments: [], activities: [], notifications: [],
                user_slug: null, subscribed_to_users: 0, user_id: null, email: null,
                display_name: null, profile_picture_uuid: null, display_name_index: 0,
                has_more: false
            },
            "/favorites": { // For the actual favorites page
                path: "/favorites",
                topics: [], // Assuming no favorited topics for this basic display test
                comments: [], activities: [], notifications: [],
                user_slug: null, subscribed_to_users: 0, user_id: null, email: null,
                display_name: null, profile_picture_uuid: null, display_name_index: 0,
                has_more: false,
            }
        })

        // 2. Initial Navigation (Welcome -> Topics)
        const $joinButton = $(`a[href="/topics"][big]`)
        assertEquals(true, Boolean($joinButton), "Agree button (Join the Discussion) should exist on the welcome page.")

        $joinButton.click()
        await new Promise(resolve => setTimeout(resolve, 0)) 
        assertEquals("/topics", state.path, "Path should be /topics after agreeing to terms.")

        // 3. Navigate to Favorites Page
        const $favoritesFooterIcon = $("footer icon[favorites]")
        assertEquals(true, Boolean($favoritesFooterIcon), "Favorites footer icon should exist.")

        $favoritesFooterIcon.click()
        await new Promise(resolve => setTimeout(resolve, 0))
        assertEquals("/favorites", state.path, "Path should be /favorites after clicking the favorites footer icon.")

        // 4. Verify Favorites Page Content
        const $mainContentWrapper = $("main-content-wrapper[active]")
        assertEquals(true, Boolean($mainContentWrapper), "Main content wrapper for favorites page should be active.")

        const $mainContent = $mainContentWrapper.$("main-content")
        assertEquals(true, Boolean($mainContent), "Main content area should exist within the active wrapper.")

        // Adjusted header selector: Look for any h2 and check its text.
        const $favoritesPageHeaderH2Span = $mainContent.$("h2[favorites] span") 
        assertEquals(true, Boolean($favoritesPageHeaderH2Span), "A <h2> header element should exist on the favorites page.")
        assertEquals("Favorites", $favoritesPageHeaderH2Span.innerText.trim(), "Favorites page H2 header text mismatch (using innerText).")

        // Adjusted container selector: Look for any <topics> container.
        const $favoritesListContainer = $mainContent.$("topics") 
        assertEquals(true, Boolean($favoritesListContainer), "A <topics> container should be present on the favorites page.")
    
        const $renderedTopicElements = $favoritesListContainer.querySelectorAll("topic[trimmed]")
        assertEquals(0, $renderedTopicElements.length, "Should render 0 topic elements if mock data for /favorites has topics: [].")
    }
}

runTests(path.basename(__filename), Object.values(tests))
