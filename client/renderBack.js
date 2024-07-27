const renderBack = () => {
  // Always remove previous wrapper
  $("main-content-wrapper[active] main-content back-forward-wrapper")?.remove();

  // Sometimes add new wrapper
  if (
    state.path.substr(0, 7) === "/topic/" ||
    state.path.substr(0, 8) === "/comment" ||
    state.path === "/notifications"
  ) {
    const previous_path = state.path_history[state.path_history.length - 1];
    const $back_forward = $(
      `
      back-forward-wrapper
        back-wrapper
          button[expand-left]
          p $1
      `,
      [
        previous_path === "/topics"
          ? "Back to topics"
          : previous_path === "/recent"
            ? "Back to comments"
            : previous_path?.substr(0, 8) === "/comment"
              ? "Back to comment thread"
              : previous_path?.substr(0, 7) === "/topic/"
                ? "Back to topic"
                : previous_path === "/"
                  ? "Back to home"
                  : previous_path === "/notifications"
                    ? "Back to notifications"
                    : "Back",
      ],
    );
    $("main-content-wrapper[active] main-content").prepend($back_forward);
    $back_forward.$("back-wrapper").on("click", () => {
      state.path_index--;
      state.path_index--;
      state.path_history = state.path_history.slice(0, -2);
      goToPath(previous_path, false, true);
    });

    if (!previous_path) {
      $back_forward.$("back-wrapper")?.remove();
    }
  }
};
