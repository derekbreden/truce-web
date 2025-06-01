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
