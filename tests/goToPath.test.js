const { loadClientScript, createMockDollar, createMockDocument, createMockWindow, createMockFunction } = require('./testHelpers');
const { assertEquals, runTests } = require('./testUtils');
const path = require('path'); // Needed for path.resolve if used, though not directly in this refactor immediately

// --- Mock Instances (created once) ---
const mockLocalStorage = {
  getItem: createMockFunction('localStorage.getItem'),
  setItem: createMockFunction('localStorage.setItem'),
  removeItem: createMockFunction('localStorage.removeItem'),
};
const mockHistory = {
  pushState: createMockFunction('history.pushState'),
};
const mockModalInfo = createMockFunction('modalInfo');
const mockLoadingPage = createMockFunction('loadingPage');
const mockStartSession = createMockFunction('startSession');
const mock$ = createMockDollar(); // From testHelpers.js
// This mock$ is for simulating Flint's `$` library. It's distinct from
// mockWindow and mockDocument, which are manually created below to mock the
// global browser environment for the goToPath.js script.

const mockState = {
  path: '', // Initialized in setupMocksAndState
  cache: {}, // Initialized in setupMocksAndState
  path_index: 0, // Initialized in setupMocksAndState
  path_history: [], // Initialized in setupMocksAndState, will get toReversed property
  ws: {
    send: createMockFunction('ws.send'),
  },
  active_add_new_comment: null, // Initialized in setupMocksAndState
  active_add_new_topic: null, // Initialized in setupMocksAndState
};

let mockPathSequence = []; // Initialized in setupMocksAndState
// mockWindow and mockDocument will be initialized by helper functions in setupMocksAndState
let mockWindow;
let mockDocument;


// Function to reset all mocks and state before each test
const setupMocksAndState = () => {
  // Reset properties of existing mock objects
  mockLocalStorage.getItem.reset();
  mockLocalStorage.getItem.customBehavior = null; // Clear previous custom behavior
  mockLocalStorage.getItem.returnValue = null; // Default return value
  mockLocalStorage.setItem.reset();
  mockLocalStorage.removeItem.reset();

  mockHistory.pushState.reset();

  mockModalInfo.reset();
  mockLoadingPage.reset();
  mockStartSession.reset();
  mock$.reset(); // createMockDollar has its own reset method

  // Reset state object properties
  mockState.path = '/initial-path';
  mockState.cache = {};
  mockState.path_index = 0;
  mockState.path_history = [];
  // Polyfill/mock toReversed for path_history if it doesn't exist (for Node < 20)
  if (!mockState.path_history.toReversed) {
    mockState.path_history.toReversed = function() {
      return [...this].reverse();
    };
  }
  mockState.ws.send.reset();
  mockState.active_add_new_comment = null;
  mockState.active_add_new_topic = null;

  // Re-initialize these as they might be structurally different or simpler to reset by replacement
  mockPathSequence.length = 0;
  mockPathSequence.push(...['/', '/topics', '/tags']); // Default

  // Initialize with helpers
  mockDocument = createMockDocument();
  mockWindow = createMockWindow(mockDocument);

  // Augment mockWindow with specific properties needed for goToPath.test.js
  mockWindow.local_storage_key = 'test_storage_key';
  mockWindow.location = {
    pathname: '/initial-path', // Will be reset by tests if needed
    hash: '',
    search: '',
  };
  // Override basic addEventListener/removeEventListener from createMockWindow if createMockFunction's tracking is preferred
  mockWindow.addEventListener = createMockFunction('window.addEventListener');
  mockWindow.removeEventListener = createMockFunction('window.removeEventListener');
  mockWindow.scrollTo = createMockFunction('window.scrollTo');
  mockWindow.$ = mock$;
  mockWindow.jQuery = mock$; // Alias

  // Augment mockDocument with specific properties needed for goToPath.test.js
  // createMockDocument provides createElement, getElementById, querySelectorAll, body, head.
  // Override addEventListener/removeEventListener if createMockFunction's tracking is preferred
  mockDocument.addEventListener = createMockFunction('document.addEventListener');
  mockDocument.removeEventListener = createMockFunction('document.removeEventListener');

  // Potentially override methods on document.body and document.head if specific mock function instances are needed
  // createMockDocument().body and .head are mock elements from createMockElement.
  // We need to ensure their methods are the createMockFunction instances for test assertions.
  mockDocument.head.appendChild = createMockFunction('document.head.appendChild');

  mockDocument.body.appendChild = createMockFunction('document.body.appendChild');
  mockDocument.body.removeChild = createMockFunction('document.body.removeChild');
  mockDocument.body.classList = { // createMockElement does not provide classList
      add: createMockFunction('document.body.classList.add'),
      remove: createMockFunction('document.body.classList.remove'),
  };

  // Ensure other document methods used by the script are available if not covered by createMockDocument
  // For example, if querySelectorAll from createMockFunction is preferred (it's not in this case, createMockDocument's is fine)
  // mockDocument.querySelectorAll = createMockFunction('document.querySelectorAll');
  // mockDocument.getElementById = createMockFunction('document.getElementById'); // Already provided by createMockDocument
  // mockDocument.createElement = createMockFunction('document.createElement'); // Already provided by createMockDocument
};

// Initial call to setupMocksAndState to populate mocks before loading the script
setupMocksAndState();

const goToPath = loadClientScript(
  __dirname + '/../client/goToPath.js', // Use __dirname for robustness
  {
    localStorage: mockLocalStorage, // Pass the single instance
    history: mockHistory,           // Pass the single instance
    modalInfo: mockModalInfo,         // Pass the single instance
    loadingPage: mockLoadingPage,       // Pass the single instance
    startSession: mockStartSession,     // Pass the single instance
    state: mockState,               // Pass the single instance
    path_sequence: mockPathSequence,   // Pass the single instance (array reference)
    window: mockWindow,             // Pass the single instance
    $: mock$,                       // Pass the single instance
    jQuery: mock$,
    document: mockDocument,           // Pass the single instance
  },
  'goToPath'
);

// --- Test Cases ---
function testNavigateToNewPath() {
  setupMocksAndState(); // Reset state of shared mocks, and reconfigure as needed for this test

  // Configure the shared mockLocalStorage for this specific test
  mockLocalStorage.getItem.customBehavior = (key) => {
    if (key === `${mockWindow.local_storage_key}:agreed`) {
      return 'true'; // Terms agreed
    }
    return null;
  };

  goToPath('/new-path', false, false);

  assertEquals(mockState.path, '/new-path', 'Should update state.path');
  assertEquals(mockHistory.pushState.called, true, 'history.pushState should be called');
  assertEquals(mockHistory.pushState.callCount, 1, 'history.pushState call count');
  assertEquals(mockHistory.pushState.calls[0][2], '/new-path', 'history.pushState path argument');
  assertEquals(mockState.path_index, 1, 'state.path_index should increment');


  assertEquals(mockLoadingPage.called, true, 'loadingPage should be called');
  assertEquals(JSON.stringify(mockLoadingPage.calls[0]), JSON.stringify([false, false, false]), 'loadingPage arguments');

  assertEquals(mockStartSession.called, true, 'startSession should be called');
  assertEquals(JSON.stringify(mockStartSession.calls[0]), JSON.stringify([false]), 'startSession arguments (was_same_path false)');

  assertEquals(mockState.ws.send.called, true, 'ws.send should be called');
  assertEquals(mockState.ws.send.calls[0][0], JSON.stringify({ path: '/new-path' }), 'ws.send arguments');
}

function testModalShownIfTermsNotAgreed() {
  setupMocksAndState();
  mockLocalStorage.getItem.customBehavior = (key) => {
    if (key === `${mockWindow.local_storage_key}:agreed`) return null; // Terms NOT agreed
    return null;
  };

  goToPath('/some-restricted-path', false, false);

  assertEquals(mockModalInfo.called, true, 'modalInfo should be called for restricted path without agreement');
  assertEquals(mockModalInfo.calls[0][0], 'Please tap "Join the Discussion" to agree to these terms.', 'modalInfo message');
  assertEquals(mockHistory.pushState.called, false, 'history.pushState should NOT be called');
  assertEquals(mockLoadingPage.called, false, 'loadingPage should NOT be called');
  assertEquals(mockStartSession.called, false, 'startSession should NOT be called');
}

function testUsesTopicsPreferenceFromLocalStorage() {
  setupMocksAndState();
  const preferredPath = '/topics/my-preferred-view';
  mockLocalStorage.getItem.customBehavior = (key) => {
    if (key === `${mockWindow.local_storage_key}:topics_preference`) return preferredPath;
    if (key === `${mockWindow.local_storage_key}:agreed`) return 'true'; // Terms agreed
    return null;
  };

  goToPath('/topics', false, false);

  assertEquals(mockState.path, preferredPath, 'state.path should be the preferred topics path');
  assertEquals(mockHistory.pushState.called, true, 'history.pushState should be called for preferred path');
  assertEquals(mockHistory.pushState.calls[0][2], preferredPath, 'history.pushState path argument for preferred path');
}

function testUpdatesScrollTopOfCachedPath() {
  setupMocksAndState();
  mockState.path = '/cached-path'; // Current path
  mockState.cache['/cached-path'] = { scroll_top: 0 };

  mockLocalStorage.getItem.customBehavior = (key) => { // Ensure terms agreed
    if (key === `${mockWindow.local_storage_key}:agreed`) return 'true';
    return null;
  };

  // Prime the mock$ to return an element with scrollTop: 100 for the specific selector
  mock$.primeElementProperties('main-content-wrapper[active]', { scrollTop: 100 });

  goToPath('/new-path-after-cache', false, false);

  // This assertion is now expected to pass due to the priming mechanism.
  assertEquals(mockState.cache['/cached-path'].scroll_top, 100, 'Scroll top of cached path should be updated to 100');
}


function testHandlesTagPathAsActionTags() {
  setupMocksAndState();
   mockLocalStorage.getItem.customBehavior = (key) => { // Ensure terms agreed
    if (key === `${mockWindow.local_storage_key}:agreed`) return 'true';
    return null;
  };
  // path_sequence is ['/', '/topics', '/tags']
  // current state.path = '/initial-path' (not in sequence, so previous_sequence = -1)
  // new_path = '/tag/some-tag', new_path_parsed = '/tags' (index 2 in sequence)
  // clicked_back logic: next_sequence (2) !== -1 && previous_sequence (-1) === -1.
  // This part of logic doesn't set clicked_back = true by itself.
  // It then checks most_recent_sequence_page. Assume path_history is empty or doesn't meet criteria.
  // So, clicked_back should remain false.

  goToPath('/tag/some-tag', false, false);

  assertEquals(mockLoadingPage.called, true, 'loadingPage should be called for /tag/ path');
  // Arguments: loadingPage(false, skip_state, clicked_back)
  assertEquals(mockLoadingPage.calls[0][0], false, 'loadingPage arg1 (show_loading_animation) should be false');
  assertEquals(mockLoadingPage.calls[0][1], false, 'loadingPage arg2 (skip_state) should be false');
  assertEquals(mockLoadingPage.calls[0][2], false, 'loadingPage arg3 (clicked_back) should be false for this /tag/ scenario');
  assertEquals(mockState.path, '/tag/some-tag', 'state.path should be the new /tag/some-tag path');
}

function testClickedBackTrueForBackwardNavigationInSequence() {
  setupMocksAndState();
  mockState.path = '/topics'; // Current path (index 1 in mockPathSequence)
  // mockPathSequence is ['/', '/topics', '/tags'] by default from setupMocksAndState()
  // mockState.path is '/topics'

  mockLocalStorage.getItem.customBehavior = (key) => { // Ensure terms agreed
    if (key === `${mockWindow.local_storage_key}:agreed`) return 'true';
    return null;
  };

  goToPath('/', false, false); // Navigate to '/' (index 0)

  assertEquals(mockLoadingPage.called, true, 'loadingPage should be called');
  assertEquals(mockLoadingPage.calls[0][2], true, 'loadingPage clicked_back argument should be true for backward navigation');
}

function testClickedBackFalseForForwardNavigationInSequence() {
  setupMocksAndState();
  mockState.path = '/'; // Current path (index 0)
  // mockPathSequence is ['/', '/topics', '/tags'] by default

  mockLocalStorage.getItem.customBehavior = (key) => { // Ensure terms agreed
    if (key === `${mockWindow.local_storage_key}:agreed`) return 'true';
    return null;
  };

  goToPath('/topics', false, false); // Navigate to '/topics' (index 1)

  assertEquals(mockLoadingPage.called, true, 'loadingPage should be called');
  assertEquals(mockLoadingPage.calls[0][2], false, 'loadingPage clicked_back argument should be false for forward navigation');
}

function testFooterDotIndexSetCorrectly() {
  setupMocksAndState();
  mockState.path = '/some-other-page'; // A non-sequence page

  // Modify the shared mockPathSequence for this test
  mockPathSequence.length = 0;
  mockPathSequence.push(...['/', '/topics', '/tags', '/another']);

  mockLocalStorage.getItem.customBehavior = (key) => { // Ensure terms agreed
    if (key === `${mockWindow.local_storage_key}:agreed`) return 'true';
    return null;
  };

  goToPath('/topics', false, false); // '/topics' is at index 1

  goToPath('/topics', false, false); // '/topics' is at index 1 in mockPathSequence

  // Verify by checking the attributes of the mock element from mock$.calls
  // goToPath calls: $("footer dot").setAttribute("index", dot_index);
  // The mock$ instance used by goToPath is the one from its closure.
  // Elements created by it now have a setAttribute method (alias to attr).
  let footerDotCall = mock$.calls.find(call => call.originalSelector === 'footer dot');
  assertEquals(!!footerDotCall, true, 'call to $("footer dot") should have happened for /topics');
  if (footerDotCall) {
    assertEquals(footerDotCall.element.attributes['index'], 0, 'footer dot index attribute for /topics should be 0');
  }

  // Reset mock$.calls for the next part of the test, or filter more carefully.
  // For simplicity, we'll rely on finding the last relevant call if multiple exist,
  // or ensure calls are reset if necessary (setupMocksAndState does mock$.reset()).
  // Let's call setupMocksAndState again to be clean for the next goToPath call in the same test.
  // However, this also resets mockState.path, path_history etc. which might not be intended mid-test.
  // A more granular reset of mock$.calls or specific mock element states would be better.
  // For now, let's re-setup and re-navigate carefully.

  setupMocksAndState(); // Resets path, history, and mock$.calls
  mockState.path = '/some-other-page'; // Reset to a different page
  mockPathSequence.length = 0;
  mockPathSequence.push(...['/', '/topics', '/tags', '/another']);
  mockLocalStorage.getItem.customBehavior = (key) => {
    if (key === `${mockWindow.local_storage_key}:agreed`) return 'true';
    return null;
  };

  goToPath('/another', false, false); // '/another' is at index 3

  footerDotCall = mock$.calls.find(call => call.originalSelector === 'footer dot');
  assertEquals(!!footerDotCall, true, 'call to $("footer dot") should have happened for /another');
  if (footerDotCall) {
    // dot_index = Math.max(3 - 1, 0) = 2
    assertEquals(footerDotCall.element.attributes['index'], 2, 'footer dot index attribute for /another should be 2');
  }
}

function testStoresLastRootPathInLocalStorage() {
  setupMocksAndState();
   mockLocalStorage.getItem.customBehavior = (key) => { // Ensure terms agreed
    if (key === `${mockWindow.local_storage_key}:agreed`) return 'true';
    return null;
  };

  goToPath('/topics', false, false);
  assertEquals(mockLocalStorage.setItem.called, true, 'localStorage.setItem should be called');
  const setItemCall = mockLocalStorage.setItem.calls.find(call => call[0] === `${mockWindow.local_storage_key}:last_root_path`);
  assertEquals(!!setItemCall, true, 'last_root_path should be set in localStorage');
  assertEquals(setItemCall[1], '/topics', 'last_root_path value');

  mockLocalStorage.setItem.reset();
  goToPath('/tag/a-tag', false, false);
  const setItemCallTag = mockLocalStorage.setItem.calls.find(call => call[0] === `${mockWindow.local_storage_key}:last_root_path`);
  assertEquals(!!setItemCallTag, true, 'last_root_path should be set for /tag/ paths');
  assertEquals(setItemCallTag[1], '/tag/a-tag', 'last_root_path value for /tag/a-tag');

}

function testClearsActiveCommentAndTopicOnPathChange() {
  setupMocksAndState();
  mockState.path = '/current-path';
  mockState.active_add_new_comment = { text: 'some comment' };
  mockState.active_add_new_topic = { title: 'some topic' };
   mockLocalStorage.getItem.customBehavior = (key) => { // Ensure terms agreed
    if (key === `${mockWindow.local_storage_key}:agreed`) return 'true';
    return null;
  };

  goToPath('/new-path-different', false, false);

  assertEquals(mockState.active_add_new_comment, undefined, 'active_add_new_comment should be undefined');
  assertEquals(mockState.active_add_new_topic, undefined, 'active_add_new_topic should be undefined');
}

function testDoesNotClearItemsIfPathIsSame() {
  setupMocksAndState();
  mockState.path = '/current-path'; // Set current path in mockState
  const comment = { text: 'some comment' };
  const topic = { title: 'some topic' };
  mockState.active_add_new_comment = comment;
  mockState.active_add_new_topic = topic;
   mockLocalStorage.getItem.customBehavior = (key) => { // Ensure terms agreed
    if (key === `${mockWindow.local_storage_key}:agreed`) return 'true';
    return null;
  };

  goToPath('/current-path', false, false); // Navigate to the *same* path

  assertEquals(mockState.active_add_new_comment, comment, 'active_add_new_comment should not be cleared');
  assertEquals(mockState.active_add_new_topic, topic, 'active_add_new_topic should not be cleared');
  assertEquals(mockStartSession.called, true, 'startSession should be called');
  assertEquals(mockStartSession.calls[0][0], true, 'startSession was_same_path argument should be true');
}


// --- Run Tests ---
const allTests = [
  testNavigateToNewPath,
  testModalShownIfTermsNotAgreed,
  testUsesTopicsPreferenceFromLocalStorage,
  testUpdatesScrollTopOfCachedPath,
  testHandlesTagPathAsActionTags,
  testClickedBackTrueForBackwardNavigationInSequence,
  testClickedBackFalseForForwardNavigationInSequence,
  testFooterDotIndexSetCorrectly,
  testStoresLastRootPathInLocalStorage,
  testClearsActiveCommentAndTopicOnPathChange,
  testDoesNotClearItemsIfPathIsSame,
];

// The path_sequence used by goToPath.js is the one provided during loadClientScript.
// It's an array, so it's passed by reference. Tests can modify `mockPathSequence.length = 0; mockPathSequence.push(...);`
// which will affect the instance used by the loaded `goToPath` function.

runTests('client/goToPath.test.js', allTests);
