const goToPath = (new_path, skip_state, clicked_back) => {
  if (state.path !== new_path) {

    // Cancel any open active comment or topic
    delete state.active_add_new_comment;
    delete state.active_add_new_topic;

    // Always track scroll position on cached paths
    if (state.cache[state.path]) {
      state.cache[state.path].scroll_top = $("main-content-wrapper[active]").scrollTop;
    }

    // Slide from left to right as if clicking back in several more scenarios
    const sequence = [
      "/",
      "/privacy",
      "/topics",
      "/recent",
      "/favorites",
      "/notifications",
    ];
    const previous_sequence = sequence.indexOf(state.path) !== -1 ? sequence.indexOf(state.path) : 999;
    const next_sequence = sequence.indexOf(new_path) !== -1 ? sequence.indexOf(new_path) : 999;
    if (next_sequence < previous_sequence) {
      clicked_back = true;
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
    } catch(e) {
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
