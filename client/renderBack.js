const renderBack = () => {
  // Always remove previous wrapper
  $("main-content-wrapper[active] main-content back-forward-wrapper")?.remove();

  // Sometimes add new wrapper
  if (
    state.path.substr(0, 7) === "/topic/" ||
    state.path.substr(0, 8) === "/comment" ||
    state.path.substr(0, 6) === "/user/"
  ) {
    let previous_path = state.path_history[state.path_history.length - 1];
    if (previous_path === state.path) {
      state.path_history.pop();
      previous_path = state.path_history[state.path_history.length - 1];
    }
    if (state.path.split("/")[3]) {
      previous_path = state.path_history[state.path_history.length - 2];
    }
    const $back_forward = $(
      `
      back-forward-wrapper
        back-wrapper
          button[expand-left]
          p $1
      `,
      [
        previous_path === "/topics" || previous_path === "/topics/all"
          ? "Topics"
          : previous_path?.substr(0, 8) === "/comment"
            ? "Comment thread"
            : previous_path?.substr(0, 7) === "/topic/"
              ? state.cache[previous_path].topics[0].title
              : previous_path === "/"
                ? "Terms and conditions"
                : previous_path === "/notifications"
                  ? "Notifications"
                  : previous_path === "/favorites"
                    ? "Favorites"
                    : previous_path?.substr(0, 5) === "/tag/"
                      ? previous_path.substr(5)[0].toUpperCase() +
                        previous_path.substr(5).slice(1)
                      : previous_path?.substr(0, 6) === "/user/"
                        ? renderName(
                            state.cache[previous_path].user.display_name,
                            state.cache[previous_path].user.display_name_index,
                          )
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
      $back_forward.remove();
    }
  }
};
