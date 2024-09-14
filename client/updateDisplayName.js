const updateDisplayName = (data) => {
  // Workaround for back button not updating
  if ($("back-forward-wrapper")) {
    const previous_path = state.path_history[state.path_history.length - 2];
    if (previous_path === `/user/${state.user_slug}`) {
      state.path_history[state.path_history.length - 2] =
        `/user/${data.user_slug}`;

      // Best argument for using reactive framework right here?
      $("back-forward-wrapper back-wrapper p").innerText = renderName(
        data.display_name,
        data.display_name_index,
      );
    }
  }

  // Update state from data
  state.user_id = data.user_id;
  state.display_name = data.display_name;
  state.display_name_index = data.display_name_index;
  state.user_slug = data.user_slug;

  // Iterate each cache key
  Object.keys(state.cache).forEach((cache_key) => {
    const cache = state.cache[cache_key];

    // Update the relevant user display name data for each category of data
    cache.topics?.forEach((topic) => {
      if (topic.user_id === state.user_id) {
        topic.display_name = state.display_name;
        topic.display_name_index = state.display_name_index;
        topic.user_slug = state.user_slug;
      }
    });
    cache.comments?.forEach((comment) => {
      if (comment.user_id === state.user_id) {
        comment.display_name = state.display_name;
        comment.display_name_index = state.display_name_index;
        comment.user_slug = state.user_slug;
      }
    });
    cache.users?.forEach((user) => {
      if (user.user_id === state.user_id) {
        user.display_name = state.display_name;
        user.display_name_index = state.display_name_index;
        user.user_slug = state.user_slug;
      }
    });
    cache.activities?.forEach((activity) => {
      if (activity.user_id === state.user_id) {
        activity.display_name = state.display_name;
        activity.display_name_index = state.display_name_index;
        activity.user_slug = state.user_slug;
      }
    });
    if (cache.user && cache.user.user_id === state.user_id) {
      cache.user.display_name = state.display_name;
      cache.user.display_name_index = state.display_name_index;
      cache.user.user_slug = state.user_slug;
    }
  });
};
