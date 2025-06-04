const path = require('path');
const { setupIntegrationTestEnvironment } = require('./../shared/integrationTestSetup.js');
const { assertEquals, runTests } = require('../shared/testUtils.js');

// Test function demonstrating urlPattern matching for a distinct API endpoint
const testUserProfileDisplaysFetchedData = async () => {
    const { window } = await setupIntegrationTestEnvironment();

    window.setMockFetchResponses([
      {
        urlPattern: "/api/user/testuser/profile",
        responseBody: {
          success: true,
          user: {
            display_name: "Test User",
            bio: "A test bio.",
            profile_picture_uuid: "uuid-test-pic"
          }
        },
        status: 200
      }
    ]);

    // Simulate an action that would trigger a fetch to this URL
    // For this example, we directly call window.fetch
    const response = await window.fetch("/api/user/testuser/profile");
    const data = await response.json();

    assertEquals(response.ok, true, "Response should be OK for successful fetch");
    assertEquals(response.status, 200, "Response status should be 200");
    assertEquals(data.success, true, "Success should be true in response body");
    assertEquals(data.user.display_name, "Test User", "User display name should be fetched");
    assertEquals(data.user.bio, "A test bio.", "User bio should be fetched");
    assertEquals(data.user.profile_picture_uuid, "uuid-test-pic", "User profile picture UUID should be fetched");
};

// Test function demonstrating requestMatcher for /session endpoint and error handling
const testUserProfileShowsErrorOnFailedFetch = async () => {
    const { window } = await setupIntegrationTestEnvironment();

    window.setMockFetchResponses([
      {
        requestMatcher: (url, options) => {
          if (url === "/session" && options && options.body) {
            try {
              const body = JSON.parse(options.body);
              return body.path === "/user/anotheruser";
            } catch (e) {
              return false;
            }
          }
          return false;
        },
        responseBody: { success: false, error: "User not found" },
        status: 404
      }
    ]);

    // Simulate fetching data for /user/anotheruser via a /session call
    const response = await window.fetch("/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" }, // Good practice to include headers
      body: JSON.stringify({ path: "/user/anotheruser" })
    });
    const data = await response.json();

    assertEquals(response.ok, false, "Response should not be OK for failed fetch");
    assertEquals(response.status, 404, "Response status should be 404");
    assertEquals(data.success, false, "Success should be false in response body");
    assertEquals(data.error, "User not found", "Error message should be 'User not found'");
};

// Register and run the tests
runTests(path.basename(__filename), [
  testUserProfileDisplaysFetchedData,
  testUserProfileShowsErrorOnFailedFetch
]);
