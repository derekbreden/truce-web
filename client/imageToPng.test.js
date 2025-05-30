const fs = require('fs');
const path = require('path');

// Mocking browser environment
let lastDrawImageArgs = null;
const mockCtx = {
  drawImage: (...args) => {
    lastDrawImageArgs = args;
  },
  getImageData: () => ({ data: new Uint8ClampedArray(4) }), // Minimal mock for alpha check
};

const mockCanvas = {
  width: 0,
  height: 0,
  getContext: () => mockCtx,
  toDataURL: (type) => {
    if (type === 'image/png') {
      return 'data:image/png;base64,mockpngdata';
    }
    return 'data:image/jpeg;base64,mockjpegdata';
  },
};

global.document = {
  createElement: (elementName) => {
    if (elementName === 'canvas') {
      return mockCanvas;
    }
    return {};
  },
};

global.Image = function() {
  this.src = '';
  this.naturalWidth = 0;
  this.naturalHeight = 0;
  this.width = 0;
  this.height = 0;
  this.onload = null;
  this.onerror = null;
  global.Image.lastInstance = this;
};

let imageToPng;

try {
  const imageToPngPath = path.resolve(__dirname, './imageToPng.js');
  const imageToPngCode = fs.readFileSync(imageToPngPath, 'utf8');
  imageToPng = new Function('Image', 'document', `${imageToPngCode}; return imageToPng;`)(
    global.Image,
    global.document
  );
} catch (error) {
  console.error("Failed to load imageToPng.js:", error);
  process.exit(1); 
}

// Test Results Storage and Assertion Function
const testResults = [];
let testsPassed = 0; 
let testsFailed = 0; 

function assertEquals(expected, actual, message) {
  if (expected === actual) {
    testResults.push({ status: 'PASS', message });
  } else {
    testResults.push({ status: 'FAIL', message, expected, actual });
  }
}

// Function to log results in the desired format
function logResults() {
  testsPassed = 0;
  testsFailed = 0;
  // console.log('\n--- Test Results ---'); // This will be done by runTests before calling this
  testResults.forEach(detail => {
    if (detail.status === 'PASS') {
      testsPassed++;
      console.log(`\x1b[32mPASS\x1b[0m: ${detail.message}`);
    } else {
      testsFailed++;
      console.error(`\x1b[31mFAIL\x1b[0m: ${detail.message}`);
      console.error(`  Expected: ${detail.expected}`);
      console.error(`  Actual: ${detail.actual}`);
    }
  });
}

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
  return new Promise((resolve, reject) => {
    const inputSrc = `data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7?w=${imgWidth}&h=${imgHeight}`;
    const expectedDataUrl = 'data:image/png;base64,mockpngdata';
    lastDrawImageArgs = null; 

    let toDataURLCalled = false;
    const originalToDataURL = mockCanvas.toDataURL; // Save original
    mockCanvas.toDataURL = (type) => { // Temporarily spy
      if (type === 'image/png') {
        toDataURLCalled = true;
      }
      return 'data:image/png;base64,mockpngdata'; // Ensure mock always returns this for consistency
    };

    const callback = (result) => {
      try {
        assertEquals(expectedDataUrl, result.url, `${testName}: Should convert to PNG successfully`);
        assertEquals(expectedCanvasWidth, result.width, `${testName}: Result canvas width should be ${expectedCanvasWidth}`);
        assertEquals(expectedCanvasHeight, result.height, `${testName}: Result canvas height should be ${expectedCanvasHeight}`);
        assertEquals(true, !!lastDrawImageArgs, `${testName}: drawImage should have been called`);
        assertEquals(true, toDataURLCalled, `${testName}: toDataURL('image/png') should have been called`);
        assertEquals(expectedCanvasWidth, mockCanvas.width, `${testName}: Mock canvas width should be set to ${expectedCanvasWidth}`);
        assertEquals(expectedCanvasHeight, mockCanvas.height, `${testName}: Mock canvas height should be set to ${expectedCanvasHeight}`);

        if (expectedDrawImageArgs && lastDrawImageArgs) {
          for (let i = 0; i < expectedDrawImageArgs.length; i++) {
            assertEquals(expectedDrawImageArgs[i], lastDrawImageArgs[i+1], `${testName}: drawImage argument index ${i} (value: ${expectedDrawImageArgs[i]})`);
          }
        }
        resolve();
      } catch (e) {
        testResults.push({ status: 'FAIL', message: `${testName}: Error during callback assertions: ${e.message}`, expected: 'No error', actual: e.toString() });
        reject(e);
      } finally {
        mockCanvas.toDataURL = originalToDataURL; // Restore original
      }
    };

    imageToPng(inputSrc, callback, targetSize, crop);

    if (!global.Image.lastInstance) {
      testResults.push({ status: 'FAIL', message: `[${testName}]: No image instance was created.`, expected: 'Image instance', actual: 'null/undefined' });
      return reject(new Error(`[${testName}] No image instance created.`));
    }
    
    assertEquals(inputSrc, global.Image.lastInstance.src, `${testName}: Image src should be set to inputSrc`);

    if (global.Image.lastInstance && typeof global.Image.lastInstance.onload === 'function') {
      global.Image.lastInstance.naturalWidth = imgWidth;
      global.Image.lastInstance.naturalHeight = imgHeight;
      global.Image.lastInstance.width = imgWidth;
      global.Image.lastInstance.height = imgHeight;
      global.Image.lastInstance.onload();
    } else {
      testResults.push({ status: 'FAIL', message: `[${testName}]: Image onload was not set or lastInstance is not available.`, expected: 'function', actual: typeof global.Image.lastInstance.onload });
      return reject(new Error(`[${testName}] Image onload not set.`));
    }
  });
}

// --- Test Definitions ---
function testImageToPngLoaded() {
  assertEquals(typeof imageToPng, "function", "imageToPng should be a function");
}

async function runAllImageProcessingTests() {
  await runImageTest({
    testName: "NoCrop: Larger landscape (2000x1000) to size 1024",
    imgWidth: 2000, imgHeight: 1000, targetSize: 1024, crop: false,
    expectedCanvasWidth: 1024, expectedCanvasHeight: 512,
    expectedDrawImageArgs: [0, 0, 2000, 1000, 0, 0, 1024, 512],
  });

  await runImageTest({
    testName: "NoCrop: Larger portrait (1000x2000) to size 1024",
    imgWidth: 1000, imgHeight: 2000, targetSize: 1024, crop: false,
    expectedCanvasWidth: 512, expectedCanvasHeight: 1024,
    expectedDrawImageArgs: [0, 0, 1000, 2000, 0, 0, 512, 1024],
  });

  await runImageTest({
    testName: "NoCrop: Smaller image (500x250) to size 1024 (scales up)",
    imgWidth: 500, imgHeight: 250, targetSize: 1024, crop: false,
    expectedCanvasWidth: 1024, expectedCanvasHeight: 512,
    expectedDrawImageArgs: [0, 0, 500, 250, 0, 0, 1024, 512],
  });

  const mixedNoCropHeight = 800 * (1024/1200);
  await runImageTest({
    testName: "NoCrop: Mixed dimensions (1200x800) to size 1024",
    imgWidth: 1200, imgHeight: 800, targetSize: 1024, crop: false,
    expectedCanvasWidth: 1024, expectedCanvasHeight: mixedNoCropHeight,
    expectedDrawImageArgs: [0, 0, 1200, 800, 0, 0, 1024, mixedNoCropHeight],
  });

  await runImageTest({
    testName: "Crop: Larger landscape (2000x1000) to size 1024",
    imgWidth: 2000, imgHeight: 1000, targetSize: 1024, crop: true,
    expectedCanvasWidth: 1024, expectedCanvasHeight: 1024,
    expectedDrawImageArgs: [500, 0, 2000, 1000, 0, 0, 2000 * (1024/1000), 1000 * (1024/1000)],
  });

  await runImageTest({
    testName: "Crop: Larger portrait (1000x2000) to size 1024",
    imgWidth: 1000, imgHeight: 2000, targetSize: 1024, crop: true,
    expectedCanvasWidth: 1024, expectedCanvasHeight: 1024,
    expectedDrawImageArgs: [0, 500, 1000, 2000, 0, 0, 1000 * (1024/1000), 2000 * (1024/1000)],
  });
  
  const smallerCropRatio = 1024 / 250;
  await runImageTest({
    testName: "Crop: Smaller image (500x250) to size 1024 (scales up then crops)",
    imgWidth: 500, imgHeight: 250, targetSize: 1024, crop: true,
    expectedCanvasWidth: 1024, expectedCanvasHeight: 1024,
    expectedDrawImageArgs: [125, 0, 500, 250, 0, 0, 500 * smallerCropRatio, 250 * smallerCropRatio],
  });

  const mixedCropRatio = 1024 / 800;
  await runImageTest({
    testName: "Crop: Mixed dimensions (1200x800) to size 1024",
    imgWidth: 1200, imgHeight: 800, targetSize: 1024, crop: true,
    expectedCanvasWidth: 1024, expectedCanvasHeight: 1024,
    expectedDrawImageArgs: [200, 0, 1200, 800, 0, 0, 1200 * mixedCropRatio, 800 * mixedCropRatio],
  });
  
  await runImageTest({
    testName: "NoCrop: Square image (2000x2000) to size 1024",
    imgWidth: 2000, imgHeight: 2000, targetSize: 1024, crop: false,
    expectedCanvasWidth: 1024, expectedCanvasHeight: 1024,
    expectedDrawImageArgs: [0, 0, 2000, 2000, 0, 0, 1024, 1024],
  });

  const squareCropRatio = 1024 / 2000;
  await runImageTest({
    testName: "Crop: Square image (2000x2000) to size 1024",
    imgWidth: 2000, imgHeight: 2000, targetSize: 1024, crop: true,
    expectedCanvasWidth: 1024, expectedCanvasHeight: 1024,
    expectedDrawImageArgs: [0, 0, 2000, 2000, 0, 0, 2000 * squareCropRatio, 2000 * squareCropRatio],
  });
}

// --- Test Runner ---
async function runTests() {
  console.log('\n--- Running imageToPng.test.js ---');
  testResults.length = 0; // Clear results for the run

  testImageToPngLoaded(); 

  try {
    await runAllImageProcessingTests();
  } catch (error) {
    // This catch is for unexpected errors during the orchestration of tests,
    // individual test failures (promise rejections from runImageTest) are handled by pushing to testResults.
    if (!testResults.find(r => r.message && r.message.includes(error.message))) { // Avoid duplicate error logging
        testResults.push({ status: 'FAIL', message: `Unexpected error during test suite execution: ${error.message || error}`, expected: 'Successful suite execution', actual: error.toString() });
    }
  }
  
  console.log('\n--- Test Results ---');
  logResults(); 

  console.log('\n--- Test Summary ---');
  console.log(`Total assertions: ${testResults.length}`);
  console.log(`Passed: ${testsPassed}`);
  console.log(`Failed: ${testsFailed}`);

  if (testsFailed > 0) {
    process.exit(1); 
  }
}

runTests().catch(err => {
  console.error("\nCritical Error during test execution:", err);
  process.exit(1);
});

module.exports = { assertEquals }; // Export for potential use if other files run tests this way
