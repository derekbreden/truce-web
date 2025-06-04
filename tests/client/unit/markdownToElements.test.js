// --- Imports ---
const path = require('path');
const { assertEquals, runTests: runTestsFromUtils } = require('../shared/testUtils.js');
const { loadClientScript, createMockDocument, createMockWindow } = require('../shared/testHelpers.js'); // Updated imports

// Global variable for the function, will be loaded by loadClientScript
let markdownToElements;
let $; // To store the real flint's $

// --- Mocks ---
const mockDocument = createMockDocument();
const mockWindow = createMockWindow(mockDocument);

// --- Per-Test Setup Function ---
function beforeEachMarkdownTest() {
  // Clear any children added to head or body from previous tests
  if (mockDocument && mockDocument.body) {
    mockDocument.body.children = [];
    mockDocument.body.innerHTML = "";
    mockDocument.body.innerText = "";
  }
  if (mockDocument && mockDocument.head) {
    mockDocument.head.children = [];
    mockDocument.head.innerHTML = "";
    mockDocument.head.innerText = "";
  }
  // Also reset the _elements array used by mockDocument.querySelectorAll
  // to ensure test isolation for any selector logic that might be used
  // or if elements were added to _elements without being parented to body/head.
  if (mockDocument) {
    mockDocument._elements = [];
    // Re-add essential elements like html, head, body as createMockDocument does,
    // as clearing _elements removes them.
    // This is a simplified re-initialization; ideally, createMockDocument would be callable per test.
    if (!mockDocument.head) mockDocument.head = mockDocument.createElement('head'); else mockDocument.head.children = [];
    if (!mockDocument.body) mockDocument.body = mockDocument.createElement('body'); else mockDocument.body.children = [];
    if (!mockDocument.documentElement) {
        mockDocument.documentElement = mockDocument.createElement('html');
        mockDocument.documentElement.appendChild(mockDocument.head);
        mockDocument.documentElement.appendChild(mockDocument.body);
    }
    // Ensure these base elements are in _elements if not already due to createElement logic
    if (!mockDocument._elements.includes(mockDocument.documentElement)) mockDocument._elements.push(mockDocument.documentElement);
    if (!mockDocument._elements.includes(mockDocument.head)) mockDocument._elements.push(mockDocument.head);
    if (!mockDocument._elements.includes(mockDocument.body)) mockDocument._elements.push(mockDocument.body);
  }
}

// --- Load Flint ---
try {
  $ = loadClientScript(
    path.resolve(__dirname, '../../../client/flint.js'),
    { document: mockDocument, window: mockWindow },
    "$" // Ensure we get the '$' constant from flint.js
  );
  if (typeof $ !== 'function') {
    throw new Error("Failed to load flint.js '$' function.");
  }
} catch (e) {
  console.error("Failed to load flint.js:", e);
  process.exit(1);
}

// --- Load Function Under Test ---
try {
  markdownToElements = loadClientScript(
    path.join(__dirname, '../../../client/markdownToElements.js'),
    {
      // These are the globals markdownToElements.js expects
      "document": mockDocument, // The same mockDocument flint.js uses
      "$": $ // The REAL $ function from flint.js
    }
  );
} catch (e) {
  console.error("Failed to load markdownToElements.js using testHelpers:", e);
  process.exit(1);
}

// --- Test Cases ---
function testParagraphs() {
    beforeEachMarkdownTest();
    const input = "Hello world";
    const result = markdownToElements(input);

    assertEquals(result.length, 1, "Paragraph test: paragraph count");
    const pActual = result[0]; // This is a mock <p> element
    assertEquals(pActual.tagName, "P", "Paragraph test: p tagName");
    assertEquals(pActual.children.length, 1, "Paragraph test: p children count");

    const spanActual = pActual.children[0]; // This is a mock <span> element
    assertEquals(spanActual.tagName, "SPAN", "Paragraph test: span tagName");
    assertEquals(spanActual.innerText, "Hello world", "Paragraph test: span innerText");

    const input2 = "Line 1\n\nLine 2";
    const resultMulti = markdownToElements(input2);

    assertEquals(resultMulti.length, 2, "Multi-paragraph test: paragraph count");

    const p1Actual = resultMulti[0];
    assertEquals(p1Actual.tagName, "P", "Multi-paragraph test: p1 tagName");
    assertEquals(p1Actual.children.length, 1, "Multi-paragraph test: p1 children count");
    const span1Actual = p1Actual.children[0];
    assertEquals(span1Actual.tagName, "SPAN", "Multi-paragraph test: span1 tagName");
    assertEquals(span1Actual.innerText, "Line 1", "Multi-paragraph test: span1 innerText");

    const p2Actual = resultMulti[1];
    assertEquals(p2Actual.tagName, "P", "Multi-paragraph test: p2 tagName");
    assertEquals(p2Actual.children.length, 1, "Multi-paragraph test: p2 children count");
    const span2Actual = p2Actual.children[0];
    assertEquals(span2Actual.tagName, "SPAN", "Multi-paragraph test: span2 tagName");
    assertEquals(span2Actual.innerText, "Line 2", "Multi-paragraph test: span2 innerText");
}

function testBlockquotes() {
    beforeEachMarkdownTest();
    const input = "> This is a quote";
    const result = markdownToElements(input);

    assertEquals(result.length, 1, "Blockquote test: paragraph count");
    const pActual = result[0];
    assertEquals(pActual.tagName, "P", "Blockquote test: p tagName");
    assertEquals(pActual.getAttribute('quote'), "", "Blockquote test: p quote attribute");
    assertEquals(pActual.children.length, 1, "Blockquote test: p children count");
    const spanActual = pActual.children[0];
    assertEquals(spanActual.tagName, "SPAN", "Blockquote test: span tagName");
    assertEquals(spanActual.innerText, "This is a quote", "Blockquote test: span innerText");
}

function testHeaders() {
    beforeEachMarkdownTest();
    const input = "# Heading 1";
    const result = markdownToElements(input);

    assertEquals(result.length, 1, "Header test: paragraph count");
    const pActual = result[0];
    assertEquals(pActual.tagName, "P", "Header test: p tagName");
    assertEquals(pActual.getAttribute('bold'), "", "Header test: p bold attribute");
    assertEquals(pActual.children.length, 1, "Header test: p children count");
    const spanActual = pActual.children[0];
    assertEquals(spanActual.tagName, "SPAN", "Header test: span tagName");
    assertEquals(spanActual.innerText, "Heading 1", "Header test: span innerText");
}

function testBold() {
    beforeEachMarkdownTest();
    const input = "**bold text**";
    const result = markdownToElements(input);

    assertEquals(result.length, 1, "Bold test: paragraph count");
    const pActual = result[0];
    assertEquals(pActual.tagName, "P", "Bold test: p tagName");
    assertEquals(pActual.getAttribute('bold'), "", "Bold test: p bold attribute");
    assertEquals(pActual.children.length, 1, "Bold test: p children count");
    const spanActual = pActual.children[0];
    assertEquals(spanActual.tagName, "SPAN", "Bold test: span tagName");
    assertEquals(spanActual.innerText, "bold text", "Bold test: span innerText");
}

function testItalic() {
    beforeEachMarkdownTest();
    const input = "*italic text*";
    const result = markdownToElements(input);

    assertEquals(result.length, 1, "Italic test: paragraph count");
    const pActual = result[0];
    assertEquals(pActual.tagName, "P", "Italic test: p tagName");
    assertEquals(pActual.getAttribute('italic'), "", "Italic test: p italic attribute");
    assertEquals(pActual.children.length, 1, "Italic test: p children count");
    const spanActual = pActual.children[0];
    assertEquals(spanActual.tagName, "SPAN", "Italic test: span tagName");
    assertEquals(spanActual.innerText, "italic text", "Italic test: span innerText");
}

function testHorizontalRule() {
    beforeEachMarkdownTest();
    const input = "---";
    const result = markdownToElements(input);

    assertEquals(result.length, 1, "Horizontal Rule test: paragraph count");
    const pActual = result[0];
    assertEquals(pActual.tagName, "P", "Horizontal Rule test: p tagName");
    assertEquals(pActual.getAttribute('hr'), "", "Horizontal Rule test: p hr attribute");
    assertEquals(pActual.children.length, 0, "Horizontal Rule test: p children count (should be 0)");
}

function testUnorderedList() {
    beforeEachMarkdownTest();
    const input = "- item 1\n- item 2";
    const result = markdownToElements(input);

    assertEquals(result.length, 1, "Unordered List test: ul count");
    const ulActual = result[0]; // This is a mock <ul> element
    assertEquals(ulActual.tagName, "UL", "Unordered List test: ul tagName");
    assertEquals(ulActual.children.length, 2, "Unordered List test: ul children count");

    const li1Actual = ulActual.children[0]; // This is a mock <li> element
    assertEquals(li1Actual.tagName, "LI", "Unordered List test: li1 tagName");
    assertEquals(li1Actual.innerText, "item 1", "Unordered List test: li1 innerText");

    const li2Actual = ulActual.children[1]; // This is a mock <li> element
    assertEquals(li2Actual.tagName, "LI", "Unordered List test: li2 tagName");
    assertEquals(li2Actual.innerText, "item 2", "Unordered List test: li2 innerText");
}

function testOrderedList() {
    beforeEachMarkdownTest();
    const input = "1. item 1\n2. item 2";
    const result = markdownToElements(input);

    assertEquals(result.length, 1, "Ordered List test: ol count");
    const olActual = result[0]; // This is a mock <ol> element
    assertEquals(olActual.tagName, "OL", "Ordered List test: ol tagName");
    assertEquals(olActual.children.length, 2, "Ordered List test: ol children count");

    const li1Actual = olActual.children[0]; // This is a mock <li> element
    assertEquals(li1Actual.tagName, "LI", "Ordered List test: li1 tagName");
    assertEquals(li1Actual.innerText, "item 1", "Ordered List test: li1 innerText");

    const li2Actual = olActual.children[1]; // This is a mock <li> element
    assertEquals(li2Actual.tagName, "LI", "Ordered List test: li2 tagName");
    assertEquals(li2Actual.innerText, "item 2", "Ordered List test: li2 innerText");
}

function testImages() {
    beforeEachMarkdownTest();
    const input = "![alt text](image.png)";
    const result = markdownToElements(input);

    assertEquals(result.length, 1, "Image test: paragraph count");
    const pActual = result[0];
    assertEquals(pActual.tagName, "P", "Image test: p tagName");
    assertEquals(pActual.children.length, 1, "Image test: p children count");

    const imgActual = pActual.children[0];
    assertEquals(imgActual.tagName, "IMG", "Image test: img tagName");
    assertEquals(imgActual.getAttribute('alt'), "alt text", "Image test: img alt attribute");
    assertEquals(imgActual.getAttribute('src'), "image.png", "Image test: img src attribute");

    const inputMixed = "Text before ![alt text2](image2.png) text after";
    const resultMixed = markdownToElements(inputMixed);
    assertEquals(resultMixed.length, 1, "Image mixed content test: paragraph count");
    const pMixedActual = resultMixed[0];
    assertEquals(pMixedActual.tagName, "P", "Image mixed content test: p tagName");
    // Expected: <span>Text before </span><img><span> text after</span>
    assertEquals(pMixedActual.children.length, 3, "Image mixed content test: p children count");

    const span1Actual = pMixedActual.children[0];
    assertEquals(span1Actual.tagName, "SPAN", "Image mixed content test: span1 tagName");
    assertEquals(span1Actual.innerText, "Text before ", "Image mixed content test: span1 innerText");

    const img2Actual = pMixedActual.children[1];
    assertEquals(img2Actual.tagName, "IMG", "Image mixed content test: img2 tagName");
    assertEquals(img2Actual.getAttribute('alt'), "alt text2", "Image mixed content test: img2 alt attribute");
    assertEquals(img2Actual.getAttribute('src'), "image2.png", "Image mixed content test: img2 src attribute");

    const span2Actual = pMixedActual.children[2];
    assertEquals(span2Actual.tagName, "SPAN", "Image mixed content test: span2 tagName");
    assertEquals(span2Actual.innerText, " text after", "Image mixed content test: span2 innerText");
}

function testLinks() {
    beforeEachMarkdownTest();
    const input = "[link text](http://example.com)";
    const result = markdownToElements(input);

    assertEquals(result.length, 1, "Link test: paragraph count");
    const pActual = result[0];
    assertEquals(pActual.tagName, "P", "Link test: p tagName");
    assertEquals(pActual.children.length, 1, "Link test: p children count");

    const aActual = pActual.children[0];
    assertEquals(aActual.tagName, "A", "Link test: a tagName");
    assertEquals(aActual.getAttribute('href'), "http://example.com", "Link test: a href attribute");
    assertEquals(aActual.getAttribute('big'), "true", "Link test: a big attribute (single link on line)"); // Assuming it's considered 'big'
    assertEquals(aActual.innerText, "link text", "Link test: a innerText");

    const inputMixed = "Text before [link2](url2.com) text after";
    const resultMixed = markdownToElements(inputMixed);
    assertEquals(resultMixed.length, 1, "Link mixed content test: paragraph count");
    const pMixedActual = resultMixed[0];
    assertEquals(pMixedActual.tagName, "P", "Link mixed content test: p tagName");
    // Expected: <span>Text before </span><a><span> text after</span>
    assertEquals(pMixedActual.children.length, 3, "Link mixed content test: p children count");

    const span1Actual = pMixedActual.children[0];
    assertEquals(span1Actual.tagName, "SPAN", "Link mixed content test: span1 tagName");
    assertEquals(span1Actual.innerText, "Text before ", "Link mixed content test: span1 innerText");

    const a2Actual = pMixedActual.children[1];
    assertEquals(a2Actual.tagName, "A", "Link mixed content test: a2 tagName");
    assertEquals(a2Actual.getAttribute('href'), "url2.com", "Link mixed content test: a2 href attribute");
    assertEquals(a2Actual.getAttribute('big'), undefined, "Link mixed content test: a2 big attribute (mixed)");
    assertEquals(a2Actual.innerText, "link2", "Link mixed content test: a2 innerText");

    const span2Actual = pMixedActual.children[2];
    assertEquals(span2Actual.tagName, "SPAN", "Link mixed content test: span2 tagName");
    assertEquals(span2Actual.innerText, " text after", "Link mixed content test: span2 innerText");
}

function testAutomaticUrlLinking() {
    beforeEachMarkdownTest();
    const input = "Check http://example.com out";
    const result = markdownToElements(input);

    assertEquals(result.length, 1, "Auto URL test: paragraph count");
    const pActual = result[0];
    assertEquals(pActual.tagName, "P", "Auto URL test: p tagName");
    // Expected: <span>Check </span><a>http://example.com</a><span> out</span>
    assertEquals(pActual.children.length, 3, "Auto URL test: p children count");

    const span1Actual = pActual.children[0];
    assertEquals(span1Actual.tagName, "SPAN", "Auto URL test: span1 tagName");
    assertEquals(span1Actual.innerText, "Check ", "Auto URL test: span1 innerText");

    const aActual = pActual.children[1];
    assertEquals(aActual.tagName, "A", "Auto URL test: a tagName");
    assertEquals(aActual.getAttribute('href'), "http://example.com", "Auto URL test: a href attribute");
    assertEquals(aActual.getAttribute('big'), undefined, "Auto URL test: a big attribute");
    assertEquals(aActual.innerText, "example.com", "Auto URL test: a innerText");

    const span2Actual = pActual.children[2];
    assertEquals(span2Actual.tagName, "SPAN", "Auto URL test: span2 tagName");
    assertEquals(span2Actual.innerText, " out", "Auto URL test: span2 innerText");
}

// Stores all test functions
const allTestFunctions = [
    testParagraphs,
    testBlockquotes,
    testHeaders,
    testBold,
    testItalic,
    testHorizontalRule,
    testUnorderedList,
    testOrderedList,
    testImages,
    testLinks,
    testAutomaticUrlLinking,
    // testMockDollarTagProperty is removed
];

// --- Main execution ---
runTestsFromUtils("markdownToElements.test.js", allTestFunctions).catch(err => {
  console.error("\nCritical Error during test execution:", err);
  process.exit(1); 
});
