const renderForward = (parent_topic) => {
  if (parent_topic) {
    const $forward = $(
      `
      forward-wrapper
        p $1
        button[expand-right]
      `,
      [parent_topic.title],
    );
    if (!$("main-content-wrapper[active] back-forward-wrapper")) {
      $("main-content-wrapper[active] main-content").prepend(
        $(
          `
          back-forward-wrapper
          `,
        ),
      );
    }
    $("main-content-wrapper[active] back-forward-wrapper")
      .$("forward-wrapper")
      ?.remove();
    $("main-content-wrapper[active] back-forward-wrapper").appendChild(
      $forward,
    );
    $forward.on("click", () => {
      let new_path = `/topic/${parent_topic.slug}`;
      if (parent_topic.slug === "Home") {
        new_path = "/";
      } else if (parent_topic.slug === "Topics") {
        new_path = "/topics";
      }
      goToPath(new_path);
    });
  }
};
