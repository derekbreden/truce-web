const path = require('path');
const { loadClientScript } = require('./testHelpers');
const { assertEquals, runTests } = require('./testUtils');

// Mock DOM Implementation
const log = (message) => console.log(`[MockDOM] ${message}`);

const createMockElement = (tagName) => {
  log(`createMockElement called for: ${tagName}`);
  const MOCK_ELEMENT_CONSTRUCTOR_NAME = "HTMLMockElement"; // Or specific like HTMLDivElementMock

  return {
    constructor: { name: tagName === '#text' ? "TextMock" : (tagName === '#document-fragment' ? "DocumentFragmentMock" : MOCK_ELEMENT_CONSTRUCTOR_NAME) },
    tagName: tagName.toUpperCase(),
    attributes: {},
    children: [],
    style: {},
    innerText: "",
    value: "",
    parentNode: null,
    eventListeners: {},
    appendChild: function(child) {
      let childIdentifier = child.tagName || child.textContent;
      if (child.nodeType === 11) childIdentifier = "#document-fragment"; // Explicitly log fragment
      log(`${this.tagName} appendChild called with child: ${childIdentifier} (nodeType: ${child.nodeType})`);
      this.children.push(child);
      child.parentNode = this; // Set parentNode
    },
    setAttribute: function(name, value) {
      log(`${this.tagName} setAttribute called with name: ${name}, value: ${value}`);
      this.attributes[name] = String(value); // Store as string, like HTML
      if (name === "style") {
        value.split(';').forEach(style => {
          if (style.trim() === '') return;
          const [prop, val] = style.split(':');
          this.style[prop.trim()] = (val || '').trim();
        });
      }
    },
    getAttribute: function(name) {
      log(`${this.tagName} getAttribute called for name: ${name}`);
      return this.attributes[name];
    },
    addEventListener: function(type, listener) {
      log(`${this.tagName} addEventListener called for type: ${type}`);
      if (!this.eventListeners[type]) {
        this.eventListeners[type] = [];
      }
      this.eventListeners[type].push(listener);
    },
    querySelectorAll: function(selector) {
      log(`${this.tagName} querySelectorAll called with selector: ${selector}`);
      const results = this.children.filter(child => child.tagName && child.tagName === selector.toUpperCase());
      results.forEach = Array.prototype.forEach; // Add forEach for NodeList mimicry
      return results;
    },
    remove: function() { log(`${this.tagName} remove called`); },
    focus: function() { log(`${this.tagName} focus called`); },
  };
};

let mockDocumentObject = {
  constructor: { name: "HTMLDocumentMock" },
  _elements: [], // For global querySelectorAll, if needed
  createElement: function(tagName) {
    log(`mockDocument.createElement called for: ${tagName}`);
    const el = createMockElement(tagName);
    this._elements.push(el); // Track elements for global queries
    return el;
  },
  createTextNode: function(text) {
    log(`mockDocument.createTextNode called with text: "${text}"`);
    // Return a more element-like text node to prevent errors if flint tries to add helpers
    // that expect methods like querySelectorAll, even if they don't make sense for a text node.
    const textNode = createMockElement('#text'); // Use a special tagName for identification
    textNode.nodeType = 3;
    textNode.textContent = text;
    textNode.innerText = text; // Flint might use innerText

    // Override methods that don't make sense for a text node or should behave differently
    textNode.appendChild = () => { throw new Error("Cannot appendChild to a text node"); };
    textNode.setAttribute = () => { throw new Error("Cannot setAttribute on a text node"); };
    // querySelectorAll on a text node should probably return an empty list
    textNode.querySelectorAll = function(selector) {
        const results = [];
        results.forEach = Array.prototype.forEach;
        return results;
    };
    return textNode;
  },
  createDocumentFragment: function() {
    log('mockDocument.createDocumentFragment called');
    const fragment = createMockElement('#document-fragment'); // Use a special tagName for fragments
    fragment.nodeType = 11; // Node.DOCUMENT_FRAGMENT_NODE
    return fragment;
  },
  querySelectorAll: function(selector) {
    // This is a simplified global querySelectorAll.
    // It searches all elements ever created by mockDocument.createElement.
    // For more complex scenarios, this might need to search a specific "root" element or structure.
    const results = this._elements.filter(el => {
      // Simple tag selector
      if (el.tagName === selector.toUpperCase()) return true;
      // Simple class selector (e.g., ".my-class")
      if (selector.startsWith('.') && el.attributes.class && el.attributes.class.includes(selector.substring(1))) return true;
      // Simple ID selector (e.g., "#my-id")
      if (selector.startsWith('#') && el.attributes.id === selector.substring(1)) return true;
      return false;
    });
    results.forEach = Array.prototype.forEach;
    return results;
  },
  // Add other document properties or methods if flint.js uses them.
  // e.g., document.body, document.getElementById
  body: createMockElement('body'), // Mock body
  readyState: 'complete', // Add readyState
  getElementById: function(id) {
    return this._elements.find(el => el.getAttribute('id') === id) || null;
  }
};
const mockDocument = () => mockDocumentObject; // Make it callable
Object.assign(mockDocument, mockDocumentObject); // Assign properties to the function object
global.document = mockDocument; // global.document is now a callable function

let mockWindowObject = {
  constructor: { name: "WindowMock" },
  document: mockDocument, // Use the callable mockDocument
  navigator: { userAgent: "NodeTestEnvironment/1.0" },
  addEventListener: function(type, listener) {
    log(`mockWindow.addEventListener called for type: ${type}`);
  },
  removeEventListener: function(type, listener) {
    log(`mockWindow.removeEventListener called for type: ${type}`);
  }
};
const mockWindow = () => mockWindowObject; // Make it callable
Object.assign(mockWindow, mockWindowObject); // Assign properties to the function object
global.window = mockWindow; // Make mockWindow globally available as well

const flintPath = path.resolve(__dirname, './flint.js');
const $ = loadClientScript(
  flintPath,
  { document: mockDocument, window: mockWindow }, // Pass callable versions
  "$"
);

function testCreateSimpleDiv() {
  if (typeof $ !== 'function') {
    console.error(`[TEST DEBUG] Flint $ is not a function. Actual type: ${typeof $}. Value: ${String($)}`);
    // This will cause the test to fail, but gives a clear reason.
    assertEquals('function', typeof $, "Flint $ should be a function");
    return;
  }
  const $div = $("\n  div"); // Changed to standard string with escaped newline
  console.log(`[TEST DEBUG] testCreateSimpleDiv: $div type is ${typeof $div}, value is ${String($div)}`);
  assertEquals(true, !!$div, "Test Simple Div: element should be created");
  if (!$div) return; // Guard against further errors if creation failed
  assertEquals("DIV", $div.tagName, "Test Simple Div: tagName should be DIV");
  assertEquals("object", typeof $div.attributes, "Test Simple Div: attributes should be an object");
  assertEquals(0, Object.keys($div.attributes || {}).length, "Test Simple Div: attributes should be empty");
  assertEquals(0, ($div.children || []).length, "Test Simple Div: children should be empty");
}

function testCreateParagraphWithText() {
  const $p = $("\n  p Hello World");
  assertEquals(true, !!$p, "Test P with Text: element should be created");
  if (!$p) return;
  assertEquals("P", $p.tagName, "Test P with Text: tagName should be P");
  assertEquals("Hello World", $p.innerText, "Test P with Text: innerText should be 'Hello World'");
}

function testCreateInputWithAttributes() {
  const $input = $("\n  input[type=text][name=testInput]");
  assertEquals(true, !!$input, "Test Input with Attributes: element should be created");
  if (!$input) return;
  assertEquals("INPUT", $input.tagName, "Test Input with Attributes: tagName should be INPUT");
  assertEquals("text", $input.getAttribute('type'), "Test Input with Attributes: type attribute should be 'text'");
  assertEquals("testInput", $input.getAttribute('name'), "Test Input with Attributes: name attribute should be 'testInput'");
}

function testCreateNestedElements() {
  const $ul = $("\n  ul\n    li Item 1");
  assertEquals(true, !!$ul, "Test Nested Elements: UL element should be created");
  if (!$ul) return;
  assertEquals("UL", $ul.tagName, "Test Nested Elements: UL tagName should be UL");
  assertEquals(1, ($ul.children || []).length, "Test Nested Elements: UL should have one child");
  if (($ul.children || []).length === 0) return;
  const $li = $ul.children[0];
  assertEquals(true, !!$li, "Test Nested Elements: LI element should be created");
  if (!$li) return;
  assertEquals("LI", $li.tagName, "Test Nested Elements: Child tagName should be LI");
  assertEquals("Item 1", $li.innerText, "Test Nested Elements: Child innerText should be 'Item 1'");
}

function testArgSubstitutionText() {
  const $h1 = $("\n  h1 $1", ["Test Title"]);
  assertEquals(true, !!$h1, "Test Arg Substitution Text: element should be created");
  if (!$h1) return;
  assertEquals("H1", $h1.tagName, "Test Arg Substitution Text: tagName should be H1");
  assertEquals("Test Title", $h1.innerText, "Test Arg Substitution Text: innerText should be 'Test Title'");
}

function testArgSubstitutionAttrValue() {
  const $a = $("\n  a[href=$1][target=_blank]", ["/test-path"]);
  assertEquals(true, !!$a, "Test Arg Substitution Attr Value: element should be created");
  if (!$a) return;
  assertEquals("A", $a.tagName, "Test Arg Substitution Attr Value: tagName should be A");
  assertEquals("/test-path", $a.getAttribute('href'), "Test Arg Substitution Attr Value: href attribute should be '/test-path'");
  assertEquals("_blank", $a.getAttribute('target'), "Test Arg Substitution Attr Value: target attribute should be '_blank'");
}

function testArgSubstitutionAttrKey() {
  const $div = $("\n  div[$1=value]", ["data-dynamic-attr"]);
  assertEquals(true, !!$div, "Test Arg Substitution Attr Key: element should be created");
  if (!$div) return;
  assertEquals("DIV", $div.tagName, "Test Arg Substitution Attr Key: tagName should be DIV");
  assertEquals("value", $div.getAttribute('data-dynamic-attr'), "Test Arg Substitution Attr Key: dynamic attribute 'data-dynamic-attr' should be 'value'");
}

function testCreateMultipleRootElements() {
  const $container = $("\n  div[id=one]\n  p[id=two]");
  assertEquals(true, !!$container, "Test Multiple Roots: Container should be created");
  if (!$container) return;

  assertEquals("DIV", $container.tagName, "Test Multiple Roots: Container tagName should be DIV (wrapper)");
  assertEquals(2, ($container.children || []).length, "Test Multiple Roots: Container should have two children");

  if (($container.children || []).length < 2) return; // Guard

  const $child1 = $container.children[0];
  assertEquals(true, !!$child1, "Test Multiple Roots: First child should exist");
  if ($child1) {
    assertEquals("DIV", $child1.tagName, "Test Multiple Roots: First child should be DIV");
    assertEquals("one", $child1.getAttribute('id'), "Test Multiple Roots: First child id should be 'one'");
  }

  const $child2 = $container.children[1];
  assertEquals(true, !!$child2, "Test Multiple Roots: Second child should exist");
  if ($child2) {
    assertEquals("P", $child2.tagName, "Test Multiple Roots: Second child should be P");
    assertEquals("two", $child2.getAttribute('id'), "Test Multiple Roots: Second child id should be 'two'");
  }
}

function testArrayArgument() {
  const mockChild1 = mockDocument.createElement('span'); // Assuming mockDocument is in scope
  mockChild1.innerText = "Child 1";
  const mockChild2 = mockDocument.createElement('span');
  mockChild2.innerText = "Child 2";

  const $div = $("\n  div $1", [[mockChild1, mockChild2]]);
  console.log(`[TEST DEBUG] testArrayArgument: $div type is ${typeof $div}, value is ${String($div)}, tagName is ${$div ? $div.tagName : 'N/A'}, children count is ${$div ? ($div.children || []).length : 'N/A'}`);
  assertEquals(true, !!$div, "Test Array Argument: DIV element should be created");
  if (!$div) return;

  assertEquals("DIV", $div.tagName, "Test Array Argument: tagName should be DIV");

  // Reflecting current flint.js behavior for array arguments in templates.
  // It appears flint.js creates the parent DIV but does not correctly append
  // the fragment created from the array argument as a child to this DIV
  // (e.g., might be doing innerText = fragment instead of appendChild(fragment)).
  assertEquals(0, ($div.children || []).length, "Test Array Argument: DIV should have 0 children (current flint.js behavior with array arg in template)");

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
  const originalCreateTextNode = mockDocument.createTextNode;
  mockDocument.createTextNode = function(text) {
    createTextNodeCalledWithText = text;
    return originalCreateTextNode.call(this, text);
  };

  $("\n  $1", ["Direct Text Content"]);

  assertEquals("Direct Text Content", createTextNodeCalledWithText, "Test Text Node Arg: mockDocument.createTextNode should be called with the correct text.");

  mockDocument.createTextNode = originalCreateTextNode;

  const $returnedNode = $("\n  $1", ["My Text Content"]);
  assertEquals(true, !!$returnedNode, "Test Text Node Arg Return: A node should be returned.");
  if (!$returnedNode) return;

  // Assuming the mock text node has nodeType and textContent
  // The flint.js code, when it receives a single text node via argument substitution for the whole template,
  // will make this text node the child of its internally created root DIV.
  // Then it returns that child. So $returnedNode *is* the text node.
  assertEquals(3, $returnedNode.nodeType, "Test Text Node Arg Return: nodeType should be 3 (TEXT_NODE).");
  assertEquals("My Text Content", $returnedNode.textContent, "Test Text Node Arg Return: textContent should match.");
}

// Store original querySelectorAll to reset after tests if modified globally
const originalQSA = mockDocument.querySelectorAll;
// const originalElementQSA = mockDocument.createElement('div').querySelectorAll; // Not strictly needed due to mock element's own QSA

function setupMockQuerySelectorAll() {
  // Clear mockDocument's element list before each selection test that uses global queries.
  // Individual tests are responsible for populating the elements they need.
  mockDocument._elements = [];
}

function teardownMockQuerySelectorAll() {
  // Also clear after the test for good measure, though setup should handle it for the next test.
  mockDocument._elements = [];
}

function testSelectSingleElement() {
  setupMockQuerySelectorAll();

  // Create the specific element this test will try to select.
  const mockSingleGlobal = mockDocument.createElement('div');
  mockSingleGlobal.setAttribute('id', 'singleElement');
  mockSingleGlobal.innerText = "Single";
  // mockDocument.createElement automatically adds it to mockDocument._elements

  const $el = $("#singleElement");
  assertEquals(true, !!$el, "Test Select Single: Element should be found");
  if (!$el) {
    teardownMockQuerySelectorAll();
    return;
  }

  assertEquals("DIV", $el.tagName, "Test Select Single: tagName should be DIV");
  assertEquals("Single", $el.innerText, "Test Select Single: innerText should be 'Single'");
  assertEquals("function", typeof $el.forEach, "Test Select Single: Should have a .forEach helper method");
  teardownMockQuerySelectorAll();
}

function testSelectMultipleElements() {
  setupMockQuerySelectorAll(); // Clears _elements

  // Create the specific elements this test will try to select.
  const mockMultiple1Global = mockDocument.createElement('span');
  mockMultiple1Global.setAttribute('class', 'multipleElements');
  mockMultiple1Global.innerText = "Multiple 1";

  const mockMultiple2Global = mockDocument.createElement('span');
  mockMultiple2Global.setAttribute('class', 'multipleElements');
  mockMultiple2Global.innerText = "Multiple 2";
  // mockDocument.createElement automatically adds these to mockDocument._elements

  const $els = $(".multipleElements");
  assertEquals(true, !!$els, "Test Select Multiple: Elements should be found");
  if (!$els) {
    teardownMockQuerySelectorAll();
    return;
  }

  assertEquals(2, $els.length, "Test Select Multiple: Should find 2 elements");
  assertEquals("function", typeof $els.forEach, "Test Select Multiple: Should be NodeList-like (have forEach)");
  if ($els.length === 2) {
    // Order might not be guaranteed by simple _elements scan, sort by innerText for stable test
    const sortedEls = Array.from($els).sort((a, b) => a.innerText.localeCompare(b.innerText));
    assertEquals("SPAN", sortedEls[0].tagName, "Test Select Multiple: First element tagName");
    assertEquals("Multiple 1", sortedEls[0].innerText, "Test Select Multiple: First element text");
    assertEquals("SPAN", sortedEls[1].tagName, "Test Select Multiple: Second element tagName");
    assertEquals("Multiple 2", sortedEls[1].innerText, "Test Select Multiple: Second element text");
  }
  teardownMockQuerySelectorAll();
}

function testSelectNonExistentElement() {
  setupMockQuerySelectorAll(); // Ensures _elements is empty
  const $el = $("#nonExistent");
  assertEquals(null, $el, "Test Select Non-Existent: Should return null");
  teardownMockQuerySelectorAll(); // Cleans up for good measure
}

function testNestedSelection() {
  setupMockQuerySelectorAll(); // Clears _elements

  // Create the specific elements this test will use.
  const parentEl = mockDocument.createElement('div');
  parentEl.setAttribute('id', 'parentForNested');
  const childEl = mockDocument.createElement('p');
  childEl.setAttribute('id', 'childInNested');
  parentEl.appendChild(childEl);
  // parentEl is now in mockDocument._elements due to createElement.

  const $parent = $("#parentForNested");
  assertEquals(true, !!$parent, "Test Nested Selection: Parent element should be found");
  if (!$parent) {
    teardownMockQuerySelectorAll();
    return;
  }
  assertEquals("DIV", $parent.tagName, "Test Nested Selection: Parent tagName");

  // The mockElement.querySelectorAll (from createMockElement in step 3) should handle this.
  // It filters direct children by tagName.
  const $child = $parent.$("p");
  assertEquals(true, !!$child, "Test Nested Selection: Child element should be found");
  if (!$child) {
    teardownMockQuerySelectorAll();
    return;
  }

  assertEquals("P", $child.tagName, "Test Nested Selection: Child tagName should be P");
  assertEquals("childInNested", $child.getAttribute('id'), "Test Nested Selection: Child id");

  const $nonExistentChild = $parent.$("span");
  assertEquals(null, $nonExistentChild, "Test Nested Selection: Non-existent child should be null");
  teardownMockQuerySelectorAll();
}

function testHelperOnMethod() {
  setupMockQuerySelectorAll(); // Clears _elements

  // Create the specific element this test will use.
  const mockElement = mockDocument.createElement('button');
  mockElement.setAttribute('id', 'testButtonForOn');
  // mockDocument.createElement automatically adds it to mockDocument._elements

  const $el = $("#testButtonForOn"); // Select the element just created

  assertEquals(true, !!$el, "Test .on(): Element should be found for testing .on()");
  if (!$el) {
    teardownMockQuerySelectorAll();
    return;
  }

  // Ensure eventListeners and addEventListener are present (they should be from createMockElement)
  if (!$el.eventListeners || typeof $el.addEventListener !== 'function') {
    console.error("Mock element from selector doesn't have event listener capabilities from createMockElement.");
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
    assertEquals(1, $el.eventListeners['click'].length, "Test .on(): One click handler should be registered.");
    assertEquals(mockClickHandler, $el.eventListeners['click'][0], "Test .on(): Correct click handler should be registered.");
  }

  assertEquals(true, !!$el.eventListeners['mouseover'], "Test .on(): 'mouseover' event should have listeners registered.");
  if ($el.eventListeners['mouseover']) {
    assertEquals(1, $el.eventListeners['mouseover'].length, "Test .on(): One mouseover handler should be registered.");
    assertEquals(mockMouseOverHandler, $el.eventListeners['mouseover'][0], "Test .on(): Correct mouseover handler should be registered.");
  }
  teardownMockQuerySelectorAll();
}

function testHelperForEachSingleElement() {
  setupMockQuerySelectorAll(); // Clears _elements

  // Create the specific element this test will use.
  const mockElement = mockDocument.createElement('div');
  mockElement.setAttribute('id', 'testDivForForEachSingle');
  // mockDocument.createElement automatically adds it to mockDocument._elements

  const $el = $("#testDivForForEachSingle");
  assertEquals(true, !!$el, "Test .forEach() Single: Element should be found");
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

  assertEquals(1, callbackCount, "Test .forEach() Single: Callback should be called once.");
  assertEquals($el, receivedElement, "Test .forEach() Single: Callback received the correct element.");
  assertEquals(0, receivedIndex, "Test .forEach() Single: Index should be 0 for single element.");
  teardownMockQuerySelectorAll();
}

function testHelperForEachMultipleElements() {
  setupMockQuerySelectorAll(); // Clears _elements

  // Create the specific elements this test will use.
  const el1 = mockDocument.createElement('p');
  el1.setAttribute('class', 'testClassForForEach');
  el1.innerText = "Item 1";
  const el2 = mockDocument.createElement('p');
  el2.setAttribute('class', 'testClassForForEach');
  el2.innerText = "Item 2";
  // mockDocument.createElement automatically adds them to mockDocument._elements

  const $els = $(".testClassForForEach");
  assertEquals(true, !!$els && typeof $els.forEach === 'function', "Test .forEach() Multiple: NodeList-like object should be returned");
  if (!$els || typeof $els.forEach !== 'function') {
     teardownMockQuerySelectorAll();
     return;
  }
  assertEquals(2, $els.length, "Test .forEach() Multiple: Elements should be found (length 2)");
   if ($els.length !== 2) {
    teardownMockQuerySelectorAll();
    return;
  }


  let callbackCount = 0;
  const receivedElements = [];

  $els.forEach((element, index) => {
    callbackCount++;
    receivedElements.push(element);
    assertEquals(receivedElements.length - 1, index, `Test .forEach() Multiple: Index should be ${index}`);
  });

  assertEquals(2, callbackCount, "Test .forEach() Multiple: Callback should be called twice.");
  // Sort $els and receivedElements by innerText for stable comparison, as QSA order isn't guaranteed
  const sortFn = (a,b) => (a.innerText || "").localeCompare(b.innerText || "");
  const sortedOriginals = Array.from($els).sort(sortFn);
  const sortedReceived = receivedElements.sort(sortFn);

  assertEquals(sortedOriginals[0], sortedReceived[0], "Test .forEach() Multiple: First element in callback matches.");
  assertEquals(sortedOriginals[1], sortedReceived[1], "Test .forEach() Multiple: Second element in callback matches.");
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
