const renderComments = (comments) => {
  // Creates a $comment element on each comment in the array
  comments.forEach(renderComment);

  // Attach the comment elements to each other in a hierarchy
  comments.forEach((comment) => {
    if (comment.parent_comment_id) {
      const parent = comments.find(
        (c) => c.comment_id === comment.parent_comment_id,
      );

      // When all ancestors are an only child we act like a sibling instead of a child
      let ancestor = parent;
      if (!ancestor) {
        return;
      }
      let found_siblings = false;
      while (!found_siblings && ancestor.parent_comment_id) {
        const siblings = comments.filter(
          (c) =>
            c.parent_comment_id === ancestor.parent_comment_id &&
            c.comment_id !== ancestor.comment_id,
        );
        if (siblings.length === 0) {
          ancestor = comments.find(
            (c) => c.comment_id === ancestor.parent_comment_id,
          );
        } else {
          siblings.forEach((sibling) => {
            const $reply = sibling.$comment.$(":scope > reply-wrapper [reply]");
            $reply.setAttribute("alt", "");
            $reply.setAttribute("faint", "");
          });
          found_siblings = true;
        }
      }
      ancestor.$comment.appendChild(comment.$comment);
      const $reply = parent.$comment.$(":scope > reply-wrapper [reply]");
      $reply.setAttribute("alt", "");
      $reply.setAttribute("faint", "");
    }
  });

  // Identify the root comments (threads) to be displayed
  const $root_comments = comments
    .filter((c) => !c.parent_comment_id)
    .sort((a, b) => new Date(b.create_date) - new Date(a.create_date))
    .map((c) => {
      c.$comment.comment_id = c.comment_id;
      return c.$comment;
    });

  // Collapse all the intermediates in each thread, if present
  $root_comments.forEach(($root_comment) => {
    const $child_comments = Array.from($root_comment.$("comment") || []);
    if ($child_comments.length > 1) {
      const $last_comment = $child_comments.pop();
      const $original_parent = $last_comment.parentElement;

      // Collapse button
      const $collapse_button = $(
        `
        expand-wrapper[collapse]
          button[expand-left]
          p $1
          button[expand-right]
        `,
        [`Hide ${$child_comments.length} comments`],
      );
      $collapse_button.on("click", () => {
        // Track what is collapsed
        const index = state.expanded_comment_ids.indexOf(
          $root_comment.comment_id,
        );
        if (index !== -1) {
          state.expanded_comment_ids.splice(index, 1);
          localStorage.setItem(
            "trucev1:expanded_comment_ids",
            JSON.stringify(state.expanded_comment_ids),
          );
        }

        // Add and remove the buttons
        $root_comment.$(":scope > reply-wrapper").after($expand_button);
        $collapse_button.remove();

        // Move last child to bottom of root
        $root_comment.appendChild($last_comment);

        // Show intermediates
        $child_comments.forEach(($child_comment) => {
          $child_comment.style.display = "none";
          $child_comment.$expand_button = $expand_button;
        });
      });

      // Expand button
      const $expand_button = $(
        `
        expand-wrapper[expand]
          button[expand-up]
          p $1
          button[expand-down]
        `,
        [`Show ${$child_comments.length} hidden comments`],
      );
      $expand_button.on("click", ($event) => {
        // Track what is expanded
        const index = state.expanded_comment_ids.indexOf(
          $root_comment.comment_id,
        );
        if (index === -1) {
          state.expanded_comment_ids.push($root_comment.comment_id);
          localStorage.setItem(
            "trucev1:expanded_comment_ids",
            JSON.stringify(state.expanded_comment_ids),
          );
        }

        // Track for scroll position
        const original_rect = $last_comment.getBoundingClientRect();

        // Add and remove the buttons
        $expand_button.remove();
        $root_comment.$(":scope > reply-wrapper").after($collapse_button);

        // Bring all the collapsed nodes back and flash them
        $child_comments.forEach(($child_comment) => {
          $child_comment.style.display = "flex";
          if (!$event.detail?.skip_flash) {
            $child_comment.setAttribute("flash-focus", "");
          }
        });

        // Slightly shift the last element horizontally after that flash finishes
        // setTimeout(() => {
        $original_parent.appendChild($last_comment);
        // }, 500);

        // When they click down, keep scroll on the last comment
        if ($event.target?.hasAttribute("expand-down")) {
          const final_rect = $last_comment.getBoundingClientRect();
          $("main-content-wrapper[active]").scrollTop =
            $("main-content-wrapper[active]").scrollTop +
            (final_rect.y - original_rect.y);
        }
      });
      if (state.expanded_comment_ids.includes($root_comment.comment_id)) {
        $expand_button.dispatchEvent(
          new CustomEvent("click", { detail: { skip_flash: true } }),
        );
      } else {
        $collapse_button.click();
      }
    }
  });

  // Add each thread to the DOM
  beforeDomUpdate();
  const showCommentList = state.path.substr(0, 7) === "/topic/";
  if (!$("main-content-wrapper[active] comments")) {
    const target =
      state.path.substr(0, 9) === "/comment/"
        ? "main-content-wrapper[active] main-content"
        : "main-content-wrapper[active] main-content-2";
    $(target).appendChild(
      $(
        `
        comments
        `,
      ),
    );
  }
  $("main-content-wrapper[active] comments").replaceChildren(
    ...[
      ...(showCommentList
        ? [
            state.active_add_new_comment?.is_root
              ? state.active_add_new_comment
              : showAddNewCommentButton(),
            $(
              `
              expand-wrapper[above-comments]
                p $1
              `,
              [
                comments.length +
                  (comments.length === 1 ? " comment" : " comments"),
              ],
            ),
          ]
        : []),
      ...$root_comments,
    ],
  );
  if (state.active_add_new_comment?.is_edit) {
    const comment = comments.find(
      (c) => c.comment_id === state.active_add_new_comment.is_edit,
    );
    comment.$comment.replaceWith(state.active_add_new_comment);
  }
  if (state.active_add_new_comment?.is_reply) {
    const comment = comments.find(
      (c) => c.comment_id === state.active_add_new_comment.is_reply,
    );
    comment.$comment.$(":scope > reply-wrapper").style.display = "none";
    comment.$comment
      .$(":scope > reply-wrapper")
      .after(state.active_add_new_comment);
  }
  if (state.path === "/" || state.path === "/privacy") {
    $("reply-wrapper")?.forEach(
      ($reply_wrapper) => ($reply_wrapper.style.display = "none"),
    );
    $("p[add-new-comment]")?.remove();
    $("expand-wrapper[above-comments]")?.remove();
  }
  afterDomUpdate();

  // Highlight a comment in a thread we've navigated to specifically
  if (state.path.substr(0, 8) === "/comment") {
    const comment_id = state.path.substr(9);
    const comment = comments.find((c) => c.comment_id === comment_id);
    if (comment.$comment.style.display === "none") {
      comment.$comment.$expand_button.dispatchEvent(
        new CustomEvent("click", { detail: { skip_flash: true } }),
      );
    }
    comment.$comment.setAttribute("flash-long-focus", "");
    // Wait for slide in animation before scrolling
    setTimeout(() => {
      comment.$comment.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 250);
    setTimeout(() => {
      comment.$comment.removeAttribute("flash-long-focus");
    }, 2500);
  }

  // Only render a single comment thread as a thread
  if (state.path.substr(0, 8) === "/comment") {
    $("main-content-wrapper[active] comments").setAttribute("thread", "");
  } else {
    $("main-content-wrapper[active] comments").removeAttribute("thread");
  }
};
