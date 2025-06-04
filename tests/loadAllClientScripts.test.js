const path = require('path');
const { loadAllClientScripts } = require('../tests/testHelpers.js');
const { assertEquals, runTests } = require('../tests/testUtils.js');

const mockIndexHtmlPath = path.resolve(__dirname, 'mockIndex.html');

const tests = {

    testRealIndexHtmlLoads: () => {
        const startTime = new Date()
        
        const window = loadAllClientScripts();
        assertEquals(false, window.is_android)

        const endTime = new Date()
        // const timeTakenToLoadWindow = endTime - startTime
        // console.warn("TIME IN TEST: " + timeTakenToLoadWindow + "ms")
    }
};

// Run tests
const testName = path.basename(__filename); // Get the current filename for the test name
runTests(testName, Object.values(tests));
