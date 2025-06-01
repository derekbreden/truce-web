const { assertEquals, runTests } = require('./testUtils');
const { loadClientScript, createMockDollar } = require('./testHelpers');
const path = require('path');

// --- Mock DOM Environment ---
const mock$ = createMockDollar();
let setTimeoutCallback = null;
let setTimeoutDuration = 0;

// This global array will mimic the 'rendered' array inside debug.js for assertion purposes
let expectedRenderedArrayForAssertions = [];

const mockDocument = {
  getElementById: (id) => ({ id: id, value: 'mockValue' }),
  createElement: (tagName) => ({ tagName: tagName }),
  querySelector: (selector) => null,
};

const mockWindow = {
  setTimeout: (callback, duration) => {
    setTimeoutCallback = callback;
    setTimeoutDuration = duration;
  },
  addEventListener: (type, listener) => {},
};

const resetMocksAndExpectedRenderedArray = () => {
  mock$.reset(); // Reset calls for createMockDollar
  setTimeoutCallback = null;
  setTimeoutDuration = 0;
  // Crucially, reset the expectedRenderedArrayForAssertions for each test that implies a "fresh start"
  // This relies on tests being run in order by runTests for the accumulation to be predictable.
  // Or, if debug.js's 'rendered' array was also reset, this would be simpler.
  // For now, each test will manage its contribution to expectedRenderedArrayForAssertions.
};

// --- Load Script Under Test ---
// debug.js is loaded once. Its internal 'rendered' array will accumulate.
const scriptPath = path.resolve(__dirname, './debug.js');
const { debug } = loadClientScript(
  scriptPath,
  { $: mock$, document: mockDocument, window: mockWindow, setTimeout: mockWindow.setTimeout },
  ["debug"]
);
// --- End Load Script Under Test ---

// --- Test Cases ---
function testDebug_rendersSingleStringArgument() {
  resetMocksAndExpectedRenderedArray(); // Resets global assertion array
  expectedRenderedArrayForAssertions = []; // Explicitly start fresh for this test sequence

  const testMessage = "Hello, world!";
  debug(testMessage);
  expectedRenderedArrayForAssertions.push(testMessage); // As per debug.js logic for single arg

  const prependCall = mock$.calls.find(call => call.originalSelector === 'main-content-wrapper' && call.element.prependedChildren.length > 0);
  assertEquals(!!prependCall, true, "Prepend should have been called on main-content-wrapper.");
  if (prependCall) {
    const prependedElement = prependCall.element.prependedChildren[0];
    assertEquals(!!prependedElement, true, "A child element should have been prepended.");
    if (prependedElement) {
      const prependedContentString = prependedElement.selector; // The string content is in the 'selector' of the mock element
      const expectedJsonInPayload = JSON.stringify(expectedRenderedArrayForAssertions, null, 2);
      const expectedPayload = `\n    debug ${expectedJsonInPayload}\n    `;
      assertEquals(prependedContentString, expectedPayload, "Rendered output for single string incorrect.");
    }
  }

  assertEquals(setTimeoutDuration, 5000, "setTimeout duration for single string incorrect.");
  const removeCall = mock$.calls.find(call => call.originalSelector === 'debug' && call.element.removed);
  assertEquals(!!removeCall, true, "$('debug').remove() for single string incorrect.");
}

function testDebug_rendersMultipleStringArguments() {
  resetMocksAndExpectedRenderedArray(); // Reset test-side trackers
  // expectedRenderedArrayForAssertions is managed by the test suite runner below for accumulation.

  const msg1 = "First message";
  const msg2 = "Second message";
  debug(msg1, msg2);
  expectedRenderedArrayForAssertions.push([msg1, msg2]); // As per debug.js logic for multiple args

  const prependCall = mock$.calls.find(call => call.originalSelector === 'main-content-wrapper' && call.element.prependedChildren.length > 0);
  assertEquals(!!prependCall, true, "Prepend should have been called for multiple args.");
  if (prependCall) {
    const prependedElement = prependCall.element.prependedChildren[0];
    assertEquals(!!prependedElement, true, "A child element should have been prepended for multiple args.");
    if (prependedElement) {
      const prependedContentString = prependedElement.selector;
      const expectedJsonInPayload = JSON.stringify(expectedRenderedArrayForAssertions, null, 2);
      const expectedPayload = `\n    debug ${expectedJsonInPayload}\n    `;
      assertEquals(prependedContentString, expectedPayload, "Rendered output for multiple strings incorrect.");
    }
  }

  assertEquals(setTimeoutDuration, 5000, "setTimeout duration for multiple strings incorrect.");
  const removeCall = mock$.calls.find(call => call.originalSelector === 'debug' && call.element.removed);
  assertEquals(!!removeCall, true, "$('debug').remove() for multiple strings incorrect.");
}

function testDebug_rendersErrorObject() {
  resetMocksAndExpectedRenderedArray();
  const errorEventLike = { message: "Test error message", lineno: 10, colno: 5 };
  debug(errorEventLike);

  const expectedRenderedError = { message: "Test error message", lineno: 10, colno: 5 };
  expectedRenderedArrayForAssertions.push(expectedRenderedError); // As per debug.js logic for error-like

  const prependCall = mock$.calls.find(call => call.originalSelector === 'main-content-wrapper' && call.element.prependedChildren.length > 0);
  assertEquals(!!prependCall, true, "Prepend for error object incorrect.");
  if (prependCall) {
    const prependedElement = prependCall.element.prependedChildren[0];
    assertEquals(!!prependedElement, true, "A child element should have been prepended for error object.");
    if (prependedElement) {
      const prependedContentString = prependedElement.selector;
      const expectedJsonInPayload = JSON.stringify(expectedRenderedArrayForAssertions, null, 2);
      const expectedPayload = `\n    debug ${expectedJsonInPayload}\n    `;
      assertEquals(prependedContentString, expectedPayload, "Rendered output for error object incorrect.");
    }
  }

  assertEquals(setTimeoutDuration, 5000, "setTimeout for error object incorrect.");
  const removeCall = mock$.calls.find(call => call.originalSelector === 'debug' && call.element.removed);
  assertEquals(!!removeCall, true, "$('debug').remove() for error object incorrect.");
}

function testDebug_rendersSimpleObject() {
  resetMocksAndExpectedRenderedArray();
  const testObj = { key: "value", nested: { num: 123 } };
  debug(testObj);
  expectedRenderedArrayForAssertions.push(testObj); // As per debug.js for single object

  const prependCall = mock$.calls.find(call => call.originalSelector === 'main-content-wrapper' && call.element.prependedChildren.length > 0);
  assertEquals(!!prependCall, true, "Prepend for simple object incorrect.");
  if (prependCall) {
    const prependedElement = prependCall.element.prependedChildren[0];
    assertEquals(!!prependedElement, true, "A child element should have been prepended for simple object.");
    if (prependedElement) {
      const prependedContentString = prependedElement.selector;
      const expectedJsonInPayload = JSON.stringify(expectedRenderedArrayForAssertions, null, 2);
      const expectedPayload = `\n    debug ${expectedJsonInPayload}\n    `;
      assertEquals(prependedContentString, expectedPayload, "Rendered output for simple object incorrect.");
    }
  }

  assertEquals(setTimeoutDuration, 5000, "setTimeout for simple object incorrect.");
  const removeCall = mock$.calls.find(call => call.originalSelector === 'debug' && call.element.removed);
  assertEquals(!!removeCall, true, "$('debug').remove() for simple object incorrect.");
}

function testDebug_setTimeoutCallbackRemovesElement() {
  resetMocksAndExpectedRenderedArray();
  debug("Testing setTimeout callback");
  // We don't need to check expectedRenderedArrayForAssertions for this specific test's main goal.

  assertEquals(typeof setTimeoutCallback === 'function', true, "setTimeout callback not a function.");

  mock$.reset(); // Reset calls before invoking the callback to isolate its effect.

  setTimeoutCallback(); // Execute the callback.

  const removeCall = mock$.calls.find(call => call.originalSelector === 'debug' && call.element.removed);
  assertEquals(!!removeCall, true, "$('debug').remove() by timeout callback incorrect.");
}

// --- End Test Cases ---

// --- Run Tests ---
// This will run tests in order. The expectedRenderedArrayForAssertions will build up.
// To make tests truly independent, one would typically use a test runner like Jest/Mocha
// that isolates modules or provides setup/teardown for each test.
// Here, we manage a shared 'expectedRenderedArrayForAssertions' to match debug.js's behavior.

// Resetting the array at the start of the whole test suite run.
expectedRenderedArrayForAssertions = [];

runTests('debug.test.js', [
  testDebug_rendersSingleStringArgument,
  testDebug_rendersMultipleStringArguments,
  testDebug_rendersErrorObject,
  testDebug_rendersSimpleObject,
  testDebug_setTimeoutCallbackRemovesElement // This test is less affected by accumulation for its main assertion
]);
// --- End Run Tests ---
