const loadingPage = (first_render, skip_state, clicked_back) => {
  if (clicked_back) {
    $("main-content-wrapper[active]")?.setAttribute("clicked-back", "");
  } else {
    $("main-content-wrapper[active]")?.removeAttribute("clicked-back");
  }
  $("main-content-wrapper[active]")?.setAttribute("inactive", "");
  $("main-content-wrapper[active]")?.removeAttribute("active");
  $("body").appendChild(
    $(
      `
      main-content-wrapper[active][skip-state=$1][clicked-back=$2]
        main-content
        main-content-2
      `,
      [Boolean(skip_state), Boolean(clicked_back)],
    ),
  );
  bindScrollEvent();
  setTimeout(() => {
    $("main-content-wrapper[inactive]")?.remove();
  }, 250);
  // $("[add-new-comment]")?.remove();
  if (!first_render) {
    $("main-content-wrapper[active] main-content").appendChild(
      $(
        `
        topics-loading
          h2
          p
          p
        `,
      ),
    );
  }
  // $("main-content topics")?.remove();
  // $("main-content-2 topics")?.remove();
  // $("main-content comments")?.remove();
  // $("main-content-2 comments")?.remove();
  // $("main-content activities")?.remove();
  // $("main-content-2 activities")?.remove();
  // $("main-content notifications")?.remove();
  // $("main-content-2 notifications")?.remove();
  if (state.path === "/topics") {
    if (!state.active_add_new_topic?.is_root) {
      $(
        "main-content-wrapper[active] main-content > add-new:first-child",
      )?.remove();
      $("main-content-wrapper[active] main-content").prepend(showAddNewTopic());
    }
  }
  // } else {
  //   $("main-content > add-new:first-child")?.remove();
  // }

  // Render Back Button
  renderBack();

  // Render Share Button on topic
  renderShare();
};
