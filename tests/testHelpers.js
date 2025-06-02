const fs = require('fs');
const path = require('path');

// New loadClientScript function
function loadClientScript(filePath, globalMocks, constNamesToReturn) {
  try {
    const scriptContent = fs.readFileSync(filePath, 'utf8');
    const mockNames = Object.keys(globalMocks);
    const mockValues = Object.values(globalMocks);
    const scriptName = path.basename(filePath, '.js');

    let returnStatement = "";

    if (constNamesToReturn === undefined ||
        (typeof constNamesToReturn === 'string' && constNamesToReturn === scriptName)) {
      returnStatement = `return ${scriptName};`;
    } else if (typeof constNamesToReturn === 'string') {
      returnStatement = `return ${constNamesToReturn};`;
    } else if (Array.isArray(constNamesToReturn)) {
      if (constNamesToReturn.length === 0) {
        returnStatement = "return {};";
      } else {
        // Correctly quote property names if they are not simple identifiers,
        // but here 'name' is a variable containing the string name, which is valid as a key.
        const assignments = constNamesToReturn.map(name => `${name}: ${name}`);
        returnStatement = `return { ${assignments.join(', ')} };`;
      }
    } else {
      console.warn(`Invalid constNamesToReturn type: ${typeof constNamesToReturn}. Defaulting to returning const matching script name (${scriptName}).`);
      returnStatement = `return ${scriptName};`;
    }

    const scriptToExecute = scriptContent + "\n" + returnStatement; // Ensure newline before return

    const functionConstructorArgs = [...mockNames, scriptToExecute];
    const dynamicallyCreatedFunction = new Function(...functionConstructorArgs);
    return dynamicallyCreatedFunction.apply(null, mockValues);
  } catch (e) {
    let attemptedReturn = "Error determining return statement";
    // Safely stringify constNamesToReturn for the error message
    try {
      if (typeof returnStatement === 'string' && returnStatement.length > 0) {
          attemptedReturn = returnStatement;
      } else if (constNamesToReturn !== undefined) {
          attemptedReturn = `Input constNamesToReturn: ${JSON.stringify(constNamesToReturn)}`;
      }
    } catch (jsonError) {
        attemptedReturn = "Input constNamesToReturn could not be stringified."
    }

    console.error(`Failed to load or execute client script: ${filePath}.`);
    console.error(`Attempted to construct return statement: ${attemptedReturn}`);
    console.error(`Error details: ${e.message}`); // Log the original error message
    throw new Error(`Failed to load or execute client script: ${filePath}. Reason: ${e.message}. (Attempted return: ${attemptedReturn})`);
  }
}
// End of new loadClientScript function

/**
 * Creates a mock implementation of flint.js's $ (dollar) function for testing purposes.
 * This mock is intended for tests where flint.js itself is NOT the System Under Test (SUT),
 * but its interactions need to be simulated (e.g., in client/goToPath.test.js or client/debug.test.js).
 * The returned mockDollar function tracks its calls and the behavior of created elements.
 *
 * This is one of two primary methods used in this codebase for testing Flint-dependent code.
 * For a comprehensive explanation of these approaches, their rationale, and the long-term
 * refactoring goals, please refer to the "Mocking Inconsistencies for $ (Flint)" section in README.md.
 * @returns {Function} The mockDollar function, which also has a .calls array and .reset() method.
 */
function createMockDollar() {
  // primedProperties stores properties to be merged for specific selectors
  const mockDollar = (selector, args = []) => { // args defaults to empty array if not provided
    // Simulate template processing if args are provided (simple $1, $2 replacement)
    let processedSelector = selector;
    let idFromHtml = null;

    if (typeof selector === 'string' && selector.trim().startsWith('<')) {
      const idMatch = selector.match(/id\s*=\s*["']([^"']+)["']/);
      if (idMatch && idMatch[1]) {
        idFromHtml = idMatch[1];
        // For call logging, we might want to use #id if tests search this way
        // processedSelector = `#${idFromHtml}`;
        // However, elementProperties.selector should remain the original for consistency of the element itself
      }
    }

    if (args && Array.isArray(args) && typeof selector === 'string' && args.length > 0 && !idFromHtml) { // only process if not already identified as HTML string with ID
      args.forEach((arg, index) => {
        const placeholder = new RegExp(`\\$${index + 1}`, 'g');
        processedSelector = processedSelector.replace(placeholder, String(arg));
      });
    }

    // Default properties for the element
    let elementProperties = {
      selector: processedSelector, // Store the (potentially processed) selector
      originalSelector: selector,  // Store the original selector for reference
      args: args,                  // Store the arguments for reference
      removed: false,
      _children: [],
      prependedChildren: [], // For test compatibility
      appendedChildren: [], // For test compatibility (if append is used similarly in tests)
      _eventHandlers: {},
      _attributes: {},
      _content: '',
      value: '', // Keep value for val() compatibility
      scrollTop: 0, // Default scrollTop property
      focused: false,
      _tag: undefined, // Initialize _tag property
      id: idFromHtml, // Store extracted ID
      _parent: null, // Add _parent property
      style: {}, // Add style property
      length: 1, // Mimic jQuery object; 0 for empty
      index: 0, // For test compatibility (goToPath.test.js)
      
      remove: function() {
        this.removed = true;
        if (this._parent && this._parent._children) {
          const index = this._parent._children.indexOf(this);
          if (index > -1) {
            this._parent._children.splice(index, 1);
          }
        }
      },
      appendChild: function(childElement) {
        this._children.push(childElement);
        this.appendedChildren.push(childElement); // For test compatibility
        childElement._parent = this;
        return this; // for chaining
      },
      prepend: function(childElement) {
        // Child might be a string or another mockElement
        this._children.unshift(childElement);
        this.prependedChildren.unshift(childElement); // For test compatibility
        // If childElement is a mock element, set its parent
        if (childElement && typeof childElement === 'object') {
            childElement._parent = this;
        }
        return this; // for chaining
      },
      on: function(eventName, handler) {
        this._eventHandlers[eventName] = this._eventHandlers[eventName] || [];
        this._eventHandlers[eventName].push(handler);
      },
      attr: function(attributeName, value) {
        if (value === undefined) {
          return this._attributes[attributeName];
        }
        this._attributes[attributeName] = value;
        return this; // for chaining
      },
      text: function(content) {
        if (content === undefined) {
          return this._content;
        }
        this._content = String(content); // Ensure content is stringified
        return this;
      },
      val: function(v_content) {
        if (v_content === undefined) {
          return this.value;
        }
        this.value = v_content;
        return this;
      },
      focus: function() {
        this.focused = true;
      },
      empty: function() {
        this._children = [];
        this.prependedChildren = []; // Also clear these for test consistency
        this.appendedChildren = [];  // Also clear these for test consistency
        this._content = '';
        return this;
      },
      $: function(subSelector, subArgs) { // Chained call
        //This was the original behavior: uses the parent mockDollar to ensure tracking & creation
        return mockDollar(subSelector, subArgs);
      },
      // Add setAttribute as an alias for attr to handle tests for code using either
      setAttribute: function(attributeName, value) {
        return this.attr(attributeName, value);
      },
      click: function() {
        // Simulate click event
        if (this._eventHandlers && this._eventHandlers.click) {
          this._eventHandlers.click.forEach(handler => handler.call(this));
        }
      },
    };

    // Extract tag from selector
    if (typeof processedSelector === 'string') {
      const match = processedSelector.match(/^[a-zA-Z0-9]+/);
      if (match && !processedSelector.startsWith('.') && !processedSelector.startsWith('#')) {
        elementProperties._tag = match[0];
      }
    }

    // Check if there are primed properties for this selector
    if (mockDollar.primedProperties && mockDollar.primedProperties[processedSelector]) {
      // Merge primed properties, potentially overriding defaults (especially scrollTop)
      elementProperties = { ...elementProperties, ...mockDollar.primedProperties[processedSelector] };
      delete mockDollar.primedProperties[processedSelector]; // Use once
    }

    const element = elementProperties; // Assign to element after potential modification
    element.attributes = element._attributes; // Ensure attributes property points to _attributes for test compatibility
    element.eventHandlers = element._eventHandlers; // Ensure eventHandlers property points to _eventHandlers for test compatibility
    if (idFromHtml) {
      element._attributes.id = idFromHtml; // Also ensure it's in _attributes
    }

    mockDollar.calls.push({ 
        selector: idFromHtml || processedSelector, // Use raw id for selector in calls if extracted, to match test
        originalSelector: selector, 
        args, 
        element 
    });
    return element;
  };

  mockDollar.calls = [];
  mockDollar.primedProperties = {}; // Initialize primedProperties store

  mockDollar.reset = () => {
    mockDollar.calls = [];
    mockDollar.primedProperties = {}; // Reset primed properties as well
  };

  mockDollar.primeElementProperties = function(selector, properties) {
    this.primedProperties[selector] = properties;
  };

  return mockDollar;
}

// Helper to create an empty mock element for $ results (Might not be strictly needed if $ always returns full mock)
function createEmptyMockElement() {
  const emptyElement = {
    selector: 'empty-mock-element', // Make it identifiable
    originalSelector: '',
    args: [],
    removed: false,
    _children: [],
    prependedChildren: [], // For test compatibility
    appendedChildren: [], // For test compatibility
    _eventHandlers: {},
    _attributes: {},
    _content: '',
    value: '',
    scrollTop: 0,
    focused: false,
    _tag: undefined,
    _parent: null,
    style: {},
    length: 0, // Key property to indicate it's an empty collection

    remove: function() { this.removed = true; return this; },
    appendChild: function(childElement) { return this; },
    prepend: function(childElement) { return this; },
    on: function(eventName, handler) { return this; },
    attr: function(attributeName, value) { if (value === undefined) return undefined; return this; },
    text: function(content) { if (content === undefined) return ''; return this; },
    val: function(v_content) { if (v_content === undefined) return ''; return this; },
    focus: function() { this.focused = true; return this; },
    empty: function() {
      this._children = [];
      this.prependedChildren = [];
      this.appendedChildren = [];
      this._content = '';
      return this;
    },
    $: function(subSelector, subArgs) { return createEmptyMockElement(); },
    setAttribute: function(attributeName, value) { return this.attr(attributeName, value); },
    click: function() { return this; },
    index: function() { return 0; }
  };
  return emptyElement;
}

// Mock DOM Implementation for testing flint.js itself
// The functions createMockDocument, createMockWindow, and createMockElement (below)
// build a simulated DOM environment. This setup is used when the *actual* flint.js
// script is the System Under Test (SUT), for example, in client/flint.test.js.
//
// For a comprehensive explanation of the different Flint testing approaches,
// their rationale, and the long-term refactoring goals, please refer to the
// "Mocking Inconsistencies for $ (Flint)" section in README.md.

const createMockElement = (tagName, ownerDoc) => { // Added ownerDoc parameter
  const MOCK_ELEMENT_CONSTRUCTOR_NAME = "HTMLMockElement"; // Or specific like HTMLDivElementMock

  const element = {
    constructor: { name: tagName === '#text' ? "TextMock" : (tagName === '#document-fragment' ? "DocumentFragmentMock" : MOCK_ELEMENT_CONSTRUCTOR_NAME) },
    tagName: tagName.toUpperCase(),
    ownerDocument: ownerDoc, // Set ownerDocument
    attributes: {},
    children: [],
    // style: {}, // Let style be created dynamically if setAttribute or direct access occurs
    innerText: "",
    textContent: "", // Add textContent property
    value: "",
    parentNode: null,
    eventListeners: {},
    appendChild: function(child) {
      this.children.push(child);
      child.parentNode = this; // Set parentNode
      if (child.nodeType === 3) { // Node.TEXT_NODE
        // Simplest form: directly append. Make sure parent textContent is also updated.
        const newText = child.textContent || "";
        this.innerText += newText;
        this.textContent += newText; // Also update textContent
      } else {
        // For non-text nodes, their own innerText/textContent might contribute to parent's textContent in real DOM.
        // This is complex to model perfectly. For now, focus on direct text node children.
        // if (child.textContent) { this.textContent += child.textContent; }
      }
    },
    prepend: function(...nodes) { // Added prepend method
      const currentChildren = [...this.children];
      this.children = [];
      nodes.forEach(node => {
        // If node is a string, convert it to a text node (simplified)
        const childNode = typeof node === 'string' ? this.ownerDocument.createTextNode(node) : node;
        this.appendChild(childNode); // Use existing appendChild logic
      });
      currentChildren.forEach(child => this.appendChild(child));
    },
    setAttribute: function(name, value) {
      this.attributes[name] = String(value); // Store as string, like HTML
      if (name.toLowerCase() === "style") {
        if (!this.style) this.style = {}; // Initialize style if not present
        // console.log(`setAttribute style: ${value} on ${this.tagName}`);
        // this.style = {}; // Clear previous styles set by attribute - NO, merge them.
        value.split(';').forEach(styleRule => {
          if (styleRule.trim() === '') return;
          const [prop, valPart] = styleRule.split(':');
          if (prop && valPart) {
            const propFormatted = prop.trim().replace(/-([a-z])/g, g => g[1].toUpperCase()); // css-case to camelCase
            this.style[propFormatted] = valPart.trim();
          }
        });
      }
    },
    getAttribute: function(name) {
      return this.attributes[name];
    },
    addEventListener: function(type, listener) {
      if (!this.eventListeners[type]) {
        this.eventListeners[type] = [];
      }
      this.eventListeners[type].push(listener);
    },
    _matchesSelector: function(selector) { // `this` refers to the element being checked
      if (!this.tagName) return false;

      const attrSelectorMatch = selector.match(/^([*.a-zA-Z0-9_-]*)\[\s*([a-zA-Z0-9_-]+)\s*(?:=\s*["']?([^"']+)["']?)?\s*\]$/);

      if (attrSelectorMatch) {
        const tagNamePart = attrSelectorMatch[1] || '*';
        const attrName = attrSelectorMatch[2];
        const attrValue = attrSelectorMatch[3];

        let tagMatch = false;
        if (tagNamePart === '*' || tagNamePart === '' || this.tagName === tagNamePart.toUpperCase()) {
          tagMatch = true;
        }

        if (tagMatch) {
          const elAttrValue = this.getAttribute(attrName);
          if (attrValue !== undefined) {
            return elAttrValue === attrValue;
          } else {
            return elAttrValue !== undefined && elAttrValue !== null;
          }
        }
        return false;
      } else if (selector.startsWith('#')) {
        return this.getAttribute('id') === selector.substring(1);
      } else if (selector.startsWith('.')) {
        const className = selector.substring(1);
        const classes = this.getAttribute('class');
        return classes && classes.split(' ').includes(className);
      } else {
        return this.tagName === selector.toUpperCase();
      }
    },
    querySelectorAll: function(selector) { // Applies to mockElement.querySelectorAll
      const results = [];

      const findRecursively = (currentElement, currentSelector) => {
        for (const child of currentElement.children) {
          if (!child.tagName) {
            continue;
          }
          if (child._matchesSelector && typeof child._matchesSelector === 'function' && child._matchesSelector(currentSelector)) {
            results.push(child);
          } else if (!child._matchesSelector || typeof child._matchesSelector !== 'function') {
            // Element doesn't have the method, which is unexpected for valid mock elements.
            // This case can be logged or handled if necessary, but for now, we just don't match.
          }
          if (child.children && child.children.length > 0) {
            findRecursively(child, currentSelector);
          }
        }
      };

      findRecursively(this, selector);
      results.forEach = Array.prototype.forEach; // Add forEach for NodeList mimicry
      return results;
    },
    remove: function() {
      if (this.parentNode && this.parentNode.children) {
        const index = this.parentNode.children.indexOf(this);
        if (index > -1) {
          this.parentNode.children.splice(index, 1);
        }
      }
      // Also remove from ownerDocument._elements to prevent re-selection by global queries
      if (this.ownerDocument && this.ownerDocument._elements) {
        const docIndex = this.ownerDocument._elements.indexOf(this);
        if (docIndex > -1) {
          this.ownerDocument._elements.splice(docIndex, 1);
        }
      }
    },
    focus: function() { this.focused = true; /* Basic mock */ },
  };
  // Ensure style property exists for direct assignment like el.style.zIndex
  Object.defineProperty(element, 'style', {
    value: {},
    writable: true,
    configurable: true,
    enumerable: true
  });
  return element;
};

function createMockDocument() {
  const mockDocumentObject = {
    constructor: { name: "HTMLDocumentMock" },
    _elements: [], // For global querySelectorAll, if needed
    createElement: function(tagName) {
      const el = createMockElement(tagName, this); // Pass this (mockDocument) as ownerDocument
      this._elements.push(el); // Track elements for global queries
      return el;
    },
    createTextNode: function(text) {
      const textNode = createMockElement('#text', this); // Pass this (mockDocument) as ownerDocument
      textNode.nodeType = 3;
      textNode.textContent = text; // textContent is primary for text nodes
      textNode.nodeValue = text; // Another property real text nodes have
      textNode.data = text; // And another
      // textNode.innerText = text; // innerText on a text node itself is not standard as on elements

      textNode.appendChild = () => { throw new Error("Cannot appendChild to a text node"); };
      textNode.setAttribute = () => { throw new Error("Cannot setAttribute on a text node"); };
      textNode.querySelectorAll = function(selector) {
          const results = [];
          results.forEach = Array.prototype.forEach;
          return results;
      };
      return textNode;
    },
    createDocumentFragment: function() {
      const fragment = createMockElement('#document-fragment');
      fragment.nodeType = 11; // Node.DOCUMENT_FRAGMENT_NODE
      return fragment;
    },
    querySelectorAll: function(selector) { // Applies to mockDocument.querySelectorAll
      const lowerCaseSelector = selector.toLowerCase();

      if (lowerCaseSelector === 'html') {
        const results = [];
        if (this.documentElement) {
          results.push(this.documentElement);
        }
        results.forEach = Array.prototype.forEach;
        return results;
      }

      if (lowerCaseSelector === 'body') {
        const results = [];
        if (this.body) {
          results.push(this.body);
        }
        results.forEach = Array.prototype.forEach;
        return results;
      }

      let results = [];
      let elementsToSearch = this._elements;

      const parts = selector.trim().split(/\s+/);

      if (parts.length > 1) {
        const ancestorSelector = parts[0];
        const descendantSelector = parts.slice(1).join(' ');

        const ancestors = this.querySelectorAll(ancestorSelector);

        elementsToSearch = [];
        ancestors.forEach(ancestor => {
          elementsToSearch.push(...ancestor.querySelectorAll(descendantSelector));
        });

        results = [...new Set(elementsToSearch)];
        results.forEach = Array.prototype.forEach;
        return results;
      }

      const currentSelectorPart = parts[0];
      for (const el of elementsToSearch) {
        if (!el.tagName) {
          continue;
        }
        if (el._matchesSelector && typeof el._matchesSelector === 'function' && el._matchesSelector(currentSelectorPart)) {
          results.push(el);
        } else if (!el._matchesSelector || typeof el._matchesSelector !== 'function') {
          // Element doesn't have the method - potentially an issue if it's supposed to be a full mock element.
        }
      }
      if (currentSelectorPart.toLowerCase() === 'html' && this.documentElement && !results.includes(this.documentElement)) {
        results.push(this.documentElement);
      }
      if (currentSelectorPart.toLowerCase() === 'body' && this.body && !results.includes(this.body)) {
        results.push(this.body);
      }
      const uniqueResults = [...new Set(results)];
      uniqueResults.forEach = Array.prototype.forEach;
      return uniqueResults;
    },
    head: null,
    body: null, // Initialized below
    readyState: 'complete',
    getElementById: function(id) {
      return this._elements.find(el => el.getAttribute('id') === id) || null;
    },
    getElementsByTagName: function(tagNameLC) {
      const lowerCaseTagName = tagNameLC.toLowerCase();
      const results = this._elements.filter(el => el.tagName && el.tagName.toLowerCase() === lowerCaseTagName);
      results.forEach = Array.prototype.forEach; // Add forEach for NodeList mimicry
      // Also make it behave like a live HTMLCollection by adding a namedItem method (simplified)
      results.namedItem = (name) => results.find(el => el.getAttribute('id') === name || el.getAttribute('name') === name) || null;
      return results;
    },
    getElementsByClassName: function(className) {
      const results = this._elements.filter(el => {
        const classes = el.getAttribute('class');
        return classes && classes.split(' ').includes(className);
      });
      results.forEach = Array.prototype.forEach; // Add forEach for NodeList mimicry
      results.namedItem = (name) => results.find(el => el.getAttribute('id') === name || el.getAttribute('name') === name) || null;
      return results;
    }
  };
  mockDocumentObject.head = mockDocumentObject.createElement('head');
  mockDocumentObject.body = mockDocumentObject.createElement('body');
  // Add html element (documentElement)
  mockDocumentObject.documentElement = mockDocumentObject.createElement('html');
  mockDocumentObject.documentElement.appendChild(mockDocumentObject.head);
  mockDocumentObject.documentElement.appendChild(mockDocumentObject.body);
  // Ensure documentElement is also part of _elements so it can be found by generic queries if needed
  // although specific 'html' query should handle it.
  if (!mockDocumentObject._elements.includes(mockDocumentObject.documentElement)) {
    mockDocumentObject._elements.push(mockDocumentObject.documentElement);
  }
   if (!mockDocumentObject._elements.includes(mockDocumentObject.body)) {
    mockDocumentObject._elements.push(mockDocumentObject.body);
  }
   if (!mockDocumentObject._elements.includes(mockDocumentObject.head)) {
    mockDocumentObject._elements.push(mockDocumentObject.head);
  }

  return mockDocumentObject;
}

function createMockWindow(mockDocument) {
  return {
    constructor: { name: "WindowMock" },
    document: mockDocument,
    navigator: { userAgent: "NodeTestEnvironment/1.0" },
    addEventListener: function(type, listener) {
    },
    removeEventListener: function(type, listener) {
    }
  };
}

// --- Mock Implementations ---
const createMockFunction = (name = 'mockFunction') => {
  const mock = (...args) => {
    mock.called = true;
    mock.callCount++;
    mock.calls.push(args);
    // For functions that need to return a value based on input:
    if (mock.customBehavior) {
      return mock.customBehavior(...args);
    }
    return mock.returnValue;
  };
  mock.called = false;
  mock.callCount = 0;
  mock.calls = [];
  mock.returnValue = undefined;
  mock.customBehavior = null; // Function to define custom return logic
  mock.mockName = name; // Store the name for debugging or identification
  mock.reset = () => { // Renamed from clearHistory to reset to avoid confusion
    mock.called = false;
    mock.callCount = 0;
    mock.calls = [];
    // mock.returnValue = undefined; // Usually, returnValue is set once
    // mock.customBehavior = null; // And customBehavior is set once
  };
  return mock;
};

module.exports = {
  loadClientScript,
  createMockDollar,
  createMockFunction,
  createMockElement,
  createMockDocument,
  createMockWindow,
  setupClientScriptTest,
};

function setupClientScriptTest() {
  const mock$ = createMockDollar();
  const mockDocument = createMockDocument();
  const mockWindow = createMockWindow(mockDocument);

  return {
    mock$,
    mockDocument,
    mockWindow,
    loadScript: (filePath, additionalGlobalMocks, constNamesToReturn) => {
      const globalMocks = {
        $: mock$,
        document: mockDocument,
        window: mockWindow,
        ...additionalGlobalMocks,
      };
      return loadClientScript(filePath, globalMocks, constNamesToReturn);
    },
  };
}
