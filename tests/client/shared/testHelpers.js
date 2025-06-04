const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

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
      const parts = selector.trim().split(/\s+/);

      if (parts.length > 1) {
        const firstPart = parts[0];
        const remainingPartsString = parts.slice(1).join(' ');

        // Find all descendants of 'this' (current context element) that match 'firstPart'
        const firstLevelMatches = [];
        const collectDescendantsMatchingFirstPart = (currentElement) => {
          for (const child of currentElement.children) {
            if (!child.tagName) continue;
            if (child._matchesSelector && typeof child._matchesSelector === 'function' && child._matchesSelector(firstPart)) {
              if (!firstLevelMatches.includes(child)) {
                firstLevelMatches.push(child);
              }
            }
            // Continue searching deeper within this child for the firstPart
            if (child.children && child.children.length > 0) {
              collectDescendantsMatchingFirstPart(child);
            }
          }
        };
        collectDescendantsMatchingFirstPart(this);

        // For each element that matched the firstPart, call its querySelectorAll with the remaining parts
        firstLevelMatches.forEach(matchedElement => {
          if (matchedElement.querySelectorAll && typeof matchedElement.querySelectorAll === 'function') {
            const deeperMatches = matchedElement.querySelectorAll(remainingPartsString);
            deeperMatches.forEach(dm => {
              if (!results.includes(dm)) { // Ensure uniqueness
                results.push(dm);
              }
            });
          }
        });
      } else { // Single selector part (no spaces)
        const singleSelector = parts[0];
        const findRecursively = (currentElement) => {
          for (const child of currentElement.children) {
            if (!child.tagName) continue;
            if (child._matchesSelector && typeof child._matchesSelector === 'function' && child._matchesSelector(singleSelector)) {
              if (!results.includes(child)) { // Ensure uniqueness
                results.push(child);
              }
            }
            // Continue searching deeper within this child
            if (child.children && child.children.length > 0) {
              findRecursively(child);
            }
          }
        };
        findRecursively(this);
      }

      results.forEach = Array.prototype.forEach; // Add forEach for NodeList mimicry
      return [...new Set(results)]; // Return a unique set of results
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

function loadAllClientScripts() {
  const indexPath = path.resolve(__dirname, '../../../index.html');
  const indexHtmlContent = fs.readFileSync(indexPath, 'utf8');

  // Parse the includes
  const parseIncludes = (fromHtmlContent) => {
    let returningHtmlContent = fromHtmlContent
    const scriptLineRegex = /(.*<!--#include\s+file="[^"]+\.[^"]+".*)/g;
    const scriptRegex = /[^"]+\.[^"]+/;
    let match;
    while ((match = scriptLineRegex.exec(fromHtmlContent)) !== null) {
      // Resolve the script path relative to the directory of the indexHtmlFile
      const indexDir = path.dirname(indexPath)
      const fullLine = match[0]
      const filePath = fullLine.match(scriptRegex)[0]
      // console.warn(match.index, fullLine.length, filePath)
      // console.warn(fullLine, filePath) 
      const scriptContent = fs.readFileSync(indexDir + "/" + filePath, "utf8")
      returningHtmlContent = returningHtmlContent.replace(fullLine, scriptContent)
    }
    return returningHtmlContent
  }
  // Parse the initial includes
  const firstPassHtmlContent = parseIncludes(indexHtmlContent)
  // Parse the includes of includes
  const finalIndexHtmlContent = parseIncludes(firstPassHtmlContent)
  // console.warn(finalIndexHtmlContent)
  const virtualConsole = new VirtualConsole()
  virtualConsole.sendTo(console)
  const dom = new JSDOM(finalIndexHtmlContent, {
    runScripts: "dangerously", // Allow scripts added to the DOM to run
    url: "http://localhost", // Necessary for some scripts that might use location/history
    pretendToBeVisual: true, // Helps with some DOM manipulations if needed
    includeNodeLocations: true,
    virtualConsole: virtualConsole,
    beforeParse(window) {
      window.is_test = true

      // Force setTimeout to be faster, to avoid delays
      //   (add conditional logic here if we need to not do this later)
      window.setTimeout = (fn) => {
        fn()
      }

      if (!window.matchMedia) {
        window.matchMedia = function(query) {
          return {
            matches: false, // Or true, depending on what's more suitable for general tests
            media: query,
            onchange: null,
            addListener: function() {}, // Deprecated
            removeListener: function() {}, // Deprecated
            addEventListener: function() {},
            removeEventListener: function() {},
            dispatchEvent: function() {}
          };
        };
      }

      if (!window.fetch) {
        window.fetch = async function(url, options) {
          // Log the fetch call for debugging during tests if needed
          // console.log(`Mock fetch called for URL: ${url}`, options);
          return {
            ok: true,
            status: 200,
            statusText: "OK",
            headers: {
              get: function(headerName) {
                if (headerName === "Content-Type") {
                  return "application/json";
                }
                return null;
              }
            },
            json: async () => ({ success: true }),
            text: async () => JSON.stringify({ success: true })
          };
        };
      }
    }
  })
  const { window } = dom

  return window
}

module.exports = {
  loadClientScript,
  createMockFunction,
  createMockElement,
  createMockDocument,
  createMockWindow,
  loadAllClientScripts, // Added here
};