const { assertEquals, runTests } = require('../shared/testUtils.js');
const { createMockDocument, createMockWindow, loadClientScript } = require('../shared/testHelpers.js'); // Updated imports
const path = require('path');

// --- Mock Environment Setup ---
// Removed: const { mock$, loadScript } = setupClientScriptTest();

// Instantiate mockDocument and mockWindow
const mockDocument = createMockDocument();
const mockWindow = createMockWindow(mockDocument);

// Create and append main-content-wrapper
const mainContentWrapper = mockDocument.createElement('div');
mainContentWrapper.setAttribute('id', 'main-content-wrapper');
mockDocument.body.appendChild(mainContentWrapper);

// Load flint.js using loadClientScript to get the real $ function
const $ = loadClientScript(
  path.resolve(__dirname, '../../../client/flint.js'),
  { document: mockDocument, window: mockWindow },
  "$"
);

// Mock for window.setTimeout used by debug.js
// Captures the callback and duration for manual execution and assertion.
// debug.js only sets one timeout at a time and doesn't clear it,
// so a simple capture is sufficient.
let setTimeoutCallback = null;
let setTimeoutDuration = 0;
const mockSetTimeout = (callback, duration) => {
  setTimeoutCallback = callback; // Store the callback
  setTimeoutDuration = duration; // Store the duration
  // Does not return a timeoutId as debug.js doesn't use it.
};

// This global array will mimic the 'rendered' array inside debug.js for assertion purposes
let expectedRenderedArrayForAssertions = [];
// This will be reassigned in setupTestEnvironment
let debug;

// Refactored function: Renamed and updated logic
const setupTestEnvironment = () => {
  expectedRenderedArrayForAssertions = [];
  setTimeoutCallback = null;
  setTimeoutDuration = 0;

  // Clear any DEBUG elements from mainContentWrapper
  const debugElements = mainContentWrapper.querySelectorAll('debug');
  debugElements.forEach(el => el.remove());

  // Reload debug.js to reset its internal state, including the 'rendered' array
  const scriptPath = path.resolve(__dirname, '../../../client/debug.js');
  const loadedDebugModule = loadClientScript(
    scriptPath,
    {
      document: mockDocument,
      $: $, // Pass the real $
      setTimeout: mockSetTimeout
    },
    ["debug"] // Ensure we are asking for the 'debug' export
  );
  debug = loadedDebugModule.debug; // Re-assign the debug function
};

// --- Load Script Under Test ---
// debug.js is loaded once. Its internal 'rendered' array will accumulate.
// const scriptPath = path.resolve(__dirname, '../client/debug.js'); // Moved into setupTestEnvironment
// Modified loadClientScript call for debug.js
// const { debug } = loadClientScript( // Moved into setupTestEnvironment
// scriptPath,
// {
// document: mockDocument,
// $: $, // Pass the real $
// setTimeout: mockSetTimeout
// },
// ["debug"]
// );
// --- End Load Script Under Test ---

// --- Test Cases ---
function testDebug_rendersSingleStringArgument() {
  setupTestEnvironment(); // Call renamed function
  expectedRenderedArrayForAssertions = []; // Reset for this test case

  const testMessage = "Hello, world!";
  debug(testMessage);
  expectedRenderedArrayForAssertions.push(testMessage);

  // Query the DOM for the prepended debug element
  const debugElements = mainContentWrapper.querySelectorAll('debug');
  assertEquals(debugElements.length, 1, "A debug element should have been prepended to main-content-wrapper.");

  if (debugElements.length > 0) {
    const prependedElement = debugElements[0];
    const expectedJsonInPayload = JSON.stringify(expectedRenderedArrayForAssertions, null, 2);
    assertEquals(prependedElement.innerText.trim(), expectedJsonInPayload.trim(), "Rendered output for single string incorrect.");
  }

  assertEquals(setTimeoutDuration, 5000, "setTimeout duration for single string incorrect.");

  // Check element removal after setTimeoutCallback
  if (typeof setTimeoutCallback === 'function') {
    setTimeoutCallback();
  }
  const debugElementsAfterTimeout = mainContentWrapper.querySelectorAll('debug');
  assertEquals(debugElementsAfterTimeout.length, 0, "$('debug').remove() by timeout callback incorrect. Element should be gone from main-content-wrapper.");
}

function testDebug_rendersMultipleStringArguments() {
  setupTestEnvironment(); // Call renamed function
  expectedRenderedArrayForAssertions = []; // Reset for this test case

  const msg1 = "First message";
  const msg2 = "Second message";
  debug(msg1, msg2);
  expectedRenderedArrayForAssertions.push([msg1, msg2]);

  const debugElements = mainContentWrapper.querySelectorAll('debug');
  assertEquals(debugElements.length, 1, "A debug element should have been prepended for multiple args.");

  if (debugElements.length > 0) {
    const prependedElement = debugElements[0];
    const expectedJsonInPayload = JSON.stringify(expectedRenderedArrayForAssertions, null, 2);
    assertEquals(prependedElement.innerText.trim(), expectedJsonInPayload.trim(), "Rendered output for multiple strings incorrect.");
  }

  assertEquals(setTimeoutDuration, 5000, "setTimeout duration for multiple strings incorrect.");

  if (typeof setTimeoutCallback === 'function') {
    setTimeoutCallback();
  }
  const debugElementsAfterTimeout = mainContentWrapper.querySelectorAll('debug');
  assertEquals(debugElementsAfterTimeout.length, 0, "$('debug').remove() by timeout callback for multiple strings incorrect.");
}

function testDebug_rendersErrorObject() {
  setupTestEnvironment(); // Call renamed function
  expectedRenderedArrayForAssertions = []; // Reset for this test case
  const errorEventLike = { message: "Test error message", lineno: 10, colno: 5 };
  debug(errorEventLike);

  const expectedRenderedError = { message: "Test error message", lineno: 10, colno: 5 };
  expectedRenderedArrayForAssertions.push(expectedRenderedError);

  const debugElements = mainContentWrapper.querySelectorAll('debug');
  assertEquals(debugElements.length, 1, "A debug element should have been prepended for error object.");

  if (debugElements.length > 0) {
    const prependedElement = debugElements[0];
    const expectedJsonInPayload = JSON.stringify(expectedRenderedArrayForAssertions, null, 2);
    assertEquals(prependedElement.innerText.trim(), expectedJsonInPayload.trim(), "Rendered output for error object incorrect.");
  }

  assertEquals(setTimeoutDuration, 5000, "setTimeout for error object incorrect.");

  if (typeof setTimeoutCallback === 'function') {
    setTimeoutCallback();
  }
  const debugElementsAfterTimeout = mainContentWrapper.querySelectorAll('debug');
  assertEquals(debugElementsAfterTimeout.length, 0, "$('debug').remove() by timeout callback for error object incorrect.");
}

function testDebug_rendersSimpleObject() {
  setupTestEnvironment(); // Call renamed function
  expectedRenderedArrayForAssertions = []; // Reset for this test case
  const testObj = { key: "value", nested: { num: 123 } };
  debug(testObj);
  expectedRenderedArrayForAssertions.push(testObj);

  const debugElements = mainContentWrapper.querySelectorAll('debug');
  assertEquals(debugElements.length, 1, "A debug element should have been prepended for simple object.");

  if (debugElements.length > 0) {
    const prependedElement = debugElements[0];
    const expectedJsonInPayload = JSON.stringify(expectedRenderedArrayForAssertions, null, 2);
    assertEquals(prependedElement.innerText.trim(), expectedJsonInPayload.trim(), "Rendered output for simple object incorrect.");
  }

  assertEquals(setTimeoutDuration, 5000, "setTimeout for simple object incorrect.");

  if (typeof setTimeoutCallback === 'function') {
    setTimeoutCallback();
  }
  const debugElementsAfterTimeout = mainContentWrapper.querySelectorAll('debug');
  assertEquals(debugElementsAfterTimeout.length, 0, "$('debug').remove() by timeout callback for simple object incorrect.");
}

function testDebug_setTimeoutCallbackRemovesElement() {
  setupTestEnvironment(); // Call renamed function
  debug("Testing setTimeout callback");
  // We don't need to check expectedRenderedArrayForAssertions for this specific test's main goal.

  assertEquals(true, typeof setTimeoutCallback === 'function', "setTimeout callback not a function.");

  // mock$.reset(); // Removed: mock$ is no longer used

  if (typeof setTimeoutCallback === 'function') {
    setTimeoutCallback(); // Execute the callback.
  }

  const debugElementsAfterTimeout = mainContentWrapper.querySelectorAll('debug');
  assertEquals(debugElementsAfterTimeout.length, 0, "$('debug').remove() by timeout callback incorrect. Element should be gone from main-content-wrapper.");
}

// --- End Test Cases ---

// --- Run Tests ---
// This will run tests in order. The expectedRenderedArrayForAssertions will build up.
// To make tests truly independent, one would typically use a test runner like Jest/Mocha
// that isolates modules or provides setup/teardown for each test.
// Here, we manage a shared 'expectedRenderedArrayForAssertions' to match debug.js's behavior.

// Resetting the array at the start of the whole test suite run.
// expectedRenderedArrayForAssertions = []; // Now handled by setupTestEnvironment in each test

runTests('debug.test.js', [
  testDebug_rendersSingleStringArgument,
  testDebug_rendersMultipleStringArguments,
  testDebug_rendersErrorObject,
  testDebug_rendersSimpleObject,
  testDebug_setTimeoutCallbackRemovesElement // This test is less affected by accumulation for its main assertion
]);
// --- End Run Tests ---
