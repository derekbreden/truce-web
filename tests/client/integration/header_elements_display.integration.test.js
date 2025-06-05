const path = require("path")
const { setupIntegrationTestEnvironment } = require("./../shared/integrationTestSetup.js")
const { assertEquals, runTests } = require("../shared/testUtils.js")

const tests = {
    testHeaderStaticElementsAreVisible: () => {
        const window = setupIntegrationTestEnvironment()
        const { $ } = window

        // Mock API response for initial load
        window.setMockFetchResponseForPaths({
            "/": {
                path: "/",
                topics: [], comments: [], activities: [], notifications: [],
                user_slug: null, subscribed_to_users: 0, user_id: null, email: null,
                display_name: null, profile_picture_uuid: null, display_name_index: 0,
                has_more: false
            }
        })

        // Test for header title <h1>Truce.</h1>
        const $headerTitle = $("header h1")
        assertEquals(true, Boolean($headerTitle), "Header title <h1> should exist.")
        if ($headerTitle) {
            assertEquals("Truce.", $headerTitle.textContent.trim(), "Header title text should be 'Truce.'.")
        }

        // Test for header logo <img alt="A bridge between ideological differences">
        const $headerLogo = $("header img[alt='A bridge between ideological differences']")
        assertEquals(true, Boolean($headerLogo), "Header logo image should exist.")
        if ($headerLogo) {
            assertEquals("/icon2.svg?v=2", $headerLogo.getAttribute("src"), "Header logo src attribute should be correct.")
            assertEquals("A bridge between ideological differences", $headerLogo.getAttribute("alt"), "Header logo alt attribute should be correct.")
        }
    }
}

runTests(path.basename(__filename), Object.values(tests))
