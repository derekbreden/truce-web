const path = require("path")
const { setupIntegrationTestEnvironment } = require("./../shared/integrationTestSetup.js")
const { assertEquals, runTests } = require("../shared/testUtils.js")

const tests = {
    testRealIndexHtmlLoads: () => {
        const window = setupIntegrationTestEnvironment()
        // window.$ and window.state are exposed from consts by options.constsToExpose by default
        assertEquals("function", typeof window.$)
        assertEquals("object", typeof window.state)
    }
}

runTests(path.basename(__filename), Object.values(tests))
