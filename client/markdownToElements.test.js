// --- Imports ---
console.log("Test script starting..."); // Debug log

// Assuming a CommonJS-like environment for tests if not running in a browser
// If this were to run in a browser, markdownToElements would be global.
// For this setup, we'll imagine a build step or test runner handles the import.
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
            innerText: '', // For cases where text might be directly set
            setAttribute: function(name, value) {
                this.attributes[name] = value === undefined ? '' : String(value);
            },
            appendChild: function(child) {
                if (typeof child === 'string') {
                    // Simulate TextNode behavior for simplicity in toString
                    this.children.push(child);
                } else {
                    this.children.push(child);
                }
            },
            // A simple way to represent the element for assertions
            toString: function() {
                let attrs = Object.entries(this.attributes)
                    .map(([k,v]) => `${k}="${v}"`)
                    .sort() // Ensure consistent order for comparison
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
        element.appendChild(values[0] || '');
    } else if (htmlString.startsWith("img[alt=$1][src=$2]")) {
        element = mockDocument.createElement('img');
        element.setAttribute('alt', values[0]);
        element.setAttribute('src', values[1]);
    } else if (htmlString.startsWith("a[href=$1][big=$2] $3")) {
        element = mockDocument.createElement('a');
        element.setAttribute('href', values[0]);
        element.setAttribute('big', values[1]);
        element.appendChild(values[2] || '');
    } else if (htmlString.startsWith("audio[controls][src=$1]")) {
        element = mockDocument.createElement('audio');
        element.setAttribute('controls', '');
        element.setAttribute('src', values[0]);
    } else if (htmlString.startsWith("li $1")) {
        element = mockDocument.createElement('li');
        // The original code does some replacement, e.g. .replace(/^- /g, "").replace(/\*\*/g, "")
        // We'll assume the value passed in is already processed for the mock.
        element.appendChild(values[0] || '');
    } else {
        console.warn(`Unhandled mockDollarUtil case: ${htmlString}`);
        element = mockDocument.createElement('div'); // Fallback
        element.innerText = htmlString;
    }
    return element;
};

// --- Test Runner & Assertions ---
const testResults = {
    passed: 0,
    failed: 0,
    details: []
};

function assertEqual(actual, expected, message) {
    // Normalize to string for comparison. A deep comparison would be more robust
    // but this is simpler for this environment.
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
function testParagraphs() {
    const result = markdownToElements("Hello world");
    const p = mockDocument.createElement('p');
    const span = mockDollarUtil("span $1", ["Hello world"]);
    p.appendChild(span);
    assertEqual(result, [p], "Should create a single paragraph with a span");

    const resultMulti = markdownToElements("First line.\n\nSecond line.");
    const p1 = mockDocument.createElement('p');
    p1.appendChild(mockDollarUtil("span $1", ["First line."]));
    const p2 = mockDocument.createElement('p');
    p2.appendChild(mockDollarUtil("span $1", ["Second line."]));
    assertEqual(resultMulti, [p1, p2], "Should create two paragraphs for double line breaks");
}

function testBlockquotes() {
    const result = markdownToElements("> This is a quote");
    const p = mockDocument.createElement('p');
    p.setAttribute("quote", "");
    p.appendChild(mockDollarUtil("span $1", ["This is a quote"]));
    assertEqual(result, [p], "Should create a paragraph with quote attribute");
}

function testHeadersBold() { // Combined as '#' in original code sets 'bold' attribute
    const result = markdownToElements("# This is a heading");
    const p = mockDocument.createElement('p');
    p.setAttribute("bold", "");
    p.appendChild(mockDollarUtil("span $1", ["This is a heading"]));
    assertEqual(result, [p], "Should create a paragraph with bold attribute for # heading");
}

function testBoldDoubleAsterisk() {
    const result = markdownToElements("**This is bold**");
    const p = mockDocument.createElement('p');
    p.setAttribute("bold", "");
    p.appendChild(mockDollarUtil("span $1", ["This is bold"]));
    assertEqual(result, [p], "Should create a paragraph with bold attribute for **bold**");
}

function testItalicsSingleAsterisk() {
    const result = markdownToElements("*This is italic*");
    const p = mockDocument.createElement('p');
    p.setAttribute("italic", "");
    p.appendChild(mockDollarUtil("span $1", ["This is italic"]));
    assertEqual(result, [p], "Should create a paragraph with italic attribute for *italic*");
}

function testHorizontalRule() {
    const result = markdownToElements("---");
    const p = mockDocument.createElement('p');
    p.setAttribute("hr", "");
    // Content becomes empty string, and no span should be appended if it's truly empty.
    // The original markdownToElements.js code, after setting p_content = "",
    // would only append a span if inserts were present or if the final p_content slice was non-empty.
    // Since p_content is empty and no inserts for "---", it should be an empty <p hr=""></p>.
    assertEqual(result, [p], "Should create a paragraph with hr attribute");
}

function testUnorderedList() {
    const input = "- item1\n- item2";
    const result = markdownToElements(input); // This will be a single "paragraph" block due to no \n\n
    
    const ul = mockDocument.createElement('ul');
    const li1 = mockDollarUtil("li $1", ["item1"]); // Original code replaces "- " from "item1"
    const li2 = mockDollarUtil("li $1", ["item2"]); // Original code replaces "- " from "item2"
    ul.appendChild(li1);
    ul.appendChild(li2);
    
    // The original function returns the <ul> directly, not wrapped in a <p>
    assertEqual(result, [ul], "Should create an unordered list");
}

function testOrderedList() {
    const input = "1. item1\n2. item2";
    const result = markdownToElements(input); // Single "paragraph" block
    
    const ol = mockDocument.createElement('ol');
    const li1 = mockDollarUtil("li $1", ["item1"]); // Original code replaces "1. "
    const li2 = mockDollarUtil("li $1", ["item2"]); // Original code replaces "2. "
    ol.appendChild(li1);
    ol.appendChild(li2);
    
    assertEqual(result, [ol], "Should create an ordered list");
}

function testImages() {
    const input = "Look ![alt text](image.png) this";
    const result = markdownToElements(input);
    
    const p = mockDocument.createElement('p');
    p.appendChild(mockDollarUtil("span $1", ["Look "]));
    const img = mockDollarUtil("img[alt=$1][src=$2]", ["alt text", "image.png"]);
    p.appendChild(img);
    // The original code replaces the image markdown with 'X's, so the remaining text is " this"
    // and `p_content.slice(offset)` correctly extracts it.
    p.appendChild(mockDollarUtil("span $1", [" this"])); 

    assertEqual(result, [p], "Should create a paragraph with an image");
}

function testLinks() {
    const input = "Click [link text](http://example.com) here";
    const result = markdownToElements(input);

    const p = mockDocument.createElement('p');
    p.appendChild(mockDollarUtil("span $1", ["Click "]));
    const link = mockDollarUtil("a[href=$1][big=$2] $3", ["http://example.com", false, "link text"]);
    p.appendChild(link);
    // Similar to images, the link markdown is replaced by 'Y's.
    p.appendChild(mockDollarUtil("span $1", [" here"]));

    assertEqual(result, [p], "Should create a paragraph with a link");
}

function testAutomaticUrlLinking() {
    const input = "Check http://example.com out";
    // Expected transformation by markdownToElements: "Check [example.com](http://example.com) out"
    // Then this is processed by the link handler.
    const result = markdownToElements(input);

    const p = mockDocument.createElement('p');
    p.appendChild(mockDollarUtil("span $1", ["Check "]));
    const link = mockDollarUtil("a[href=$1][big=$2] $3", ["http://example.com", false, "example.com"]);
    p.appendChild(link);
    p.appendChild(mockDollarUtil("span $1", [" out"]));
    
    assertEqual(result, [p], "Should automatically link URLs");
}

function testCombinedFeatures() {
    const input = "# **Hello**\n\n> And *this* is a [link](url.com) and an ![image](img.png)";
    const results = markdownToElements(input);

    // First paragraph: "# **Hello**"
    // -> p_content = "Hello" (after removing # and **)
    // -> p_element gets "bold" attribute.
    const p1 = mockDocument.createElement('p');
    p1.setAttribute("bold", ""); 
    p1.appendChild(mockDollarUtil("span $1", ["Hello"]));

    // Second paragraph: "> And *this* is a [link](url.com) and an ![image](img.png)"
    // -> p_element gets "quote" attribute.
    // -> p_content = "And *this* is a [link](url.com) and an ![image](img.png)" (after removing "> ")
    // -> No "italic" attribute because p_content doesn't start with "*"
    // -> Link and image are extracted.
    //    p_content becomes "And *this* is a YYYYYYYYYYYY and an XXXXXXXXXXXX"
    //    (where Y is placeholder for link, X for image)
    // -> Spans are created:
    //    1. "And *this* is a "
    //    2. link element
    //    3. " and an "
    //    4. image element
    const p2 = mockDocument.createElement('p');
    p2.setAttribute("quote", "");
    
    p2.appendChild(mockDollarUtil("span $1", ["And *this* is a "]));
    const link = mockDollarUtil("a[href=$1][big=$2] $3", ["url.com", false, "link"]);
    p2.appendChild(link);
    p2.appendChild(mockDollarUtil("span $1", [" and an "]));
    const img = mockDollarUtil("img[alt=$1][src=$2]", ["image", "img.png"]);
    p2.appendChild(img);

    assertEqual(results, [p1, p2], "Should handle combined markdown features across paragraphs");
}

function testListWithBold() {
    const input = "- **bold item**\n- normal item";
    const result = markdownToElements(input);
    const ul = mockDocument.createElement('ul');
    // The original function's list item processing:
    // li_content.replace(/^- /g, "").replace(/\*\*/g, "")
    // For "**bold item**", it becomes "bold item"
    // For "normal item", it remains "normal item"
    ul.appendChild(mockDollarUtil("li $1", ["bold item"]));
    ul.appendChild(mockDollarUtil("li $1", ["normal item"]));
    assertEqual(result, [ul], "Should handle bold within unordered list items");
}

function testOrderedListWithBold() {
    const input = "1. **bold item**\n2. normal item";
    const result = markdownToElements(input);
    const ol = mockDocument.createElement('ol');
    // The original function's list item processing:
    // li_content.replace(/^\d. /g, "").replace(/\*\*/g, "")
    ol.appendChild(mockDollarUtil("li $1", ["bold item"]));
    ol.appendChild(mockDollarUtil("li $1", ["normal item"]));
    assertEqual(result, [ol], "Should handle bold within ordered list items");
}


// --- Run Tests ---
async function runAllTests() {
    // In a real test environment, document and $ would be globally available
    // or properly set up in a test setup file.
    global.document = mockDocument;
    global.$ = mockDollarUtil;

    // Dynamically import the module to be tested
    console.log("Attempting to import markdownToElements.js..."); // Debug log
    try {
        // Simplify import for debugging
        const module = await import('./markdownToElements.js');
        markdownToElements = module.markdownToElements;
        console.log("markdownToElements.js imported successfully."); // Debug log
    } catch (e) {
        console.error("Failed to import markdownToElements:", e); // This should print if import fails
        testResults.details.push({
            status: 'ERROR',
            message: 'Failed to load markdownToElements.js. Ensure it is correctly exporting the function.',
            error: e.toString()
        });
        logResults();
        return;
    }

    // List of test functions
    const testsToRun = [
        testParagraphs,
        testBlockquotes,
        testHeadersBold,
        testBoldDoubleAsterisk,
        testItalicsSingleAsterisk,
        testHorizontalRule,
        testUnorderedList,
        testOrderedList,
        testImages,
        testLinks,
        testAutomaticUrlLinking,
        testCombinedFeatures,
        testListWithBold,
        testOrderedListWithBold
    ];

    // Execute all tests
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
            console.log(`\x1b[32mPASS\x1b[0m: ${detail.message}`); // Green for PASS
        } else if (detail.status === 'FAIL') {
            console.error(`\x1b[31mFAIL\x1b[0m: ${detail.message}`); // Red for FAIL
            console.error(`  Expected: ${detail.expected}`);
            console.error(`  Actual:   ${detail.actual}`);
        } else if (detail.status === 'ERROR') {
            console.error(`\x1b[31mERROR\x1b[0m: ${detail.message}`); // Red for ERROR
            if (detail.error) console.error(`  Error: ${detail.error}`);
            if (detail.stack) console.error(`  Stack: ${detail.stack}`);
        }
    });
    console.log("--------------------");
    console.log(`Total Passed: ${testResults.passed}`);
    console.log(`Total Failed: ${testResults.failed}`);
    console.log("--------------------");

    if (testResults.failed > 0 || testResults.details.some(d => d.status === 'ERROR')) {
        // console.error(`\x1b[31m${testResults.failed} tests failed and/or errors occurred.\x1b[0m`);
        // To ensure output is captured by the calling environment, avoid direct process.exit
        // throw new Error(`${testResults.failed} tests failed and/or errors occurred.`);
    } else {
        console.log("\x1b[32mAll tests passed!\x1b[0m");
    }
}

// --- Main execution ---
console.log("Calling runAllTests() directly..."); // Debug log
runAllTests().catch(err => {
    console.error("Unhandled error during test execution catch block:", err); // Debug log
    if (testResults.failed === 0 && testResults.passed === 0 && testResults.details.length === 0) {
         testResults.failed++; // Mark as failure if it aborts early and no results logged
         testResults.details.push({ status: 'ERROR', message: 'Test execution aborted early', error: err.toString() });
    }
    logResults(); // Log whatever results we have
});

// Note: Removed exports as this script is primarily for direct execution.
// If it were to be imported by another ES module test runner, exports would be kept.
