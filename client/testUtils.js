let testResults = [];

function assertEquals(expected, actual, message) {
  const pass = expected === actual; // Consider a deep equality check for objects/arrays if needed
  testResults.push({
    pass,
    message,
    expected,
    actual,
  });
}

function getTestResults() {
  return [...testResults];
}

function clearTestResults() {
  testResults = [];
}

async function runTests(testFileName, testFunctions) {
  clearTestResults();
  console.log(`--- Running ${testFileName} ---`);

  for (const testFn of testFunctions) {
    try {
      const result = testFn();
      if (result && typeof result.then === 'function') {
        await result;
      }
    } catch (error) {
      // If a test function itself throws an error, record it as a failure.
      // This is a basic way to catch unexpected errors within a test.
      testResults.push({
        pass: false,
        message: `Test function "${testFn.name || 'anonymous'}" threw an error: ${error.message}`,
        expected: 'Test to complete without error',
        actual: `Error: ${error.message}`,
      });
    }
  }

  let passedCount = 0;
  let failedCount = 0;

  console.log("\n--- Test Results ---");
  testResults.forEach(result => {
    if (result.pass) {
      console.log(`\x1b[32mPASS:\x1b[0m ${result.message}`);
      passedCount++;
    } else {
      console.log(`\x1b[31mFAIL:\x1b[0m ${result.message}`);
      console.log(`  Expected: ${JSON.stringify(result.expected)}`);
      console.log(`  Actual:   ${JSON.stringify(result.actual)}`);
      failedCount++;
    }
  });

  console.log(`\n--- Test Summary for ${testFileName} ---`);
  console.log(`Total assertions: ${testResults.length}`);
  console.log(`Passed: ${passedCount}`);
  console.log(`Failed: ${failedCount}`);

  if (failedCount > 0) {
    console.log("\x1b[31mSome tests failed. Exiting with status 1.\x1b[0m");
    process.exit(1);
  }
}

module.exports = {
  assertEquals,
  getTestResults,
  clearTestResults,
  runTests,
};
