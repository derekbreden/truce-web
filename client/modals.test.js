const path = require("path")
const { loadClientScript } = require("./testHelpers")
const { assertEquals, runTests } = require("./testUtils")

// --- Mocks ---
let mockFlintInstance
const flintInstances = [] // To track created flint instances

const createMockFlintElement = (tag = "div", attributes = {}, content = "") => {
  const element = {
    _tag: tag,
    _attributes: { ...attributes },
    _content: content,
    _children: [],
    _eventHandlers: {},
    _removed: false,
    _parent: null,

    // Event handler method, matching the call in modals.js (e.g., .on("click", ...))
    on: function(event, handler) {
      if (!this._eventHandlers[event]) {
        this._eventHandlers[event] = []
      }
      this._eventHandlers[event].push(handler)
      return this // for chaining, if any
    },
    // This is the method flint.js uses for finding sub-elements.
    // Now updated to be recursive.
    $: function(selector) {
      const findInChildren = (currentElement, sel) => {
        // Check direct children first
        for (const child of currentElement._children) {
          let match = false;
          if (sel.startsWith("[")) { // Attribute selector like [confirm]
            const attr = sel.substring(1, sel.length - 1);
            if (child._attributes.hasOwnProperty(attr)) match = true;
          } else if (sel.includes("[")) { // Tag with attribute like button[confirm]
            const tagName = sel.substring(0, sel.indexOf("["))
            const attr = sel.substring(sel.indexOf("[") + 1, sel.length - 1)
            if (child._tag === tagName && child._attributes.hasOwnProperty(attr)) match = true;
          } else { // Tag selector
            if (child._tag === sel) match = true;
          }
          if (match) return child;
        }
        // If not found in direct children, search recursively
        for (const child of currentElement._children) {
          const found = findInChildren(child, sel); // Recursive call
          if (found) return found;
        }
        return null; // Not found in this branch
      };
      return findInChildren(this, selector);
    },
    remove: function() {
      this._removed = true
      if (this._parent && this._parent._children) {
        const index = this._parent._children.indexOf(this)
        if (index > -1) {
          this._parent._children.splice(index, 1)
        }
      }
      return this
    },
    appendChild: function(child) {
      this._children.push(child)
      child._parent = this
      return child // DOM standard
    },
    getAttribute: function(name) {
      return this._attributes[name]
    },
    setAttribute: function(name, value) {
      this._attributes[name] = value
    },
    // To help with assertions
    click: function() { // Helper to simulate click
      if (this._eventHandlers["click"]) {
        this._eventHandlers["click"].forEach(handler => handler({ preventDefault: () => {} }))
      }
    },
    // Flint template rendering uses $1, $2 for content.
    // This mock won't parse the complex template string yet, but we can simulate parts.
    // For now, the structure is more important.
    // The actual flint.js parses indentation and attributes from the template.
    // Our mock will need to be created with an initial structure.
    style: {} // Basic style object
  }
  flintInstances.push(element)
  return element
}

const $ = (templateOrSelector, args = []) => {
  // If it's a simple selector (e.g., "body", "modal-wrapper")
  if (typeof templateOrSelector === "string" && !templateOrSelector.includes("\n") && !templateOrSelector.includes(" ")) {
      if (templateOrSelector === "body") {
        return mockDocument.body // Special case for $("body")
      } else if (templateOrSelector === "modal-wrapper" || templateOrSelector === "alert-wrapper") {
        // Try to find existing wrappers
        const instance = mockDocument.body._children.find(child => child._tag === templateOrSelector && !child._removed)
        return instance || null // Return null if not found, to support `?.remove()`
      }
      // For other simple selectors, we currently don't have a generic "find in document" logic
      // This might need to be expanded or rely on flintInstances for specific test setups.
      // For now, returning null for unhandled simple selectors.
      return null
  }

  // If it's a template string (contains newlines or spaces, indicating structure)
  // This is a MAJOR simplification. Real flint parses the template.
  // We'll assume the first line is the main tag for now.
  // We also need to create a semblence of the nested structure for modals.
  const lines = templateOrSelector.trim().split("\n").map(line => line.trim());
  const mainTagLine = lines[0];
  const mainTag = mainTagLine.split(" ")[0]; // e.g., "modal-wrapper"
  const newElement = createMockFlintElement(mainTag);

  // Generalized parser for template structure.
  // It iterates through lines (children of the mainTag) and builds the structure.
  let currentParent = newElement;
  // TODO: A proper stack-based indentation system would be more robust here,
  // but for the current known templates, a simpler parent tracking might suffice.
  // For now, we'll assume 'modal[*]' or 'div' lines change currentParent,
  // and other elements are children of that. 'modal-bg' is child of newElement.

  for (let i = 1; i < lines.length; i++) {
    const trimmedLine = lines[i].trim(); // Use trimmed line for type checks
    if (!trimmedLine) continue;

    if (trimmedLine.startsWith("modal[") || trimmedLine.startsWith("div")) {
      const parts = trimmedLine.split(/[[\]\s]+/);
      const tag = parts[0];
      const attr = parts.length > 1 && parts[1] ? { [parts[1]]: true } : {};
      const childElement = createMockFlintElement(tag, attr);
      newElement.appendChild(childElement); // These are direct children of newElement (e.g. modal-wrapper)
      currentParent = childElement; // Subsequent elements are children of this new child

    } else if (trimmedLine.startsWith("button")) {
      const parts = trimmedLine.split(/[[\]\s]+/);
      const tag = parts[0];
      const attributes = {};
      if (parts[1]) attributes[parts[1]] = true; // e.g. {close: true}
      // TODO: more robust attribute parsing for multiple attributes like [cancel][close]
      const buttonText = trimmedLine.substring(trimmedLine.lastIndexOf("]") + 1).trim();
      const buttonElement = createMockFlintElement(tag, attributes, buttonText);
      currentParent.appendChild(buttonElement); // Assumes button is child of currentParent (e.g. the modal div)

    } else if (trimmedLine.startsWith("modal-bg")) {
      const bgElement = createMockFlintElement("modal-bg");
      newElement.appendChild(bgElement); // modal-bg is a direct child of newElement (e.g. modal-wrapper)
      // currentParent remains where it was, or reset to newElement if modal-bg should be a sibling of modal-div
      currentParent = newElement; // Assuming modal-bg makes the wrapper the current parent again

    } else if (trimmedLine.startsWith("info ") || trimmedLine.startsWith("error ")) {
      // e.g., "info $1" or "error $1"
      if (currentParent && args.length > 0 && typeof args[0] === 'string') {
        currentParent._content = (currentParent._content || "") + args[0]; // Set content on currentParent
      }
    } else if (trimmedLine === "$1") {
      // Handles cases like "alert-wrapper \n $1" where $1 is an element,
      // or "alert \n $1" where $1 is text (though "info $1" is preferred for text).
      if (currentParent && args.length > 0) {
        if (typeof args[0] === 'object' && args[0]._tag) { // $1 is an element
          currentParent.appendChild(args[0]);
        } else if (typeof args[0] === 'string') { // $1 is a string
          currentParent._content = (currentParent._content || "") + args[0];
        }
      }
    }
  }

  // Fallback for $1 if the mainTag line itself contains $1 (e.g. "tag $1") and no children lines.
  // This is less likely with current templates but adds robustness.
  if (lines.length === 1 && mainTagLine.includes("$1") && args.length > 0) {
    if (typeof args[0] === 'string' && !newElement._content) {
        newElement._content = args[0];
    } else if (typeof args[0] === 'object' && args[0]._tag) {
        // If template is just "mainTag $1" and $1 is an element, append it.
        newElement.appendChild(args[0]);
    }
  }

  mockFlintInstance = newElement; // Keep track of the last created top-level instance from a template
  return newElement
}


const mockDocument = {
  body: createMockFlintElement("body"), // Mock body as a flint element itself
  // querySelector: (selector) => { /* basic mock if needed */ },
  // getElementById: (id) => { /* basic mock if needed */ }
}

let mockSetTimeoutCallback = null
let mockTimeoutId = 123
let lastClearedTimeoutId = null
const mockSetTimeout = (callback, duration) => {
  mockSetTimeoutCallback = callback
  // console.log(\`Mock setTimeout called with duration: \${duration}\`)
  return mockTimeoutId // Return a dummy ID
}
const mockClearTimeout = (id) => {
  // console.log(\`Mock clearTimeout called with id: \${id}\`)
  if (id === mockTimeoutId) {
    mockSetTimeoutCallback = null // Prevent it from running
  }
  lastClearedTimeoutId = id
}

const mockState = {
  most_recent_error: null
}

const mockDebugLog = []
const mockDebug = (...args) => {
  mockDebugLog.push(args)
}

// Placeholder for loaded functions
let modals = {}
// Individual functions for easier access if preferred
let modalConfirm, modalInfo, modalError, alertInfo, alertError

// Function to reset mocks before each test group if needed
const resetMocks = () => {
  flintInstances.length = 0 // Clear the array
  mockDocument.body = createMockFlintElement("body") // Reset body
  mockSetTimeoutCallback = null
  lastClearedTimeoutId = null
  mockState.most_recent_error = null
  mockDebugLog.length = 0
  mockFlintInstance = null

  // Reset module state by clearing potentially loaded functions
  modals = {}
  modalConfirm = undefined
  modalInfo = undefined
  modalError = undefined
  alertInfo = undefined
  alertError = undefined
}

// Load the modals.js script and attach its functions
// modals.js is in the same directory as this test file.
const scriptPath = path.join(__dirname, "modals.js")

//Globals that flint.js and modals.js expect
const flintGlobal = $ // flint.js assigns itself to window.$
const mockWindow = { // Mock window object
  $: flintGlobal,
  debug: mockDebug,
  state: mockState,
  setTimeout: mockSetTimeout,
  clearTimeout: mockClearTimeout,
  document: mockDocument, // Provide the mock document
  modals: {} // Initialize modals global for the script
}


try {
  const functionsToLoad = ["modalConfirm", "modalInfo", "modalError", "alertInfo", "alertError"];
  const loadedFunctions = loadClientScript(scriptPath, mockWindow, functionsToLoad);

  // loadedFunctions should now be an object like:
  // { modalConfirm: fn, modalInfo: fn, ... }

  // Assign to individual variables if they are directly exported
  // and loadClientScript returns them in a way that can be destructured or accessed.
  // Assign the entire returned object to 'modals'
  if (loadedFunctions) {
      modals = loadedFunctions;
  } else {
      // This case should ideally not happen if loadClientScript works as expected with constNamesToReturn
      console.error("loadClientScript did not return an object of functions.");
      modals = {}; // Prevent further errors from modals being undefined
  }

  // Assign to individual variables from the 'modals' object
  if (modals && Object.keys(modals).length > 0) {
    modalConfirm = modals.modalConfirm
    modalInfo = modals.modalInfo
    modalError = modals.modalError
    alertInfo = modals.alertInfo
    alertError = modals.alertError
  } else {
    console.error("Failed to load modals.js or no functions were exported to the modals object.")
    // Potentially throw an error or handle this state if critical
  }
} catch (e) {
  console.error("Error loading modals.js:", e)
  // Handle error, perhaps by skipping tests or failing them
}

// Function to load/reload the script and assign functions
// This should be called after resetMocks in each test that needs these functions.
const setupLoadedFunctions = () => {
  try {
    const functionsToLoad = ["modalConfirm", "modalInfo", "modalError", "alertInfo", "alertError"];
    const loadedScriptFunctions = loadClientScript(scriptPath, mockWindow, functionsToLoad);

    if (loadedScriptFunctions) {
        modals = loadedScriptFunctions;
        modalConfirm = modals.modalConfirm;
        modalInfo = modals.modalInfo;
        modalError = modals.modalError;
        alertInfo = modals.alertInfo;
        alertError = modals.alertError;
    } else {
      console.error("setupLoadedFunctions: loadClientScript did not return an object of functions.");
      // Ensure functions are undefined so tests don't use stale versions from a previous load
      modals = {};
      modalConfirm = undefined;
      modalInfo = undefined;
      modalError = undefined;
      alertInfo = undefined;
      alertError = undefined;
    }
     // Check if modalInfo is actually a function now
    if (typeof modalInfo !== 'function') {
      // console.error("setupLoadedFunctions: modalInfo is still not a function after loading attempt.");
    }

  } catch (e) {
    console.error("Error in setupLoadedFunctions:", e);
    // Ensure functions are undefined to prevent tests from using potentially corrupted state
    modals = {};
    modalConfirm = undefined;
    modalInfo = undefined;
    modalError = undefined;
    alertInfo = undefined;
    alertError = undefined;
  }
};

// Initial load (optional, as tests will call setupLoadedFunctions)
// Commenting this out as tests will now handle their own loading setup.
/*
try {
  setupLoadedFunctions();
  if (typeof modalInfo !== 'function') {
    console.error("Initial load: modalInfo is not a function.");
  }
} catch (e) {
  console.error("Error during initial load:", e);
}
*/

// Placeholder for test functions
const testsToRun = [
  function testModalInfo_BasicDisplayAndDismiss() {
    resetMocks();
    setupLoadedFunctions(); // Load functions for this test

    // Defensive check
    if (typeof modalInfo !== 'function') {
      assertEquals(false, true, "TestModalInfo_Basic: modalInfo function was not loaded correctly.");
      return false; // Stop test if essential function is missing
    }

    const title = "Info Title";
    const message = "This is an info message.";

    modalInfo(title, message);

    // 1. Check if modal wrapper was created and appended to body
    const modalWrapper = mockDocument.body._children.find(child => child._tag === "modal-wrapper")
    assertEquals(modalWrapper !== null && modalWrapper !== undefined, true, "TestModalInfo_Basic: Modal wrapper should be created.")
    assertEquals(modalWrapper._children.length > 0, true, "TestModalInfo_Basic: Modal should have content.")

    // 2. Check for title and message (simplistic check based on current mock capabilities)
    //    A more robust check would involve inspecting the actual content structure if $find supported text content or classes.
    //    For now, we assume the modal's direct content might be the message or title, or they are passed as args.
    //    The current flint mock stores the first template arg in _content of the main element.
    //    Let's assume modals.js creates a structure like:
    //    modal-wrapper
    //      div (modal)
    //        h2 (title)
    //        p (message)
    //        button-bar
    //          button[ok]

    const modalDiv = modalWrapper._children.find(child => child._tag === "modal" && child._attributes.info) // Flint creates <modal info> not <div>
    assertEquals(modalDiv !== null && modalDiv !== undefined, true, "TestModalInfo_Basic: Modal content element (modal[info]) should exist in wrapper.")

    // We need to adjust how we check title and message.
    // The mock $ doesn't deeply parse and structure template content with $1, $2.
    // Let's assume modalInfo passes title and message to child elements.
    // We'll have to rely on finding elements and checking their _content if it was set.
    // Or, if modals.js uses template arguments like $1, $2, our mock $ captures the *first* one in _content.
    // This part of the test will be weak until the mock $ is more sophisticated or we know how modals.js structures content.

    // For now, let's assume the title is in an 'h2' and message in a 'p' directly inside modalDiv.
    // This is a guess about modals.js's internal structure.
    const titleElement = modalDiv._children.find(child => child._tag === 'h2')
    const messageElement = modalDiv._children.find(child => child._tag === 'p')

    // assertEquals(titleElement && titleElement._content === title, true, "TestModalInfo_Basic: Title should be displayed.");
    // assertEquals(messageElement && messageElement._content === message, true, "TestModalInfo_Basic: Message should be displayed.");
    // These assertions are commented out as the current mock $ doesn't populate _content of children based on $1, $2 from parent template.
    // We'll rely on the presence of the modal and its buttons for now.

    // 3. Check for "Close" button (modalInfo has a "close" button, not "ok")
    const closeButton = modalDiv.$("button[close]")
    assertEquals(closeButton !== null && closeButton !== undefined, true, "TestModalInfo_Basic: Close button should exist.")
    assertEquals(closeButton._attributes.hasOwnProperty("close"), true, "TestModalInfo_Basic: Close button should have 'close' attribute.")


    // 4. Simulate click on "Close" button
    closeButton.click()

    // 5. Assert that the modal is removed
    // The modal-wrapper should be removed from the body
    assertEquals(modalWrapper._removed, true, "TestModalInfo_Basic: Modal wrapper should be marked as removed.")
    assertEquals(mockDocument.body._children.includes(modalWrapper), false, "TestModalInfo_Basic: Modal wrapper should be removed from body children.")

    return true // Test passed
  },

  function testModalConfirm_ConfirmAction() {
    resetMocks();
    setupLoadedFunctions();

    if (typeof modalConfirm !== 'function') {
      assertEquals(false, true, "TestModalConfirm_ConfirmAction: modalConfirm function was not loaded.");
      return false;
    }

    let callbackCalled = false;
    const mockCallback = () => {
      callbackCalled = true;
    };
    const message = "Are you sure?";

    modalConfirm(message, mockCallback);

    const modalWrapper = mockDocument.body._children.find(child => child._tag === "modal-wrapper");
    assertEquals(modalWrapper !== null, true, "TestModalConfirm_ConfirmAction: Modal wrapper should be created.");

    const modalDiv = modalWrapper._children.find(child => child._tag === "modal" && child._attributes.confirm);
    assertEquals(modalDiv !== null, true, "TestModalConfirm_ConfirmAction: Modal content (modal[confirm]) should exist.");

    const confirmButton = modalDiv.$("button[confirm]");
    assertEquals(confirmButton !== null, true, "TestModalConfirm_ConfirmAction: Confirm button should exist.");

    confirmButton.click();

    assertEquals(modalWrapper._removed, true, "TestModalConfirm_ConfirmAction: Modal wrapper should be removed after confirm.");
    assertEquals(callbackCalled, true, "TestModalConfirm_ConfirmAction: Callback should be called after confirm.");

    return true;
  },

  function testModalConfirm_CancelAction() {
    resetMocks();
    setupLoadedFunctions();

    if (typeof modalConfirm !== 'function') {
      assertEquals(false, true, "TestModalConfirm_CancelAction: modalConfirm function was not loaded.");
      return false;
    }

    let callbackCalled = false;
    const mockCallback = () => {
      callbackCalled = true; // This should not happen
    };
    const message = "Are you sure you want to cancel?";

    modalConfirm(message, mockCallback);

    const modalWrapper = mockDocument.body._children.find(child => child._tag === "modal-wrapper");
    assertEquals(modalWrapper !== null, true, "TestModalConfirm_CancelAction: Modal wrapper should be created.");

    const modalDiv = modalWrapper._children.find(child => child._tag === "modal" && child._attributes.confirm);
    assertEquals(modalDiv !== null, true, "TestModalConfirm_CancelAction: Modal content (modal[confirm]) should exist.");

    // In modals.js, the cancel button is button[cancel][close][alt]
    // My simple parser for attributes in $ mock might only get the first one.
    // Let's try finding by [cancel] attribute.
    const cancelButton = modalDiv.$("button[cancel]");
    assertEquals(cancelButton !== null, true, "TestModalConfirm_CancelAction: Cancel button should exist.");

    // Optional: Check if it also has 'close' and 'alt' if the parser/mock was more advanced
    // assertEquals(cancelButton._attributes.hasOwnProperty("close"), true, "TestModalConfirm_CancelAction: Cancel button should have 'close' attribute.");
    // assertEquals(cancelButton._attributes.hasOwnProperty("alt"), true, "TestModalConfirm_CancelAction: Cancel button should have 'alt' attribute.");


    cancelButton.click();

    assertEquals(modalWrapper._removed, true, "TestModalConfirm_CancelAction: Modal wrapper should be removed after cancel.");
    assertEquals(callbackCalled, false, "TestModalConfirm_CancelAction: Callback should NOT be called after cancel.");

    return true;
  },

  function testModalError_BasicDisplayAndDismiss() {
    resetMocks();
    setupLoadedFunctions();

    if (typeof modalError !== 'function') {
      assertEquals(false, true, "TestModalError_Basic: modalError function was not loaded.");
      return false;
    }

    const errorMessage = "This is an error message.";
    modalError(errorMessage);

    const modalWrapper = mockDocument.body._children.find(child => child._tag === "modal-wrapper");
    assertEquals(modalWrapper !== null, true, "TestModalError_Basic: Modal wrapper should be created.");

    const modalDiv = modalWrapper._children.find(child => child._tag === "modal" && child._attributes.error);
    assertEquals(modalDiv !== null, true, "TestModalError_Basic: Modal content (modal[error]) should exist.");

    // Check for content (simplified)
    // The actual message "error $1" is processed by flint. My mock $ puts args[0] into _content of currentParent.
    // For modalError, currentParent (the modalDiv) should get the message in its _content.
    // This depends on how the simple parser handles "error $1" line.
    // Current parser: currentParent._content = (currentParent._content || "") + args[0];
    if (modalDiv) {
         assertEquals(modalDiv._content && modalDiv._content.includes(errorMessage), true, "TestModalError_Basic: Error message should be in modal content.");
    }


    const closeButton = modalDiv.$("button[close]");
    assertEquals(closeButton !== null, true, "TestModalError_Basic: Close button should exist.");
    assertEquals(closeButton._attributes.hasOwnProperty("close"), true, "TestModalError_Basic: Close button should have 'close' attribute.");
    // assertEquals(closeButton._content === "Okay", true, "TestModalError_Basic: Close button should have text 'Okay'."); // My parser puts this in _content

    closeButton.click();

    assertEquals(modalWrapper._removed, true, "TestModalError_Basic: Modal wrapper should be removed after close.");
    assertEquals(mockDocument.body._children.includes(modalWrapper), false, "TestModalError_Basic: Modal wrapper should be removed from body children.");

    return true;
  },

  function testAlertInfo_SingleAlert_DisappearsOnTimeout() {
    resetMocks();
    setupLoadedFunctions();

    if (typeof alertInfo !== 'function') {
      assertEquals(false, true, "TestAlertInfo_Single: alertInfo function was not loaded.");
      return false;
    }

    const message = "This is an info alert.";
    alertInfo(message);

    const alertWrapper = mockDocument.body._children.find(child => child._tag === "alert-wrapper");
    assertEquals(alertWrapper !== null, true, "TestAlertInfo_Single: Alert wrapper should be created.");

    const alertElement = alertWrapper._children.find(child => child._tag === "alert");
    assertEquals(alertElement !== null, true, "TestAlertInfo_Single: Alert element should exist in wrapper.");
    // Based on simplified parser, message should be in alertElement._content
    assertEquals(alertElement._content && alertElement._content.includes(message), true, "TestAlertInfo_Single: Alert message should be in alert element.");

    assertEquals(typeof mockSetTimeoutCallback, 'function', "TestAlertInfo_Single: setTimeout should have been called.");

    // Simulate timeout
    if (mockSetTimeoutCallback) {
      mockSetTimeoutCallback();
    }
    assertEquals(alertWrapper._removed, true, "TestAlertInfo_Single: Alert wrapper should be removed after timeout.");
    assertEquals(mockDocument.body._children.includes(alertWrapper), false, "TestAlertInfo_Single: Alert wrapper should be removed from body children.");

    return true;
  },

  function testAlertInfo_MultipleAlerts_AppendAndClearPreviousTimeout() {
    resetMocks();
    setupLoadedFunctions();

    if (typeof alertInfo !== 'function') {
      assertEquals(false, true, "TestAlertInfo_Multiple: alertInfo function was not loaded.");
      return false;
    }

    const message1 = "First alert.";
    alertInfo(message1);

    const alertWrapper1 = mockDocument.body._children.find(child => child._tag === "alert-wrapper");
    assertEquals(alertWrapper1 !== null, true, "TestAlertInfo_Multiple: First alert wrapper should be created.");
    const alertElement1 = alertWrapper1._children.find(child => child._tag === "alert");
    assertEquals(alertElement1 !== null, true, "TestAlertInfo_Multiple: First alert element should exist.");

    const firstTimeoutId = mockTimeoutId; // mockSetTimeout returns this
    const oldSetTimeoutCallback = mockSetTimeoutCallback; // Save the first callback

    const message2 = "Second alert.";
    alertInfo(message2); // This should clear the first timeout and set a new one

    const alertWrapper2 = mockDocument.body._children.find(child => child._tag === "alert-wrapper");
    assertEquals(alertWrapper1 === alertWrapper2, true, "TestAlertInfo_Multiple: Alert wrapper should be the same for multiple alerts.");

    // Corrected assertion: Expect 2 children. If this fails, it means appendChild on existing wrapper failed.
    assertEquals(alertWrapper2._children.length, 2, "TestAlertInfo_Multiple: Alert wrapper should contain two alert elements.");

    const alertElement2 = alertWrapper2._children.length === 2 ? alertWrapper2._children[1] : undefined; // Second alert, handle if not found
    assertEquals(alertElement2 !== undefined, true, "TestAlertInfo_Multiple: Second alert element object should exist.");
    if (alertElement2) { // Only access properties if alertElement2 exists
        assertEquals(alertElement2._tag === "alert", true, "TestAlertInfo_Multiple: Second alert element should have correct tag.");
        assertEquals(alertElement2._content && alertElement2._content.includes(message2), true, "TestAlertInfo_Multiple: Second alert message should be correct.");
    }

    assertEquals(lastClearedTimeoutId, firstTimeoutId, "TestAlertInfo_Multiple: Previous timeout should have been cleared.");
    assertEquals(typeof mockSetTimeoutCallback, 'function', "TestAlertInfo_Multiple: New setTimeout should have been called for the second alert.");
    assertEquals(mockSetTimeoutCallback !== oldSetTimeoutCallback, true, "TestAlertInfo_Multiple: A new timeout callback should be set.");


    // Simulate new timeout for the second alert
    if (mockSetTimeoutCallback) {
      mockSetTimeoutCallback();
    }
    assertEquals(alertWrapper2._removed, true, "TestAlertInfo_Multiple: Alert wrapper should be removed after the latest timeout.");

    return true;
  },

  function testAlertError_BasicDisplayClickAndTimeout() {
    resetMocks();
    setupLoadedFunctions();

    if (typeof alertError !== 'function') {
      assertEquals(false, true, "TestAlertError_Basic: alertError function was not loaded.");
      return false;
    }

    const testErrorMessageContent = "This is an error alert.";
    const testStateError = "Detailed error from state";
    mockState.most_recent_error = testStateError;
    mockDebugLog.length = 0; // Clear debug log before action

    alertError(testErrorMessageContent);

    const alertWrapper = mockDocument.body._children.find(child => child._tag === "alert-wrapper");
    assertEquals(alertWrapper !== null, true, "TestAlertError_Basic: Alert wrapper should be created.");

    const alertElement = alertWrapper._children.find(child => child._tag === "alert");
    assertEquals(alertElement !== null, true, "TestAlertError_Basic: Alert element should exist in wrapper.");

    // Check content. The template is "alert \n error $1".
    // Parser makes 'alert' the newElement. Then processes "error $1".
    // currentParent for "error $1" should be 'alert' element itself.
    assertEquals(alertElement._content && alertElement._content.includes(testErrorMessageContent), true, "TestAlertError_Basic: Alert error message content should be correct.");

    // Simulate click on the alert element
    alertElement.click();
    assertEquals(mockDebugLog.length, 1, "TestAlertError_Basic: debug should have been called once after click.");
    if (mockDebugLog.length > 0) {
      assertEquals(mockDebugLog[0][0], testStateError, "TestAlertError_Basic: debug should be called with state.most_recent_error.");
    }

    // Check timeout behavior (same as alertInfo)
    assertEquals(typeof mockSetTimeoutCallback, 'function', "TestAlertError_Basic: setTimeout should have been called.");
    if (mockSetTimeoutCallback) {
      mockSetTimeoutCallback();
    }
    assertEquals(alertWrapper._removed, true, "TestAlertError_Basic: Alert wrapper should be removed after timeout.");
    assertEquals(mockDocument.body._children.includes(alertWrapper), false, "TestAlertError_Basic: Alert wrapper should be removed from body children.");

    return true;
  }
];

// Run all tests in this file
runTests("modals.test.js", testsToRun)
