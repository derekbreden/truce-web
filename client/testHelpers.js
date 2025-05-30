const fs = require('fs');
const path = require('path');

/**
 * Loads a client-side JavaScript file, makes specified global mocks available to it,
 * and returns the primary export of the script.
 * Assumes the script exports a function or object with the same name as the file (minus .js).
 *
 * @param {string} filePath - Absolute path to the client-side JavaScript file.
 * @param {object} globalMocks - Object mapping global variable names to their mock implementations.
 * @returns {*} The primary export of the loaded script.
 * @throws {Error} If loading or execution fails.
 */
function loadClientScript(filePath, globalMocks) {
  try {
    const scriptContent = fs.readFileSync(filePath, 'utf8');
    const mockNames = Object.keys(globalMocks);
    const mockValues = Object.values(globalMocks);
    const scriptName = path.basename(filePath, '.js');
    const functionConstructorArgs = [...mockNames, scriptContent + `;\nreturn ${scriptName};`];
    const dynamicallyCreatedFunction = new Function(...functionConstructorArgs);
    return dynamicallyCreatedFunction.apply(null, mockValues);
  } catch (e) {
    console.error(`Failed to load or execute client script: ${filePath}`, e);
    throw new Error(`Failed to load or execute client script: ${filePath}. Reason: ${e.message}`);
  }
}

/**
 * Creates a mock $ (dollar) function similar to jQuery, for testing purposes.
 * The returned mockDollar function tracks its calls and the behavior of created elements.
 * @returns {Function} The mockDollar function, which also has a .calls array and .reset() method.
 */
function createMockDollar() {
  const mockDollar = (selector, args = []) => { // args defaults to empty array if not provided
    // Simulate template processing if args are provided (simple $1, $2 replacement)
    let processedSelector = selector;
    if (args && Array.isArray(args) && typeof selector === 'string' && args.length > 0) {
      args.forEach((arg, index) => {
        const placeholder = new RegExp(`\\$${index + 1}`, 'g');
        processedSelector = processedSelector.replace(placeholder, String(arg));
      });
    }

    const element = {
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
      focused: false,
      
      remove: function() { 
        this.removed = true; 
        // console.log(`Mock element '${this.selector}' remove called`);
      },
      prepend: function(childElement) { 
        // Child might be a string or another mockElement
        this.prependedChildren.push(childElement); 
        // console.log(`Mock element '${this.selector}' prepend called with:`, childElement);
      },
      append: function(childElement) { 
        this.appendedChildren.push(childElement); 
        // console.log(`Mock element '${this.selector}' append called with:`, childElement);
      },
      on: function(eventName, handler) { 
        this.eventHandlers[eventName] = this.eventHandlers[eventName] || [];
        this.eventHandlers[eventName].push(handler); 
        // console.log(`Mock element '${this.selector}' on '${eventName}' handler added`);
      },
      attr: function(attributeName, value) { 
        if (value === undefined) {
          return this.attributes[attributeName];
        }
        this.attributes[attributeName] = value;
        // console.log(`Mock element '${this.selector}' attr '${attributeName}' set to:`, value);
        return this; // for chaining
      },
      text: function(content) {
        if (content === undefined) {
          return this.textContent;
        }
        this.textContent = String(content); // Ensure content is stringified
        // console.log(`Mock element '${this.selector}' text set to:`, content);
        return this;
      },
      val: function(v_content) { // Renamed to avoid conflict with 'value' property
        if (v_content === undefined) {
          return this.value;
        }
        this.value = v_content;
        // console.log(`Mock element '${this.selector}' val set to:`, v_content);
        return this;
      },
      focus: function() { 
        this.focused = true; 
        // console.log(`Mock element '${this.selector}' focus called`);
      },
      empty: function() { 
        this.prependedChildren = []; 
        this.appendedChildren = []; 
        this.textContent = ''; 
        // Potentially clear other fields like attributes or value if needed by tests
        // console.log(`Mock element '${this.selector}' empty called`);
        return this;
      },
      $: function(subSelector, subArgs) { // Chained call
        // console.log(`Mock element '${this.selector}' chained $ call with selector: '${subSelector}'`);
        return mockDollar(subSelector, subArgs); // Uses the parent mockDollar to ensure tracking
      }
    };
    
    mockDollar.calls.push({ 
        selector: processedSelector, // Use processed selector for easier matching in tests
        originalSelector: selector, 
        args, 
        element 
    });
    return element;
  };

  mockDollar.calls = [];
  mockDollar.reset = () => {
    mockDollar.calls = [];
    // console.log('mockDollar.calls reset');
  };

  return mockDollar;
}

module.exports = {
  loadClientScript,
  createMockDollar,
};
