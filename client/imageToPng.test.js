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
  // onload and onerror will be assigned by the code using the Image instance
  // e.g. img.onload = () => { ... }
  // We can trigger them manually in tests:
  //
  // const mockImageInstance = new Image();
  // mockImageInstance.onload(); // or mockImageInstance.onerror();

  // Store the last created instance for test manipulation
  global.Image.lastInstance = this;
};

// URL.createObjectURL and File/Blob mocks are not needed for this script.

let imageToPng;

try {
  const imageToPngPath = path.resolve(__dirname, './imageToPng.js');
  const imageToPngCode = fs.readFileSync(imageToPngPath, 'utf8');
  // Pass Image and document mocks into the function's scope
  imageToPng = new Function('Image', 'document', `${imageToPngCode}; return imageToPng;`)(
    global.Image,
    global.document
  );
} catch (error) {
  console.error("Failed to load imageToPng.js:", error);
  process.exit(1); // Exit if the main script can't be loaded
}

// Simple Assertion Function
let testsPassed = 0;
let testsFailed = 0;

function assertEquals(expected, actual, message) {
  if (expected === actual) {
    testsPassed++;
    console.log(`PASSED: ${message}`);
  } else {
    testsFailed++;
    console.error(`FAILED: ${message}`);
    console.error(`  Expected: ${expected}`);
    console.error(`  Actual: ${actual}`);
  }
}

// --- Test Cases Placeholder ---
console.log('\n--- Running imageToPng.test.js ---');

// --- Test Cases Placeholder ---
console.log('\n--- Running imageToPng.test.js ---');

// Test 1: Check if imageToPng function is loaded
function testImageToPngLoaded() {
  assertEquals(typeof imageToPng, "function", "imageToPng should be a function");
}

// Helper function for running image processing tests
function runImageTest({
  testName,
  imgWidth,
  imgHeight,
  targetSize,
  crop,
  expectedCanvasWidth,
  expectedCanvasHeight,
  expectedDrawImageArgs, // This will be an array [img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight]
                          // We will only check sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight (args[1] to args[8])
}) {
  return new Promise((resolve, reject) => {
    const inputSrc = `data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7?w=${imgWidth}&h=${imgHeight}`; // Dummy src, dimensions in query for info
    const expectedDataUrl = 'data:image/png;base64,mockpngdata';
    lastDrawImageArgs = null; // Reset for each test

    let toDataURLCalled = false;
    const originalToDataURL = mockCanvas.toDataURL;
    mockCanvas.toDataURL = (type) => {
      if (type === 'image/png') {
        toDataURLCalled = true;
      }
      return originalToDataURL(type);
    };

    const callback = (result) => {
      try {
        console.log(`Running: ${testName}`);
        assertEquals(expectedDataUrl, result.url, `${testName}: Should convert to PNG successfully`);
        assertEquals(expectedCanvasWidth, result.width, `${testName}: Result canvas width should be ${expectedCanvasWidth}`);
        assertEquals(expectedCanvasHeight, result.height, `${testName}: Result canvas height should be ${expectedCanvasHeight}`);
        assertEquals(true, !!lastDrawImageArgs, `${testName}: drawImage should have been called`);
        assertEquals(true, toDataURLCalled, `${testName}: toDataURL('image/png') should have been called`);
        assertEquals(expectedCanvasWidth, mockCanvas.width, `${testName}: Mock canvas width should be set to ${expectedCanvasWidth}`);
        assertEquals(expectedCanvasHeight, mockCanvas.height, `${testName}: Mock canvas height should be set to ${expectedCanvasHeight}`);

        if (expectedDrawImageArgs && lastDrawImageArgs) {
          // Compare drawImage arguments (excluding the img object itself)
          for (let i = 0; i < expectedDrawImageArgs.length; i++) {
            assertEquals(expectedDrawImageArgs[i], lastDrawImageArgs[i+1], `${testName}: drawImage argument ${i+1} (0-indexed for expected) should be ${expectedDrawImageArgs[i]}`);
          }
        }
        resolve();
      } catch (e) {
        console.error(`Error during test "${testName}":`, e);
        reject(e);
      } finally {
        mockCanvas.toDataURL = originalToDataURL; // Restore
      }
    };

    imageToPng(inputSrc, callback, targetSize, crop);

    if (!global.Image.lastInstance) {
      testsFailed++;
      console.error(`FAILED [${testName}]: No image instance was created.`);
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
      testsFailed++;
      console.error(`FAILED [${testName}]: Image onload was not set or lastInstance is not available.`);
      return reject(new Error(`[${testName}] Image onload not set.`));
    }
  });
}


// --- Test Cases ---

async function runAllImageProcessingTests() {
  // --- Default Resizing (No Crop) ---
  await runImageTest({
    testName: "NoCrop: Larger landscape (2000x1000) to size 1024",
    imgWidth: 2000, imgHeight: 1000, targetSize: 1024, crop: false,
    expectedCanvasWidth: 1024, expectedCanvasHeight: 512, // 2000/1000 = 2. 1024 / 2 = 512. Max dim is width.
    expectedDrawImageArgs: [0, 0, 2000, 1000, 0, 0, 1024, 512], // sx, sy, sW, sH, dx, dy, dW, dH
  });

  await runImageTest({
    testName: "NoCrop: Larger portrait (1000x2000) to size 1024",
    imgWidth: 1000, imgHeight: 2000, targetSize: 1024, crop: false,
    expectedCanvasWidth: 512, expectedCanvasHeight: 1024, // 1000/2000 = 0.5. 1024 * 0.5 = 512. Max dim is height.
    expectedDrawImageArgs: [0, 0, 1000, 2000, 0, 0, 512, 1024],
  });

  await runImageTest({
    testName: "NoCrop: Smaller image (500x250) to size 1024 (no resize expected)",
    imgWidth: 500, imgHeight: 250, targetSize: 1024, crop: false,
    expectedCanvasWidth: 500, expectedCanvasHeight: 250, // ratio = 1024/500 = 2.048. canvas.width = min(1024, 500 * 2.048) = 1024. Oh, wait.
                                                      // ratio = size / Math.max(w,h) = 1024 / 500 = 2.048
                                                      // canvas.width = Math.min(size, w*ratio) = Math.min(1024, 500*2.048) = Math.min(1024, 1024) = 1024
                                                      // canvas.height = Math.min(size, h*ratio) = Math.min(1024, 250*2.048) = Math.min(1024, 512) = 512
                                                      // So it *does* scale up if smaller.
    expectedCanvasWidth: 1024, expectedCanvasHeight: 512,
    expectedDrawImageArgs: [0, 0, 500, 250, 0, 0, 1024, 512],
  });

  await runImageTest({
    testName: "NoCrop: Mixed dimensions (1200x800) to size 1024 (width larger, height smaller)",
    imgWidth: 1200, imgHeight: 800, targetSize: 1024, crop: false,
    // ratio = 1024 / 1200 = 0.85333
    // canvas.width = Math.min(1024, 1200 * 0.85333) = Math.min(1024, 1024) = 1024
    // canvas.height = Math.min(1024, 800 * 0.85333) = Math.min(1024, 682.66) = 682 (assuming integer results)
    expectedCanvasWidth: 1024, expectedCanvasHeight: 682, // Math.round(800 * (1024/1200)) = 683. The script uses Math.min, so it will be floating point.
                                                       // Let's use integer for mock result, but the actual calculation might be float.
                                                       // The script's canvas.width/height are directly assigned, so they can be float.
                                                       // For testing, let's assume the environment truncates or rounds.
                                                       // The actual code is: (img.width * ratio) and (img.height * ratio)
                                                       // 1200 * (1024/1200) = 1024.   800 * (1024/1200) = 682.666...
                                                       // My mockCanvas.toDataURL returns fixed string, so result width/height from callback are what we check.
    // mockCanvas.width/height are set by the script. The script uses floating point numbers.
    expectedCanvasWidth: 1024, expectedCanvasHeight: 800 * (1024/1200),
    expectedDrawImageArgs: [0, 0, 1200, 800, 0, 0, 1024, 800 * (1024/1200)],
  });

  // --- Cropping (crop = true) ---
  await runImageTest({
    testName: "Crop: Larger landscape (2000x1000) to size 1024",
    imgWidth: 2000, imgHeight: 1000, targetSize: 1024, crop: true,
    expectedCanvasWidth: 1024, expectedCanvasHeight: 1024,
    // sx = Math.max(0,(img.width - img.height)/2) = Math.max(0, (2000-1000)/2) = 500
    // sy = Math.max(0,(img.height - img.width)/2) = Math.max(0, (1000-2000)/2) = 0
    // sWidth = img.width (2000), sHeight = img.height (1000)
    // dWidth = img_width = img.width * ratio = 2000 * (1024/1000) = 2048
    // dHeight = img_height = img.height * ratio = 1000 * (1024/1000) = 1024
    // drawImage(img, sx, sy, img.width, img.height, 0, 0, dWidth, dHeight) -- NO, this seems wrong based on code.
    // drawImage(img, sx, sy, sWH, sWH, 0, 0, size, size) where sWH is min(img.width, img.height)
    // The code is: ctx.drawImage(img, sx, sy, img.width, img.height, 0, 0, img_width, img_height)
    // img_width = img.width * ratio; img_height = img.height * ratio; ratio = size / Math.min(img.width, img.height)
    // ratio = 1024 / 1000 = 1.024
    // img_width_scaled = 2000 * 1.024 = 2048
    // img_height_scaled = 1000 * 1.024 = 1024
    // drawImage(img, 500, 0, 2000, 1000, 0, 0, 2048, 1024)
    expectedDrawImageArgs: [500, 0, 2000, 1000, 0, 0, 2048, 1024],
  });

  await runImageTest({
    testName: "Crop: Larger portrait (1000x2000) to size 1024",
    imgWidth: 1000, imgHeight: 2000, targetSize: 1024, crop: true,
    expectedCanvasWidth: 1024, expectedCanvasHeight: 1024,
    // ratio = 1024 / Math.min(1000,2000) = 1024/1000 = 1.024
    // sx = Math.max(0,(1000-2000)/2) = 0
    // sy = Math.max(0,(2000-1000)/2) = 500
    // sWidth = 1000, sHeight = 2000
    // img_width_scaled = 1000 * 1.024 = 1024
    // img_height_scaled = 2000 * 1.024 = 2048
    expectedDrawImageArgs: [0, 500, 1000, 2000, 0, 0, 1024, 2048],
  });
  
  await runImageTest({
    testName: "Crop: Smaller image (500x250) to size 1024", // Behavior: scales up then crops.
    imgWidth: 500, imgHeight: 250, targetSize: 1024, crop: true,
    expectedCanvasWidth: 1024, expectedCanvasHeight: 1024,
    // ratio = 1024 / Math.min(500,250) = 1024/250 = 4.096
    // sx = Math.max(0,(500-250)/2) = 125
    // sy = Math.max(0,(250-500)/2) = 0
    // sWidth = 500, sHeight = 250
    // img_width_scaled = 500 * 4.096 = 2048
    // img_height_scaled = 250 * 4.096 = 1024
    expectedDrawImageArgs: [125, 0, 500, 250, 0, 0, 2048, 1024],
  });

  await runImageTest({
    testName: "Crop: Mixed dimensions (1200x800) to size 1024 (W > size, H < size)",
    imgWidth: 1200, imgHeight: 800, targetSize: 1024, crop: true,
    expectedCanvasWidth: 1024, expectedCanvasHeight: 1024,
    // ratio = 1024 / Math.min(1200,800) = 1024/800 = 1.28
    // sx = Math.max(0,(1200-800)/2) = 200
    // sy = Math.max(0,(800-1200)/2) = 0
    // sWidth = 1200, sHeight = 800
    // img_width_scaled = 1200 * 1.28 = 1536
    // img_height_scaled = 800 * 1.28 = 1024
    expectedDrawImageArgs: [200, 0, 1200, 800, 0, 0, 1536, 1024],
  });
  
  // Special case: perfectly square image, no crop needed or crop doesn't change source region
   await runImageTest({
    testName: "NoCrop: Square image (2000x2000) to size 1024",
    imgWidth: 2000, imgHeight: 2000, targetSize: 1024, crop: false,
    expectedCanvasWidth: 1024, expectedCanvasHeight: 1024,
    expectedDrawImageArgs: [0, 0, 2000, 2000, 0, 0, 1024, 1024],
  });

  await runImageTest({
    testName: "Crop: Square image (2000x2000) to size 1024",
    imgWidth: 2000, imgHeight: 2000, targetSize: 1024, crop: true,
    expectedCanvasWidth: 1024, expectedCanvasHeight: 1024,
    // ratio = 1024 / 2000 = 0.512
    // sx = 0, sy = 0
    // img_width_scaled = 2000 * 0.512 = 1024
    // img_height_scaled = 2000 * 0.512 = 1024
    expectedDrawImageArgs: [0, 0, 2000, 2000, 0, 0, 1024, 1024],
  });
}

// --- Test Runner ---
async function runTests() {
  testImageToPngLoaded();
  await runAllImageProcessingTests();

  console.log('\n--- Test Summary ---');
  console.log(`Total tests: ${testsPassed + testsFailed}`);
  console.log(`Passed: ${testsPassed}`);
  console.log(`Failed: ${testsFailed}`);

  if (testsFailed > 0) {
    process.exit(1); // Indicate failure
  }
}

runTests().catch(err => {
  console.error("Error during test execution:", err);
  process.exit(1);
});

module.exports = { assertEquals }; // Export for potential use in other test files if needed
