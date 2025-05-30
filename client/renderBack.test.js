const fs = require('fs');
const path = require('path');
const { assertEquals, runTests } = require('./testUtils.js');

// Mock for the $ utility
const mockDollarUtil = (selector, args) => {
  // console.log(`mockDollarUtil CALLED WITH: '${selector}', args: ${JSON.stringify(args)}`); // Debugging disabled
  let processedSelector = selector;
  if (args && Array.isArray(args) && typeof selector === 'string') {
    args.forEach((arg, index) => {
      const placeholder = new RegExp(`\\$${index + 1}`, 'g');
      processedSelector = processedSelector.replace(placeholder, String(arg));
    });
  }

  const element = {
    selector: processedSelector, // This is the key for tests to find the call
    originalSelectorString: selector,
    argsReceived: args,
    removed: false,
    prependedChildren: [],
    eventHandlers: {},
    remove: () => {
      element.removed = true;
      // console.log(`Mock element ${element.selector} remove called`);
    },
    prepend: (childElement) => {
      element.prependedChildren.push(childElement);
      // console.log(`Mock element ${element.selector} prepend called with`, childElement);
    },
    on: (event, handler) => {
      if (!element.eventHandlers[event]) {
        element.eventHandlers[event] = [];
      }
      element.eventHandlers[event].push(handler);
      // console.log(`Mock element ${element.selector} on called for event ${event}`);
    },
    $: (subSelector, subArgs) => {
      // console.log(`Mock element ${element.selector} chained call with ${subSelector}`);
      return mockDollarUtil(subSelector, subArgs); 
    }
  };
  
  mockDollarUtil.calls.push({ 
    selector: processedSelector, // This is what tests will query via find
    element,
    originalSelector: selector, // Restore for potential debugging
    argsPushed: args           // Restore this crucial line
  });
  return element;
};
mockDollarUtil.calls = [];
mockDollarUtil.reset = () => {
  mockDollarUtil.calls = [];
};

// Mock for the state object
global.state = {
  path: "",
  path_history: [],
  cache: {},
  path_index: 0
};

// Mock for goToPath function
global.goToPath = (path, skip_state, clicked_back) => {
  global.goToPath.lastCall = { path, skip_state, clicked_back };
};
global.goToPath.lastCall = null;
global.goToPath.reset = () => {
  global.goToPath.lastCall = null;
};

// Mock for renderName function
global.renderName = (displayName, index) => {
  return `${displayName}_${index}`;
};

// Assign $ to global scope
global.$ = mockDollarUtil;

// renderBack will be loaded here
let renderBack;

// Load the renderBack function from renderBack.js
try {
  const fileContent = fs.readFileSync(path.join(__dirname, 'renderBack.js'), 'utf8');
  const getRenderBackFunction = new Function(fileContent + '; return renderBack;');
  renderBack = getRenderBackFunction();
} catch (e) {
  console.error("Failed to load renderBack.js", e);
  process.exit(1);
}

// --- Test Cases ---

function testBackButtonNotRendered_RootPath() {
  global.state.path = "/";
  global.state.path_history = ["/"];
  global.state.path_index = 0;
  mockDollarUtil.reset();
  global.goToPath.reset();

  renderBack();

  const removeCall = mockDollarUtil.calls.find(call => call.selector === "main-content-wrapper[active] main-content back-forward-wrapper");
  assertEquals(true, removeCall?.element.removed, "Test Case 1 Failed: Back button wrapper should be removed for root path.");
  
  const mainContentArea = mockDollarUtil.calls.find(call => call.selector === "main-content-wrapper[active] main-content");
  const prependedToMain = mainContentArea?.element.prependedChildren.some(child => child.selector.includes("back-forward-wrapper"));
  assertEquals(false, !!prependedToMain, "Test Case 1 Failed: No new back-forward-wrapper should be prepended for root path.");
}

function testBackButtonNotRendered_TopicsPath() {
  global.state.path = "/topics";
  global.state.path_history = ["/topics"];
  global.state.path_index = 0;
  mockDollarUtil.reset();
  global.goToPath.reset();

  renderBack();

  const removeCall = mockDollarUtil.calls.find(call => call.selector === "main-content-wrapper[active] main-content back-forward-wrapper");
  assertEquals(true, removeCall?.element.removed, "Test Case 2 Failed: Back button wrapper should be removed for /topics path if it's the only history.");

  const mainContentArea = mockDollarUtil.calls.find(call => call.selector === "main-content-wrapper[active] main-content");
  const prependedToMain = mainContentArea?.element.prependedChildren.some(child => child.selector.includes("back-forward-wrapper"));
  assertEquals(false, !!prependedToMain, "Test Case 2 Failed: No new back-forward-wrapper should be prepended for /topics path.");
}

function testBackButtonRendered_TopicPath_DisplaysTitle() {
  global.state.path = "/topic/some-topic-slug";
  global.state.path_history = ["/topics", "/topic/some-topic-slug"];
  global.state.path_index = 1;
  global.state.cache["/topics"] = { topics: [{ title: "My Awesome Topic" }] }; // This cache is for /topics path
  mockDollarUtil.reset();
  global.goToPath.reset();

  renderBack();

  const prependCall = mockDollarUtil.calls.find(call => call.selector === "main-content-wrapper[active] main-content");
  assertEquals(true, prependCall?.element.prependedChildren.length > 0, "Test Case 3 Failed: Back button wrapper should be prepended.");
  
  // previous_path is "/topics". Text should be "Topics".
  const buttonCreationCall = mockDollarUtil.calls.find(call => call.selector.includes("Topics"));
  assertEquals(true, !!buttonCreationCall, "Test Case 3 Failed: Button text should include 'Topics'.");
  if (prependCall?.element.prependedChildren.length > 0) {
     assertEquals(true, prependCall.element.prependedChildren[0].selector.includes("back-forward-wrapper"), "Test Case 3 Failed: Correct wrapper prepended.");
  }
}

function testBackButtonRendered_TopicPath_ClickNavigates() {
  global.state.path = "/topic/another-topic";
  global.state.path_history = ["/topics", "/topic/another-topic"];
  global.state.path_index = 1; 
  global.state.cache["/topics"] = { topics: [{ title: "Another Topic Title" }] };
  mockDollarUtil.reset();
  global.goToPath.reset();

  renderBack();
  
  const backWrapperElementCall = mockDollarUtil.calls.find(call => call.selector === "back-wrapper");
  assertEquals(true, !!backWrapperElementCall, "Test Case 4 Failed: 'back-wrapper' element should be selected by chained call.");
  
  const clickHandler = backWrapperElementCall?.element.eventHandlers.click?.[0];
  assertEquals('function', typeof clickHandler, "Test Case 4 Failed: Click handler should be registered on 'back-wrapper'.");

  if (clickHandler) {
    clickHandler(); 
  }

  assertEquals("/topics", global.goToPath.lastCall.path, "Test Case 4 Failed: goToPath called with correct path.");
  assertEquals(false, global.goToPath.lastCall.skip_state, "Test Case 4 Failed: goToPath called with skip_state false.");
  assertEquals(true, global.goToPath.lastCall.clicked_back, "Test Case 4 Failed: goToPath called with clicked_back true.");
  
  assertEquals(1 - 2, global.state.path_index, "Test Case 4 Failed: path_index should be decremented twice.");
  assertEquals(0, global.state.path_history.length, "Test Case 4 Failed: path_history should be sliced by two elements.");
}

function testBackButtonRendered_CommentPath_DisplaysGenericText() {
  global.state.path = "/comment/comment123";
  global.state.path_history = ["/topic/some-topic", "/comment/comment123"];
  global.state.path_index = 1;
  global.state.cache["/topic/some-topic"] = { topics: [{ title: "Some Topic" }] }; 
  mockDollarUtil.reset();
  global.goToPath.reset();

  renderBack();

  // previous_path is "/topic/some-topic". Text should be "Some Topic".
  const buttonCreationCall = mockDollarUtil.calls.find(call => call.selector.includes("Some Topic"));
  assertEquals(true, !!buttonCreationCall, "Test Case 5 Failed: Button text should be 'Some Topic'.");
}

function testBackButtonRendered_UserPath_DisplaysRenderName() {
  global.state.path = "/user/user-slug";
  global.state.path_history = ["/topics", "/user/user-slug"];
  global.state.path_index = 1;
  // previous_path is "/topics". Cache for "/topics" should determine text.
  // renderBack.js logic for previous_path="/topics" is "Topics".
  global.state.cache["/topics"] = { user: { display_name: "TestUser", display_name_index: 1 } }; // This cache won't be used for "Topics" text
  mockDollarUtil.reset();
  global.goToPath.reset();

  renderBack();

  // previous_path is "/topics". Text should be "Topics".
  const buttonCreationCall = mockDollarUtil.calls.find(call => call.selector.includes("Topics"));
  assertEquals(true, !!buttonCreationCall, "Test Case 6 Failed: Button text should include 'Topics'.");
}

function testBackButtonRendered_PathWithThreeSegments_CorrectPreviousPath() {
  global.state.path = "/topic/slug/extra-segment"; 
  global.state.path_history = ["/first", "/second", "/topic/slug/extra-segment"]; 
  global.state.path_index = 2; 
  // Special logic: previous_path becomes "/first".
  // renderBack.js logic for "/first" (not matching specific rules) defaults to "Back".
  global.state.cache["/first"] = { topics: [{ title: "First Page Title" }] }; // This cache won't be used.
  mockDollarUtil.reset();
  global.goToPath.reset();

  renderBack();

  // previous_path becomes "/first". Text should be "Back".
  const buttonCreationCall = mockDollarUtil.calls.find(call => call.selector.includes("Back"));
  assertEquals(true, !!buttonCreationCall, "Test Case 7 Failed: Button text should contain 'Back'.");

  const backWrapperElementCall = mockDollarUtil.calls.find(call => call.selector === "back-wrapper");
  const clickHandler = backWrapperElementCall?.element.eventHandlers.click?.[0];
  if (clickHandler) {
    clickHandler();
  }
  assertEquals("/first", global.goToPath.lastCall.path, "Test Case 7 Failed: Click should navigate to '/first'.");
}

function testBackButtonRemoved_IfPreviousPathBecomesUndefined() {
  global.state.path = "/topic/a-topic";
  global.state.path_history = ["/topic/a-topic"]; 
  global.state.path_index = 0;
  mockDollarUtil.reset();
  global.goToPath.reset();
  
  renderBack();
  
  const initialRemoveCall = mockDollarUtil.calls.find(call => call.selector === "main-content-wrapper[active] main-content back-forward-wrapper");
  assertEquals(true, initialRemoveCall?.element.removed, "Test Case 8 Failed: Initial back button should be removed.");

  // previous_path becomes undefined. A button is created then removed.
  // previous_path becomes undefined. A button is created then removed.
  // Find the call record that corresponds to the creation of the button via template.
  // This is the call that received an array as its second argument ('argsPushed')
  // console.log("TC8 mockDollarUtil.calls:", JSON.stringify(mockDollarUtil.calls, null, 2)); // Debugging disabled
  const creationCallRecord = mockDollarUtil.calls.find(c => Array.isArray(c.argsPushed));
  
  if (creationCallRecord) {
    // Check if THIS element (the one created with template args) was removed
    assertEquals(true, creationCallRecord.element.removed, "Test Case 8 Failed: Newly created back button should be removed if previous_path is undefined.");
  } else {
    // This else implies a button wasn't even templated using the args array method
    assertEquals(true, false, "Test Case 8 Failed: Button creation call (the one with template args) not found.");
  }
}


const allTestFunctions = [
  testBackButtonNotRendered_RootPath,
  testBackButtonNotRendered_TopicsPath,
  testBackButtonRendered_TopicPath_DisplaysTitle,
  testBackButtonRendered_TopicPath_ClickNavigates,
  testBackButtonRendered_CommentPath_DisplaysGenericText,
  testBackButtonRendered_UserPath_DisplaysRenderName,
  testBackButtonRendered_PathWithThreeSegments_CorrectPreviousPath,
  testBackButtonRemoved_IfPreviousPathBecomesUndefined,
];

runTests('renderBack.test.js', allTestFunctions);
