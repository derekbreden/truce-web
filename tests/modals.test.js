const path = require("path")
const { loadClientScript, createMockDocument, createMockWindow } = require("./testHelpers")
const { assertEquals, runTests } = require("./testUtils")

// Global Variables for Mocks and Loaded Functions
let mockDocumentInstance, mockWindowInstance, $, modalConfirm, modalInfo, modalError, alertInfo, alertError;
let mockSetTimeoutCallback = null;
let mockTimeoutId = 123; // Dummy ID
let lastClearedTimeoutId = null;
let mockState = { most_recent_error: null };
let mockDebugLog = [];

// --- Mocks ---
const mockDebug = (...args) => mockDebugLog.push(args);
const mockSetTimeout = (callback, duration) => {
  mockSetTimeoutCallback = callback;
  return mockTimeoutId;
};
const mockClearTimeout = (id) => {
  if (id === mockTimeoutId) {
    mockSetTimeoutCallback = null;
  }
  lastClearedTimeoutId = id;
};

// --- Initial Setup (executed once) ---
mockDocumentInstance = createMockDocument();
mockWindowInstance = createMockWindow(mockDocumentInstance);
mockState = { most_recent_error: null }; // Already declared, ensure it's reset here if needed
mockDebugLog = []; // Already declared, ensure it's reset here

// Load client/flint.js
const flintPath = path.resolve(__dirname, "../client/flint.js");
$ = loadClientScript(flintPath, { document: mockDocumentInstance, window: mockWindowInstance }, "$");

// Update mockWindowInstance with loaded flint $ and other mocks
mockWindowInstance.$ = $;
mockWindowInstance.debug = mockDebug;
mockWindowInstance.state = mockState;
mockWindowInstance.setTimeout = mockSetTimeout;
mockWindowInstance.clearTimeout = mockClearTimeout;
// mockWindowInstance.document is already set by createMockWindow

// Load functions from client/modals.js
const modalsScriptPath = path.join(__dirname, "../client/modals.js");
const functionsToLoad = ["modalConfirm", "modalInfo", "modalError", "alertInfo", "alertError"];
const loadedFunctions = loadClientScript(modalsScriptPath, mockWindowInstance, functionsToLoad);

if (loadedFunctions) {
  modalConfirm = loadedFunctions.modalConfirm;
  modalInfo = loadedFunctions.modalInfo;
  modalError = loadedFunctions.modalError;
  alertInfo = loadedFunctions.alertInfo;
  alertError = loadedFunctions.alertError;
} else {
  console.error("Failed to load functions from modals.js. Check loadClientScript and path:", modalsScriptPath);
  // Initialize to undefined to prevent tests from using potentially stale/incorrect functions
  modalConfirm = undefined;
  modalInfo = undefined;
  modalError = undefined;
  alertInfo = undefined;
  alertError = undefined;
}


// Function to reset mocks before each test
const resetMocks = () => {
  // Clear the mockDocumentInstance.body's children
  if (mockDocumentInstance && mockDocumentInstance.body && mockDocumentInstance.body.children) {
    for (let i = mockDocumentInstance.body.children.length - 1; i >= 0; i--) {
      const child = mockDocumentInstance.body.children[i];
      if (typeof child.remove === 'function') {
        child.remove();
      } else if (typeof mockDocumentInstance.body.removeChild === 'function') {
        // Fallback for environments where child.remove might not be present (though our mock should have it)
        mockDocumentInstance.body.removeChild(child);
      }
    }
  }

  mockSetTimeoutCallback = null;
  lastClearedTimeoutId = null;
  if (mockState) { // Ensure mockState is defined before trying to set a property
    mockState.most_recent_error = null;
  } else {
    // This case should ideally not happen if mockState is initialized globally
    mockState = { most_recent_error: null };
  }
  mockDebugLog.length = 0;
};


// Placeholder for test functions
const testsToRun = [
  function testModalInfo_BasicDisplayAndDismiss() {
    resetMocks(); // Ensure this is at the top

    // Defensive check for modalInfo function
    if (typeof modalInfo !== 'function') {
      assertEquals(true, false, "TestModalInfo_Basic: modalInfo function was not loaded correctly.");
      return false;
    }

    const testMessage = "This is an info message.";
    modalInfo(testMessage);

    const $modalWrapper = mockDocumentInstance.body.$("modal-wrapper");
    assertEquals(true, !!$modalWrapper, "TestModalInfo_Basic: Modal wrapper should be created.");
    if (!$modalWrapper) {
      console.error("TestModalInfo_Basic: Modal wrapper not found. Document body:", mockDocumentInstance.body.innerHTML);
      return false; // Guard
    }

    const $modalDiv = $modalWrapper.$("modal[info]");
    assertEquals(true, !!$modalDiv, "TestModalInfo_Basic: Modal content (modal[info]) should exist in wrapper.");
    if (!$modalDiv) {
      console.error("TestModalInfo_Basic: Modal div (modal[info]) not found. Wrapper content:", $modalWrapper.innerHTML);
      return false; // Guard
    }

    // Verify message content
    // modalInfo template is "info $1", where $1 is the message. Flint creates <info>message</info>
    const $infoElement = $modalDiv.$("info");
    assertEquals(true, !!$infoElement, "TestModalInfo_Basic: Info element containing the message should exist.");
    if ($infoElement) {
      assertEquals(testMessage, $infoElement.innerText, "TestModalInfo_Basic: Message content should be correct.");
    } else {
      console.error("TestModalInfo_Basic: Info element not found. Modal div content:", $modalDiv.innerHTML);
      return false; // Guard
    }

    // Verify "Okay" button
    const $closeButton = $modalDiv.$("button[close]");
    assertEquals(true, !!$closeButton, "TestModalInfo_Basic: Okay button should exist.");
    if ($closeButton) {
      assertEquals("Okay", $closeButton.innerText.trim(), "TestModalInfo_Basic: Button text should be 'Okay'.");

      // Simulate click
      if ($closeButton.eventListeners && $closeButton.eventListeners['click'] && $closeButton.eventListeners['click'].length > 0) {
        $closeButton.eventListeners['click'].forEach(handler => handler({ preventDefault: () => {} }));
      } else {
        console.error("TestModalInfo_Basic: Close button has no click listeners. Button:", $closeButton);
        assertEquals(true, false, "TestModalInfo_Basic: Close button has no click listeners.");
        return false;
      }
    } else {
      console.error("TestModalInfo_Basic: Close button not found. Modal div content:", $modalDiv.innerHTML);
      return false; // Guard if button not found
    }

    // Assert that the modal is removed
    assertEquals(null, mockDocumentInstance.body.$("modal-wrapper"), "TestModalInfo_Basic: Modal wrapper should be removed from body after close.");

    return true; // Test passed
  },

  function testModalConfirm_ConfirmAction() {
    resetMocks();

    if (typeof modalConfirm !== 'function') {
      assertEquals(true, false, "TestModalConfirm_ConfirmAction: modalConfirm function was not loaded.");
      return false;
    }

    let callbackCalled = false;
    const mockCallback = () => { callbackCalled = true; };
    const testMessage = "Are you sure you want to proceed?";

    modalConfirm(testMessage, mockCallback);

    const $modalWrapper = mockDocumentInstance.body.$("modal-wrapper");
    assertEquals(true, !!$modalWrapper, "TestModalConfirm_ConfirmAction: Modal wrapper should be created.");
    if (!$modalWrapper) { console.error("ConfirmAction: No modal wrapper. Body:", mockDocumentInstance.body.innerHTML); return false; }

    const $modalDiv = $modalWrapper.$("modal[confirm]");
    assertEquals(true, !!$modalDiv, "TestModalConfirm_ConfirmAction: Modal content (modal[confirm]) should exist.");
    if (!$modalDiv) { console.error("ConfirmAction: No modal div. Wrapper:", $modalWrapper.innerHTML); return false; }

    assertEquals(true, $modalDiv.innerText.includes(testMessage), "TestModalConfirm_ConfirmAction: Message content should be correct in modal div.");

    const $confirmButton = $modalDiv.$("button[confirm]");
    assertEquals(true, !!$confirmButton, "TestModalConfirm_ConfirmAction: Confirm button should exist.");
    if (!$confirmButton) { console.error("ConfirmAction: No confirm button. Modal div:", $modalDiv.innerHTML); return false; }
    assertEquals("Yes, I am sure", $confirmButton.innerText.trim(), "TestModalConfirm_ConfirmAction: Confirm button text incorrect.");

    // Simulate click
    if ($confirmButton.eventListeners && $confirmButton.eventListeners['click'] && $confirmButton.eventListeners['click'].length > 0) {
      $confirmButton.eventListeners['click'].forEach(handler => handler({ preventDefault: () => {} }));
    } else {
      console.error("ConfirmAction: Confirm button has no click listeners. Button:", $confirmButton);
      assertEquals(true, false, "TestModalConfirm_ConfirmAction: Confirm button has no click listeners.");
      return false;
    }

    assertEquals(true, callbackCalled, "TestModalConfirm_ConfirmAction: Callback should be called after confirm.");
    assertEquals(null, mockDocumentInstance.body.$("modal-wrapper"), "TestModalConfirm_ConfirmAction: Modal wrapper should be removed after confirm.");

    return true;
  },

  function testModalConfirm_CancelAction() {
    resetMocks();

    if (typeof modalConfirm !== 'function') {
      assertEquals(true, false, "TestModalConfirm_CancelAction: modalConfirm function was not loaded.");
      return false;
    }

    let callbackCalled = false;
    const mockCallback = () => { callbackCalled = true; };
    const testMessage = "Are you sure you want to cancel?";

    modalConfirm(testMessage, mockCallback);

    const $modalWrapper = mockDocumentInstance.body.$("modal-wrapper");
    assertEquals(true, !!$modalWrapper, "TestModalConfirm_CancelAction: Modal wrapper should be created.");
    if (!$modalWrapper) { console.error("CancelAction: No modal wrapper. Body:", mockDocumentInstance.body.innerHTML); return false; }

    const $modalDiv = $modalWrapper.$("modal[confirm]");
    assertEquals(true, !!$modalDiv, "TestModalConfirm_CancelAction: Modal content (modal[confirm]) should exist.");
    if (!$modalDiv) { console.error("CancelAction: No modal div. Wrapper:", $modalWrapper.innerHTML); return false; }

    assertEquals(true, $modalDiv.innerText.includes(testMessage), "TestModalConfirm_CancelAction: Message content should be correct.");

    const $cancelButton = $modalDiv.$("button[cancel]");
    assertEquals(true, !!$cancelButton, "TestModalConfirm_CancelAction: Cancel button should exist.");
    if (!$cancelButton) { console.error("CancelAction: No cancel button. Modal div:", $modalDiv.innerHTML); return false; }
    assertEquals("Cancel", $cancelButton.innerText.trim(), "TestModalConfirm_CancelAction: Cancel button text incorrect.");

    // Simulate click
    if ($cancelButton.eventListeners && $cancelButton.eventListeners['click'] && $cancelButton.eventListeners['click'].length > 0) {
      $cancelButton.eventListeners['click'].forEach(handler => handler({ preventDefault: () => {} }));
    } else {
      console.error("CancelAction: Cancel button has no click listeners. Button:", $cancelButton);
      assertEquals(true, false, "TestModalConfirm_CancelAction: Cancel button has no click listeners.");
      return false;
    }

    assertEquals(false, callbackCalled, "TestModalConfirm_CancelAction: Callback should NOT be called after cancel.");
    assertEquals(null, mockDocumentInstance.body.$("modal-wrapper"), "TestModalConfirm_CancelAction: Modal wrapper should be removed after cancel.");

    return true;
  },

  function testModalError_BasicDisplayAndDismiss() {
    resetMocks();

    if (typeof modalError !== 'function') {
      assertEquals(true, false, "TestModalError_Basic: modalError function was not loaded.");
      return false;
    }

    const testErrorMessage = "This is a test error message.";
    modalError(testErrorMessage);

    const $modalWrapper = mockDocumentInstance.body.$("modal-wrapper");
    assertEquals(true, !!$modalWrapper, "TestModalError_Basic: Modal wrapper should be created.");
    if (!$modalWrapper) { console.error("ModalError_Test: No modal wrapper. Body:", mockDocumentInstance.body.innerHTML); return false; }

    const $modalDiv = $modalWrapper.$("modal[error]");
    assertEquals(true, !!$modalDiv, "TestModalError_Basic: Modal content (modal[error]) should exist.");
    if (!$modalDiv) { console.error("ModalError_Test: No modal div. Wrapper:", $modalWrapper.innerHTML); return false; }

    // Verify error message content
    // modalError template is "error $1", where $1 is the message. Flint creates <error>message</error>
    const $errorElement = $modalDiv.$("error");
    assertEquals(true, !!$errorElement, "TestModalError_Basic: Error element containing the message should exist.");
    if ($errorElement) {
      assertEquals(testErrorMessage, $errorElement.innerText, "TestModalError_Basic: Error message content should be correct.");
    } else {
      console.error("ModalError_Test: Error element not found. Modal div:", $modalDiv.innerHTML);
      return false; // Guard
    }

    // Verify "Okay" button
    const $closeButton = $modalDiv.$("button[close]");
    assertEquals(true, !!$closeButton, "TestModalError_Basic: Okay button should exist.");
    if ($closeButton) {
      assertEquals("Okay", $closeButton.innerText.trim(), "TestModalError_Basic: Button text should be 'Okay'.");

      // Simulate click
      if ($closeButton.eventListeners && $closeButton.eventListeners['click'] && $closeButton.eventListeners['click'].length > 0) {
        $closeButton.eventListeners['click'].forEach(handler => handler({ preventDefault: () => {} }));
      } else {
        console.error("ModalError_Test: Close button has no click listeners. Button:", $closeButton);
        assertEquals(true, false, "TestModalError_Basic: Close button has no click listeners.");
        return false;
      }
    } else {
      console.error("ModalError_Test: Close button not found. Modal div:", $modalDiv.innerHTML);
      return false; // Guard if button not found
    }

    // Assert that the modal is removed
    assertEquals(null, mockDocumentInstance.body.$("modal-wrapper"), "TestModalError_Basic: Modal wrapper should be removed from body after close.");

    return true; // Test passed
  },

  function testAlertInfo_SingleAlert_DisappearsOnTimeout() {
    resetMocks();

    if (typeof alertInfo !== 'function') {
      assertEquals(true, false, "TestAlertInfo_Single: alertInfo function was not loaded.");
      return false;
    }

    const testMessage = "This is an info alert.";
    alertInfo(testMessage);

    const $alertWrapper = mockDocumentInstance.body.$("alert-wrapper");
    assertEquals(true, !!$alertWrapper, "TestAlertInfo_Single: Alert wrapper should be created.");
    if (!$alertWrapper) { console.error("SingleAlert: No alert wrapper. Body:", mockDocumentInstance.body.innerHTML); return false; }

    const $alertElement = $alertWrapper.$("alert");
    assertEquals(true, !!$alertElement, "TestAlertInfo_Single: Alert element should exist in wrapper.");
    if (!$alertElement) { console.error("SingleAlert: No alert element. Wrapper:", $alertWrapper.innerHTML); return false; }

    const $infoElement = $alertElement.$("info");
    assertEquals(true, !!$infoElement, "TestAlertInfo_Single: Info element should exist in alert.");
    if($infoElement) {
      assertEquals(testMessage, $infoElement.innerText, "TestAlertInfo_Single: Alert message should be correct.");
    } else {
      console.error("SingleAlert: No info element in alert. Alert:", $alertElement.innerHTML);
      return false;
    }

    assertEquals('function', typeof mockSetTimeoutCallback, "TestAlertInfo_Single: setTimeout should have been called.");

    if (mockSetTimeoutCallback) {
      mockSetTimeoutCallback(); // Simulate timeout
    } else {
      assertEquals(true, false, "TestAlertInfo_Single: mockSetTimeoutCallback was not set.");
      return false;
    }

    assertEquals(null, mockDocumentInstance.body.$("alert-wrapper"), "TestAlertInfo_Single: Alert wrapper should be removed after timeout.");
    return true;
  },

  function testAlertInfo_MultipleAlerts_AppendAndClearPreviousTimeout() {
    resetMocks();

    if (typeof alertInfo !== 'function') {
      assertEquals(true, false, "TestAlertInfo_Multiple: alertInfo function was not loaded.");
      return false;
    }

    const message1 = "First alert.";
    alertInfo(message1);

    let $alertWrapper = mockDocumentInstance.body.$("alert-wrapper");
    assertEquals(true, !!$alertWrapper, "TestAlertInfo_Multiple: First alert wrapper should be created.");
    if (!$alertWrapper) { console.error("MultipleAlerts: No initial alert wrapper. Body:", mockDocumentInstance.body.innerHTML); return false; }

    const $alertElement1 = $alertWrapper.$("alert");
    assertEquals(true, !!$alertElement1, "TestAlertInfo_Multiple: First alert element should exist.");
    if (!$alertElement1) { console.error("MultipleAlerts: No first alert element. Wrapper:", $alertWrapper.innerHTML); return false; }
    const $infoElement1 = $alertElement1.$("info");
    assertEquals(true, !!$infoElement1, "TestAlertInfo_Multiple: Info for first alert should exist.");
    if($infoElement1) assertEquals(message1, $infoElement1.innerText, "TestAlertInfo_Multiple: First alert message should be correct.");


    const firstTimeoutIdVal = mockTimeoutId;
    const oldSetTimeoutCallback = mockSetTimeoutCallback;

    const message2 = "Second alert.";
    alertInfo(message2);

    $alertWrapper = mockDocumentInstance.body.$("alert-wrapper");
    assertEquals(true, !!$alertWrapper, "TestAlertInfo_Multiple: Alert wrapper should still exist.");
    if (!$alertWrapper) { console.error("MultipleAlerts: Alert wrapper disappeared unexpectedly. Body:", mockDocumentInstance.body.innerHTML); return false; }

    const $alertElements = $alertWrapper.querySelectorAll("alert");
    assertEquals(2, $alertElements.length, "TestAlertInfo_Multiple: Alert wrapper should contain two alert elements.");

    if ($alertElements.length === 2) {
      const $infoElement2 = $alertElements[1].$("info");
      assertEquals(true, !!$infoElement2, "TestAlertInfo_Multiple: Info element for second alert should exist.");
      if($infoElement2) {
        assertEquals(message2, $infoElement2.innerText, "TestAlertInfo_Multiple: Second alert message should be correct.");
      } else {
        console.error("MultipleAlerts: No info element in second alert. Second alert:", $alertElements[1].innerHTML);
        return false;
      }
    } else {
      console.error("MultipleAlerts: Did not find 2 alert elements. Wrapper:", $alertWrapper.innerHTML);
      assertEquals(true, false, "TestAlertInfo_Multiple: Did not find 2 alert elements."); return false;
    }

    assertEquals(firstTimeoutIdVal, lastClearedTimeoutId, "TestAlertInfo_Multiple: Previous timeout ID (" + firstTimeoutIdVal + ") should have been cleared (" + lastClearedTimeoutId + ").");
    assertEquals('function', typeof mockSetTimeoutCallback, "TestAlertInfo_Multiple: New setTimeout should have been called for the second alert.");
    assertEquals(true, mockSetTimeoutCallback !== oldSetTimeoutCallback, "TestAlertInfo_Multiple: A new timeout callback should be set.");

    if (mockSetTimeoutCallback) {
      mockSetTimeoutCallback();
    } else {
       assertEquals(true, false, "TestAlertInfo_Multiple: mockSetTimeoutCallback was not set for second alert."); return false;
    }

    assertEquals(null, mockDocumentInstance.body.$("alert-wrapper"), "TestAlertInfo_Multiple: Alert wrapper should be removed after the latest timeout.");
    return true;
  },

  function testAlertError_BasicDisplayClickAndTimeout() {
    resetMocks(); // This will clear mockDebugLog and mockState.most_recent_error

    if (typeof alertError !== 'function') {
      assertEquals(true, false, "TestAlertError_Basic: alertError function was not loaded.");
      return false;
    }

    const testErrorMessageContent = "This is an error alert message.";
    const testStateErrorDetails = "Detailed error from state for this test";
    mockState.most_recent_error = testStateErrorDetails; // Set it for this test after resetMocks

    alertError(testErrorMessageContent);

    const $alertWrapper = mockDocumentInstance.body.$("alert-wrapper");
    assertEquals(true, !!$alertWrapper, "TestAlertError_Basic: Alert wrapper should be created.");
    if (!$alertWrapper) { console.error("AlertError_Test: No alert wrapper. Body:", mockDocumentInstance.body.innerHTML); return false; }

    const $alertElement = $alertWrapper.$("alert");
    assertEquals(true, !!$alertElement, "TestAlertError_Basic: Alert element should exist in wrapper.");
    if (!$alertElement) { console.error("AlertError_Test: No alert element. Wrapper:", $alertWrapper.innerHTML); return false; }

    const $errorContentElement = $alertElement.$("error");
    assertEquals(true, !!$errorContentElement, "TestAlertError_Basic: Error content element should exist.");
    if ($errorContentElement) {
      assertEquals(testErrorMessageContent, $errorContentElement.innerText, "TestAlertError_Basic: Alert error message content should be correct.");
    } else {
      console.error("AlertError_Test: No error content element in alert. Alert:", $alertElement.innerHTML);
      return false;
    }

    // Simulate click on the alert element itself
    if ($alertElement.eventListeners && $alertElement.eventListeners['click'] && $alertElement.eventListeners['click'].length > 0) {
      $alertElement.eventListeners['click'].forEach(handler => handler({ preventDefault: () => {} }));
    } else {
      console.error("AlertError_Test: Alert element has no click listeners. Alert:", $alertElement);
      assertEquals(true, false, "TestAlertError_Basic: Alert element has no click listeners.");
      return false;
    }

    assertEquals(1, mockDebugLog.length, "TestAlertError_Basic: debug should have been called once after click.");
    if (mockDebugLog.length > 0) {
      assertEquals(testStateErrorDetails, mockDebugLog[0][0], "TestAlertError_Basic: debug should be called with state.most_recent_error.");
    } else {
      // This case implies the previous assertion failed, but good for clarity
      assertEquals(true, false, "TestAlertError_Basic: mockDebugLog is empty after click.");
      return false;
    }

    // Check timeout behavior
    assertEquals('function', typeof mockSetTimeoutCallback, "TestAlertError_Basic: setTimeout should have been called.");
    if (mockSetTimeoutCallback) {
      mockSetTimeoutCallback(); // Simulate timeout
    } else {
      assertEquals(true, false, "TestAlertError_Basic: mockSetTimeoutCallback was not set for alertError.");
      return false;
    }

    assertEquals(null, mockDocumentInstance.body.$("alert-wrapper"), "TestAlertError_Basic: Alert wrapper should be removed after timeout.");

    return true;
  }
];

// Run all tests in this file
runTests("modals.test.js", testsToRun)
