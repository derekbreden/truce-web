const fs = require('fs');
const path = require('path');
const { loadAllClientScripts } = require('../tests/testHelpers.js');
const { assertEquals, runTests } = require('../tests/testUtils.js');

const mockIndexHtmlPath = path.resolve(__dirname, 'mockIndex.html');
const mockScriptsDirPath = path.resolve(__dirname, 'mockClientScripts');
const realIndexHtmlPath = path.resolve(__dirname, '..', 'index.html');

const tests = {
    testFunctionsAreLoaded: () => {
        const loadedFunctions = loadAllClientScripts(mockIndexHtmlPath);
        assertEquals('function', typeof loadedFunctions.mockFunction1, "mockFunction1 should be loaded as a function");
        assertEquals('function', typeof loadedFunctions.anotherFunctionInScript1, "anotherFunctionInScript1 should be loaded as a function");
        assertEquals('function', typeof loadedFunctions.mockFunction2, "mockFunction2 should be loaded as a function");
        assertEquals('function', typeof loadedFunctions.callMockFunction1, "callMockFunction1 should be loaded as a function");
    },

    testFunctionsCanBeCalled: () => {
        const loadedFunctions = loadAllClientScripts(mockIndexHtmlPath);
        assertEquals('Hello from mockFunction1', loadedFunctions.mockFunction1(), "mockFunction1 output mismatch");
        assertEquals('Greetings from mockFunction2', loadedFunctions.mockFunction2(), "mockFunction2 output mismatch");
    },

    testInterScriptFunctionCall: () => {
        const loadedFunctions = loadAllClientScripts(mockIndexHtmlPath);
        // mockFunction1 is defined in mockScript1.js
        // callMockFunction1 is defined in mockScript2.js but calls mockFunction1
        assertEquals('Hello from mockFunction1', loadedFunctions.callMockFunction1(), "Inter-script call output mismatch");
    },

    testSpecificFunctionFromScript: () => {
        const loadedFunctions = loadAllClientScripts(mockIndexHtmlPath);
        assertEquals('Script1 echoes: test', loadedFunctions.anotherFunctionInScript1('test'), "anotherFunctionInScript1 output mismatch");
    },

    testUndefinedVariableIsUndefined: () => {
        // This test is to ensure that variables not defined with "const" are not picked up.
        // For example, if a script had `let someVar = 10;`, it shouldn't be in loadedFunctions.
        // Or if a function was defined as `function classicFunc() {}` (though our heuristic is 'const')
        // For now, we are checking that a non-existent const is not there.
        const loadedFunctions = loadAllClientScripts(mockIndexHtmlPath);
        assertEquals(undefined, loadedFunctions.nonExistentFunction, "nonExistentFunction should be undefined");
    },

    testRealIndexHtmlLoads: () => {
        const indexHtmlContent = fs.readFileSync(realIndexHtmlPath, 'utf-8');
        assertEquals(true, /\/\/ <!--#include file="client\/flint\.js" -->/.test(indexHtmlContent), "Should find flint.js include in real index.html");
    }
};

// Run tests
const testName = path.basename(__filename); // Get the current filename for the test name
runTests(testName, Object.values(tests));

// Note: Cleanup of mock files has been removed.
// These files (mockIndex.html, mockClientScripts/*) should exist as permanent test assets.
