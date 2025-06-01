const { assertEquals, runTests } = require('./testUtils');
const { loadClientScript } = require('./testHelpers');
const path = require('path');

// --- Mock DOM Environment ---
let mockDollarInstance = {
  remove: () => {},
  prepend: () => {},
};

let flintPrependPayload = null;
let flintRemoveCalledOn = null;
let setTimeoutCallback = null;
let setTimeoutDuration = 0;

// This global array will mimic the 'rendered' array inside debug.js for assertion purposes
let expectedRenderedArrayForAssertions = [];

const mockFlint$ = (selectorOrTemplate, templateArgsIfAny) => {
  if (typeof selectorOrTemplate === 'string' && selectorOrTemplate.includes('$1') && Array.isArray(templateArgsIfAny)) {
    let processedTemplate = selectorOrTemplate;
    templateArgsIfAny.forEach((arg, index) => {
      const placeholder = new RegExp(`\\$${index + 1}`, 'g');
      processedTemplate = processedTemplate.replace(placeholder, String(arg));
    });
    return processedTemplate;
  }

  const selector = selectorOrTemplate;
  if (selector === 'debug') {
    return { remove: () => { flintRemoveCalledOn = selector; } };
  } else if (selector === 'main-content-wrapper') {
    return { prepend: (content) => { flintPrependPayload = content; } };
  }
  return { ...mockDollarInstance };
};

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
  flintPrependPayload = null;
  flintRemoveCalledOn = null;
  setTimeoutCallback = null;
  setTimeoutDuration = 0;
  mockDollarInstance = { remove: () => {}, prepend: () => {} };
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
  { $: mockFlint$, document: mockDocument, window: mockWindow, setTimeout: mockWindow.setTimeout },
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

  assertEquals(true, flintPrependPayload !== null, "Prepend should have been called.");
  const expectedJsonInPayload = JSON.stringify(expectedRenderedArrayForAssertions, null, 2);
  const expectedPayload = `\n    debug ${expectedJsonInPayload}\n    `;
  assertEquals(expectedPayload, flintPrependPayload, "Rendered output for single string incorrect.");
  assertEquals(5000, setTimeoutDuration, "setTimeout duration for single string incorrect.");
  assertEquals("debug", flintRemoveCalledOn, "$('debug').remove() for single string incorrect.");
}

function testDebug_rendersMultipleStringArguments() {
  resetMocksAndExpectedRenderedArray(); // Reset test-side trackers
  // Note: expectedRenderedArrayForAssertions is NOT reset here if we want to test accumulation.
  // However, the problem asks to "write and run unit tests", implying they should be independent.
  // Given no control over debug.js's internal state reset, we must test its actual behavior (accumulation).
  // Let's run tests in a sequence that builds up expectedRenderedArrayForAssertions.
  // To make this test independent, we would need to reload debug.js or have it expose a reset.
  // For now, this test will run *after* the previous one modified expectedRenderedArrayForAssertions.

  const msg1 = "First message";
  const msg2 = "Second message";
  debug(msg1, msg2);
  expectedRenderedArrayForAssertions.push([msg1, msg2]); // As per debug.js logic for multiple args

  assertEquals(true, flintPrependPayload !== null, "Prepend should have been called for multiple args.");
  const expectedJsonInPayload = JSON.stringify(expectedRenderedArrayForAssertions, null, 2);
  const expectedPayload = `\n    debug ${expectedJsonInPayload}\n    `;
  assertEquals(expectedPayload, flintPrependPayload, "Rendered output for multiple strings incorrect.");
  assertEquals(5000, setTimeoutDuration, "setTimeout duration for multiple strings incorrect.");
  assertEquals("debug", flintRemoveCalledOn, "$('debug').remove() for multiple strings incorrect.");
}

function testDebug_rendersErrorObject() {
  resetMocksAndExpectedRenderedArray();
  const errorEventLike = { message: "Test error message", lineno: 10, colno: 5 };
  debug(errorEventLike);

  const expectedRenderedError = { message: "Test error message", lineno: 10, colno: 5 };
  expectedRenderedArrayForAssertions.push(expectedRenderedError); // As per debug.js logic for error-like

  assertEquals(true, flintPrependPayload !== null, "Prepend for error object incorrect.");
  const expectedJsonInPayload = JSON.stringify(expectedRenderedArrayForAssertions, null, 2);
  const expectedPayload = `\n    debug ${expectedJsonInPayload}\n    `;
  assertEquals(expectedPayload, flintPrependPayload, "Rendered output for error object incorrect.");
  assertEquals(5000, setTimeoutDuration, "setTimeout for error object incorrect.");
  assertEquals("debug", flintRemoveCalledOn, "$('debug').remove() for error object incorrect.");
}

function testDebug_rendersSimpleObject() {
  resetMocksAndExpectedRenderedArray();
  const testObj = { key: "value", nested: { num: 123 } };
  debug(testObj);
  expectedRenderedArrayForAssertions.push(testObj); // As per debug.js for single object

  assertEquals(true, flintPrependPayload !== null, "Prepend for simple object incorrect.");
  const expectedJsonInPayload = JSON.stringify(expectedRenderedArrayForAssertions, null, 2);
  const expectedPayload = `\n    debug ${expectedJsonInPayload}\n    `;
  assertEquals(expectedPayload, flintPrependPayload, "Rendered output for simple object incorrect.");
  assertEquals(5000, setTimeoutDuration, "setTimeout for simple object incorrect.");
  assertEquals("debug", flintRemoveCalledOn, "$('debug').remove() for simple object incorrect.");
}

function testDebug_setTimeoutCallbackRemovesElement() {
  resetMocksAndExpectedRenderedArray(); // Also clears expectedRenderedArrayForAssertions for this test
  debug("Testing setTimeout callback");
  // expectedRenderedArrayForAssertions will be ["Testing setTimeout callback"] if this runs first, or accumulated if not.
  // This specific test doesn't assert flintPrependPayload, so accumulation doesn't affect its primary check.

  assertEquals(true, typeof setTimeoutCallback === 'function', "setTimeout callback not a function.");

  // Reset flintRemoveCalledOn after the initial call within debug() and before the callback runs,
  // so we can specifically check if the callback sets it.
  flintRemoveCalledOn = null;

  setTimeoutCallback(); // Execute the callback. This should use the captured mockFlint$.
                        // mockFlint$('debug').remove() should set flintRemoveCalledOn = "debug".

  assertEquals("debug", flintRemoveCalledOn, "$('debug').remove() by timeout callback incorrect.");
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
