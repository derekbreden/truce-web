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
    if (p_content.includes("http")) {
      const matches = p_content.match(/http[^\s]*/)
      for (match of matches) {
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
        p_content = p_content.replace(match, `[${abbreviated}](${match})`)
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
      p_content = ""
    }

    // Support for -
    if (p_content.substr(0, 2) === "- ") {
      const li_contents = p_content.split("\n");
      if (li_contents.length > 1) {
        const $ul = document.createElement("ul");
        li_contents.forEach((li_content) => {
          li_content = li_content.trim();
          $ul.appendChild(
            $(
              `
              li $1
              `,
              [li_content.replace(/^- /g, "").replace(/\*\*/g, "")],
            ),
          );
        });
        return $ul;
      }
    }


    // Support for 1. 2. 3.
    if (
      p_content.substr(0, 3) === "1. " ||
      p_content.substr(0, 3) === "2. " ||
      p_content.substr(0, 3) === "3. " ||
      p_content.substr(0, 3) === "4. " ||
      p_content.substr(0, 3) === "5. " ||
      p_content.substr(0, 3) === "6. " ||
      p_content.substr(0, 3) === "7. " ||
      p_content.substr(0, 3) === "8. " ||
      p_content.substr(0, 3) === "9. "
    ) {
      const li_contents = p_content.split("\n");
      if (li_contents.length > 0) {
        const $ul = document.createElement("ol");
        li_contents.forEach((li_content) => {
          $ul.appendChild(
            $(
              `
              li $1
              `,
              [li_content.replace(/^\d. /g, "").replace(/\*\*/g, "")],
            ),
          );
        });
        return $ul;
      }
    }

    // Support for /mp3/
    if (p_content.substr(0, 5) === "/mp3/") {
      return $(
        `
        audio[controls][src=$1]
        `,
        [p_content],
      );
    }

    let inserts = [];
    let imgs;
    let links;

    // Support for ![alt](src)
    let p_content_remaining = p_content;
    let offset = 0;
    while ((imgs = p_content_remaining.match(/!\[([^\]]*)\]\(([^\)]*)\)/))) {
      const img_element = $(
        `
        img[alt=$1][src=$2]
        `,
        [imgs[1], imgs[2]],
      );
      let start = p_content_remaining.indexOf(imgs[0]);
      let finish = start + imgs[0].length;
      inserts.push([start + offset, finish + offset, img_element]);
      const to_replace = new Array(finish - start + 1).join("X");
      p_content =
        p_content.slice(0, start + offset) +
        to_replace +
        p_content.slice(finish + offset);
      offset += finish;
      p_content_remaining = p_content_remaining.slice(finish);
    }

    // Support for [text](href)
    p_content_remaining = p_content;
    offset = 0;
    while ((links = p_content_remaining.match(/\[([^\]]*)\]\(([^\)]*)\)/))) {
      const big = Boolean(links[0] === p_content_remaining && offset === 0);
      const link_element = $(
        `
        a[href=$1][big=$2] $3
        `,
        [links[2], big, links[1]],
      );
      let start = p_content_remaining.indexOf(links[0]);
      let finish = start + links[0].length;
      inserts.push([start + offset, finish + offset, link_element]);
      const to_replace = new Array(finish - start + 1).join("Y");
      p_content =
        p_content.slice(0, start + offset) +
        to_replace +
        p_content.slice(finish + offset);
      offset += finish;
      p_content_remaining = p_content_remaining.slice(finish);
    }

    // Now create elements for all the text around those inserts
    offset = 0;
    inserts.forEach((insert) => {
      if (insert[0] - offset > 0) {
        p_element.appendChild(
          $(
            `
            span $1
            `,
            [p_content.slice(offset, insert[0])],
          ),
        );
      }
      p_element.appendChild(insert[2]);
      offset = insert[1];
    });
    if (offset < p_content.length) {
      p_element.appendChild(
        $(
          `
          span $1
          `,
          [p_content.slice(offset)],
        ),
      );
    }

    // Finally return the completed <p> tag in the array
    return p_element;
  });
};
