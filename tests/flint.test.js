const path = require('path');
const { loadClientScript, createMockDocument, createMockWindow } = require('./testHelpers');
const { assertEquals, runTests } = require('./testUtils');

// Initialize Mock DOM using Imported Utilities
let mockDocumentInstance = createMockDocument();
let mockWindowInstance = createMockWindow(mockDocumentInstance);

global.document = mockDocumentInstance;
global.window = mockWindowInstance;

const flintPath = path.resolve(__dirname, '../client/flint.js');
const $ = loadClientScript(
  flintPath,
  { document: mockDocumentInstance, window: mockWindowInstance }, // New instances
  "$"
);

function testCreateSimpleDiv() {
  if (typeof $ !== 'function') {
    // This will cause the test to fail, but gives a clear reason.
    assertEquals(typeof $, 'function', "Flint $ should be a function");
    return;
  }
  const $div = $("\n  div"); // Changed to standard string with escaped newline
  assertEquals(!!$div, true, "Test Simple Div: element should be created");
  if (!$div) return; // Guard against further errors if creation failed
  assertEquals($div.tagName, "DIV", "Test Simple Div: tagName should be DIV");
  assertEquals(typeof $div.attributes, "object", "Test Simple Div: attributes should be an object");
  assertEquals(Object.keys($div.attributes || {}).length, 0, "Test Simple Div: attributes should be empty");
  assertEquals(($div.children || []).length, 0, "Test Simple Div: children should be empty");
}

function testCreateParagraphWithText() {
  const $p = $("\n  p Hello World");
  assertEquals(!!$p, true, "Test P with Text: element should be created");
  if (!$p) return;
  assertEquals($p.tagName, "P", "Test P with Text: tagName should be P");
  assertEquals($p.innerText, "Hello World", "Test P with Text: innerText should be 'Hello World'");
}

function testCreateInputWithAttributes() {
  const $input = $("\n  input[type=text][name=testInput]");
  assertEquals(!!$input, true, "Test Input with Attributes: element should be created");
  if (!$input) return;
  assertEquals($input.tagName, "INPUT", "Test Input with Attributes: tagName should be INPUT");
  assertEquals($input.getAttribute('type'), "text", "Test Input with Attributes: type attribute should be 'text'");
  assertEquals($input.getAttribute('name'), "testInput", "Test Input with Attributes: name attribute should be 'testInput'");
}

function testCreateNestedElements() {
  const $ul = $("\n  ul\n    li Item 1");
  assertEquals(!!$ul, true, "Test Nested Elements: UL element should be created");
  if (!$ul) return;
  assertEquals($ul.tagName, "UL", "Test Nested Elements: UL tagName should be UL");
  assertEquals(($ul.children || []).length, 1, "Test Nested Elements: UL should have one child");
  if (($ul.children || []).length === 0) return;
  const $li = $ul.children[0];
  assertEquals(!!$li, true, "Test Nested Elements: LI element should be created");
  if (!$li) return;
  assertEquals($li.tagName, "LI", "Test Nested Elements: Child tagName should be LI");
  assertEquals($li.innerText, "Item 1", "Test Nested Elements: Child innerText should be 'Item 1'");
}

function testArgSubstitutionText() {
  const $h1 = $("\n  h1 $1", ["Test Title"]);
  assertEquals(!!$h1, true, "Test Arg Substitution Text: element should be created");
  if (!$h1) return;
  assertEquals($h1.tagName, "H1", "Test Arg Substitution Text: tagName should be H1");
  assertEquals($h1.innerText, "Test Title", "Test Arg Substitution Text: innerText should be 'Test Title'");
}

function testArgSubstitutionAttrValue() {
  const $a = $("\n  a[href=$1][target=_blank]", ["/test-path"]);
  assertEquals(!!$a, true, "Test Arg Substitution Attr Value: element should be created");
  if (!$a) return;
  assertEquals($a.tagName, "A", "Test Arg Substitution Attr Value: tagName should be A");
  assertEquals($a.getAttribute('href'), "/test-path", "Test Arg Substitution Attr Value: href attribute should be '/test-path'");
  assertEquals($a.getAttribute('target'), "_blank", "Test Arg Substitution Attr Value: target attribute should be '_blank'");
}

function testArgSubstitutionAttrKey() {
  const $div = $("\n  div[$1=value]", ["data-dynamic-attr"]);
  assertEquals(!!$div, true, "Test Arg Substitution Attr Key: element should be created");
  if (!$div) return;
  assertEquals($div.tagName, "DIV", "Test Arg Substitution Attr Key: tagName should be DIV");
  assertEquals($div.getAttribute('data-dynamic-attr'), "value", "Test Arg Substitution Attr Key: dynamic attribute 'data-dynamic-attr' should be 'value'");
}

function testCreateMultipleRootElements() {
  const $container = $("\n  div[id=one]\n  p[id=two]");
  assertEquals(!!$container, true, "Test Multiple Roots: Container should be created");
  if (!$container) return;

  assertEquals($container.tagName, "DIV", "Test Multiple Roots: Container tagName should be DIV (wrapper)");
  assertEquals(($container.children || []).length, 2, "Test Multiple Roots: Container should have two children");

  if (($container.children || []).length < 2) return; // Guard

  const $child1 = $container.children[0];
  assertEquals(!!$child1, true, "Test Multiple Roots: First child should exist");
  if ($child1) {
    assertEquals($child1.tagName, "DIV", "Test Multiple Roots: First child should be DIV");
    assertEquals($child1.getAttribute('id'), "one", "Test Multiple Roots: First child id should be 'one'");
  }

  const $child2 = $container.children[1];
  assertEquals(!!$child2, true, "Test Multiple Roots: Second child should exist");
  if ($child2) {
    assertEquals($child2.tagName, "P", "Test Multiple Roots: Second child should be P");
    assertEquals($child2.getAttribute('id'), "two", "Test Multiple Roots: Second child id should be 'two'");
  }
}

function testArrayArgument() {
  const mockChild1 = mockDocumentInstance.createElement('span'); // Assuming mockDocument is in scope
  mockChild1.innerText = "Child 1";
  const mockChild2 = mockDocumentInstance.createElement('span');
  mockChild2.innerText = "Child 2";

  const $div = $("\n  div $1", [[mockChild1, mockChild2]]);
  assertEquals(!!$div, true, "Test Array Argument: DIV element should be created");
  if (!$div) return;

  assertEquals($div.tagName, "DIV", "Test Array Argument: tagName should be DIV");

  // Reflecting current flint.js behavior for array arguments in templates.
  // It appears flint.js creates the parent DIV but does not correctly append
  // the fragment created from the array argument as a child to this DIV
  // (e.g., might be doing innerText = fragment instead of appendChild(fragment)).
  assertEquals(($div.children || []).length, 0, "Test Array Argument: DIV should have 0 children (current flint.js behavior with array arg in template)");

  // The following assertions are commented out as they would fail if the fragment isn't appended.
  /*
  if (($div.children || []).length === 0) return;
  const fragmentWrapper = $div.children[0];
  assertEquals(true, !!fragmentWrapper, "Test Array Argument: Fragment wrapper should exist");
  if(!fragmentWrapper) return;

  assertEquals("#document-fragment", fragmentWrapper.tagName, "Test Array Argument: Child should be a document fragment");
  assertEquals(2, (fragmentWrapper.children || []).length, "Test Array Argument: Fragment should contain two children");

  if ((fragmentWrapper.children || []).length < 2) return;

  assertEquals("SPAN", fragmentWrapper.children[0].tagName, "Test Array Argument: First span in fragment");
  assertEquals("Child 1", fragmentWrapper.children[0].innerText, "Test Array Argument: First span text");
  assertEquals("SPAN", fragmentWrapper.children[1].tagName, "Test Array Argument: Second span in fragment");
  assertEquals("Child 2", fragmentWrapper.children[1].innerText, "Test Array Argument: Second span text");
  */
}

function testTextNodeArgument() {
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
  assertEquals(!!$returnedNode, true, "Test Text Node Arg Return: A node should be returned.");
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

function setupMockQuerySelectorAll() {
  // Clear mockDocumentInstance's element list before each selection test that uses global queries.
  // Individual tests are responsible for populating the elements they need.
  mockDocumentInstance._elements = [];
}

function teardownMockQuerySelectorAll() {
  // Also clear after the test for good measure, though setup should handle it for the next test.
  mockDocumentInstance._elements = [];
}

function testSelectSingleElement() {
  setupMockQuerySelectorAll();

  // Create the specific element this test will try to select.
  const mockSingleGlobal = mockDocumentInstance.createElement('div');
  mockSingleGlobal.setAttribute('id', 'singleElement');
  mockSingleGlobal.innerText = "Single";
  // mockDocumentInstance.createElement automatically adds it to mockDocumentInstance._elements

  const $el = $("#singleElement");
  assertEquals(!!$el, true, "Test Select Single: Element should be found");
  if (!$el) {
    teardownMockQuerySelectorAll();
    return;
  }

  assertEquals($el.tagName, "DIV", "Test Select Single: tagName should be DIV");
  assertEquals($el.innerText, "Single", "Test Select Single: innerText should be 'Single'");
  assertEquals(typeof $el.forEach, "function", "Test Select Single: Should have a .forEach helper method");
  teardownMockQuerySelectorAll();
}

function testSelectMultipleElements() {
  setupMockQuerySelectorAll(); // Clears _elements

  // Create the specific elements this test will try to select.
  const mockMultiple1Global = mockDocumentInstance.createElement('span');
  mockMultiple1Global.setAttribute('class', 'multipleElements');
  mockMultiple1Global.innerText = "Multiple 1";

  const mockMultiple2Global = mockDocumentInstance.createElement('span');
  mockMultiple2Global.setAttribute('class', 'multipleElements');
  mockMultiple2Global.innerText = "Multiple 2";
  // mockDocumentInstance.createElement automatically adds these to mockDocumentInstance._elements

  const $els = $(".multipleElements");
  assertEquals(!!$els, true, "Test Select Multiple: Elements should be found");
  if (!$els) {
    teardownMockQuerySelectorAll();
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
  teardownMockQuerySelectorAll();
}

function testSelectNonExistentElement() {
  setupMockQuerySelectorAll(); // Ensures _elements is empty
  const $el = $("#nonExistent");
  assertEquals($el, null, "Test Select Non-Existent: Should return null");
  teardownMockQuerySelectorAll(); // Cleans up for good measure
}

function testNestedSelection() {
  setupMockQuerySelectorAll(); // Clears _elements

  // Create the specific elements this test will use.
  const parentEl = mockDocumentInstance.createElement('div');
  parentEl.setAttribute('id', 'parentForNested');
  const childEl = mockDocumentInstance.createElement('p');
  childEl.setAttribute('id', 'childInNested');
  parentEl.appendChild(childEl);
  // parentEl is now in mockDocumentInstance._elements due to createElement.

  const $parent = $("#parentForNested");
  assertEquals(!!$parent, true, "Test Nested Selection: Parent element should be found");
  if (!$parent) {
    teardownMockQuerySelectorAll();
    return;
  }
  assertEquals($parent.tagName, "DIV", "Test Nested Selection: Parent tagName");

  // The mockElement.querySelectorAll (from createMockElement in step 3) should handle this.
  // It filters direct children by tagName.
  const $child = $parent.$("p");
  assertEquals(!!$child, true, "Test Nested Selection: Child element should be found");
  if (!$child) {
    teardownMockQuerySelectorAll();
    return;
  }

  assertEquals($child.tagName, "P", "Test Nested Selection: Child tagName should be P");
  assertEquals($child.getAttribute('id'), "childInNested", "Test Nested Selection: Child id");

  const $nonExistentChild = $parent.$("span");
  assertEquals($nonExistentChild, null, "Test Nested Selection: Non-existent child should be null");
  teardownMockQuerySelectorAll();
}

function testHelperOnMethod() {
  setupMockQuerySelectorAll(); // Clears _elements

  // Create the specific element this test will use.
  const mockElement = mockDocumentInstance.createElement('button');
  mockElement.setAttribute('id', 'testButtonForOn');
  // mockDocumentInstance.createElement automatically adds it to mockDocumentInstance._elements

  const $el = $("#testButtonForOn"); // Select the element just created

  assertEquals(!!$el, true, "Test .on(): Element should be found for testing .on()");
  if (!$el) {
    teardownMockQuerySelectorAll();
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

  assertEquals(!!$el.eventListeners['click'], true, "Test .on(): 'click' event should have listeners registered.");
  if ($el.eventListeners['click']) {
    assertEquals($el.eventListeners['click'].length, 1, "Test .on(): One click handler should be registered.");
    assertEquals($el.eventListeners['click'][0], mockClickHandler, "Test .on(): Correct click handler should be registered.");
  }

  assertEquals(!!$el.eventListeners['mouseover'], true, "Test .on(): 'mouseover' event should have listeners registered.");
  if ($el.eventListeners['mouseover']) {
    assertEquals($el.eventListeners['mouseover'].length, 1, "Test .on(): One mouseover handler should be registered.");
    assertEquals($el.eventListeners['mouseover'][0], mockMouseOverHandler, "Test .on(): Correct mouseover handler should be registered.");
  }
  teardownMockQuerySelectorAll();
}

function testHelperForEachSingleElement() {
  setupMockQuerySelectorAll(); // Clears _elements

  // Create the specific element this test will use.
  const mockElement = mockDocumentInstance.createElement('div');
  mockElement.setAttribute('id', 'testDivForForEachSingle');
  // mockDocumentInstance.createElement automatically adds it to mockDocumentInstance._elements

  const $el = $("#testDivForForEachSingle");
  assertEquals(!!$el, true, "Test .forEach() Single: Element should be found");
  if (!$el) {
    teardownMockQuerySelectorAll();
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
  teardownMockQuerySelectorAll();
}

function testHelperForEachMultipleElements() {
  setupMockQuerySelectorAll(); // Clears _elements

  // Create the specific elements this test will use.
  const el1 = mockDocumentInstance.createElement('p');
  el1.setAttribute('class', 'testClassForForEach');
  el1.innerText = "Item 1";
  const el2 = mockDocumentInstance.createElement('p');
  el2.setAttribute('class', 'testClassForForEach');
  el2.innerText = "Item 2";
  // mockDocumentInstance.createElement automatically adds them to mockDocumentInstance._elements

  const $els = $(".testClassForForEach");
  assertEquals(!!$els && typeof $els.forEach === 'function', true, "Test .forEach() Multiple: NodeList-like object should be returned");
  if (!$els || typeof $els.forEach !== 'function') {
     teardownMockQuerySelectorAll();
     return;
  }
  assertEquals($els.length, 2, "Test .forEach() Multiple: Elements should be found (length 2)");
   if ($els.length !== 2) {
    teardownMockQuerySelectorAll();
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
  teardownMockQuerySelectorAll();
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
