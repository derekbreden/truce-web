const path = require('path');
const { setupIntegrationTestEnvironment } = require('./../shared/integrationTestSetup.js');
const { assertEquals, runTests } = require('../shared/testUtils.js');

const tests = {
    testRealIndexHtmlLoads: () => {
        const window = setupIntegrationTestEnvironment(); // This should mock setTimeout and fetch
        assertEquals(false, window.is_android);
    }
    // The testEditProfilePictureShowsErrorModal has been moved
};

runTests(path.basename(__filename), Object.values(tests));
