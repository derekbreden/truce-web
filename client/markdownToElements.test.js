// --- Imports ---
const fs = require('fs');
const path = require('path');

// Global variable for the function, loaded synchronously
let markdownToElements;

// --- Mocks ---
const mockDocument = {
    _elementsToString: function(elements) {
        return elements.map(el => el.toString()).join('');
    },
    createElement: function(tagName) {
        const el = {
            tagName: tagName.toLowerCase(),
            attributes: {},
            children: [],
            innerText: '', 
            setAttribute: function(name, value) {
                this.attributes[name] = value === undefined ? '' : String(value);
            },
            appendChild: function(child) {
                if (typeof child === 'string') {
                    this.children.push(child); 
                } else if (child && typeof child.toString === 'function') {
                    this.children.push(child);
                } else if (child === null || child === undefined) {
                    // Do not append null or undefined
                } else {
                    this.children.push(String(child));
                }
            },
            toString: function() {
                let attrs = Object.entries(this.attributes)
                    .map(([k,v]) => `${k}="${v}"`)
                    .sort()
                    .join(' ');
                if (attrs) attrs = ' ' + attrs;

                let childrenHtml = this.children.map(c => {
                    if (typeof c === 'string') return c;
                    return c.toString();
                }).join('');
                return `<${this.tagName}${attrs}>${childrenHtml}</${this.tagName}>`;
            }
        };
        return el;
    }
};

const mockDollarUtil = (htmlString, values = []) => {
    htmlString = htmlString.trim();
    let element;

    if (htmlString.startsWith("span $1")) {
        element = mockDocument.createElement('span');
        if (values[0] !== undefined && values[0] !== null) {
          element.appendChild(String(values[0]));
        }
    } else if (htmlString.startsWith("img[alt=$1][src=$2]")) {
        element = mockDocument.createElement('img');
        element.setAttribute('alt', values[0]);
        element.setAttribute('src', values[1]);
    } else if (htmlString.startsWith("a[href=$1][big=$2] $3")) {
        element = mockDocument.createElement('a');
        element.setAttribute('href', values[0]);
        element.setAttribute('big', String(values[1]));
        if (values[2] !== undefined && values[2] !== null) {
          element.appendChild(String(values[2]));
        }
    } else if (htmlString.startsWith("audio[controls][src=$1]")) {
        element = mockDocument.createElement('audio');
        element.setAttribute('controls', '');
        element.setAttribute('src', values[0]);
    } else if (htmlString.startsWith("li $1")) {
        element = mockDocument.createElement('li');
        if (values[0] !== undefined && values[0] !== null) {
          element.appendChild(String(values[0]));
        }
    } else {
        // console.warn(`Unhandled mockDollarUtil case: ${htmlString}`); // Reduce noise for now
        element = mockDocument.createElement('div'); 
        element.innerText = htmlString;
    }
    return element;
};

// --- Load Function Under Test ---
try {
    console.log("Attempting to load markdownToElements.js using fs.readFileSync and new Function...");
    const markdownToElementsPath = path.join(__dirname, 'markdownToElements.js'); 
    const markdownToElementsFileContent = fs.readFileSync(markdownToElementsPath, 'utf8');
    markdownToElements = new Function('document', '$', `${markdownToElementsFileContent}; return markdownToElements;`)(mockDocument, mockDollarUtil);
    console.log("markdownToElements.js loaded successfully via new Function.");
} catch (e) {
    console.error("Failed to load markdownToElements.js using new Function:", e);
    process.exit(1); 
}

// --- Test Runner & Assertions ---
const testResults = {
    passed: 0,
    failed: 0,
    details: []
};

function assertEqual(actual, expected, message) {
    const actualStr = Array.isArray(actual) ? mockDocument._elementsToString(actual) : (actual ? actual.toString() : String(actual));
    const expectedStr = Array.isArray(expected) ? mockDocument._elementsToString(expected) : (expected ? expected.toString() : String(expected));

    if (actualStr !== expectedStr) {
        testResults.failed++;
        testResults.details.push({
            status: 'FAIL',
            message,
            expected: expectedStr,
            actual: actualStr
        });
    } else {
        testResults.passed++;
        testResults.details.push({
            status: 'PASS',
            message
        });
    }
}

// --- Test Cases ---
// Using only the "current" test cases as requested by subtask, plus any distinct "prev" ones.
// For this run, I'll use the combined list as it was before, ensuring all requested tests are present.

function prevTestParagraphs() {
    const result = markdownToElements("Hello world");
    const p = mockDocument.createElement('p');
    p.appendChild(mockDollarUtil("span $1", ["Hello world"]));
    assertEqual(result, [p], "Prev: Single paragraph with a span");

    const resultMulti = markdownToElements("First line.\n\nSecond line.");
    const p1 = mockDocument.createElement('p');
    p1.appendChild(mockDollarUtil("span $1", ["First line."]));
    const p2 = mockDocument.createElement('p');
    p2.appendChild(mockDollarUtil("span $1", ["Second line."]));
    assertEqual(resultMulti, [p1, p2], "Prev: Two paragraphs for double line breaks");
}

function prevTestBlockquotes() {
    const result = markdownToElements("> This is a quote");
    const p = mockDocument.createElement('p');
    p.setAttribute("quote", "");
    p.appendChild(mockDollarUtil("span $1", ["This is a quote"]));
    assertEqual(result, [p], "Prev: Paragraph with quote attribute");
}

function prevTestHeadersBold() { 
    const result = markdownToElements("# This is a heading");
    const p = mockDocument.createElement('p');
    p.setAttribute("bold", "");
    p.appendChild(mockDollarUtil("span $1", ["This is a heading"]));
    assertEqual(result, [p], "Prev: Paragraph with bold attribute for # heading");
}

function prevTestBoldDoubleAsterisk() {
    const result = markdownToElements("**This is bold**");
    const p = mockDocument.createElement('p');
    p.setAttribute("bold", "");
    p.appendChild(mockDollarUtil("span $1", ["This is bold"]));
    assertEqual(result, [p], "Prev: Paragraph with bold attribute for **bold**");
}

function prevTestItalicsSingleAsterisk() {
    const result = markdownToElements("*This is italic*");
    const p = mockDocument.createElement('p');
    p.setAttribute("italic", "");
    p.appendChild(mockDollarUtil("span $1", ["This is italic"]));
    assertEqual(result, [p], "Prev: Paragraph with italic attribute for *italic*");
}

function prevTestHorizontalRule() {
    const result = markdownToElements("---");
    const p = mockDocument.createElement('p');
    p.setAttribute("hr", "");
    assertEqual(result, [p], "Prev: Paragraph with hr attribute (no empty span)");
}

function prevTestUnorderedList() {
    const input = "- item1\n- item2"; // Corrected from prompt, original test used $util
    const result = markdownToElements(input); 
    const ul = mockDocument.createElement('ul');
    ul.appendChild(mockDollarUtil("li $1", ["item1"])); 
    ul.appendChild(mockDollarUtil("li $1", ["item2"]));
    assertEqual(result, [ul], "Prev: Unordered list");
}

function prevTestOrderedList() {
    const input = "1. item1\n2. item2"; // Corrected from prompt
    const result = markdownToElements(input); 
    const ol = mockDocument.createElement('ol');
    ol.appendChild(mockDollarUtil("li $1", ["item1"])); 
    ol.appendChild(mockDollarUtil("li $1", ["item2"]));
    assertEqual(result, [ol], "Prev: Ordered list");
}

function prevTestImages() { // This is the version of image test that passed previously
    const input = "Look ![alt text](image.png) this";
    const result = markdownToElements(input);
    const p = mockDocument.createElement('p');
    p.appendChild(mockDollarUtil("span $1", ["Look "]));
    p.appendChild(mockDollarUtil("img[alt=$1][src=$2]", ["alt text", "image.png"]));
    p.appendChild(mockDollarUtil("span $1", [" this"])); 
    assertEqual(result, [p], "Prev: Paragraph with an image");
}

function prevTestLinks() {
    const input = "Click [link text](http://example.com) here";
    const result = markdownToElements(input);
    const p = mockDocument.createElement('p');
    p.appendChild(mockDollarUtil("span $1", ["Click "]));
    p.appendChild(mockDollarUtil("a[href=$1][big=$2] $3", ["http://example.com", false, "link text"]));
    p.appendChild(mockDollarUtil("span $1", [" here"]));
    assertEqual(result, [p], "Prev: Paragraph with a link");
}

function prevTestAutomaticUrlLinking() {
    const input = "Check http://example.com out";
    const result = markdownToElements(input);
    const p = mockDocument.createElement('p');
    p.appendChild(mockDollarUtil("span $1", ["Check "]));
    p.appendChild(mockDollarUtil("a[href=$1][big=$2] $3", ["http://example.com", false, "example.com"]));
    p.appendChild(mockDollarUtil("span $1", [" out"]));
    assertEqual(result, [p], "Prev: Auto-linked URLs");
}

function prevTestCombinedFeatures() {
    const input = "# **Hello**\n\n> And *this* is a [link](url.com) and an ![image](img.png)";
    const results = markdownToElements(input);
    const p1 = mockDocument.createElement('p');
    p1.setAttribute("bold", ""); 
    p1.appendChild(mockDollarUtil("span $1", ["Hello"]));
    const p2 = mockDocument.createElement('p');
    p2.setAttribute("quote", "");
    p2.appendChild(mockDollarUtil("span $1", ["And *this* is a "]));
    p2.appendChild(mockDollarUtil("a[href=$1][big=$2] $3", ["url.com", false, "link"]));
    p2.appendChild(mockDollarUtil("span $1", [" and an "]));
    p2.appendChild(mockDollarUtil("img[alt=$1][src=$2]", ["image", "img.png"]));
    assertEqual(results, [p1, p2], "Prev: Combined markdown features");
}

function prevTestListWithBold() {
    const input = "- **bold item**\n- normal item";
    const result = markdownToElements(input);
    const ul = mockDocument.createElement('ul');
    ul.appendChild(mockDollarUtil("li $1", ["bold item"]));
    ul.appendChild(mockDollarUtil("li $1", ["normal item"]));
    assertEqual(result, [ul], "Prev: Bold within unordered list items");
}

function prevTestOrderedListWithBold() {
    const input = "1. **bold item**\n2. normal item";
    const result = markdownToElements(input);
    const ol = mockDocument.createElement('ol');
    ol.appendChild(mockDollarUtil("li $1", ["bold item"]));
    ol.appendChild(mockDollarUtil("li $1", ["normal item"]));
    assertEqual(result, [ol], "Prev: Bold within ordered list items");
}

// --- New Test Cases to Add (as per subtask) ---
function testParagraphs() {
    const input = "Hello world";
    const p = mockDocument.createElement('p');
    const span = mockDocument.createElement('span');
    span.appendChild('Hello world');
    p.appendChild(span);
    assertEqual(markdownToElements(input), [p], "Should create a single paragraph");

    const input2 = "Line 1\n\nLine 2";
    const p1 = mockDocument.createElement('p');
    const span1 = mockDocument.createElement('span');
    span1.appendChild('Line 1');
    p1.appendChild(span1);
    const p2 = mockDocument.createElement('p');
    const span2 = mockDocument.createElement('span');
    span2.appendChild('Line 2');
    p2.appendChild(span2);
    assertEqual(markdownToElements(input2), [p1, p2], "Should create two paragraphs for double newline");
}

function testBlockquotes() {
    const input = "> This is a quote";
    const p = mockDocument.createElement('p');
    p.setAttribute('quote', '');
    const span = mockDocument.createElement('span');
    span.appendChild('This is a quote');
    p.appendChild(span);
    assertEqual(markdownToElements(input), [p], "Should create a blockquote paragraph");
}

function testHeaders() {
    const input = "# Heading 1";
    const p = mockDocument.createElement('p');
    p.setAttribute('bold', '');
    const span = mockDocument.createElement('span');
    span.appendChild('Heading 1');
    p.appendChild(span);
    assertEqual(markdownToElements(input), [p], "Should create a header (bold p-tag)");
}

function testBold() {
    const input = "**bold text**";
    const p = mockDocument.createElement('p');
    p.setAttribute('bold', '');
    const span = mockDocument.createElement('span');
    span.appendChild('bold text');
    p.appendChild(span);
    assertEqual(markdownToElements(input), [p], "Should create bold text (bold p-tag)");
}

function testItalic() {
    const input = "*italic text*";
    const p = mockDocument.createElement('p');
    p.setAttribute('italic', '');
    const span = mockDocument.createElement('span');
    span.appendChild('italic text');
    p.appendChild(span);
    assertEqual(markdownToElements(input), [p], "Should create italic text (italic p-tag)");
}

function testHorizontalRule() {
    const input = "---";
    const hr_mock = mockDocument.createElement('p');
    hr_mock.setAttribute('hr', '');
    assertEqual(markdownToElements(input), [hr_mock], "Should create a horizontal rule element (p with hr attribute)");
}

function testUnorderedList() {
    const input = "- item 1\n- item 2";
    const ul = mockDocument.createElement('ul');
    const li1 = mockDocument.createElement('li');
    li1.appendChild('item 1');
    const li2 = mockDocument.createElement('li');
    li2.appendChild('item 2');
    ul.appendChild(li1);
    ul.appendChild(li2);
    assertEqual(markdownToElements(input), [ul], "Should create an unordered list");
}

function testOrderedList() {
    const input = "1. item 1\n2. item 2";
    const ol = mockDocument.createElement('ol');
    const li1 = mockDocument.createElement('li');
    li1.appendChild('item 1');
    const li2 = mockDocument.createElement('li');
    li2.appendChild('item 2');
    ol.appendChild(li1);
    ol.appendChild(li2);
    assertEqual(markdownToElements(input), [ol], "Should create an ordered list");
}

function testImages() {
    const input = "![alt text](image.png)";
    const p = mockDocument.createElement('p');
    const img = mockDocument.createElement('img');
    img.setAttribute('alt', 'alt text');
    img.setAttribute('src', 'image.png');
    p.appendChild(img); 
    assertEqual(markdownToElements(input), [p], "Should create an image directly in paragraph if it's the only content");
}

function testLinks() {
    const input = "[link text](http://example.com)";
    const p = mockDocument.createElement('p');
    const a = mockDocument.createElement('a');
    a.setAttribute('href', 'http://example.com');
    a.setAttribute('big', "true"); 
    a.appendChild('link text');
    p.appendChild(a); 
    assertEqual(markdownToElements(input), [p], "Should create a link directly in paragraph if it's the only content");
}

function testAutomaticUrlLinking() {
    const input = "Check http://example.com out";
    const expected_p = mockDocument.createElement('p');
    const span1 = mockDocument.createElement('span'); // Direct creation for precise expectation
    span1.appendChild('Check ');
    expected_p.appendChild(span1);

    const a = mockDocument.createElement('a'); // Direct creation
    a.setAttribute('href', 'http://example.com');
    a.setAttribute('big', "false"); 
    a.appendChild('example.com'); 
    expected_p.appendChild(a);

    const span2 = mockDocument.createElement('span'); // Direct creation
    span2.appendChild(' out');
    expected_p.appendChild(span2);

    assertEqual(markdownToElements(input), [expected_p], "Should automatically link URLs and process them correctly with surrounding text");
}
// --- End: Test Cases to Add ---

// Stores all test functions
let testsToRun = [];

function runAllTests() {
    console.log("Test script starting (runAllTests)...");
    global.document = mockDocument;
    global.$ = mockDollarUtil;
    
    testsToRun = []; 
    
    // Add PREVIOUS test functions (if any are distinct and still desired)
    // For this subtask, the prompt asks to add the *new* test cases.
    // I'll include the "prev" tests as they were there before the file "disappeared"
    // and ensure the new ones are also added.
    testsToRun.push(prevTestParagraphs);
    testsToRun.push(prevTestBlockquotes);
    testsToRun.push(prevTestHeadersBold);
    testsToRun.push(prevTestBoldDoubleAsterisk);
    testsToRun.push(prevTestItalicsSingleAsterisk);
    testsToRun.push(prevTestHorizontalRule);
    testsToRun.push(prevTestUnorderedList); // Note: prev uses $util for li, new uses direct append
    testsToRun.push(prevTestOrderedList);   // Note: prev uses $util for li, new uses direct append
    testsToRun.push(prevTestImages);        // Note: prev tests image with surrounding text
    testsToRun.push(prevTestLinks);         // Note: prev tests link with surrounding text
    testsToRun.push(prevTestAutomaticUrlLinking); // Note: prev uses $util for expected structure
    testsToRun.push(prevTestCombinedFeatures);
    testsToRun.push(prevTestListWithBold);
    testsToRun.push(prevTestOrderedListWithBold);

    // Add NEW test functions (from current subtask)
    // Some of these might test similar things as "prev" but are defined as per the prompt
    testsToRun.push(testParagraphs);
    testsToRun.push(testBlockquotes);
    testsToRun.push(testHeaders);
    testsToRun.push(testBold);
    testsToRun.push(testItalic);
    testsToRun.push(testHorizontalRule);
    testsToRun.push(testUnorderedList); // New version with direct append
    testsToRun.push(testOrderedList);   // New version with direct append
    testsToRun.push(testImages);        // New version for sole image
    testsToRun.push(testLinks);         // New version for sole link
    testsToRun.push(testAutomaticUrlLinking); // New version with direct creation of expected elements

    console.log(`Starting execution of ${testsToRun.length} test suites.`);
    for (const testFn of testsToRun) {
        try {
            testFn();
        } catch (e) {
            testResults.failed++;
            testResults.details.push({
                status: 'ERROR',
                message: `Error during test: ${testFn.name}`,
                error: e.toString(),
                stack: e.stack
            });
        }
    }
    logResults();
}

function logResults() {
    console.log("\n--- Test Results ---");
    testResults.details.forEach(detail => {
        if (detail.status === 'PASS') {
            console.log(`\x1b[32mPASS\x1b[0m: ${detail.message}`);
        } else if (detail.status === 'FAIL') {
            console.error(`\x1b[31mFAIL\x1b[0m: ${detail.message}`);
            console.error(`  Expected: ${detail.expected}`);
            console.error(`  Actual:   ${detail.actual}`);
        } else if (detail.status === 'ERROR') {
            console.error(`\x1b[31mERROR\x1b[0m: ${detail.message}`);
            if (detail.error) console.error(`  Error: ${detail.error}`);
            if (detail.stack) console.error(`  Stack: ${detail.stack}`);
        }
    });
    console.log("--------------------");
    console.log(`Total Passed: ${testResults.passed}`);
    console.log(`Total Failed: ${testResults.failed}`);
    console.log("--------------------");

    if (testResults.failed > 0 || testResults.details.some(d => d.status === 'ERROR')) {
        console.error(`\x1b[31m${testResults.failed} tests failed and/or errors occurred.\x1b[0m`);
    } else {
        console.log("\x1b[32mAll tests passed!\x1b[0m");
    }
}

// --- Main execution ---
console.log("Setting up to call runAllTests() (synchronous)...");
try {
    runAllTests();
} catch (err) {
    console.error("Unhandled error during test execution main catch block:", err);
    if (testResults.details.length === 0) { 
         testResults.failed++; 
         testResults.details.push({ status: 'ERROR', message: 'runAllTests aborted', error: err.toString() });
    }
    logResults(); 
}
