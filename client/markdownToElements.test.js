// --- Imports ---
// fs is no longer directly needed for loading the main script
const path = require('path');
const { assertEquals, runTests: runTestsFromUtils } = require('./testUtils');
const { loadClientScript } = require('./testHelpers.js'); // Added

// Global variable for the function, will be loaded by loadClientScript
let markdownToElements;

// --- Mocks ---
// mockDocument and mockDollarUtil remain unchanged as per instructions
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
        element = mockDocument.createElement('div'); 
        element.innerText = htmlString;
    }
    return element;
};

// --- Load Function Under Test ---
// Setup global mocks needed for the function under test *before loading*
// These globals are still set for consistency or if any test utility directly uses them,
// but loadClientScript is the primary mechanism for injecting them into the script's scope.
global.document = mockDocument;
global.$ = mockDollarUtil;

try {
  markdownToElements = loadClientScript(
    path.join(__dirname, 'markdownToElements.js'),
    {
      // These are the globals markdownToElements.js expects
      "document": mockDocument, 
      "$": mockDollarUtil    
    }
  );
} catch (e) {
  console.error("Failed to load markdownToElements.js using testHelpers:", e);
  process.exit(1); 
}


// Helper function for stringifying results before assertion
function elementsToString(elements) {
    return Array.isArray(elements) ? mockDocument._elementsToString(elements) : (elements ? elements.toString() : String(elements));
}

// --- Test Cases ---
// (Test cases remain unchanged)
function prevTestParagraphs() {
    const result = markdownToElements("Hello world");
    const p = mockDocument.createElement('p');
    p.appendChild(mockDollarUtil("span $1", ["Hello world"]));
    assertEquals(elementsToString(result), elementsToString([p]), "Prev: Single paragraph with a span");

    const resultMulti = markdownToElements("First line.\n\nSecond line.");
    const p1 = mockDocument.createElement('p');
    p1.appendChild(mockDollarUtil("span $1", ["First line."]));
    const p2 = mockDocument.createElement('p');
    p2.appendChild(mockDollarUtil("span $1", ["Second line."]));
    assertEquals(elementsToString(resultMulti), elementsToString([p1, p2]), "Prev: Two paragraphs for double line breaks");
}

function prevTestBlockquotes() {
    const result = markdownToElements("> This is a quote");
    const p = mockDocument.createElement('p');
    p.setAttribute("quote", "");
    p.appendChild(mockDollarUtil("span $1", ["This is a quote"]));
    assertEquals(elementsToString(result), elementsToString([p]), "Prev: Paragraph with quote attribute");
}

function prevTestHeadersBold() { 
    const result = markdownToElements("# This is a heading");
    const p = mockDocument.createElement('p');
    p.setAttribute("bold", "");
    p.appendChild(mockDollarUtil("span $1", ["This is a heading"]));
    assertEquals(elementsToString(result), elementsToString([p]), "Prev: Paragraph with bold attribute for # heading");
}

function prevTestBoldDoubleAsterisk() {
    const result = markdownToElements("**This is bold**");
    const p = mockDocument.createElement('p');
    p.setAttribute("bold", "");
    p.appendChild(mockDollarUtil("span $1", ["This is bold"]));
    assertEquals(elementsToString(result), elementsToString([p]), "Prev: Paragraph with bold attribute for **bold**");
}

function prevTestItalicsSingleAsterisk() {
    const result = markdownToElements("*This is italic*");
    const p = mockDocument.createElement('p');
    p.setAttribute("italic", "");
    p.appendChild(mockDollarUtil("span $1", ["This is italic"]));
    assertEquals(elementsToString(result), elementsToString([p]), "Prev: Paragraph with italic attribute for *italic*");
}

function prevTestHorizontalRule() {
    const result = markdownToElements("---");
    const p = mockDocument.createElement('p');
    p.setAttribute("hr", "");
    assertEquals(elementsToString(result), elementsToString([p]), "Prev: Paragraph with hr attribute (no empty span)");
}

function prevTestUnorderedList() {
    const input = "- item1\n- item2"; 
    const result = markdownToElements(input); 
    const ul = mockDocument.createElement('ul');
    ul.appendChild(mockDollarUtil("li $1", ["item1"])); 
    ul.appendChild(mockDollarUtil("li $1", ["item2"]));
    assertEquals(elementsToString(result), elementsToString([ul]), "Prev: Unordered list");
}

function prevTestOrderedList() {
    const input = "1. item1\n2. item2"; 
    const result = markdownToElements(input); 
    const ol = mockDocument.createElement('ol');
    ol.appendChild(mockDollarUtil("li $1", ["item1"])); 
    ol.appendChild(mockDollarUtil("li $1", ["item2"]));
    assertEquals(elementsToString(result), elementsToString([ol]), "Prev: Ordered list");
}

function prevTestImages() { 
    const input = "Look ![alt text](image.png) this";
    const result = markdownToElements(input);
    const p = mockDocument.createElement('p');
    p.appendChild(mockDollarUtil("span $1", ["Look "]));
    p.appendChild(mockDollarUtil("img[alt=$1][src=$2]", ["alt text", "image.png"]));
    p.appendChild(mockDollarUtil("span $1", [" this"])); 
    assertEquals(elementsToString(result), elementsToString([p]), "Prev: Paragraph with an image");
}

function prevTestLinks() {
    const input = "Click [link text](http://example.com) here";
    const result = markdownToElements(input);
    const p = mockDocument.createElement('p');
    p.appendChild(mockDollarUtil("span $1", ["Click "]));
    p.appendChild(mockDollarUtil("a[href=$1][big=$2] $3", ["http://example.com", false, "link text"]));
    p.appendChild(mockDollarUtil("span $1", [" here"]));
    assertEquals(elementsToString(result), elementsToString([p]), "Prev: Paragraph with a link");
}

function prevTestAutomaticUrlLinking() {
    const input = "Check http://example.com out";
    const result = markdownToElements(input);
    const p = mockDocument.createElement('p');
    p.appendChild(mockDollarUtil("span $1", ["Check "]));
    p.appendChild(mockDollarUtil("a[href=$1][big=$2] $3", ["http://example.com", false, "example.com"]));
    p.appendChild(mockDollarUtil("span $1", [" out"]));
    assertEquals(elementsToString(result), elementsToString([p]), "Prev: Auto-linked URLs");
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
    assertEquals(elementsToString(results), elementsToString([p1, p2]), "Prev: Combined markdown features");
}

function prevTestListWithBold() {
    const input = "- **bold item**\n- normal item";
    const result = markdownToElements(input);
    const ul = mockDocument.createElement('ul');
    ul.appendChild(mockDollarUtil("li $1", ["bold item"]));
    ul.appendChild(mockDollarUtil("li $1", ["normal item"]));
    assertEquals(elementsToString(result), elementsToString([ul]), "Prev: Bold within unordered list items");
}

function prevTestOrderedListWithBold() {
    const input = "1. **bold item**\n2. normal item";
    const result = markdownToElements(input);
    const ol = mockDocument.createElement('ol');
    ol.appendChild(mockDollarUtil("li $1", ["bold item"]));
    ol.appendChild(mockDollarUtil("li $1", ["normal item"]));
    assertEquals(elementsToString(result), elementsToString([ol]), "Prev: Bold within ordered list items");
}

function testParagraphs() {
    const input = "Hello world";
    const p = mockDocument.createElement('p');
    const span = mockDocument.createElement('span');
    span.appendChild('Hello world');
    p.appendChild(span);
    assertEquals(elementsToString(markdownToElements(input)), elementsToString([p]), "Should create a single paragraph");

    const input2 = "Line 1\n\nLine 2";
    const p1 = mockDocument.createElement('p');
    const span1 = mockDocument.createElement('span');
    span1.appendChild('Line 1');
    p1.appendChild(span1);
    const p2 = mockDocument.createElement('p');
    const span2 = mockDocument.createElement('span');
    span2.appendChild('Line 2');
    p2.appendChild(span2);
    assertEquals(elementsToString(markdownToElements(input2)), elementsToString([p1, p2]), "Should create two paragraphs for double newline");
}

function testBlockquotes() {
    const input = "> This is a quote";
    const p = mockDocument.createElement('p');
    p.setAttribute('quote', '');
    const span = mockDocument.createElement('span');
    span.appendChild('This is a quote');
    p.appendChild(span);
    assertEquals(elementsToString(markdownToElements(input)), elementsToString([p]), "Should create a blockquote paragraph");
}

function testHeaders() {
    const input = "# Heading 1";
    const p = mockDocument.createElement('p');
    p.setAttribute('bold', '');
    const span = mockDocument.createElement('span');
    span.appendChild('Heading 1');
    p.appendChild(span);
    assertEquals(elementsToString(markdownToElements(input)), elementsToString([p]), "Should create a header (bold p-tag)");
}

function testBold() {
    const input = "**bold text**";
    const p = mockDocument.createElement('p');
    p.setAttribute('bold', '');
    const span = mockDocument.createElement('span');
    span.appendChild('bold text');
    p.appendChild(span);
    assertEquals(elementsToString(markdownToElements(input)), elementsToString([p]), "Should create bold text (bold p-tag)");
}

function testItalic() {
    const input = "*italic text*";
    const p = mockDocument.createElement('p');
    p.setAttribute('italic', '');
    const span = mockDocument.createElement('span');
    span.appendChild('italic text');
    p.appendChild(span);
    assertEquals(elementsToString(markdownToElements(input)), elementsToString([p]), "Should create italic text (italic p-tag)");
}

function testHorizontalRule() {
    const input = "---";
    const hr_mock = mockDocument.createElement('p');
    hr_mock.setAttribute('hr', '');
    assertEquals(elementsToString(markdownToElements(input)), elementsToString([hr_mock]), "Should create a horizontal rule element (p with hr attribute)");
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
    assertEquals(elementsToString(markdownToElements(input)), elementsToString([ul]), "Should create an unordered list");
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
    assertEquals(elementsToString(markdownToElements(input)), elementsToString([ol]), "Should create an ordered list");
}

function testImages() {
    const input = "![alt text](image.png)";
    const p = mockDocument.createElement('p');
    const img = mockDocument.createElement('img');
    img.setAttribute('alt', 'alt text');
    img.setAttribute('src', 'image.png');
    p.appendChild(img); 
    assertEquals(elementsToString(markdownToElements(input)), elementsToString([p]), "Should create an image directly in paragraph if it's the only content");
}

function testLinks() {
    const input = "[link text](http://example.com)";
    const p = mockDocument.createElement('p');
    const a = mockDocument.createElement('a');
    a.setAttribute('href', 'http://example.com');
    a.setAttribute('big', "true"); 
    a.appendChild('link text');
    p.appendChild(a); 
    assertEquals(elementsToString(markdownToElements(input)), elementsToString([p]), "Should create a link directly in paragraph if it's the only content");
}

function testAutomaticUrlLinking() {
    const input = "Check http://example.com out";
    const expected_p = mockDocument.createElement('p');
    const span1 = mockDocument.createElement('span'); 
    span1.appendChild('Check ');
    expected_p.appendChild(span1);

    const a = mockDocument.createElement('a'); 
    a.setAttribute('href', 'http://example.com');
    a.setAttribute('big', "false"); 
    a.appendChild('example.com'); 
    expected_p.appendChild(a);

    const span2 = mockDocument.createElement('span'); 
    span2.appendChild(' out');
    expected_p.appendChild(span2);

    assertEquals(elementsToString(markdownToElements(input)), elementsToString([expected_p]), "Should automatically link URLs and process them correctly with surrounding text");
}

// Stores all test functions
const allTestFunctions = [
    prevTestParagraphs,
    prevTestBlockquotes,
    prevTestHeadersBold,
    prevTestBoldDoubleAsterisk,
    prevTestItalicsSingleAsterisk,
    prevTestHorizontalRule,
    prevTestUnorderedList,
    prevTestOrderedList,
    prevTestImages,
    prevTestLinks,
    prevTestAutomaticUrlLinking,
    prevTestCombinedFeatures,
    prevTestListWithBold,
    prevTestOrderedListWithBold,
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
];

// --- Main execution ---
// The global assignments of document and $ are done before loading the script
// and also passed to loadClientScript, ensuring the script uses these mocks.
runTestsFromUtils("markdownToElements.test.js", allTestFunctions).catch(err => {
  console.error("\nCritical Error during test execution:", err);
  process.exit(1); 
});
