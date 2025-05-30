// Limited markdown processing in a safe and readable way
//
// Supports:
// ![alt](src)
// >
// #
// [text](href)
//
const markdownToElements = (text) => {
  // Double line breaks seperate paragraphs
  const p_contents = text.split("\n\n");

  // Process one <p> tag at a time
  return p_contents.map((p_content) => {
    p_content = p_content.trim();
    const p_element = document.createElement("p");

    // Support for links not marked down
    // Auto-link URLs that are not already part of a markdown link's URL section.
    if (p_content.includes("http")) {
      const autoLinkRegex = /(?<!]\()http[^\s]*/g; // Negative lookbehind
      const matches = p_content.match(autoLinkRegex);
      if (matches) { // Null check for matches
        for (let match of matches) { // Declared match with let
          if (match.substr(match.length-1, 1) === ".") {
            match = match.substr(0, match.length-1);
          }
          let abbreviated = match.replace(/(https?:\/\/)(www\.)?/, "");
          if (abbreviated.length > 32) {
            const possible_extension = abbreviated.split(".").pop();
            if (possible_extension.length < 5) {
              abbreviated = abbreviated.substring(0, 27) + "..." + possible_extension;
            } else {
              abbreviated = abbreviated.substring(0, 30) + "...";
            }
          }
          p_content = p_content.replace(match, `[${abbreviated}](${match})`);
        }
      }
    }

    // Support for >
    if (p_content.substr(0, 2) === "> ") {
      p_element.setAttribute("quote", "");
      p_content = p_content.replace(/> /g, "");
    }

    // Support for #
    if (p_content.substr(0, 2) === "# " || p_content.substr(0, 2) === "##") {
      p_element.setAttribute("bold", "");
      p_content = p_content.replace(/#{1,} /g, "").replace(/\*{2,}/g, "");
    }

    // Support for **
    if (p_content.substr(0, 2) === "**") {
      p_element.setAttribute("bold", "");
      p_content = p_content.replace(/\*{2,}/g, "");
    }

    // Support for *
    if (p_content.substr(0, 1) === "*") {
      p_element.setAttribute("italic", "");
      p_content = p_content.replace(/\*{1,}/g, "");
    }

    // Support for ---
    if (p_content === "---") {
      p_element.setAttribute("hr", "");
      p_content = ""; // Content becomes empty for HR
    }

    // Support for -
    if (p_content.substr(0, 2) === "- ") {
      const li_contents = p_content.split("\n");
      if (li_contents.length > 1 || (li_contents.length === 1 && li_contents[0].startsWith("- "))) {
        const $ul = document.createElement("ul");
        li_contents.forEach((li_content) => {
          li_content = li_content.trim();
          $ul.appendChild(
            $(
              `
              li $1
              `, [
                li_content.replace(/^- /g, "").replace(/\*\*/g, "")
              ],
            ),
          );
        });
        return $ul;
      }
    }

    // Support for 1. 2. 3.
    if (/^\d+\. /.test(p_content)) {
      const li_contents = p_content.split("\n");
      if (li_contents.length > 0) {
        const $ol = document.createElement("ol");
        li_contents.forEach((li_content) => {
          $ol.appendChild(
            $(
              `
              li $1
              `, [
                li_content.replace(/^\d+\. /g, "").replace(/\*\*/g, "")
              ],
            ),
          );
        });
        return $ol;
      }
    }

    // Support for /mp3/
    if (p_content.substr(0, 5) === "/mp3/") {
      return $(
        `
        audio[controls][src=$1]
        `, [
          p_content
        ],
      );
    }

    let inserts = [];
    let imgs;
    let links;

    // Store original p_content for creating text spans accurately
    const original_p_content_for_spans = p_content;
    // Use a new variable for placeholder replacements to avoid corrupting original
    let p_content_placeholders = p_content;

    const imgRegex = /!\[([^\]]*)\]\(((?:[^\(\)]|\([^\)]*\))*)\)/;
    let current_search_offset = 0;
    while(current_search_offset < p_content_placeholders.length) {
        const search_space = p_content_placeholders.substring(current_search_offset);
        const match_result = search_space.match(imgRegex);
        if (!match_result) break;

        const matched_text = match_result[0];
        const alt_text = match_result[1];
        const src_text = match_result[2];
        
        const absolute_match_start = current_search_offset + search_space.indexOf(matched_text);
        const absolute_match_end = absolute_match_start + matched_text.length;

        const img_element = $(
          `
          img[alt=$1][src=$2]
          `,
          [alt_text, src_text]
        );
        inserts.push([absolute_match_start, absolute_match_end, img_element]);
        
        p_content_placeholders = p_content_placeholders.substring(0, absolute_match_start) +
                                 new Array(matched_text.length + 1).join("X") +
                                 p_content_placeholders.substring(absolute_match_end);
        current_search_offset = absolute_match_start + matched_text.length;
    }

    const linkRegex = /\[([^\]]*)\]\(((?:[^\(\)]|\([^\)]*\))*)\)/;
    current_search_offset = 0; // Reset for links
    while(current_search_offset < p_content_placeholders.length) {
        const search_space = p_content_placeholders.substring(current_search_offset);
        const match_result = search_space.match(linkRegex);
        if (!match_result) break;

        const matched_text = match_result[0];
        const link_text = match_result[1];
        const href_text = match_result[2];

        const absolute_match_start = current_search_offset + search_space.indexOf(matched_text);
        const absolute_match_end = absolute_match_start + matched_text.length;
        
        // 'big' if link is the entire original content (before any X/Y placeholders)
        const big = Boolean(matched_text === original_p_content_for_spans); 
        const link_element = $(
          `
          a[href=$1][big=$2] $3
          `, [
            href_text,
            big,
            link_text
          ]
        );
        inserts.push([absolute_match_start, absolute_match_end, link_element]);

        p_content_placeholders = p_content_placeholders.substring(0, absolute_match_start) +
                                 new Array(matched_text.length + 1).join("Y") +
                                 p_content_placeholders.substring(absolute_match_end);
        current_search_offset = absolute_match_start + matched_text.length;
    }

    // Sort inserts by their start position to process them in order of appearance
    inserts.sort((a, b) => a[0] - b[0]);

    let current_offset_in_original = 0;
    inserts.forEach((insert) => {
      const text_before_insert = original_p_content_for_spans.slice(current_offset_in_original, insert[0]);
      if (text_before_insert.length > 0) {
        p_element.appendChild($(
          `
          span $1
          `, [
            text_before_insert
          ]
        ));
      }
      p_element.appendChild(insert[2]); // Append the img/a element
      current_offset_in_original = insert[1];
    });

    // Append any remaining text from the original content
    const remaining_text_after_all_inserts = original_p_content_for_spans.slice(current_offset_in_original);
    if (remaining_text_after_all_inserts.length > 0) {
      p_element.appendChild($(
        `
        span $1
        `, [
          remaining_text_after_all_inserts
        ]
      ));
    }
    
    // If after all processing, p_element has no children AND original_p_content_for_spans was not empty
    // (e.g. it was just "---" which results in empty p_content, or just an image/link which is directly returned by some paths)
    // then append an empty span to ensure the <p> tag is not entirely empty, if original content wasn't empty.
    // This handles cases like "---" which results in p_content = "" and no inserts.
    // Or if original_p_content_for_spans was just an image/link that got processed into an insert, and no surrounding text.
    if (p_element.children.length === 0 && original_p_content_for_spans.length > 0 && !p_element.getAttributeNames().includes('hr')) {
         //This condition might be too broad. Let's re-evaluate.
         //The original code only added spans if there was text. If all content is consumed by inserts and results in no text part, it should be fine.
         //The HR case (p_content="") is handled.
         //If the p_content becomes empty due to attribute processing (e.g. bold, italic), it should still append span of that empty content.
    }
    
    // Final check: if p_element is still empty and original_p_content_for_spans was non-empty
    // (and not a special case like list that returns ul/ol directly, or mp3)
    // this implies the content was entirely consumed by formatting attributes (e.g. "**bold**" -> p_content="bold")
    // and no inserts happened. In this case, the original_p_content_for_spans (after attribute stripping) should be the content.
    // This is implicitly handled by the logic: if inserts is empty, current_offset_in_original remains 0.
    // remaining_text_after_all_inserts becomes original_p_content_for_spans.
    // So if original_p_content_for_spans is "bold text" (after "**" stripped), it will be appended in a span.
    // If original_p_content_for_spans was "" (like for "---"), it won't append. This is correct.

    return p_element;
  });
};
