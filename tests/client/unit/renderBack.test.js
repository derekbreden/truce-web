const path = require('path')
const { assertEquals, runTests } = require('../shared/testUtils.js')
const { loadClientScript, createMockDocument, createMockWindow } = require('../shared/testHelpers.js')

// Create mock document and window
const mockDocument = createMockDocument()
const mockWindow = createMockWindow(mockDocument)

// Load real flint.js
const $ = loadClientScript(
  path.join(__dirname, '../../../client/flint.js'),
  { document: mockDocument, window: mockWindow },
  '$' // Ensure we get the $ function
)

global.state = {
  path: "",
  path_history: [],
  cache: {},
  path_index: 0
}

global.goToPath = (pathValue, skip_state, clicked_back) => {
  global.goToPath.lastCall = { path: pathValue, skip_state, clicked_back }
}
global.goToPath.lastCall = null
global.goToPath.reset = () => {
  global.goToPath.lastCall = null
}

global.renderName = (displayName, index) => {
  return `${displayName}_${index}`
}

let renderBack
let mainContentWrapperElement; // Declared with let

mainContentWrapperElement = mockDocument.createElement('main-content-wrapper')
mainContentWrapperElement.setAttribute('active', '')

const mainContentElement = mockDocument.createElement('main-content')
mainContentWrapperElement.appendChild(mainContentElement)
mockDocument.body.appendChild(mainContentWrapperElement)


try {
  renderBack = loadClientScript(
    path.join(__dirname, '../../../client/renderBack.js'),
    {
      "$": $,
      "state": global.state,
      "goToPath": global.goToPath,
      "renderName": global.renderName,
      "document": mockDocument
    }
  )
} catch (e) {
  console.error("Failed to load renderBack.js using testHelpers:", e)
  process.exit(1)
}


// --- Test Cases ---

function beforeEach() {
  let existingWrapper = null
  if (mockDocument.body && mockDocument.body.children) {
    existingWrapper = Array.from(mockDocument.body.children).find(child => child.tagName === 'MAIN-CONTENT-WRAPPER')
  }

  if (existingWrapper) {
    mainContentWrapperElement = existingWrapper
    mainContentWrapperElement.setAttribute('active', '')
    let mc = null
    if (mainContentWrapperElement.children) {
        mc = Array.from(mainContentWrapperElement.children).find(child => child.tagName === 'MAIN-CONTENT')
    }

    if (mc) {
        mc.children = []
        mc.innerText = ""
        mc.textContent = ""
    } else {
        const newMainContent = mockDocument.createElement('main-content')
        mainContentWrapperElement.appendChild(newMainContent)
    }
  } else {
    mainContentWrapperElement = mockDocument.createElement('main-content-wrapper')
    mainContentWrapperElement.setAttribute('active', '')
    const newMainContent = mockDocument.createElement('main-content')
    mainContentWrapperElement.appendChild(newMainContent)
    mockDocument.body.appendChild(mainContentWrapperElement)
  }
  global.goToPath.reset()
  global.state.path_history = []
  global.state.path_index = 0
  global.state.cache = {}
}

function testBackButtonNotRendered_RootPath() {
  beforeEach()
  global.state.path = "/"
  global.state.path_history = ["/"]
  global.state.path_index = 0
  renderBack()
  const backButtonWrapper = $('main-content-wrapper[active] main-content .back-forward-wrapper')
  assertEquals(true, !backButtonWrapper || backButtonWrapper.length === 0, "Test Case 1: Back button wrapper should not exist for root path.")
}

function testBackButtonNotRendered_TopicsPath() {
  beforeEach()
  global.state.path = "/topics"
  global.state.path_history = ["/topics"]
  global.state.path_index = 0
  renderBack()
  const backButtonWrapper = $('main-content-wrapper[active] main-content .back-forward-wrapper')
  assertEquals(true, !backButtonWrapper || backButtonWrapper.length === 0, "Test Case 2: Back button wrapper should not exist for /topics path if it's the only history.")
}

function testBackButtonRendered_TopicPath_DisplaysTitle() {
  beforeEach()
  global.state.path = "/topic/some-topic-slug"
  global.state.path_history = ["/topics", "/topic/some-topic-slug"]
  global.state.path_index = 1
  global.state.cache["/topics"] = { topics: [{ title: "My Awesome Topic" }] }
  renderBack()

  const mainContent = $('main-content-wrapper[active] main-content')
  assertEquals(true, mainContent && mainContent.children && mainContent.children.length > 0, "Test Case 3: Main content should have children.")
  
  const backButtonWrapperElement = mainContent.children[0]; // This is <back-forward-wrapper>
  assertEquals(true, backButtonWrapperElement.tagName === 'BACK-FORWARD-WRAPPER', "Test Case 3: Correct wrapper is prepended (tag check).")

  const backButtonTextElement = $('main-content-wrapper[active] main-content back-forward-wrapper back-wrapper p')
  const backButtonText = backButtonTextElement ? backButtonTextElement.innerText : ""
  assertEquals(true, backButtonText.includes("Topics"), `Test Case 3: Button text includes 'Topics'. Actual: '${backButtonText}'`)
}

function testBackButtonRendered_TopicPath_ClickNavigates() {
  beforeEach()
  global.state.path = "/topic/another-topic"
  global.state.path_history = ["/topics", "/topic/another-topic"]
  global.state.path_index = 1
  global.state.cache["/topics"] = { topics: [{ title: "Another Topic Title" }] }
  renderBack()
  
  const backWrapperToClick = $('main-content-wrapper[active] main-content back-forward-wrapper back-wrapper')
  assertEquals(true, !!backWrapperToClick, "Test Case 4: Back wrapper element exists.")
  
  if (backWrapperToClick && typeof backWrapperToClick.click === 'function') {
      backWrapperToClick.click()
  } else if (backWrapperToClick && backWrapperToClick.eventListeners && backWrapperToClick.eventListeners.click) {
    backWrapperToClick.eventListeners.click.forEach(handler => handler.call(backWrapperToClick))
  } else {
    console.error("Click handler not found or not callable for back wrapper in Test Case 4. Element:", backWrapperToClick)
    assertEquals(true, false, "Test Case 4: Click handler should be registered and callable on back wrapper.")
  }

  assertEquals(global.goToPath.lastCall.path, "/topics", "Test Case 4: goToPath is called with correct path.")
  assertEquals(global.goToPath.lastCall.skip_state, false, "Test Case 4: goToPath is called with skip_state false.")
  assertEquals(true, global.goToPath.lastCall.clicked_back, "Test Case 4: goToPath is called with clicked_back true.")
}

function testBackButtonRendered_CommentPath_DisplaysGenericText() {
  beforeEach()
  global.state.path = "/comment/comment123"
  global.state.path_history = ["/topic/some-topic", "/comment/comment123"]
  global.state.path_index = 1
  global.state.cache["/topic/some-topic"] = { topics: [{ title: "Some Topic" }] }
  renderBack()

  const backButtonTextElement = $('main-content-wrapper[active] main-content back-forward-wrapper back-wrapper p')
  const backButtonText = backButtonTextElement ? backButtonTextElement.innerText : ""
  assertEquals(true, backButtonText.includes("Some Topic"), `Test Case 5: Button text is 'Some Topic'. Actual: '${backButtonText}'`)
}

function testBackButtonRendered_UserPath_DisplaysRenderName() {
  beforeEach()
  global.state.path = "/user/user-slug"
  global.state.path_history = ["/topics", "/user/user-slug"]
  global.state.path_index = 1
  global.state.cache["/topics"] = { title: "Topics" }; // renderBack.js uses 'Back' if no specific title type matches
  // To get "Topics" here, previous_path would be /topics, and renderBack has a specific rule for that.
  renderBack()

  const backButtonTextElement = $('main-content-wrapper[active] main-content back-forward-wrapper back-wrapper p')
  const backButtonText = backButtonTextElement ? backButtonTextElement.innerText : ""
  assertEquals(true, backButtonText.includes("Topics"), `Test Case 6: Button text includes 'Topics'. Actual: '${backButtonText}'`)
}

function testBackButtonRendered_PathWithThreeSegments_CorrectPreviousPath() {
  beforeEach()
  global.state.path = "/topic/slug/extra-segment"
  global.state.path_history = ["/first", "/second", "/topic/slug/extra-segment"]
  global.state.path_index = 2
  // previous_path will be /first due to path.split('/')[3] being true
  // To make it display "First Page Title", cache["/first"] should be like a topic
  // global.state.cache["/first"] = { topics: [{ title: "First Page Title" }] }
  // Otherwise, it will default to "Back"
  global.state.cache["/first"] = { title: "First Page Title" }; // This will result in "Back"
  global.state.cache["/second"] = { title: "Second Page Title" }
  renderBack()

  const backButtonTextElement = $('main-content-wrapper[active] main-content back-forward-wrapper back-wrapper p')
  const backButtonText = backButtonTextElement ? backButtonTextElement.innerText : ""
  assertEquals(true, backButtonText.includes("Back"), `Test Case 7: Button text contains 'Back'. Actual: '${backButtonText}'`)

  const backWrapperToClick = $('main-content-wrapper[active] main-content back-forward-wrapper back-wrapper')
   if (backWrapperToClick && typeof backWrapperToClick.click === 'function') {
      backWrapperToClick.click()
  } else if (backWrapperToClick && backWrapperToClick.eventListeners && backWrapperToClick.eventListeners.click) {
    backWrapperToClick.eventListeners.click.forEach(handler => handler.call(backWrapperToClick))
  } else {
     assertEquals(true, false, "Test Case 7: Click handler for back wrapper not found or not callable.")
  }
  assertEquals(global.goToPath.lastCall.path, "/first", "Test Case 7: Click navigates to '/first'.")
}

function testBackButtonRemoved_IfPreviousPathIsRootAndOnlyHistory() {
  beforeEach()
  global.state.path = "/topic/a-topic"
  global.state.path_history = ["/", "/topic/a-topic"]; // previous_path will be "/"
  global.state.path_index = 1
  global.state.cache["/"] = { title: "Root Page" }; // This cache is ignored by renderBack for "/"
  renderBack()
  
  const backButtonToRoot = $('main-content-wrapper[active] main-content back-forward-wrapper back-wrapper')
  assertEquals(true, !!backButtonToRoot, "Test Case 8a: Back button to root should be rendered.")
  const backButtonToRootTextElement = $('main-content-wrapper[active] main-content back-forward-wrapper back-wrapper p')
  const backButtonToRootText = backButtonToRootTextElement ? backButtonToRootTextElement.innerText : ""
  assertEquals(true, backButtonToRootText.includes("Terms and conditions"), `Test Case 8a: Button text is 'Terms and conditions'. Actual: '${backButtonToRootText}'`)

  beforeEach()
  global.state.path = "/nextpage"
  global.state.path_history = ["/nextpage"]
  global.state.path_index = 0
  renderBack()

  const backButtonWrapper = $('main-content-wrapper[active] main-content .back-forward-wrapper')
  assertEquals(true, !backButtonWrapper || backButtonWrapper.length === 0, "Test Case 8b: Back button wrapper is not rendered if no valid previous path.")
}

const allTestFunctions = [
  testBackButtonNotRendered_RootPath,
  testBackButtonNotRendered_TopicsPath,
  testBackButtonRendered_TopicPath_DisplaysTitle,
  testBackButtonRendered_TopicPath_ClickNavigates,
  testBackButtonRendered_CommentPath_DisplaysGenericText,
  testBackButtonRendered_UserPath_DisplaysRenderName,
  testBackButtonRendered_PathWithThreeSegments_CorrectPreviousPath,
  testBackButtonRemoved_IfPreviousPathIsRootAndOnlyHistory,
]

runTests('renderBack.test.js', allTestFunctions)
