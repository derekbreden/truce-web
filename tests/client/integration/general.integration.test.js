const path = require("path")
const { setupIntegrationTestEnvironment } = require("./../shared/integrationTestSetup.js")
const { assertEquals, runTests } = require("../shared/testUtils.js")

const tests = {
    testRealIndexHtmlLoads: () => {
        const window = setupIntegrationTestEnvironment()
        const { state, $ } = window
        // $ and state are exposed to the window from consts by options.constsToExpose by default
        assertEquals("function", typeof $)
        assertEquals("object", typeof state)
    }
}

runTests(path.basename(__filename), Object.values(tests))
