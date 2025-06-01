// --- Imports ---
// fs is no longer directly needed for loading the main script
const path = require('path');
const { assertEquals, runTests: runTestsFromUtils } = require('./testUtils');
const { loadClientScript, createMockDollar } = require('./testHelpers.js'); // Added

// Global variable for the function, will be loaded by loadClientScript
let markdownToElements;

// --- Mocks ---
// mockDocument and mockDollarUtil remain unchanged as per instructions
const mockDocument = {
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

// --- Load Function Under Test ---
// Setup global mocks needed for the function under test *before loading*
// These globals are still set for consistency or if any test utility directly uses them,
// but loadClientScript is the primary mechanism for injecting them into the script's scope.
global.document = mockDocument;
// global.$ = mockDollarUtil; // Removed as per instructions

try {
  markdownToElements = loadClientScript(
    path.join(__dirname, '../client/markdownToElements.js'),
    {
      // These are the globals markdownToElements.js expects
      "document": mockDocument, 
      "$": createMockDollar
    }
  );
} catch (e) {
  console.error("Failed to load markdownToElements.js using testHelpers:", e);
  process.exit(1); 
}

// --- Test Cases ---
// (Test cases remain unchanged)
function prevTestParagraphs() {
    const result = markdownToElements("Hello world");
    const p_expected = mockDocument.createElement('p');
    const span_expected = createMockDollar("span $1", ["Hello world"]);
    p_expected.appendChild(span_expected);

    assertEquals(result.length, 1, "Prev: Single paragraph with a span - paragraph count");
    const pActual = result[0];
    assertEquals(pActual.tagName, p_expected.tagName, "Prev: Single paragraph with a span - p tagName");
    assertEquals(pActual.children.length, 1, "Prev: Single paragraph with a span - p children count");
    const spanActual = pActual.children[0];
    assertEquals(spanActual.originalSelector, span_expected.originalSelector, "Prev: Single paragraph with a span - span originalSelector");
    assertEquals(JSON.stringify(spanActual.args), JSON.stringify(span_expected.args), "Prev: Single paragraph with a span - span args");

    const resultMulti = markdownToElements("First line.\n\nSecond line.");
    const p1_expected = mockDocument.createElement('p');
    const span1_expected = createMockDollar("span $1", ["First line."]);
    p1_expected.appendChild(span1_expected);
    const p2_expected = mockDocument.createElement('p');
    const span2_expected = createMockDollar("span $1", ["Second line."]);
    p2_expected.appendChild(span2_expected);

    assertEquals(resultMulti.length, 2, "Prev: Two paragraphs for double line breaks - paragraph count");
    const p1Actual = resultMulti[0];
    assertEquals(p1Actual.tagName, p1_expected.tagName, "Prev: Two paragraphs for double line breaks - p1 tagName");
    assertEquals(p1Actual.children.length, 1, "Prev: Two paragraphs for double line breaks - p1 children count");
    const span1Actual = p1Actual.children[0];
    assertEquals(span1Actual.originalSelector, span1_expected.originalSelector, "Prev: Two paragraphs for double line breaks - span1 originalSelector");
    assertEquals(JSON.stringify(span1Actual.args), JSON.stringify(span1_expected.args), "Prev: Two paragraphs for double line breaks - span1 args");

    const p2Actual = resultMulti[1];
    assertEquals(p2Actual.tagName, p2_expected.tagName, "Prev: Two paragraphs for double line breaks - p2 tagName");
    assertEquals(p2Actual.children.length, 1, "Prev: Two paragraphs for double line breaks - p2 children count");
    const span2Actual = p2Actual.children[0];
    assertEquals(span2Actual.originalSelector, span2_expected.originalSelector, "Prev: Two paragraphs for double line breaks - span2 originalSelector");
    assertEquals(JSON.stringify(span2Actual.args), JSON.stringify(span2_expected.args), "Prev: Two paragraphs for double line breaks - span2 args");
}

function prevTestBlockquotes() {
    const result = markdownToElements("> This is a quote");
    const p_expected = mockDocument.createElement('p');
    p_expected.setAttribute("quote", "");
    const span_expected = createMockDollar("span $1", ["This is a quote"]);
    p_expected.appendChild(span_expected);

    assertEquals(result.length, 1, "Prev: Paragraph with quote attribute - paragraph count");
    const pActual = result[0];
    assertEquals(pActual.tagName, p_expected.tagName, "Prev: Paragraph with quote attribute - p tagName");
    assertEquals(pActual.attributes.quote, "", "Prev: Paragraph with quote attribute - p quote attribute");
    assertEquals(pActual.children.length, 1, "Prev: Paragraph with quote attribute - p children count");
    const spanActual = pActual.children[0];
    assertEquals(spanActual.originalSelector, span_expected.originalSelector, "Prev: Paragraph with quote attribute - span originalSelector");
    assertEquals(JSON.stringify(spanActual.args), JSON.stringify(span_expected.args), "Prev: Paragraph with quote attribute - span args");
}

function prevTestHeadersBold() { 
    const result = markdownToElements("# This is a heading");
    const p_expected = mockDocument.createElement('p');
    p_expected.setAttribute("bold", "");
    const span_expected = createMockDollar("span $1", ["This is a heading"]);
    p_expected.appendChild(span_expected);

    assertEquals(result.length, 1, "Prev: Paragraph with bold attribute for # heading - paragraph count");
    const pActual = result[0];
    assertEquals(pActual.tagName, p_expected.tagName, "Prev: Paragraph with bold attribute for # heading - p tagName");
    assertEquals(pActual.attributes.bold, "", "Prev: Paragraph with bold attribute for # heading - p bold attribute");
    assertEquals(pActual.children.length, 1, "Prev: Paragraph with bold attribute for # heading - p children count");
    const spanActual = pActual.children[0];
    assertEquals(spanActual.originalSelector, span_expected.originalSelector, "Prev: Paragraph with bold attribute for # heading - span originalSelector");
    assertEquals(JSON.stringify(spanActual.args), JSON.stringify(span_expected.args), "Prev: Paragraph with bold attribute for # heading - span args");
}

function prevTestBoldDoubleAsterisk() {
    const result = markdownToElements("**This is bold**");
    const p_expected = mockDocument.createElement('p');
    p_expected.setAttribute("bold", "");
    const span_expected = createMockDollar("span $1", ["This is bold"]);
    p_expected.appendChild(span_expected);

    assertEquals(result.length, 1, "Prev: Paragraph with bold attribute for **bold** - paragraph count");
    const pActual = result[0];
    assertEquals(pActual.tagName, p_expected.tagName, "Prev: Paragraph with bold attribute for **bold** - p tagName");
    assertEquals(pActual.attributes.bold, "", "Prev: Paragraph with bold attribute for **bold** - p bold attribute");
    assertEquals(pActual.children.length, 1, "Prev: Paragraph with bold attribute for **bold** - p children count");
    const spanActual = pActual.children[0];
    assertEquals(spanActual.originalSelector, span_expected.originalSelector, "Prev: Paragraph with bold attribute for **bold** - span originalSelector");
    assertEquals(JSON.stringify(spanActual.args), JSON.stringify(span_expected.args), "Prev: Paragraph with bold attribute for **bold** - span args");
}

function prevTestItalicsSingleAsterisk() {
    const result = markdownToElements("*This is italic*");
    const p_expected = mockDocument.createElement('p');
    p_expected.setAttribute("italic", "");
    const span_expected = createMockDollar("span $1", ["This is italic"]);
    p_expected.appendChild(span_expected);

    assertEquals(result.length, 1, "Prev: Paragraph with italic attribute for *italic* - paragraph count");
    const pActual = result[0];
    assertEquals(pActual.tagName, p_expected.tagName, "Prev: Paragraph with italic attribute for *italic* - p tagName");
    assertEquals(pActual.attributes.italic, "", "Prev: Paragraph with italic attribute for *italic* - p italic attribute");
    assertEquals(pActual.children.length, 1, "Prev: Paragraph with italic attribute for *italic* - p children count");
    const spanActual = pActual.children[0];
    assertEquals(spanActual.originalSelector, span_expected.originalSelector, "Prev: Paragraph with italic attribute for *italic* - span originalSelector");
    assertEquals(JSON.stringify(spanActual.args), JSON.stringify(span_expected.args), "Prev: Paragraph with italic attribute for *italic* - span args");
}

function prevTestHorizontalRule() {
    const result = markdownToElements("---");
    const p_expected = mockDocument.createElement('p');
    p_expected.setAttribute("hr", "");

    assertEquals(result.length, 1, "Prev: Paragraph with hr attribute (no empty span) - paragraph count");
    const pActual = result[0];
    assertEquals(pActual.tagName, p_expected.tagName, "Prev: Paragraph with hr attribute (no empty span) - p tagName");
    assertEquals(pActual.attributes.hr, "", "Prev: Paragraph with hr attribute (no empty span) - p hr attribute");
    assertEquals(pActual.children.length, 0, "Prev: Paragraph with hr attribute (no empty span) - p children count");
}

function prevTestUnorderedList() {
    const input = "- item1\n- item2"; 
    const result = markdownToElements(input); 
    const ul_expected = mockDocument.createElement('ul');
    const li1_expected = createMockDollar("li $1", ["item1"]);
    const li2_expected = createMockDollar("li $1", ["item2"]);
    ul_expected.appendChild(li1_expected);
    ul_expected.appendChild(li2_expected);

    assertEquals(result.length, 1, "Prev: Unordered list - ul count");
    const ulActual = result[0];
    assertEquals(ulActual.tagName, ul_expected.tagName, "Prev: Unordered list - ul tagName");
    assertEquals(ulActual.children.length, 2, "Prev: Unordered list - ul children count");

    const li1Actual = ulActual.children[0];
    assertEquals(li1Actual.originalSelector, li1_expected.originalSelector, "Prev: Unordered list - li1 originalSelector");
    assertEquals(JSON.stringify(li1Actual.args), JSON.stringify(li1_expected.args), "Prev: Unordered list - li1 args");

    const li2Actual = ulActual.children[1];
    assertEquals(li2Actual.originalSelector, li2_expected.originalSelector, "Prev: Unordered list - li2 originalSelector");
    assertEquals(JSON.stringify(li2Actual.args), JSON.stringify(li2_expected.args), "Prev: Unordered list - li2 args");
}

function prevTestOrderedList() {
    const input = "1. item1\n2. item2"; 
    const result = markdownToElements(input); 
    const ol_expected = mockDocument.createElement('ol');
    const li1_expected = createMockDollar("li $1", ["item1"]);
    const li2_expected = createMockDollar("li $1", ["item2"]);
    ol_expected.appendChild(li1_expected);
    ol_expected.appendChild(li2_expected);

    assertEquals(result.length, 1, "Prev: Ordered list - ol count");
    const olActual = result[0];
    assertEquals(olActual.tagName, ol_expected.tagName, "Prev: Ordered list - ol tagName");
    assertEquals(olActual.children.length, 2, "Prev: Ordered list - ol children count");

    const li1Actual = olActual.children[0];
    assertEquals(li1Actual.originalSelector, li1_expected.originalSelector, "Prev: Ordered list - li1 originalSelector");
    assertEquals(JSON.stringify(li1Actual.args), JSON.stringify(li1_expected.args), "Prev: Ordered list - li1 args");

    const li2Actual = olActual.children[1];
    assertEquals(li2Actual.originalSelector, li2_expected.originalSelector, "Prev: Ordered list - li2 originalSelector");
    assertEquals(JSON.stringify(li2Actual.args), JSON.stringify(li2_expected.args), "Prev: Ordered list - li2 args");
}

function prevTestImages() { 
    const input = "Look ![alt text](image.png) this";
    const result = markdownToElements(input);
    const p_expected = mockDocument.createElement('p');
    const span1_expected = createMockDollar("span $1", ["Look "]);
    const img_expected = createMockDollar("img[alt=$1][src=$2]", ["alt text", "image.png"]);
    const span2_expected = createMockDollar("span $1", [" this"]);
    p_expected.appendChild(span1_expected);
    p_expected.appendChild(img_expected);
    p_expected.appendChild(span2_expected);

    assertEquals(result.length, 1, "Prev: Paragraph with an image - paragraph count");
    const pActual = result[0];
    assertEquals(pActual.tagName, p_expected.tagName, "Prev: Paragraph with an image - p tagName");
    assertEquals(pActual.children.length, 3, "Prev: Paragraph with an image - p children count");

    const span1Actual = pActual.children[0];
    assertEquals(span1Actual.originalSelector, span1_expected.originalSelector, "Prev: Paragraph with an image - span1 originalSelector");
    assertEquals(JSON.stringify(span1Actual.args), JSON.stringify(span1_expected.args), "Prev: Paragraph with an image - span1 args");

    const imgActual = pActual.children[1];
    assertEquals(imgActual.originalSelector, img_expected.originalSelector, "Prev: Paragraph with an image - img originalSelector");
    assertEquals(JSON.stringify(imgActual.args), JSON.stringify(img_expected.args), "Prev: Paragraph with an image - img args");

    const span2Actual = pActual.children[2];
    assertEquals(span2Actual.originalSelector, span2_expected.originalSelector, "Prev: Paragraph with an image - span2 originalSelector");
    assertEquals(JSON.stringify(span2Actual.args), JSON.stringify(span2_expected.args), "Prev: Paragraph with an image - span2 args");
}

function prevTestLinks() {
    const input = "Click [link text](http://example.com) here";
    const result = markdownToElements(input);
    const p_expected = mockDocument.createElement('p');
    const span1_expected = createMockDollar("span $1", ["Click "]);
    const a_expected = createMockDollar("a[href=$1][big=$2] $3", ["http://example.com", false, "link text"]);
    const span2_expected = createMockDollar("span $1", [" here"]);
    p_expected.appendChild(span1_expected);
    p_expected.appendChild(a_expected);
    p_expected.appendChild(span2_expected);

    assertEquals(result.length, 1, "Prev: Paragraph with a link - paragraph count");
    const pActual = result[0];
    assertEquals(pActual.tagName, p_expected.tagName, "Prev: Paragraph with a link - p tagName");
    assertEquals(pActual.children.length, 3, "Prev: Paragraph with a link - p children count");

    const span1Actual = pActual.children[0];
    assertEquals(span1Actual.originalSelector, span1_expected.originalSelector, "Prev: Paragraph with a link - span1 originalSelector");
    assertEquals(JSON.stringify(span1Actual.args), JSON.stringify(span1_expected.args), "Prev: Paragraph with a link - span1 args");

    const aActual = pActual.children[1];
    assertEquals(aActual.originalSelector, a_expected.originalSelector, "Prev: Paragraph with a link - a originalSelector");
    assertEquals(JSON.stringify(aActual.args), JSON.stringify(a_expected.args), "Prev: Paragraph with a link - a args");

    const span2Actual = pActual.children[2];
    assertEquals(span2Actual.originalSelector, span2_expected.originalSelector, "Prev: Paragraph with a link - span2 originalSelector");
    assertEquals(JSON.stringify(span2Actual.args), JSON.stringify(span2_expected.args), "Prev: Paragraph with a link - span2 args");
}

function prevTestAutomaticUrlLinking() {
    const input = "Check http://example.com out";
    const result = markdownToElements(input);
    const p_expected = mockDocument.createElement('p');
    const span1_expected = createMockDollar("span $1", ["Check "]);
    const a_expected = createMockDollar("a[href=$1][big=$2] $3", ["http://example.com", false, "example.com"]);
    const span2_expected = createMockDollar("span $1", [" out"]);
    p_expected.appendChild(span1_expected);
    p_expected.appendChild(a_expected);
    p_expected.appendChild(span2_expected);

    assertEquals(result.length, 1, "Prev: Auto-linked URLs - paragraph count");
    const pActual = result[0];
    assertEquals(pActual.tagName, p_expected.tagName, "Prev: Auto-linked URLs - p tagName");
    assertEquals(pActual.children.length, 3, "Prev: Auto-linked URLs - p children count");

    const span1Actual = pActual.children[0];
    assertEquals(span1Actual.originalSelector, span1_expected.originalSelector, "Prev: Auto-linked URLs - span1 originalSelector");
    assertEquals(JSON.stringify(span1Actual.args), JSON.stringify(span1_expected.args), "Prev: Auto-linked URLs - span1 args");

    const aActual = pActual.children[1];
    assertEquals(aActual.originalSelector, a_expected.originalSelector, "Prev: Auto-linked URLs - a originalSelector");
    assertEquals(JSON.stringify(aActual.args), JSON.stringify(a_expected.args), "Prev: Auto-linked URLs - a args");

    const span2Actual = pActual.children[2];
    assertEquals(span2Actual.originalSelector, span2_expected.originalSelector, "Prev: Auto-linked URLs - span2 originalSelector");
    assertEquals(JSON.stringify(span2Actual.args), JSON.stringify(span2_expected.args), "Prev: Auto-linked URLs - span2 args");
}

function prevTestCombinedFeatures() {
    const input = "# **Hello**\n\n> And *this* is a [link](url.com) and an ![image](img.png)";
    const results = markdownToElements(input);
    const p1_expected = mockDocument.createElement('p');
    p1_expected.setAttribute("bold", "");
    const span1_p1_expected = createMockDollar("span $1", ["Hello"]);
    p1_expected.appendChild(span1_p1_expected);

    const p2_expected = mockDocument.createElement('p');
    p2_expected.setAttribute("quote", "");
    const span1_p2_expected = createMockDollar("span $1", ["And *this* is a "]);
    const a_p2_expected = createMockDollar("a[href=$1][big=$2] $3", ["url.com", false, "link"]);
    const span2_p2_expected = createMockDollar("span $1", [" and an "]);
    const img_p2_expected = createMockDollar("img[alt=$1][src=$2]", ["image", "img.png"]);
    p2_expected.appendChild(span1_p2_expected);
    p2_expected.appendChild(a_p2_expected);
    p2_expected.appendChild(span2_p2_expected);
    p2_expected.appendChild(img_p2_expected);

    assertEquals(results.length, 2, "Prev: Combined markdown features - paragraph count");

    const p1Actual = results[0];
    assertEquals(p1Actual.tagName, p1_expected.tagName, "Prev: Combined markdown features - p1 tagName");
    assertEquals(p1Actual.attributes.bold, "", "Prev: Combined markdown features - p1 bold attribute");
    assertEquals(p1Actual.children.length, 1, "Prev: Combined markdown features - p1 children count");
    const span1_p1_Actual = p1Actual.children[0];
    assertEquals(span1_p1_Actual.originalSelector, span1_p1_expected.originalSelector, "Prev: Combined markdown features - p1 span originalSelector");
    assertEquals(JSON.stringify(span1_p1_Actual.args), JSON.stringify(span1_p1_expected.args), "Prev: Combined markdown features - p1 span args");

    const p2Actual = results[1];
    assertEquals(p2Actual.tagName, p2_expected.tagName, "Prev: Combined markdown features - p2 tagName");
    assertEquals(p2Actual.attributes.quote, "", "Prev: Combined markdown features - p2 quote attribute");
    assertEquals(p2Actual.children.length, 4, "Prev: Combined markdown features - p2 children count");

    const span1_p2_Actual = p2Actual.children[0];
    assertEquals(span1_p2_Actual.originalSelector, span1_p2_expected.originalSelector, "Prev: Combined markdown features - p2 span1 originalSelector");
    assertEquals(JSON.stringify(span1_p2_Actual.args), JSON.stringify(span1_p2_expected.args), "Prev: Combined markdown features - p2 span1 args");

    const a_p2_Actual = p2Actual.children[1];
    assertEquals(a_p2_Actual.originalSelector, a_p2_expected.originalSelector, "Prev: Combined markdown features - p2 a originalSelector");
    assertEquals(JSON.stringify(a_p2_Actual.args), JSON.stringify(a_p2_expected.args), "Prev: Combined markdown features - p2 a args");

    const span2_p2_Actual = p2Actual.children[2];
    assertEquals(span2_p2_Actual.originalSelector, span2_p2_expected.originalSelector, "Prev: Combined markdown features - p2 span2 originalSelector");
    assertEquals(JSON.stringify(span2_p2_Actual.args), JSON.stringify(span2_p2_expected.args), "Prev: Combined markdown features - p2 span2 args");

    const img_p2_Actual = p2Actual.children[3];
    assertEquals(img_p2_Actual.originalSelector, img_p2_expected.originalSelector, "Prev: Combined markdown features - p2 img originalSelector");
    assertEquals(JSON.stringify(img_p2_Actual.args), JSON.stringify(img_p2_expected.args), "Prev: Combined markdown features - p2 img args");
}

function prevTestListWithBold() {
    const input = "- **bold item**\n- normal item";
    const result = markdownToElements(input);
    const ul_expected = mockDocument.createElement('ul');
    const li1_expected = createMockDollar("li $1", ["bold item"]); // Markdown parser handles **bold item** -> "bold item" for li
    const li2_expected = createMockDollar("li $1", ["normal item"]);
    ul_expected.appendChild(li1_expected);
    ul_expected.appendChild(li2_expected);

    assertEquals(result.length, 1, "Prev: Bold within unordered list items - ul count");
    const ulActual = result[0];
    assertEquals(ulActual.tagName, ul_expected.tagName, "Prev: Bold within unordered list items - ul tagName");
    assertEquals(ulActual.children.length, 2, "Prev: Bold within unordered list items - ul children count");

    const li1Actual = ulActual.children[0];
    assertEquals(li1Actual.originalSelector, li1_expected.originalSelector, "Prev: Bold within unordered list items - li1 originalSelector");
    assertEquals(JSON.stringify(li1Actual.args), JSON.stringify(li1_expected.args), "Prev: Bold within unordered list items - li1 args");

    const li2Actual = ulActual.children[1];
    assertEquals(li2Actual.originalSelector, li2_expected.originalSelector, "Prev: Bold within unordered list items - li2 originalSelector");
    assertEquals(JSON.stringify(li2Actual.args), JSON.stringify(li2_expected.args), "Prev: Bold within unordered list items - li2 args");
}

function prevTestOrderedListWithBold() {
    const input = "1. **bold item**\n2. normal item";
    const result = markdownToElements(input);
    const ol_expected = mockDocument.createElement('ol');
    const li1_expected = createMockDollar("li $1", ["bold item"]); // Markdown parser handles **bold item** -> "bold item" for li
    const li2_expected = createMockDollar("li $1", ["normal item"]);
    ol_expected.appendChild(li1_expected);
    ol_expected.appendChild(li2_expected);

    assertEquals(result.length, 1, "Prev: Bold within ordered list items - ol count");
    const olActual = result[0];
    assertEquals(olActual.tagName, ol_expected.tagName, "Prev: Bold within ordered list items - ol tagName");
    assertEquals(olActual.children.length, 2, "Prev: Bold within ordered list items - ol children count");

    const li1Actual = olActual.children[0];
    assertEquals(li1Actual.originalSelector, li1_expected.originalSelector, "Prev: Bold within ordered list items - li1 originalSelector");
    assertEquals(JSON.stringify(li1Actual.args), JSON.stringify(li1_expected.args), "Prev: Bold within ordered list items - li1 args");

    const li2Actual = olActual.children[1];
    assertEquals(li2Actual.originalSelector, li2_expected.originalSelector, "Prev: Bold within ordered list items - li2 originalSelector");
    assertEquals(JSON.stringify(li2Actual.args), JSON.stringify(li2_expected.args), "Prev: Bold within ordered list items - li2 args");
}

function testParagraphs() {
    const input = "Hello world";
    const result = markdownToElements(input);

    const p_expected_props = { tagName: 'p', childrenLength: 1 };
    const span_expected_mock_dollar = createMockDollar("span $1", ["Hello world"]);

    assertEquals(result.length, 1, "Should create a single paragraph - paragraph count");
    const pActual = result[0];
    assertEquals(pActual.tagName, p_expected_props.tagName, "Should create a single paragraph - p tagName");
    assertEquals(pActual.children.length, p_expected_props.childrenLength, "Should create a single paragraph - p children count");

    const spanActual = pActual.children[0]; // This child is created by $ inside markdownToElements
    assertEquals(spanActual.originalSelector, span_expected_mock_dollar.originalSelector, "Should create a single paragraph - span originalSelector");
    assertEquals(JSON.stringify(spanActual.args), JSON.stringify(span_expected_mock_dollar.args), "Should create a single paragraph - span args");

    const input2 = "Line 1\n\nLine 2";
    const resultMulti = markdownToElements(input2);

    const p1_expected_props = { tagName: 'p', childrenLength: 1 };
    const span1_expected_mock_dollar = createMockDollar("span $1", ["Line 1"]);
    const p2_expected_props = { tagName: 'p', childrenLength: 1 };
    const span2_expected_mock_dollar = createMockDollar("span $1", ["Line 2"]);

    assertEquals(resultMulti.length, 2, "Should create two paragraphs for double newline - paragraph count");

    const p1Actual = resultMulti[0];
    assertEquals(p1Actual.tagName, p1_expected_props.tagName, "Should create two paragraphs for double newline - p1 tagName");
    assertEquals(p1Actual.children.length, p1_expected_props.childrenLength, "Should create two paragraphs for double newline - p1 children count");
    const span1Actual = p1Actual.children[0];
    assertEquals(span1Actual.originalSelector, span1_expected_mock_dollar.originalSelector, "Should create two paragraphs for double newline - span1 originalSelector");
    assertEquals(JSON.stringify(span1Actual.args), JSON.stringify(span1_expected_mock_dollar.args), "Should create two paragraphs for double newline - span1 args");

    const p2Actual = resultMulti[1];
    assertEquals(p2Actual.tagName, p2_expected_props.tagName, "Should create two paragraphs for double newline - p2 tagName");
    assertEquals(p2Actual.children.length, p2_expected_props.childrenLength, "Should create two paragraphs for double newline - p2 children count");
    const span2Actual = p2Actual.children[0];
    assertEquals(span2Actual.originalSelector, span2_expected_mock_dollar.originalSelector, "Should create two paragraphs for double newline - span2 originalSelector");
    assertEquals(JSON.stringify(span2Actual.args), JSON.stringify(span2_expected_mock_dollar.args), "Should create two paragraphs for double newline - span2 args");
}

function testBlockquotes() {
    const input = "> This is a quote";
    const result = markdownToElements(input);
    const p_expected_props = { tagName: 'p', attributes: { quote: '' }, childrenLength: 1 };
    const span_expected_mock_dollar = createMockDollar("span $1", ["This is a quote"]);

    assertEquals(result.length, 1, "Should create a blockquote paragraph - paragraph count");
    const pActual = result[0];
    assertEquals(pActual.tagName, p_expected_props.tagName, "Should create a blockquote paragraph - p tagName");
    assertEquals(pActual.attributes.quote, p_expected_props.attributes.quote, "Should create a blockquote paragraph - p quote attribute");
    assertEquals(pActual.children.length, p_expected_props.childrenLength, "Should create a blockquote paragraph - p children count");
    const spanActual = pActual.children[0];
    assertEquals(spanActual.originalSelector, span_expected_mock_dollar.originalSelector, "Should create a blockquote paragraph - span originalSelector");
    assertEquals(JSON.stringify(spanActual.args), JSON.stringify(span_expected_mock_dollar.args), "Should create a blockquote paragraph - span args");
}

function testHeaders() {
    const input = "# Heading 1";
    const result = markdownToElements(input);
    const p_expected_props = { tagName: 'p', attributes: { bold: '' }, childrenLength: 1 };
    const span_expected_mock_dollar = createMockDollar("span $1", ["Heading 1"]);

    assertEquals(result.length, 1, "Should create a header (bold p-tag) - paragraph count");
    const pActual = result[0];
    assertEquals(pActual.tagName, p_expected_props.tagName, "Should create a header (bold p-tag) - p tagName");
    assertEquals(pActual.attributes.bold, p_expected_props.attributes.bold, "Should create a header (bold p-tag) - p bold attribute");
    assertEquals(pActual.children.length, p_expected_props.childrenLength, "Should create a header (bold p-tag) - p children count");
    const spanActual = pActual.children[0];
    assertEquals(spanActual.originalSelector, span_expected_mock_dollar.originalSelector, "Should create a header (bold p-tag) - span originalSelector");
    assertEquals(JSON.stringify(spanActual.args), JSON.stringify(span_expected_mock_dollar.args), "Should create a header (bold p-tag) - span args");
}

function testBold() {
    const input = "**bold text**";
    const result = markdownToElements(input);
    const p_expected_props = { tagName: 'p', attributes: { bold: '' }, childrenLength: 1 };
    const span_expected_mock_dollar = createMockDollar("span $1", ["bold text"]);

    assertEquals(result.length, 1, "Should create bold text (bold p-tag) - paragraph count");
    const pActual = result[0];
    assertEquals(pActual.tagName, p_expected_props.tagName, "Should create bold text (bold p-tag) - p tagName");
    assertEquals(pActual.attributes.bold, p_expected_props.attributes.bold, "Should create bold text (bold p-tag) - p bold attribute");
    assertEquals(pActual.children.length, p_expected_props.childrenLength, "Should create bold text (bold p-tag) - p children count");
    const spanActual = pActual.children[0];
    assertEquals(spanActual.originalSelector, span_expected_mock_dollar.originalSelector, "Should create bold text (bold p-tag) - span originalSelector");
    assertEquals(JSON.stringify(spanActual.args), JSON.stringify(span_expected_mock_dollar.args), "Should create bold text (bold p-tag) - span args");
}

function testItalic() {
    const input = "*italic text*";
    const result = markdownToElements(input);
    const p_expected_props = { tagName: 'p', attributes: { italic: '' }, childrenLength: 1 };
    const span_expected_mock_dollar = createMockDollar("span $1", ["italic text"]);

    assertEquals(result.length, 1, "Should create italic text (italic p-tag) - paragraph count");
    const pActual = result[0];
    assertEquals(pActual.tagName, p_expected_props.tagName, "Should create italic text (italic p-tag) - p tagName");
    assertEquals(pActual.attributes.italic, p_expected_props.attributes.italic, "Should create italic text (italic p-tag) - p italic attribute");
    assertEquals(pActual.children.length, p_expected_props.childrenLength, "Should create italic text (italic p-tag) - p children count");
    const spanActual = pActual.children[0];
    assertEquals(spanActual.originalSelector, span_expected_mock_dollar.originalSelector, "Should create italic text (italic p-tag) - span originalSelector");
    assertEquals(JSON.stringify(spanActual.args), JSON.stringify(span_expected_mock_dollar.args), "Should create italic text (italic p-tag) - span args");
}

function testHorizontalRule() {
    const input = "---";
    const result = markdownToElements(input);
    const hr_mock_expected = mockDocument.createElement('p');
    hr_mock_expected.setAttribute('hr', '');

    assertEquals(result.length, 1, "Should create a horizontal rule element (p with hr attribute) - paragraph count");
    const pActual = result[0];
    assertEquals(pActual.tagName, hr_mock_expected.tagName, "Should create a horizontal rule element (p with hr attribute) - p tagName");
    assertEquals(pActual.attributes.hr, '', "Should create a horizontal rule element (p with hr attribute) - p hr attribute");
    assertEquals(pActual.children.length, 0, "Should create a horizontal rule element (p with hr attribute) - p children count");
}

function testUnorderedList() {
    const input = "- item 1\n- item 2";
    const result = markdownToElements(input);
    const ul_expected_props = { tagName: 'ul', childrenLength: 2 };
    const li1_expected_mock_dollar = createMockDollar("li $1", ["item 1"]);
    const li2_expected_mock_dollar = createMockDollar("li $1", ["item 2"]);

    assertEquals(result.length, 1, "Should create an unordered list - ul count");
    const ulActual = result[0];
    assertEquals(ulActual.tagName, ul_expected_props.tagName, "Should create an unordered list - ul tagName");
    assertEquals(ulActual.children.length, ul_expected_props.childrenLength, "Should create an unordered list - ul children count");

    const li1Actual = ulActual.children[0]; // This child is created by $ inside markdownToElements
    assertEquals(li1Actual.originalSelector, li1_expected_mock_dollar.originalSelector, "Should create an unordered list - li1 originalSelector");
    assertEquals(JSON.stringify(li1Actual.args), JSON.stringify(li1_expected_mock_dollar.args), "Should create an unordered list - li1 args");

    const li2Actual = ulActual.children[1]; // This child is created by $ inside markdownToElements
    assertEquals(li2Actual.originalSelector, li2_expected_mock_dollar.originalSelector, "Should create an unordered list - li2 originalSelector");
    assertEquals(JSON.stringify(li2Actual.args), JSON.stringify(li2_expected_mock_dollar.args), "Should create an unordered list - li2 args");
}

function testOrderedList() {
    const input = "1. item 1\n2. item 2";
    const result = markdownToElements(input);
    const ol_expected_props = { tagName: 'ol', childrenLength: 2 };
    const li1_expected_mock_dollar = createMockDollar("li $1", ["item 1"]);
    const li2_expected_mock_dollar = createMockDollar("li $1", ["item 2"]);

    assertEquals(result.length, 1, "Should create an ordered list - ol count");
    const olActual = result[0];
    assertEquals(olActual.tagName, ol_expected_props.tagName, "Should create an ordered list - ol tagName");
    assertEquals(olActual.children.length, ol_expected_props.childrenLength, "Should create an ordered list - ol children count");

    const li1Actual = olActual.children[0]; // This child is created by $ inside markdownToElements
    assertEquals(li1Actual.originalSelector, li1_expected_mock_dollar.originalSelector, "Should create an ordered list - li1 originalSelector");
    assertEquals(JSON.stringify(li1Actual.args), JSON.stringify(li1_expected_mock_dollar.args), "Should create an ordered list - li1 args");

    const li2Actual = olActual.children[1]; // This child is created by $ inside markdownToElements
    assertEquals(li2Actual.originalSelector, li2_expected_mock_dollar.originalSelector, "Should create an ordered list - li2 originalSelector");
    assertEquals(JSON.stringify(li2Actual.args), JSON.stringify(li2_expected_mock_dollar.args), "Should create an ordered list - li2 args");
}

function testImages() {
    const input = "![alt text](image.png)";
    const result = markdownToElements(input); // Returns [p]

    const p_expected_props = { tagName: 'p', childrenLength: 1 };
    // The child img is created by $ (createMockDollar)
    const img_expected_mock_dollar = createMockDollar("img[alt=$1][src=$2]", ["alt text", "image.png"]);

    assertEquals(result.length, 1, "Should create an image directly in paragraph if it's the only content - p count");
    const pActual = result[0];
    assertEquals(pActual.tagName, p_expected_props.tagName, "Should create an image directly in paragraph if it's the only content - p tagName");
    assertEquals(pActual.children.length, p_expected_props.childrenLength, "Should create an image directly in paragraph if it's the only content - p children count");

    const imgActual = pActual.children[0]; // This is a createMockDollar object
    assertEquals(imgActual.originalSelector, img_expected_mock_dollar.originalSelector, "Should create an image directly in paragraph if it's the only content - img originalSelector");
    assertEquals(JSON.stringify(imgActual.args), JSON.stringify(img_expected_mock_dollar.args), "Should create an image directly in paragraph if it's the only content - img args");
}

function testLinks() {
    const input = "[link text](http://example.com)";
    const result = markdownToElements(input); // Returns [p]

    const p_expected_props = { tagName: 'p', childrenLength: 1 };
    // The child 'a' is created by $ (createMockDollar)
    const a_expected_mock_dollar = createMockDollar("a[href=$1][big=$2] $3", ["http://example.com", true, "link text"]);

    assertEquals(result.length, 1, "Should create a link directly in paragraph if it's the only content - p count");
    const pActual = result[0];
    assertEquals(pActual.tagName, p_expected_props.tagName, "Should create a link directly in paragraph if it's the only content - p tagName");
    assertEquals(pActual.children.length, p_expected_props.childrenLength, "Should create a link directly in paragraph if it's the only content - p children count");

    const aActual = pActual.children[0]; // This is a createMockDollar object
    assertEquals(aActual.originalSelector, a_expected_mock_dollar.originalSelector, "Should create a link directly in paragraph if it's the only content - a originalSelector");
    assertEquals(JSON.stringify(aActual.args), JSON.stringify(a_expected_mock_dollar.args), "Should create a link directly in paragraph if it's the only content - a args");
}

function testAutomaticUrlLinking() {
    const input = "Check http://example.com out";
    const result = markdownToElements(input); // Returns [p]

    const p_expected_props = { tagName: 'p', childrenLength: 3 };
    const span1_expected_mock_dollar = createMockDollar("span $1", ["Check "]);
    const a_expected_mock_dollar = createMockDollar("a[href=$1][big=$2] $3", ["http://example.com", false, "example.com"]);
    const span2_expected_mock_dollar = createMockDollar("span $1", [" out"]);

    assertEquals(result.length, 1, "Should automatically link URLs - p count");
    const pActual = result[0];
    assertEquals(pActual.tagName, p_expected_props.tagName, "Should automatically link URLs - p tagName");
    assertEquals(pActual.children.length, p_expected_props.childrenLength, "Should automatically link URLs - p children count");

    const span1Actual = pActual.children[0]; // createMockDollar object
    assertEquals(span1Actual.originalSelector, span1_expected_mock_dollar.originalSelector, "Should automatically link URLs - span1 originalSelector");
    assertEquals(JSON.stringify(span1Actual.args), JSON.stringify(span1_expected_mock_dollar.args), "Should automatically link URLs - span1 args");

    const aActual = pActual.children[1]; // createMockDollar object
    assertEquals(aActual.originalSelector, a_expected_mock_dollar.originalSelector, "Should automatically link URLs - a originalSelector");
    assertEquals(JSON.stringify(aActual.args), JSON.stringify(a_expected_mock_dollar.args), "Should automatically link URLs - a args");

    const span2Actual = pActual.children[2]; // createMockDollar object
    assertEquals(span2Actual.originalSelector, span2_expected_mock_dollar.originalSelector, "Should automatically link URLs - span2 originalSelector");
    assertEquals(JSON.stringify(span2Actual.args), JSON.stringify(span2_expected_mock_dollar.args), "Should automatically link URLs - span2 args");
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
    testMockDollarTagProperty,
];

// --- Main execution ---
// The global assignments of document and $ are done before loading the script
// and also passed to loadClientScript, ensuring the script uses these mocks.
runTestsFromUtils("markdownToElements.test.js", allTestFunctions).catch(err => {
  console.error("\nCritical Error during test execution:", err);
  process.exit(1); 
});

function testMockDollarTagProperty() {
    const dollar = createMockDollar(); // Use the imported createMockDollar

    let element = dollar("div[id=test]");
    assertEquals(element._tag, "div", "Test mockDollar _tag: div[id=test]");

    element = dollar("span.myClass");
    assertEquals(element._tag, "span", "Test mockDollar _tag: span.myClass");

    element = dollar("button");
    assertEquals(element._tag, "button", "Test mockDollar _tag: button");

    element = dollar("#myId");
    assertEquals(element._tag, undefined, "Test mockDollar _tag: #myId");

    element = dollar(".myClass");
    assertEquals(element._tag, undefined, "Test mockDollar _tag: .myClass");

    // Test with template string
    element = dollar("h1 $1", ["Test Title"]);
    assertEquals(element._tag, "h1", "Test mockDollar _tag: h1 $1");

    // Test with an empty string selector
    element = dollar("");
    assertEquals(element._tag, undefined, "Test mockDollar _tag: empty string");

    // Test with a selector that is only special characters (edge case for regex)
    element = dollar("[attr=val]");
    assertEquals(element._tag, undefined, "Test mockDollar _tag: [attr=val]");
}
