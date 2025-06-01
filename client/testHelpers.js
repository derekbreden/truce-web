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
 * Creates a mock implementation of flint.js's $ (dollar) function, for testing purposes.
 * This mock is intended for tests where flint.js itself is not the direct subject under test,
 * but rather its interactions need to be simulated.
 * The returned mockDollar function tracks its calls and the behavior of created elements.
 * @returns {Function} The mockDollar function, which also has a .calls array and .reset() method.
 */
function createMockDollar() {
  // primedProperties stores properties to be merged for specific selectors
  const mockDollar = (selector, args = []) => { // args defaults to empty array if not provided
    // Simulate template processing if args are provided (simple $1, $2 replacement)
    let processedSelector = selector;
    if (args && Array.isArray(args) && typeof selector === 'string' && args.length > 0) {
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
      prependedChildren: [],
      appendedChildren: [],
      eventHandlers: {},
      attributes: {},
      textContent: '',
      value: '',
      scrollTop: 0, // Default scrollTop property
      focused: false,
      
      remove: function() { 
        this.removed = true; 
      },
      prepend: function(childElement) { 
        // Child might be a string or another mockElement
        this.prependedChildren.push(childElement); 
      },
      append: function(childElement) { 
        this.appendedChildren.push(childElement); 
      },
      on: function(eventName, handler) { 
        this.eventHandlers[eventName] = this.eventHandlers[eventName] || [];
        this.eventHandlers[eventName].push(handler); 
      },
      attr: function(attributeName, value) { 
        if (value === undefined) {
          return this.attributes[attributeName];
        }
        this.attributes[attributeName] = value;
        return this; // for chaining
      },
      text: function(content) {
        if (content === undefined) {
          return this.textContent;
        }
        this.textContent = String(content); // Ensure content is stringified
        return this;
      },
      val: function(v_content) { // Renamed to avoid conflict with 'value' property
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
        this.prependedChildren = []; 
        this.appendedChildren = []; 
        this.textContent = ''; 
        // Potentially clear other fields like attributes or value if needed by tests
        return this;
      },
      $: function(subSelector, subArgs) { // Chained call
        return mockDollar(subSelector, subArgs); // Uses the parent mockDollar to ensure tracking
      },
      // Add setAttribute as an alias for attr to handle tests for code using either
      setAttribute: function(attributeName, value) {
        return this.attr(attributeName, value);
      },
    };

    // Check if there are primed properties for this selector
    if (mockDollar.primedProperties && mockDollar.primedProperties[processedSelector]) {
      // Merge primed properties, potentially overriding defaults (especially scrollTop)
      elementProperties = { ...elementProperties, ...mockDollar.primedProperties[processedSelector] };
      delete mockDollar.primedProperties[processedSelector]; // Use once
    }

    const element = elementProperties; // Assign to element after potential modification
    
    mockDollar.calls.push({ 
        selector: processedSelector, // Use processed selector for easier matching in tests
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

// Mock DOM Implementation for testing flint.js itself
// The functions createMockDocument, createMockWindow, and createMockElement build a
// simulated DOM. This setup is used in tests like client/flint.test.js to test
// the *actual* flint.js script.
//
// This is one of two approaches currently used for testing code involving flint.js:
// 1. Mocking flint.js's $ function directly using `createMockDollar` (for when flint.js
//    itself is not the System Under Test, but its interactions need to be simulated).
// 2. Using this mock DOM with the actual flint.js script (for testing flint.js itself).
//
// This divergence is a known area for future refactoring, aiming for a more unified
// testing strategy for flint.js and its DOM interactions, as noted in README.md.

const createMockElement = (tagName) => {
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
      this.children.push(child);
      child.parentNode = this; // Set parentNode
    },
    setAttribute: function(name, value) {
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
      return this.attributes[name];
    },
    addEventListener: function(type, listener) {
      if (!this.eventListeners[type]) {
        this.eventListeners[type] = [];
      }
      this.eventListeners[type].push(listener);
    },
    querySelectorAll: function(selector) {
      const results = this.children.filter(child => child.tagName && child.tagName === selector.toUpperCase());
      results.forEach = Array.prototype.forEach; // Add forEach for NodeList mimicry
      return results;
    },
    remove: function() {  },
    focus: function() {  },
  };
};

function createMockDocument() {
  const mockDocumentObject = {
    constructor: { name: "HTMLDocumentMock" },
    _elements: [], // For global querySelectorAll, if needed
    createElement: function(tagName) {
      const el = createMockElement(tagName);
      this._elements.push(el); // Track elements for global queries
      return el;
    },
    createTextNode: function(text) {
      const textNode = createMockElement('#text');
      textNode.nodeType = 3;
      textNode.textContent = text;
      textNode.innerText = text;

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
    querySelectorAll: function(selector) {
      const results = this._elements.filter(el => {
        if (el.tagName === selector.toUpperCase()) return true;
        if (selector.startsWith('.') && el.attributes.class && el.attributes.class.includes(selector.substring(1))) return true;
        if (selector.startsWith('#') && el.attributes.id === selector.substring(1)) return true;
        return false;
      });
      results.forEach = Array.prototype.forEach;
      return results;
    },
    body: null, // Initialized below
    readyState: 'complete',
    getElementById: function(id) {
      return this._elements.find(el => el.getAttribute('id') === id) || null;
    }
  };
  mockDocumentObject.body = mockDocumentObject.createElement('body'); // Initialize body
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

module.exports = {
  loadClientScript,
  createMockDollar,
  createMockElement,
  createMockDocument,
  createMockWindow,
};
