/**
 * Flint.js - A minimalistic DOM manipulation library
 * ================================================
 *
 * Flint.js is a lightweight library designed to make DOM manipulation
 * easier and more intuitive. It provides a simple interface for
 * selecting elements, binding events, and creating new elements using
 * a template syntax.
 *
 * Usage Examples:
 * ---------------
 *
 * 1. Selecting and manipulating elements:
 *    const title = $('h1');
 *    title.innerText = "New Title";
 *
 * 2. Binding events:
 *    const button = $('button');
 *    button.on('click', () => {
 *      alert('Button clicked!');
 *    });
 *
 * 3. Creating new elements with template syntax:
 *    const newElement = $(`
 *      div
 *        h2 Title
 *        p This is a paragraph
 *        ul
 *          li Item 1
 *          li Item 2
 *    `);
 *    document.body.appendChild(newElement);
 *
 * 4. Using arguments in template:
 *    const listItem = $(`
 *      li[style=$1] $2
 *    `, ["color: red;", "Red Item"]);
 *    $('ul').appendChild(listItem);
 */

const $ = (selector_or_flint, flint_args_or_element) => {
  // Function to add helper methods to the selected elements
  const addHelpers = (element, $all) => {
    // Bind event listener
    element.on = element.addEventListener.bind(element);

    // Allow forEach even for single element
    element.forEach = (f) => $all.forEach(f);

    // Enable nested selection
    element.$ = (selector) => $(selector, element);
  };

  // Check if the input is a template string for creating new elements
  if (selector_or_flint.substr(0, 1) === "\n") {
    let flint = selector_or_flint;
    const flint_args = flint_args_or_element;

    // Split the template into lines and create nodes with their text and indentation level
    flint = flint
      .split("\n")
      .filter((x) => x.trim() !== "")
      .map((original_text) => {
        return {
          text: original_text.trim(),
          level: original_text.match(/^([\s]*)/)[0].length,
        };
      });

    // Helper function to create elements recursively from the nodes
    const createElement = (nodes, index = 0, parent = null) => {
      // Base case for recursion
      if (index >= nodes.length) {
        return null;
      }
      const node = nodes[index];

      // Extract attributes from the node text
      const attributes = (node.text.match(/\[[^\]]*\]/g) || []).map((attr) => {
        let [key, value] = attr.slice(1, -1).split("=");
        if (key.startsWith("$")) {
          const arg_index = parseInt(key.slice(1)) - 1;
          key = flint_args[arg_index];
        }
        if (value) {
          if (value.startsWith("$")) {
            const arg_index = parseInt(value.slice(1)) - 1;
            value = flint_args[arg_index];
          } else if (value.startsWith(`"`) && value.endsWith(`"`)) {
            value = value.slice(1, -1);
          } else if (value.startsWith(`'`) && value.endsWith(`'`)) {
            value = value.slice(1, -1);
          }
        } else {
          value = "";
        }
        return {
          key,
          value,
        };
      });

      // Remove attributes from the text to get the tag and inner text
      node.text = node.text.replace(/\[[^\]]*\]/g, "");
      const parts = node.text.split(" ");
      let tag = parts[0];
      const rest = parts.slice(1).join(" ");

      let element = null;

      // Handle argument substitution for dynamic content
      if (tag.startsWith("$")) {
        const arg_index = parseInt(tag.slice(1)) - 1;
        const arg = flint_args[arg_index];

        // Create text node
        if (typeof arg === "string") {
          element = document.createTextNode(arg);

          // Create document fragment for array of elements
        } else if (Array.isArray(arg)) {
          element = document.createDocumentFragment();
          arg.forEach((child) => element.appendChild(child));

          // Use the argument as the element itself
        } else {
          element = arg;
        }
      } else {
        // Create the element with the tag name
        element = document.createElement(tag);

        // Set attributes on the element
        attributes.forEach((attr) => {
          if (
            attr.value !== false &&
            attr.value !== null &&
            attr.value !== undefined
          ) {
            element.setAttribute(attr.key, attr.value);
          }
        });

        // Handle dynamic content within the element's inner text
        if (rest.includes("$")) {
          const content = rest.replace(/\$\d+/g, (match) => {
            const arg_index = parseInt(match.slice(1)) - 1;
            return flint_args[arg_index] !== undefined
              ? flint_args[arg_index]
              : match;
          });
          if (element.tagName === "TEXTAREA") {
            element.value = content;
          } else {
            element.innerText = content;
          }
        } else if (rest.length) {
          element.innerText = rest;
        }
      }

      // Append the created element to its parent
      if (parent) {
        parent.appendChild(element);
      }

      // Recursively create and append child elements
      const children = [];
      let child_level = false;
      for (let i = index + 1; i < nodes.length; i++) {
        if (nodes[i].level > node.level) {
          if (!child_level) {
            child_level = nodes[i].level;
          }
          if (nodes[i].level === child_level) {
            createElement(nodes, i, element);
          }
        } else {
          break;
        }
      }

      return element;
    };

    // Create a wrapper for potential multiple root elements
    const rootElement = document.createElement("div");

    // Iterate and create all potential root elements into actual root elements in that container
    let child_level = false;
    for (let i = 0; i < flint.length; i++) {
      if (!child_level) {
        child_level = flint[i].level;
      }
      if (flint[i].level === child_level) {
        createElement(flint, i, rootElement);
      }
    }

    // If there is just a single root element, return that with helpers
    if (rootElement.children.length === 1) {
      addHelpers(rootElement.children[0]);
      return rootElement.children[0];

      // If there are multiple root elemeents, return the wrapper with helpers
    } else {
      addHelpers(rootElement);
      return rootElement;
    }
  } else {
    // Handle element selection and manipulation
    const element = flint_args_or_element || document;
    const selector = selector_or_flint;
    const $all = element.querySelectorAll(selector);

    // Add helper methods to each selected element
    $all.forEach((element) => addHelpers(element, $all));

    // Return the appropriate result based on the number of elements found
    if ($all.length === 1) {
      return $all[0];
    } else if ($all.length === 0) {
      return null;
    } else {
      return $all;
    }
  }
};
