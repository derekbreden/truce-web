const path = require('path')
const { loadClientScript, createMockDocument, createMockWindow } = require('../shared/testHelpers.js')

// --- Mocking browser environment ---
const mockDocument = createMockDocument()
const mockWindow = createMockWindow(mockDocument)

global.document = mockDocument
global.window = mockWindow

// --- Per-Test Setup Function ---
function beforeEachImageTest() {
  // Reset canvas dimensions
  // Re-create mockCanvas before each test to ensure it's clean,
  // especially if its properties are modified by tests.
  // However, the core mockCanvas definition is now outside.
  // For this refactor, let's assume mockCanvas is defined once and its properties are reset.
  if (mockCanvas) {
    mockCanvas.width = 0
    mockCanvas.height = 0
  }

  // Reset mock context state
  lastDrawImageArgs = null

  // Reset Image mock state
  if (global.Image) { // Ensure Image mock is defined
    global.Image.lastInstance = null
  }
  // If individual Image instances stored more state that needed reset,
  // that would be more complex, potentially requiring a new Image mock per test
  // or a reset method on the mock Image instances. For now, only lastInstance is reset.
}

let lastDrawImageArgs = null
const mockCtx = {
  drawImage: (...args) => {
    lastDrawImageArgs = args
  },
  getImageData: () => ({ data: new Uint8ClampedArray(4) }), // Minimal mock for alpha check
}

// Create a specific mockCanvas instance that will be returned by mockDocument.createElement
const mockCanvas = mockDocument.createElement('canvas'); // Still use this to get a base mock element
mockCanvas.width = 0
mockCanvas.height = 0
mockCanvas.getContext = () => mockCtx
mockCanvas.toDataURL = (type) => {
  if (type === 'image/png') {
    return 'data:image/png;base64,mockpngdata'
  }
  return 'data:image/jpeg;base64,mockjpegdata'
}

// Override mockDocument.createElement to return our specific mockCanvas
// when 'canvas' is requested.
const originalCreateElement = mockDocument.createElement
mockDocument.createElement = (elementName) => {
  if (elementName === 'canvas') {
    // Ensure mockCanvas is reset for each call if tests expect fresh canvas state
    // This is currently handled in beforeEachImageTest by resetting properties.
    return mockCanvas
  }
  // For any other element, use the original implementation
  return originalCreateElement.call(mockDocument, elementName)
}

// global.document assignment is now at the top with createMockDocument

global.Image = function() {
  let _src = ''; // Use a private variable to store src
  this.naturalWidth = 0
  this.naturalHeight = 0
  this.width = 0
  this.height = 0
  this.onload = null
  this.onerror = null
  global.Image.lastInstance = this

  Object.defineProperty(this, 'src', {
    get: () => _src,
    set: (value) => {
      _src = value
      if (_src === 'invalid-image-source' && typeof this.onerror === 'function') {
        // Call onerror asynchronously to mimic real browser behavior
        setTimeout(() => this.onerror(new Event('error')), 0)
      }
      // Existing onload logic should also be considered here if it's triggered by src change
      // For now, focusing on onerror as per the task.
    },
  })
}

let imageToPng

try {
  imageToPng = loadClientScript(
    path.resolve(__dirname, '../../../client/imageToPng.js'),
    { Image: global.Image, document: global.document },
    "imageToPng"
  )
} catch (error) {
  console.error("Failed to load imageToPng.js using loadClientScript:", error)
  process.exit(1)
}

// Use the new testUtils
const { assertEquals, runTests: runTestsFromUtils } = require('../shared/testUtils.js')

// --- Test Case Helper ---
function runImageTest({
  testName,
  imgWidth,
  imgHeight,
  targetSize,
  crop,
  expectedCanvasWidth,
  expectedCanvasHeight,
  expectedDrawImageArgs, 
}) {
  beforeEachImageTest(); // Reset global mocks for this specific test run

  return new Promise((resolve, reject) => {
    const inputSrc = `data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7?w=${imgWidth}&h=${imgHeight}`
    const expectedDataUrl = 'data:image/png;base64,mockpngdata'
    // lastDrawImageArgs = null; // Now handled by beforeEachImageTest

    let toDataURLCalled = false
    const originalToDataURL = mockCanvas.toDataURL; // Save original
    mockCanvas.toDataURL = (type) => { // Temporarily spy
      if (type === 'image/png') {
        toDataURLCalled = true
      }
      return 'data:image/png;base64,mockpngdata'; // Ensure mock always returns this for consistency
    }

    const callback = (result) => {
      try {
        assertEquals(result.url, expectedDataUrl, `${testName}: Should convert to PNG successfully`)
        assertEquals(result.width, expectedCanvasWidth, `${testName}: Result canvas width should be ${expectedCanvasWidth}`)
        assertEquals(result.height, expectedCanvasHeight, `${testName}: Result canvas height should be ${expectedCanvasHeight}`)
        assertEquals(true, !!lastDrawImageArgs, `${testName}: drawImage should have been called`)
        assertEquals(true, toDataURLCalled, `${testName}: toDataURL('image/png') should have been called`)
        assertEquals(mockCanvas.width, expectedCanvasWidth, `${testName}: Mock canvas width should be set to ${expectedCanvasWidth}`)
        assertEquals(mockCanvas.height, expectedCanvasHeight, `${testName}: Mock canvas height should be set to ${expectedCanvasHeight}`)

        if (expectedDrawImageArgs && lastDrawImageArgs) {
          for (let i = 0; i < expectedDrawImageArgs.length; i++) {
            assertEquals(lastDrawImageArgs[i+1], expectedDrawImageArgs[i], `${testName}: drawImage argument index ${i} (value: ${expectedDrawImageArgs[i]})`)
          }
        }
        resolve()
      } catch (e) {
        // This error is within a specific test's callback.
        // We want runTestsFromUtils to handle overall test failure reporting.
        // So, we re-throw the error to be caught by runTestsFromUtils's try-catch block around testFn().
        // Or, ensure assertEquals correctly reports failures that runTestsFromUtils can see.
        // For now, let's make sure assertEquals is called for failures.
        assertEquals(true, false, `${testName}: Error during callback assertions: ${e.message}`)
        reject(e); // Keep reject to stop this specific Promise chain
      } finally {
        mockCanvas.toDataURL = originalToDataURL; // Restore original
      }
    }

    imageToPng(inputSrc, callback, targetSize, crop)

    if (!global.Image.lastInstance) {
      // This indicates a fundamental issue with the test setup or the Image mock.
      // Report it as a failed assertion.
      assertEquals(true, false, `[${testName}]: No image instance was created.`)
      return reject(new Error(`[${testName}] No image instance created.`))
    }
    
    assertEquals(global.Image.lastInstance.src, inputSrc, `${testName}: Image src should be set to inputSrc`)

    if (global.Image.lastInstance && typeof global.Image.lastInstance.onload === 'function') {
      global.Image.lastInstance.naturalWidth = imgWidth
      global.Image.lastInstance.naturalHeight = imgHeight
      global.Image.lastInstance.width = imgWidth
      global.Image.lastInstance.height = imgHeight
      global.Image.lastInstance.onload()
    } else {
      assertEquals(true, false, `[${testName}]: Image onload was not set or lastInstance is not available.`)
      return reject(new Error(`[${testName}] Image onload not set.`))
    }
  })
}

// --- Test Definitions ---
function testImageToPngLoaded() {
  assertEquals(typeof imageToPng, "function", "imageToPng should be a function")
}

async function testImageLoadError() {
  beforeEachImageTest(); // Reset global mocks

  const testName = "ImageLoadError: Handles invalid image source and calls callback with error"
  let mainCallbackArgs = null
  let mainCallbackCalled = false

  // This promise resolves when the main callback (from imageToPng) is called.
  const callbackPromise = new Promise((resolve, reject) => {
    imageToPng("invalid-image-source", (args) => {
      mainCallbackCalled = true
      mainCallbackArgs = args
      resolve(); // Resolve when imageToPng's callback is invoked
    }, 1024, false); // targetSize and crop are arbitrary

    if (!global.Image.lastInstance) {
        // This check is mostly for the integrity of the test setup itself,
        // ensuring imageToPng attempted to create an Image.
        return reject(new Error(`[${testName}]: No image instance was created by imageToPng.`))
    }
    // We expect the mock's src setter to trigger its onerror,
    // which in turn should make imageToPng call its main callback with an error.

    // Safety timeout if the main callback isn't called
    setTimeout(() => {
      if (!mainCallbackCalled) {
        let errMessage = `[${testName}]: Main callback was not called within the timeout period.`
        if (global.Image.lastInstance && global.Image.lastInstance.src !== "invalid-image-source") {
            errMessage += ` Expected src 'invalid-image-source' but got '${global.Image.lastInstance.src}'.`
        } else if (!global.Image.lastInstance) {
            errMessage += " global.Image.lastInstance was null."
        }
        reject(new Error(errMessage))
      }
    }, 200); // Increased timeout slightly
  })

  try {
    await callbackPromise; // Wait for the main callback from imageToPng

    assertEquals(true, mainCallbackCalled, `${testName}: Main callback should have been called.`)
    assertEquals(typeof mainCallbackArgs, "object", `${testName}: Callback argument should be an object.`)
    if (mainCallbackArgs === null || typeof mainCallbackArgs === 'undefined') {
      // Fail explicitly if mainCallbackArgs is null/undefined, to avoid error on next lines
      assertEquals(true, false, `${testName}: mainCallbackArgs is null or undefined.`)
      return; // Stop further execution in this test
    }
    assertEquals(true, mainCallbackArgs.error, `${testName}: Callback argument should have 'error: true'.`)
    assertEquals(mainCallbackArgs.message, "Image failed to load", `${testName}: Callback argument should have correct error message.`)

    // Check that the image src was indeed set to the invalid source on the mock
    if (global.Image.lastInstance) {
      assertEquals(global.Image.lastInstance.src, "invalid-image-source", `${testName}: Image src should be set to invalid-image-source on the mock.`)
    } else {
      // This should ideally be caught by the reject in the Promise if !global.Image.lastInstance
      assertEquals(true, false, `${testName}: global.Image.lastInstance was unexpectedly null after test execution.`)
    }

  } catch (error) {
    // If callbackPromise rejected (e.g. timeout or explicit reject), it will be caught here.
    assertEquals(true, false, `${testName}: Test failed: ${error.message}`)
  }
}

async function testAllImageProcessingScenarios() { // Renamed to avoid conflict and clarify it's a test function
  await runImageTest({
    testName: "NoCrop: Larger landscape (2000x1000) to size 1024",
    imgWidth: 2000, imgHeight: 1000, targetSize: 1024, crop: false,
    expectedCanvasWidth: 1024, expectedCanvasHeight: 512,
    expectedDrawImageArgs: [0, 0, 2000, 1000, 0, 0, 1024, 512],
  })

  await runImageTest({
    testName: "NoCrop: Larger portrait (1000x2000) to size 1024",
    imgWidth: 1000, imgHeight: 2000, targetSize: 1024, crop: false,
    expectedCanvasWidth: 512, expectedCanvasHeight: 1024,
    expectedDrawImageArgs: [0, 0, 1000, 2000, 0, 0, 512, 1024],
  })

  await runImageTest({
    testName: "NoCrop: Smaller image (500x250) to size 1024 (scales up)",
    imgWidth: 500, imgHeight: 250, targetSize: 1024, crop: false,
    expectedCanvasWidth: 1024, expectedCanvasHeight: 512,
    expectedDrawImageArgs: [0, 0, 500, 250, 0, 0, 1024, 512],
  })

  const mixedNoCropHeight = 800 * (1024/1200)
  await runImageTest({
    testName: "NoCrop: Mixed dimensions (1200x800) to size 1024",
    imgWidth: 1200, imgHeight: 800, targetSize: 1024, crop: false,
    expectedCanvasWidth: 1024, expectedCanvasHeight: mixedNoCropHeight,
    expectedDrawImageArgs: [0, 0, 1200, 800, 0, 0, 1024, mixedNoCropHeight],
  })

  await runImageTest({
    testName: "Crop: Larger landscape (2000x1000) to size 1024",
    imgWidth: 2000, imgHeight: 1000, targetSize: 1024, crop: true,
    expectedCanvasWidth: 1024, expectedCanvasHeight: 1024,
    expectedDrawImageArgs: [500, 0, 2000, 1000, 0, 0, 2000 * (1024/1000), 1000 * (1024/1000)],
  })

  await runImageTest({
    testName: "Crop: Larger portrait (1000x2000) to size 1024",
    imgWidth: 1000, imgHeight: 2000, targetSize: 1024, crop: true,
    expectedCanvasWidth: 1024, expectedCanvasHeight: 1024,
    expectedDrawImageArgs: [0, 500, 1000, 2000, 0, 0, 1000 * (1024/1000), 2000 * (1024/1000)],
  })
  
  const smallerCropRatio = 1024 / 250
  await runImageTest({
    testName: "Crop: Smaller image (500x250) to size 1024 (scales up then crops)",
    imgWidth: 500, imgHeight: 250, targetSize: 1024, crop: true,
    expectedCanvasWidth: 1024, expectedCanvasHeight: 1024,
    expectedDrawImageArgs: [125, 0, 500, 250, 0, 0, 500 * smallerCropRatio, 250 * smallerCropRatio],
  })

  const mixedCropRatio = 1024 / 800
  await runImageTest({
    testName: "Crop: Mixed dimensions (1200x800) to size 1024",
    imgWidth: 1200, imgHeight: 800, targetSize: 1024, crop: true,
    expectedCanvasWidth: 1024, expectedCanvasHeight: 1024,
    expectedDrawImageArgs: [200, 0, 1200, 800, 0, 0, 1200 * mixedCropRatio, 800 * mixedCropRatio],
  })
  
  await runImageTest({
    testName: "NoCrop: Square image (2000x2000) to size 1024",
    imgWidth: 2000, imgHeight: 2000, targetSize: 1024, crop: false,
    expectedCanvasWidth: 1024, expectedCanvasHeight: 1024,
    expectedDrawImageArgs: [0, 0, 2000, 2000, 0, 0, 1024, 1024],
  })

  const squareCropRatio = 1024 / 2000
  await runImageTest({
    testName: "Crop: Square image (2000x2000) to size 1024",
    imgWidth: 2000, imgHeight: 2000, targetSize: 1024, crop: true,
    expectedCanvasWidth: 1024, expectedCanvasHeight: 1024,
    expectedDrawImageArgs: [0, 0, 2000, 2000, 0, 0, 2000 * squareCropRatio, 2000 * squareCropRatio],
  })
}

// --- Organize tests for the new runner ---
const allTests = [
  testImageToPngLoaded,
  testAllImageProcessingScenarios, // This will run all the runImageTest calls
  testImageLoadError
]

// --- Run tests using the utility ---
// The runTestsFromUtils function handles console logging, summary, and process.exit
runTestsFromUtils("imageToPng.test.js", allTests).catch(err => {
  // This catch is for truly unexpected errors in runTestsFromUtils itself or during its setup.
  // Individual test failures are handled within runTestsFromUtils.
  console.error("\nCritical Error during test execution:", err)
  process.exit(1); // Ensure exit on critical error
})

// No need to export assertEquals as it's now imported from testUtils by any file that needs it.
// If other files were *relying* on this specific file's export, that would be a different refactoring concern.
// For now, assuming test files are self-contained or use the central testUtils.
// module.exports = { assertEquals }
