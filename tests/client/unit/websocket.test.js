const path = require('path')
const { assertEquals, runTests } = require('../shared/testUtils.js')
const { loadClientScript, createMockFunction, createMockDocument, createMockWindow } = require('../shared/testHelpers.js')

// Mock global dependencies
let mockState
let mockWindow
let mockWebSocketConstructor
let mockWebSocketInstance
let mockGetMoreRecent
let mockSetTimeout
let mockConsoleError

// Helper to reset mocks before each test
const setupMocks = () => {
  mockState = {
    ws: null,
    path: '/initial-path',
  }

  const mockDocument = createMockDocument(); // Create a mock document
  mockWindow = createMockWindow(mockDocument); // Create mock window, passing the document
  mockWindow.location = {}; // Initialize location object
  mockWindow.location.host = 'testhost.com'

  // Mock WebSocket instance methods
  const mockAddEventListener = createMockFunction('websocket.addEventListener')
  const mockSend = createMockFunction('websocket.send')
  const mockClose = createMockFunction('websocket.close')

  mockWebSocketInstance = {
    addEventListener: mockAddEventListener,
    send: mockSend,
    close: mockClose,
    // Simulate readyState for send logic if websocket.js checks it (optional based on script's needs)
    // readyState: 1, // WebSocket.OPEN
  }

  // mockWebSocketConstructor needs to be a function that can be called with 'new'
  // and it should have tracking properties like .called, .callCount, .calls, .url, and a .reset() method.
  mockWebSocketConstructor = function(url) {
      mockWebSocketConstructor.called = true
      mockWebSocketConstructor.callCount++
      mockWebSocketConstructor.calls.push([url])
      mockWebSocketConstructor.url = url
      // Ensure the addEventListener mock on the returned instance is fresh for this new "connection"
      // because tests will look for listeners being added upon new WebSocket creation.
      if (mockWebSocketInstance && mockWebSocketInstance.addEventListener && mockWebSocketInstance.addEventListener.reset) {
        mockWebSocketInstance.addEventListener.reset()
      }
      return mockWebSocketInstance
  }
  mockWebSocketConstructor.reset = () => {
      mockWebSocketConstructor.called = false
      mockWebSocketConstructor.callCount = 0
      mockWebSocketConstructor.calls = []
      mockWebSocketConstructor.url = undefined
      // When the constructor is reset, it implies we are starting a scenario
      // where a new WebSocket might be created. The instance it returns
      // should also have its mocks reset to reflect a fresh state.
      if (mockWebSocketInstance) { // Ensure instance and its methods exist
          if (mockWebSocketInstance.addEventListener && mockWebSocketInstance.addEventListener.reset) {
              mockWebSocketInstance.addEventListener.reset()
          }
          if (mockWebSocketInstance.send && mockWebSocketInstance.send.reset) {
              mockWebSocketInstance.send.reset()
          }
          if (mockWebSocketInstance.close && mockWebSocketInstance.close.reset) {
              mockWebSocketInstance.close.reset()
          }
      }
  }
  // Initialize to a clean state. This is important because setupMocks() is called before each test.
  mockWebSocketConstructor.reset()


  mockGetMoreRecent = createMockFunction('getMoreRecent')
  mockSetTimeout = createMockFunction('setTimeout')
  mockConsoleError = createMockFunction('console.error')

  // Load client/websocket.js
  // No specific const is exported or needed; the script execution itself is what we're testing.
  loadClientScript(
    path.resolve(__dirname, '../../../client/websocket.js'),
    {
      state: mockState,
      window: mockWindow,
      WebSocket: mockWebSocketConstructor,
      getMoreRecent: mockGetMoreRecent,
      setTimeout: mockSetTimeout,
      console: { error: mockConsoleError }, // console.error is usually under console object
    },
    [] // Explicitly return nothing (empty object) from the script
  )
}

// Placeholder for test functions
const tests = [
  function testInitialConnectionAndOpenEvent() {
    setupMocks(); // Ensure a clean state for each test

    // Verify WebSocket constructor was called
    assertEquals(true, mockWebSocketConstructor.called, "WebSocket constructor should be called")
    assertEquals(`wss://${mockWindow.location.host}`, mockWebSocketConstructor.url, "WebSocket constructor called with correct URL")

    // Verify event listeners were added
    assertEquals(true, mockWebSocketInstance.addEventListener.called, "addEventListener should be called on WebSocket instance")
    assertEquals(3, mockWebSocketInstance.addEventListener.callCount, "addEventListener should be called 3 times (for message, open, close)")

    // Find the 'open' event listener
    let openCallback
    for (const call of mockWebSocketInstance.addEventListener.calls) {
      if (call[0] === 'open') {
        openCallback = call[1]
        break
      }
    }
    assertEquals('function', typeof openCallback, "An 'open' event listener should be registered")

    if (typeof openCallback === 'function') {
      // Simulate the 'open' event
      openCallback()

      // Verify state.ws.send was called
      assertEquals(true, mockWebSocketInstance.send.called, "WebSocket send should be called on 'open'")
      assertEquals(1, mockWebSocketInstance.send.callCount, "WebSocket send should be called once")
      const expectedSendPayload = JSON.stringify({ path: mockState.path })
      assertEquals(expectedSendPayload, mockWebSocketInstance.send.calls[0][0], "WebSocket send called with correct payload")
    }
  },
  function testMessageEventHandling() {
    setupMocks(); // Ensure a clean state

    // Find the 'message' event listener
    let messageCallback
    for (const call of mockWebSocketInstance.addEventListener.calls) {
      if (call[0] === 'message') {
        messageCallback = call[1]
        break
      }
    }
    assertEquals('function', typeof messageCallback, "A 'message' event listener should be registered")

    if (typeof messageCallback === 'function') {
      // Simulate a message event with data "UPDATE"
      messageCallback({ data: "UPDATE" })
      assertEquals(true, mockGetMoreRecent.called, "getMoreRecent should be called when message data is 'UPDATE'")
      assertEquals(1, mockGetMoreRecent.callCount, "getMoreRecent should be called once")

      // Reset mock for the next assertion
      mockGetMoreRecent.reset()

      // Simulate a message event with different data
      messageCallback({ data: "OTHER_DATA" })
      assertEquals(false, mockGetMoreRecent.called, "getMoreRecent should NOT be called when message data is not 'UPDATE'")
    }
  },
  function testCloseEventAndReconnection() {
    setupMocks(); // Ensure a clean state

    // Capture the initial WebSocket instance for later comparison
    const initialWebSocketInstance = mockWebSocketInstance

    // Find the 'close' event listener
    let closeCallback
    for (const call of mockWebSocketInstance.addEventListener.calls) {
      if (call[0] === 'close') {
        closeCallback = call[1]
        break
      }
    }
    assertEquals('function', typeof closeCallback, "A 'close' event listener should be registered")

    if (typeof closeCallback === 'function') {
      // Simulate the 'close' event
      closeCallback()

      // Verify that the original WebSocket instance's close method was called
      assertEquals(true, initialWebSocketInstance.close.called, "Original WebSocket instance's close() method should be called")
      assertEquals(1, initialWebSocketInstance.close.callCount, "Original WebSocket instance's close() method should be called once")

      // Verify setTimeout was called for reconnection
      assertEquals(true, mockSetTimeout.called, "setTimeout should be called for reconnection")
      assertEquals(1, mockSetTimeout.callCount, "setTimeout should be called once")
      assertEquals(10000, mockSetTimeout.calls[0][1], "setTimeout called with correct delay (10000ms)")

      const reconnectCallback = mockSetTimeout.calls[0][0]
      assertEquals('function', typeof reconnectCallback, "Callback for setTimeout should be a function (reconnectWs)")

      if (typeof reconnectCallback === 'function') {
        // Reset the constructor mock to check for a new call
        mockWebSocketConstructor.reset()
        // Reset the instance mocks to ensure we are checking the new instance's calls
        mockWebSocketInstance.addEventListener.reset()
        mockWebSocketInstance.send.reset()
        // Note: initialWebSocketInstance.close is not reset, as we already asserted it.

        // Simulate the timeout for reconnection
        reconnectCallback()

        // Verify a new WebSocket was created
        assertEquals(true, mockWebSocketConstructor.called, "WebSocket constructor should be called again for reconnection")
        assertEquals(1, mockWebSocketConstructor.callCount, "WebSocket constructor should be called once for reconnection")
        assertEquals(`wss://${mockWindow.location.host}`, mockWebSocketConstructor.url, "New WebSocket connection made to the correct URL")

        // Verify that event listeners are added to the new WebSocket instance
        // mockWebSocketInstance now refers to the *new* instance because mockWebSocketConstructor returns it.
        assertEquals(true, mockWebSocketInstance.addEventListener.called, "addEventListener should be called on the new WebSocket instance")
        // Expecting 3 listeners: message, open, close
        assertEquals(3, mockWebSocketInstance.addEventListener.callCount, "addEventListener should be called 3 times on the new WebSocket instance")
      }
    }
  }
]

// Run tests
runTests('websocket.test.js', tests)

// Remove the temporary setup verification console.log and runTests call from the previous step.
// The `setupMocks()` call is now made at the beginning of each test case.
