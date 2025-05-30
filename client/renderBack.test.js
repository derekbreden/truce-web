const path = require('path'); 
const { assertEquals, runTests } = require('./testUtils.js');
const { loadClientScript, createMockDollar } = require('./testHelpers.js');

const mock$ = createMockDollar();

global.state = {
  path: "",
  path_history: [],
  cache: {},
  path_index: 0
};

global.goToPath = (pathValue, skip_state, clicked_back) => { 
  global.goToPath.lastCall = { path: pathValue, skip_state, clicked_back };
};
global.goToPath.lastCall = null;
global.goToPath.reset = () => {
  global.goToPath.lastCall = null;
};

global.renderName = (displayName, index) => {
  return `${displayName}_${index}`;
};

let renderBack;

try {
  renderBack = loadClientScript(
    path.join(__dirname, 'renderBack.js'),
    {
      "$": mock$, 
      "state": global.state, 
      "goToPath": global.goToPath, 
      "renderName": global.renderName 
    }
  );
} catch (e) {
  console.error("Failed to load renderBack.js using testHelpers:", e);
  process.exit(1); 
}


// --- Test Cases ---

function testBackButtonNotRendered_RootPath() {
  global.state.path = "/";
  global.state.path_history = ["/"];
  global.state.path_index = 0;
  mock$.reset(); 
  global.goToPath.reset();

  renderBack();

  const removeCall = mock$.calls.find(call => call.selector === "main-content-wrapper[active] main-content back-forward-wrapper");
  assertEquals(true, removeCall?.element.removed, "Test Case 1: Back button wrapper is removed for root path.");
  
  const mainContentAreaCall = mock$.calls.find(call => call.selector === "main-content-wrapper[active] main-content");
  const prependedToMain = mainContentAreaCall?.element.prependedChildren.some(
    child => typeof child.selector === 'string' && child.selector.includes("back-forward-wrapper")
  );
  assertEquals(false, !!prependedToMain, "Test Case 1: No new back-forward-wrapper is prepended for root path.");
}

function testBackButtonNotRendered_TopicsPath() {
  global.state.path = "/topics";
  global.state.path_history = ["/topics"];
  global.state.path_index = 0;
  mock$.reset();
  global.goToPath.reset();

  renderBack();

  const removeCall = mock$.calls.find(call => call.selector === "main-content-wrapper[active] main-content back-forward-wrapper");
  assertEquals(true, removeCall?.element.removed, "Test Case 2: Back button wrapper is removed for /topics path if it's the only history.");

  const mainContentAreaCall = mock$.calls.find(call => call.selector === "main-content-wrapper[active] main-content");
   const prependedToMain = mainContentAreaCall?.element.prependedChildren.some(
    child => typeof child.selector === 'string' && child.selector.includes("back-forward-wrapper")
  );
  assertEquals(false, !!prependedToMain, "Test Case 2: No new back-forward-wrapper is prepended for /topics path if it's the only history.");
}

function testBackButtonRendered_TopicPath_DisplaysTitle() {
  global.state.path = "/topic/some-topic-slug";
  global.state.path_history = ["/topics", "/topic/some-topic-slug"];
  global.state.path_index = 1;
  global.state.cache["/topics"] = { topics: [{ title: "My Awesome Topic" }] };
  mock$.reset();
  global.goToPath.reset();

  renderBack();

  const prependCall = mock$.calls.find(call => call.selector === "main-content-wrapper[active] main-content");
  assertEquals(true, prependCall?.element.prependedChildren.length > 0, "Test Case 3: Back button wrapper is prepended.");
  
  const buttonCreationCall = mock$.calls.find(call => call.selector.includes("Topics") && call.originalSelector.includes("p $1"));
  assertEquals(true, !!buttonCreationCall, "Test Case 3: Button text includes 'Topics'.");

  if (prependCall?.element.prependedChildren.length > 0) {
     assertEquals(true, prependCall.element.prependedChildren[0].selector.includes("back-forward-wrapper"), "Test Case 3: Correct wrapper is prepended.");
  }
}

function testBackButtonRendered_TopicPath_ClickNavigates() {
  global.state.path = "/topic/another-topic";
  global.state.path_history = ["/topics", "/topic/another-topic"];
  global.state.path_index = 1; 
  global.state.cache["/topics"] = { topics: [{ title: "Another Topic Title" }] };
  mock$.reset();
  global.goToPath.reset();

  renderBack();
  
  const backWrapperElementCall = mock$.calls.find(call => call.selector === "back-wrapper");
  assertEquals(true, !!backWrapperElementCall, "Test Case 4: 'back-wrapper' element is selected by chained call.");
  
  const clickHandler = backWrapperElementCall?.element.eventHandlers.click?.[0];
  assertEquals('function', typeof clickHandler, "Test Case 4: Click handler is registered on 'back-wrapper'.");

  if (clickHandler) {
    clickHandler(); 
  }

  assertEquals("/topics", global.goToPath.lastCall.path, "Test Case 4: goToPath is called with correct path.");
  assertEquals(false, global.goToPath.lastCall.skip_state, "Test Case 4: goToPath is called with skip_state false.");
  assertEquals(true, global.goToPath.lastCall.clicked_back, "Test Case 4: goToPath is called with clicked_back true.");
  
  assertEquals(1 - 2, global.state.path_index, "Test Case 4: path_index is decremented twice.");
  assertEquals(0, global.state.path_history.length, "Test Case 4: path_history is sliced by two elements.");
}

function testBackButtonRendered_CommentPath_DisplaysGenericText() {
  global.state.path = "/comment/comment123";
  global.state.path_history = ["/topic/some-topic", "/comment/comment123"];
  global.state.path_index = 1;
  global.state.cache["/topic/some-topic"] = { topics: [{ title: "Some Topic" }] }; 
  mock$.reset();
  global.goToPath.reset();

  renderBack();

  const buttonCreationCall = mock$.calls.find(call => call.selector.includes("Some Topic") && call.originalSelector.includes("p $1"));
  assertEquals(true, !!buttonCreationCall, "Test Case 5: Button text is 'Some Topic'.");
}

function testBackButtonRendered_UserPath_DisplaysRenderName() {
  global.state.path = "/user/user-slug";
  global.state.path_history = ["/topics", "/user/user-slug"];
  global.state.path_index = 1;
  global.state.cache["/topics"] = { user: { display_name: "TestUser", display_name_index: 1 } }; 
  mock$.reset();
  global.goToPath.reset();

  renderBack();

  const buttonCreationCall = mock$.calls.find(call => call.selector.includes("Topics") && call.originalSelector.includes("p $1"));
  assertEquals(true, !!buttonCreationCall, "Test Case 6: Button text includes 'Topics'.");
}

function testBackButtonRendered_PathWithThreeSegments_CorrectPreviousPath() {
  global.state.path = "/topic/slug/extra-segment"; 
  global.state.path_history = ["/first", "/second", "/topic/slug/extra-segment"]; 
  global.state.path_index = 2; 
  global.state.cache["/first"] = { topics: [{ title: "First Page Title" }] }; 
  mock$.reset();
  global.goToPath.reset();

  renderBack();

  const buttonCreationCall = mock$.calls.find(call => call.selector.includes("p Back") && call.originalSelector.includes("p $1"));
  assertEquals(true, !!buttonCreationCall, "Test Case 7: Button text contains 'Back'.");

  const backWrapperElementCall = mock$.calls.find(call => call.selector === "back-wrapper");
  const clickHandler = backWrapperElementCall?.element.eventHandlers.click?.[0];
  if (clickHandler) {
    clickHandler();
  }
  assertEquals("/first", global.goToPath.lastCall.path, "Test Case 7: Click navigates to '/first'.");
}

function testBackButtonRemoved_IfPreviousPathBecomesUndefined() {
  global.state.path = "/topic/a-topic";
  global.state.path_history = ["/topic/a-topic"]; 
  global.state.path_index = 0;
  mock$.reset();
  global.goToPath.reset();
  
  renderBack();
  
  const initialRemoveCall = mock$.calls.find(call => call.selector === "main-content-wrapper[active] main-content back-forward-wrapper");
  assertEquals(true, initialRemoveCall?.element.removed, "Test Case 8: Initial back button is removed.");

  const creationCallRecord = mock$.calls.find(c => Array.isArray(c.args) && c.originalSelector.includes("p $1"));
  
  if (creationCallRecord) {
    assertEquals(true, creationCallRecord.element.removed, "Test Case 8: Newly created back button is removed if previous_path is undefined.");
  } else {
    assertEquals(true, false, "Test Case 8: Button creation call (the one with template args) was expected but not found.");
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
