const goToPath = (new_path, skip_state, clicked_back) => {
  if (state.path !== new_path) {
    // Cancel any open active comment or topic
    delete state.active_add_new_comment;
    delete state.active_add_new_topic;

    // Always track scroll position on cached paths
    if (state.cache[state.path]) {
      state.cache[state.path].scroll_top = $(
        "main-content-wrapper[active]",
      ).scrollTop;
    }

    // Slide from left to right as if clicking back in several more scenarios
    const previous_sequence = path_sequence.indexOf(state.path);
    const next_sequence = path_sequence.indexOf(new_path);

    // From one main page to another
    if (
      next_sequence !== -1 &&
      previous_sequence !== -1 &&
      next_sequence < previous_sequence
    ) {
      clicked_back = true;

      // From a sub page (topic / comment) to a main page
    } else if (next_sequence !== -1 && previous_sequence === -1) {
      // Find the main page they were at most recently
      most_recent_sequence_page = state.path_history
        .toReversed()
        .find((p) => path_sequence.indexOf(p) !== -1);

      // If they are going to that same one, or one further back in the sequence, animate back
      if (
        most_recent_sequence_page &&
        path_sequence.indexOf(most_recent_sequence_page) >= next_sequence
      ) {
        clicked_back = true;
      }
    }

    // Dot indicating main page on most recently
    if (next_sequence !== -1) {
      const dot_index = Math.max(next_sequence - 1, 0);
      $("footer dot").setAttribute("index", dot_index);
    }

    // Set the new path
    state.path = new_path;
    if (!skip_state) {
      state.path_index++;
      history.pushState({ path_index: state.path_index }, "", state.path);
    }
    loadingPage(false, skip_state, clicked_back);

    // Tell the websocket we are on a new path
    try {
      state.ws.send(JSON.stringify({ path: new_path }));
    } catch (e) {
      console.error(e);
    }

    if (state.path === "/topics") {
      localStorage.setItem("has_visited_topics", true);
    } else if (state.path === "/") {
      localStorage.removeItem("has_visited_topics");
    }
  }

  // Load the page
  startSession();
};
