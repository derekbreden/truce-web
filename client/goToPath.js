const goToPath = (new_path, skip_state, clicked_back) => {
  if (
    new_path !== "/" &&
    new_path !== "/privacy" &&
    !localStorage.getItem(`${window.local_storage_key}:agreed`)
  ) {
    modalInfo(`Please tap "Join the Discussion" to agree to these terms.`);
    return;
  }
  let was_same_path = true;

  if (
    new_path === "/topics" &&
    localStorage.getItem(`${window.local_storage_key}:topics_preference`)
  ) {
    new_path = localStorage.getItem(
      `${window.local_storage_key}:topics_preference`,
    );
  }

  if (state.path !== new_path) {
    was_same_path = false;
    // Cancel any open active comment or topic
    delete state.active_add_new_comment;
    delete state.active_add_new_topic;

    // Always track scroll position on cached paths
    if (state.cache[state.path]) {
      state.cache[state.path].scroll_top = $(
        "main-content-wrapper[active]",
      ).scrollTop;
    }

    // New path for /tag/ is same as /tags
    let new_path_parsed = new_path;
    if (new_path.substr(0, 5) === "/tag/") {
      new_path_parsed = "/tags";
    }

    // Slide from left to right as if clicking back in several more scenarios
    let previous_sequence = path_sequence.indexOf(state.path);
    let next_sequence = path_sequence.indexOf(new_path_parsed);

    // Slide left and right on user profile sub-pages
    let sequence_is_user = false
    if (
      state.path.substr(0, 6) === "/user/" &&
      new_path_parsed.substr(0, 6) === "/user/"
    ) {
      const this_user_slug = state.path.split("/")[2];
      const user_path_sequence = [
        `/user/${this_user_slug}`,
        `/user/${this_user_slug}/comments`,
        `/user/${this_user_slug}/subscribers`,
        `/user/${this_user_slug}/subscribed_to_users`,
      ];
      previous_sequence = user_path_sequence.indexOf(state.path);
      next_sequence = user_path_sequence.indexOf(new_path_parsed);
      sequence_is_user = true;
    }

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
      const most_recent_sequence_page = state.path_history
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
    if (next_sequence !== -1 && !sequence_is_user) {
      let dot_index = Math.max(next_sequence - 1, 0);
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
      localStorage.setItem(
        `${window.local_storage_key}:has_visited_topics`,
        true,
      );
    } else if (state.path === "/") {
      localStorage.removeItem(`${window.local_storage_key}:has_visited_topics`);
    }
    if (
      state.path === "/" ||
      state.path === "/topics" ||
      state.path === "/topics/all" ||
      state.path.substr(0, 5) === "/tag/"
    ) {
      localStorage.setItem(
        `${window.local_storage_key}:last_root_path`,
        state.path,
      );
    }
  }

  // Load the page
  startSession(was_same_path);
};
