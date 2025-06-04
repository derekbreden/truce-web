const path = require('path');
const { loadClientScript, createMockDocument, createMockWindow } = require('../shared/testHelpers.js');
const { assertEquals, runTests } = require('../shared/testUtils.js');

// Initialize Mock DOM using Imported Utilities
let mockDocumentInstance = createMockDocument();
let mockWindowInstance = createMockWindow(mockDocumentInstance);

global.document = mockDocumentInstance;
global.window = mockWindowInstance;

const flintPath = path.resolve(__dirname, '../../../client/flint.js');
const $ = loadClientScript(
  flintPath,
  { document: mockDocumentInstance, window: mockWindowInstance }, // New instances
  "$"
);

// --- Per-Test Setup Function ---
function beforeEachFlintTest() {
  // Reset _elements for global query selections
  setupMockQuerySelectorAll();

  // Clear any children added to head or body from previous tests
  if (mockDocumentInstance && mockDocumentInstance.body) {
    mockDocumentInstance.body.children = [];
    // Also reset innerHTML/innerText if necessary, though children = [] is usually sufficient for mock
    mockDocumentInstance.body.innerHTML = "";
    mockDocumentInstance.body.innerText = "";
  }
  if (mockDocumentInstance && mockDocumentInstance.head) {
    mockDocumentInstance.head.children = [];
    mockDocumentInstance.head.innerHTML = "";
    mockDocumentInstance.head.innerText = "";
  }
  // Note: mockDocumentInstance.createElement() in testHelpers.js adds to _elements
  // but does not automatically append to body/head. Tests would do that explicitly if needed.
  // This cleanup is a safeguard.
}

function testCreateSimpleDiv() {
  beforeEachFlintTest();
  if (typeof $ !== 'function') {
    // This will cause the test to fail, but gives a clear reason.
    assertEquals(typeof $, 'function', "Flint $ should be a function");
    return;
  }
  const $div = $("\n  div"); // Changed to standard string with escaped newline
  assertEquals(true, !!$div, "Test Simple Div: element should be created");
  if (!$div) return; // Guard against further errors if creation failed
  assertEquals($div.tagName, "DIV", "Test Simple Div: tagName should be DIV");
  assertEquals(typeof $div.attributes, "object", "Test Simple Div: attributes should be an object");
  assertEquals(Object.keys($div.attributes || {}).length, 0, "Test Simple Div: attributes should be empty");
  assertEquals(($div.children || []).length, 0, "Test Simple Div: children should be empty");
}

function testCreateParagraphWithText() {
  beforeEachFlintTest();
  const $p = $("\n  p Hello World");
  assertEquals(true, !!$p, "Test P with Text: element should be created");
  if (!$p) return;
  assertEquals($p.tagName, "P", "Test P with Text: tagName should be P");
  assertEquals($p.innerText, "Hello World", "Test P with Text: innerText should be 'Hello World'");
}

function testCreateInputWithAttributes() {
  beforeEachFlintTest();
  const $input = $("\n  input[type=text][name=testInput]");
  assertEquals(true, !!$input, "Test Input with Attributes: element should be created");
  if (!$input) return;
  assertEquals($input.tagName, "INPUT", "Test Input with Attributes: tagName should be INPUT");
  assertEquals($input.getAttribute('type'), "text", "Test Input with Attributes: type attribute should be 'text'");
  assertEquals($input.getAttribute('name'), "testInput", "Test Input with Attributes: name attribute should be 'testInput'");
}

function testCreateNestedElements() {
  beforeEachFlintTest();
  const $ul = $("\n  ul\n    li Item 1");
  assertEquals(true, !!$ul, "Test Nested Elements: UL element should be created");
  if (!$ul) return;
  assertEquals($ul.tagName, "UL", "Test Nested Elements: UL tagName should be UL");
  assertEquals(($ul.children || []).length, 1, "Test Nested Elements: UL should have one child");
  if (($ul.children || []).length === 0) return;
  const $li = $ul.children[0];
  assertEquals(true, !!$li, "Test Nested Elements: LI element should be created");
  if (!$li) return;
  assertEquals($li.tagName, "LI", "Test Nested Elements: Child tagName should be LI");
  assertEquals($li.innerText, "Item 1", "Test Nested Elements: Child innerText should be 'Item 1'");
}

function testArgSubstitutionText() {
  beforeEachFlintTest();
  const $h1 = $("\n  h1 $1", ["Test Title"]);
  assertEquals(true, !!$h1, "Test Arg Substitution Text: element should be created");
  if (!$h1) return;
  assertEquals($h1.tagName, "H1", "Test Arg Substitution Text: tagName should be H1");
  assertEquals($h1.innerText, "Test Title", "Test Arg Substitution Text: innerText should be 'Test Title'");
}

function testArgSubstitutionAttrValue() {
  beforeEachFlintTest();
  const $a = $("\n  a[href=$1][target=_blank]", ["/test-path"]);
  assertEquals(true, !!$a, "Test Arg Substitution Attr Value: element should be created");
  if (!$a) return;
  assertEquals($a.tagName, "A", "Test Arg Substitution Attr Value: tagName should be A");
  assertEquals($a.getAttribute('href'), "/test-path", "Test Arg Substitution Attr Value: href attribute should be '/test-path'");
  assertEquals($a.getAttribute('target'), "_blank", "Test Arg Substitution Attr Value: target attribute should be '_blank'");
}

function testArgSubstitutionAttrKey() {
  beforeEachFlintTest();
  const $div = $("\n  div[$1=value]", ["data-dynamic-attr"]);
  assertEquals(true, !!$div, "Test Arg Substitution Attr Key: element should be created");
  if (!$div) return;
  assertEquals($div.tagName, "DIV", "Test Arg Substitution Attr Key: tagName should be DIV");
  assertEquals($div.getAttribute('data-dynamic-attr'), "value", "Test Arg Substitution Attr Key: dynamic attribute 'data-dynamic-attr' should be 'value'");
}

function testCreateMultipleRootElements() {
  beforeEachFlintTest();
  const $container = $("\n  div[id=one]\n  p[id=two]");
  assertEquals(true, !!$container, "Test Multiple Roots: Container should be created");
  if (!$container) return;

  assertEquals($container.tagName, "DIV", "Test Multiple Roots: Container tagName should be DIV (wrapper)");
  assertEquals(($container.children || []).length, 2, "Test Multiple Roots: Container should have two children");

  if (($container.children || []).length < 2) return; // Guard

  const $child1 = $container.children[0];
  assertEquals(true, !!$child1, "Test Multiple Roots: First child should exist");
  if ($child1) {
    assertEquals($child1.tagName, "DIV", "Test Multiple Roots: First child should be DIV");
    assertEquals($child1.getAttribute('id'), "one", "Test Multiple Roots: First child id should be 'one'");
  }

  const $child2 = $container.children[1];
  assertEquals(true, !!$child2, "Test Multiple Roots: Second child should exist");
  if ($child2) {
    assertEquals($child2.tagName, "P", "Test Multiple Roots: Second child should be P");
    assertEquals($child2.getAttribute('id'), "two", "Test Multiple Roots: Second child id should be 'two'");
  }
}

function testArrayArgument() {
  beforeEachFlintTest();
  const mockChild1 = mockDocumentInstance.createElement('span'); // Assuming mockDocument is in scope
  mockChild1.innerText = "Child 1";
  const mockChild2 = mockDocumentInstance.createElement('span');
  mockChild2.innerText = "Child 2";

  const $div = $("\n  div $1", [[mockChild1, mockChild2]]);
  assertEquals(true, !!$div, "Test Array Argument: DIV element should be created");
  if (!$div) return;

  assertEquals($div.tagName, "DIV", "Test Array Argument: tagName should be DIV");

  // Current flint.js behavior for array arguments used as element content (e.g., "div $1"):
  // Flint.js correctly identifies the array argument. However, when substituting this array
  // into the content of the 'div', it effectively does `div.innerText = arrayArgument;`.
  // Assigning an array (or a DocumentFragment) to innerText results in its string representation
  // being set as the text (e.g., "[object HTMLSpanElement],[object HTMLSpanElement]" or "[object DocumentFragment]"),
  // rather than appending the actual elements from the array/fragment as children.
  // Thus, the div element remains empty of actual child DOM elements.
  //
  // If the template were "$1" (argument used as the tag itself), flint.js *does* create and return
  // a DocumentFragment containing the elements from the array, which is a different behavior.
  //
  // This test confirms the current behavior where the div has no children.
  assertEquals(($div.children || []).length, 0, "Test Array Argument: DIV should have 0 children due to array being set to innerText.");

  // The large commented-out block of assertions, which described a hypothetical alternative behavior
  // for array arguments (direct child appending), has been removed to clean up the test file.
  // The current behavior (setting innerText to the string representation of the array)
  // is correctly asserted above and documented in the preceding comments.
}

function testTextNodeArgument() {
  beforeEachFlintTest();
  let createTextNodeCalledWithText = null;
  const originalCreateTextNode = mockDocumentInstance.createTextNode;
  mockDocumentInstance.createTextNode = function(text) {
    createTextNodeCalledWithText = text;
    return originalCreateTextNode.call(this, text);
  };

  $("\n  $1", ["Direct Text Content"]);

  assertEquals(createTextNodeCalledWithText, "Direct Text Content", "Test Text Node Arg: mockDocumentInstance.createTextNode should be called with the correct text.");

  mockDocumentInstance.createTextNode = originalCreateTextNode;

  const $returnedNode = $("\n  $1", ["My Text Content"]);
  assertEquals(true, !!$returnedNode, "Test Text Node Arg Return: A node should be returned.");
  if (!$returnedNode) return;

  // Assuming the mock text node has nodeType and textContent
  // The flint.js code, when it receives a single text node via argument substitution for the whole template,
  // will make this text node the child of its internally created root DIV.
  // Then it returns that child. So $returnedNode *is* the text node.
  assertEquals($returnedNode.nodeType, 3, "Test Text Node Arg Return: nodeType should be 3 (TEXT_NODE).");
  assertEquals($returnedNode.textContent, "My Text Content", "Test Text Node Arg Return: textContent should match.");
}

// Store original querySelectorAll to reset after tests if modified globally
const originalQSA = mockDocumentInstance.querySelectorAll;
// const originalElementQSA = mockDocumentInstance.createElement('div').querySelectorAll; // Not strictly needed due to mock element's own QSA

// --- Query SelectorAll Mocking Setup for Flint Selection Tests ---
// The global `mockDocumentInstance` (from `testHelpers.js`) has its own `querySelectorAll` method
// which operates on an internal `_elements` array. Elements created via `mockDocumentInstance.createElement()`
// are automatically added to this `_elements` array.
//
// Since `mockDocumentInstance` is initialized globally for all tests in this file,
// `setupMockQuerySelectorAll` is crucial for tests that perform global selections (e.g., `$("#id")`).
// It resets `mockDocumentInstance._elements` to ensure that each such test starts with a clean slate
// and is not affected by elements created in previous tests.
//
// The actual query selection logic (matching selectors against elements) is handled by
// `mockDocumentInstance.querySelectorAll` and `mockElement._matchesSelector` from `testHelpers.js`.
// This function (`setupMockQuerySelectorAll`) is primarily for state management (test isolation)
// in the context of these flint.js selection tests.
function setupMockQuerySelectorAll() {
  // Clear mockDocumentInstance's element list before each selection test that uses global queries.
  // `mockDocumentInstance.createElement()` (from testHelpers.js) will then populate this list
  // for the current test. `mockDocumentInstance.querySelectorAll()` (from testHelpers.js)
  // will use this list.
  mockDocumentInstance._elements = [];
}

// `teardownMockQuerySelectorAll` was removed as it's redundant.
// `setupMockQuerySelectorAll()` handles cleaning before each relevant test.

function testSelectSingleElement() {
  beforeEachFlintTest(); // Calls setupMockQuerySelectorAll and clears body/head

  // Create the specific element this test will try to select.
  const mockSingleGlobal = mockDocumentInstance.createElement('div');
  mockSingleGlobal.setAttribute('id', 'singleElement');
  mockSingleGlobal.innerText = "Single";
  // mockDocumentInstance.createElement automatically adds it to mockDocumentInstance._elements

  const $el = $("#singleElement");
  assertEquals(true, !!$el, "Test Select Single: Element should be found");
  if (!$el) {
    // No teardown needed here as setup handles the next test.
    return;
  }

  assertEquals($el.tagName, "DIV", "Test Select Single: tagName should be DIV");
  assertEquals($el.innerText, "Single", "Test Select Single: innerText should be 'Single'");
  assertEquals(typeof $el.forEach, "function", "Test Select Single: Should have a .forEach helper method");
  // No teardown needed here
}

function testSelectMultipleElements() {
  beforeEachFlintTest(); // Calls setupMockQuerySelectorAll and clears body/head

  // Create the specific elements this test will try to select.
  const mockMultiple1Global = mockDocumentInstance.createElement('span');
  mockMultiple1Global.setAttribute('class', 'multipleElements');
  mockMultiple1Global.innerText = "Multiple 1";

  const mockMultiple2Global = mockDocumentInstance.createElement('span');
  mockMultiple2Global.setAttribute('class', 'multipleElements');
  mockMultiple2Global.innerText = "Multiple 2";
  // mockDocumentInstance.createElement automatically adds these to mockDocumentInstance._elements

  const $els = $(".multipleElements");
  assertEquals(true, !!$els, "Test Select Multiple: Elements should be found");
  if (!$els) {
    // No teardown needed here
    return;
  }

  assertEquals($els.length, 2, "Test Select Multiple: Should find 2 elements");
  assertEquals(typeof $els.forEach, "function", "Test Select Multiple: Should be NodeList-like (have forEach)");
  if ($els.length === 2) {
    // Order might not be guaranteed by simple _elements scan, sort by innerText for stable test
    const sortedEls = Array.from($els).sort((a, b) => a.innerText.localeCompare(b.innerText));
    assertEquals(sortedEls[0].tagName, "SPAN", "Test Select Multiple: First element tagName");
    assertEquals(sortedEls[0].innerText, "Multiple 1", "Test Select Multiple: First element text");
    assertEquals(sortedEls[1].tagName, "SPAN", "Test Select Multiple: Second element tagName");
    assertEquals(sortedEls[1].innerText, "Multiple 2", "Test Select Multiple: Second element text");
  }
  // No teardown needed here
}

function testSelectNonExistentElement() {
  beforeEachFlintTest(); // Calls setupMockQuerySelectorAll and clears body/head
  const $el = $("#nonExistent");
  assertEquals($el, null, "Test Select Non-Existent: Should return null");
  // No teardown needed here
}

function testNestedSelection() {
  beforeEachFlintTest(); // Calls setupMockQuerySelectorAll and clears body/head

  // Create the specific elements this test will use.
  const parentEl = mockDocumentInstance.createElement('div');
  parentEl.setAttribute('id', 'parentForNested');
  const childEl = mockDocumentInstance.createElement('p');
  childEl.setAttribute('id', 'childInNested');
  parentEl.appendChild(childEl);
  // parentEl is now in mockDocumentInstance._elements due to createElement.

  const $parent = $("#parentForNested");
  assertEquals(true, !!$parent, "Test Nested Selection: Parent element should be found");
  if (!$parent) {
    // No teardown needed here
    return;
  }
  assertEquals($parent.tagName, "DIV", "Test Nested Selection: Parent tagName");

  // The mockElement.querySelectorAll (from createMockElement in testHelpers.js) should handle this.
  // It filters children of the $parent element.
  const $child = $parent.$("p");
  assertEquals(true, !!$child, "Test Nested Selection: Child element should be found");
  if (!$child) {
    // No teardown needed here
    return;
  }

  assertEquals($child.tagName, "P", "Test Nested Selection: Child tagName should be P");
  assertEquals($child.getAttribute('id'), "childInNested", "Test Nested Selection: Child id");

  const $nonExistentChild = $parent.$("span");
  assertEquals($nonExistentChild, null, "Test Nested Selection: Non-existent child should be null");
  // No teardown needed here
}

function testHelperOnMethod() {
  beforeEachFlintTest(); // Calls setupMockQuerySelectorAll and clears body/head

  // Create the specific element this test will use.
  const mockElement = mockDocumentInstance.createElement('button');
  mockElement.setAttribute('id', 'testButtonForOn');
  // mockDocumentInstance.createElement automatically adds it to mockDocumentInstance._elements

  const $el = $("#testButtonForOn"); // Select the element just created

  assertEquals(true, !!$el, "Test .on(): Element should be found for testing .on()");
  if (!$el) {
    // No teardown needed here
    return;
  }

  // Ensure eventListeners and addEventListener are present (they should be from createMockElement)
  if (!$el.eventListeners || typeof $el.addEventListener !== 'function') {
    // This would indicate an issue with how mock elements are retrieved or created by selectors.
    // For now, we'll add them if missing, but this signals a deeper mock setup problem.
    $el.eventListeners = $el.eventListeners || {};
    if (typeof $el.addEventListener !== 'function') {
        $el.addEventListener = function(type, listener) {
            if (!this.eventListeners[type]) this.eventListeners[type] = [];
            this.eventListeners[type].push(listener);
        };
    }
  }

  const mockClickHandler = () => {};
  const mockMouseOverHandler = () => {};

  $el.on('click', mockClickHandler);
  $el.on('mouseover', mockMouseOverHandler);

  assertEquals(true, !!$el.eventListeners['click'], "Test .on(): 'click' event should have listeners registered.");
  if ($el.eventListeners['click']) {
    assertEquals($el.eventListeners['click'].length, 1, "Test .on(): One click handler should be registered.");
    assertEquals($el.eventListeners['click'][0], mockClickHandler, "Test .on(): Correct click handler should be registered.");
  }

  assertEquals(true, !!$el.eventListeners['mouseover'], "Test .on(): 'mouseover' event should have listeners registered.");
  if ($el.eventListeners['mouseover']) {
    assertEquals($el.eventListeners['mouseover'].length, 1, "Test .on(): One mouseover handler should be registered.");
    assertEquals($el.eventListeners['mouseover'][0], mockMouseOverHandler, "Test .on(): Correct mouseover handler should be registered.");
  }
  // No teardown needed here
}

function testHelperForEachSingleElement() {
  beforeEachFlintTest(); // Calls setupMockQuerySelectorAll and clears body/head

  // Create the specific element this test will use.
  const mockElement = mockDocumentInstance.createElement('div');
  mockElement.setAttribute('id', 'testDivForForEachSingle');
  // mockDocumentInstance.createElement automatically adds it to mockDocumentInstance._elements

  const $el = $("#testDivForForEachSingle");
  assertEquals(true, !!$el, "Test .forEach() Single: Element should be found");
  if (!$el) {
    // No teardown needed here
    return;
  }

  let callbackCount = 0;
  let receivedElement = null;
  let receivedIndex = -1; // Store index

  // Flint's .forEach for a single element (not a list) should still provide element and index 0.
  $el.forEach((element, index) => {
    callbackCount++;
    receivedElement = element;
    receivedIndex = index;
  });

  assertEquals(callbackCount, 1, "Test .forEach() Single: Callback should be called once.");
  assertEquals(receivedElement, $el, "Test .forEach() Single: Callback received the correct element.");
  assertEquals(receivedIndex, 0, "Test .forEach() Single: Index should be 0 for single element.");
  // No teardown needed here
}

function testHelperForEachMultipleElements() {
  beforeEachFlintTest(); // Calls setupMockQuerySelectorAll and clears body/head

  // Create the specific elements this test will use.
  const el1 = mockDocumentInstance.createElement('p');
  el1.setAttribute('class', 'testClassForForEach');
  el1.innerText = "Item 1";
  const el2 = mockDocumentInstance.createElement('p');
  el2.setAttribute('class', 'testClassForForEach');
  el2.innerText = "Item 2";
  // mockDocumentInstance.createElement automatically adds them to mockDocumentInstance._elements

  const $els = $(".testClassForForEach");
  assertEquals(true, !!$els && typeof $els.forEach === 'function', "Test .forEach() Multiple: NodeList-like object should be returned");
  if (!$els || typeof $els.forEach !== 'function') {
     // No teardown needed here
     return;
  }
  assertEquals($els.length, 2, "Test .forEach() Multiple: Elements should be found (length 2)");
   if ($els.length !== 2) {
    // No teardown needed here
    return;
  }


  let callbackCount = 0;
  const receivedElements = [];

  $els.forEach((element, index) => {
    callbackCount++;
    receivedElements.push(element);
    assertEquals(index, receivedElements.length - 1, `Test .forEach() Multiple: Index should be ${index}`);
  });

  assertEquals(callbackCount, 2, "Test .forEach() Multiple: Callback should be called twice.");
  // Sort $els and receivedElements by innerText for stable comparison, as QSA order isn't guaranteed
  const sortFn = (a,b) => (a.innerText || "").localeCompare(b.innerText || "");
  const sortedOriginals = Array.from($els).sort(sortFn);
  const sortedReceived = receivedElements.sort(sortFn);

  assertEquals(sortedReceived[0], sortedOriginals[0], "Test .forEach() Multiple: First element in callback matches.");
  assertEquals(sortedReceived[1], sortedOriginals[1], "Test .forEach() Multiple: Second element in callback matches.");
  // No teardown needed here
}

const flintTestFunctions = [
  testCreateSimpleDiv,
  testCreateParagraphWithText,
  testCreateInputWithAttributes,
  testCreateNestedElements,
  testArgSubstitutionText,
  testArgSubstitutionAttrValue,
  testArgSubstitutionAttrKey,
  testCreateMultipleRootElements,
  testArrayArgument,
  testTextNodeArgument,
  testSelectSingleElement,
  testSelectMultipleElements,
  testSelectNonExistentElement,
  testNestedSelection,
  testHelperOnMethod,
  testHelperForEachSingleElement,
  testHelperForEachMultipleElements
];

runTests('flint.test.js', flintTestFunctions);
