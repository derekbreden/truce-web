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

  if (state.path === "/") {
    $("main-content-wrapper[active] main-content").replaceChildren(
      $(
        `
        topics
          topic
            h2 Welcome to Truce
            p If you agree to:
            ul
              li Never escalate
              li Never judge
              li Never name-call
            p Then, please join us in this Truce.
            p
              a[big][href=/topics] Join the Discussion
        `,
      ),
    );
    $("main-content-wrapper[active] main-content-2").replaceChildren(
      $(
        `
        topics
            h2 Our Approach to Moderation
            p If you post:
            ul
              li An escalation
              li A judgment
              li Name-calling
            p Then:
            ul
              li A label will be applied
              li The label will be explained
              li Nothing is banned
              li Nothing is muted
              li Nothing is blocked
            comments
              expand-wrapper[above-comments]
                p Example
              comment
                h3 John Doe:
                p You are a fascist, who attended a fascist rally and supported a fascist leader.
                info-wrapper
                  info
                    b Name-calling
                    p If someone does not identify themselves as a fascist, calling them one is an example of name-calling. This type of labeling hinders constructive and respectful dialogue.
        `,
      ),
    );

    $("main-content-wrapper[active] main-content")
      .$("[href]")
      .forEach(($el) => {
        $el.on("click", ($event) => {
          $event.preventDefault();
          goToPath($el.getAttribute("href"));
        });
      });
  }
};
