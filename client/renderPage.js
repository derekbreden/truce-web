const renderPage = (data) => {
  // Update global state
  if (state.path !== data.path) {
    state.path = data.path;
    history.replaceState({ path_index: state.path_index }, "", data.path);
  }
  if (!state.path.split("/")[3]) {
    state.path_history.push(state.path);
  }

  // Remove loading indicator
  $("main-content-wrapper[active] topics-loading")?.remove();

  // Render Users
  renderUsers(data.users);

  // Render Topics
  renderTopics(data.topics, data.tag, data.user);

  // Render Comments
  renderComments(data.comments);

  // Render Activities
  renderActivities(data.activities);

  // Render Notifications
  renderNotifications(data.notifications);

  // Render Images
  renderImages();

  // Render Tags
  renderTags(data.tags);

  // Render Forward Button on comment thread
  renderForward(data.parent_topic);

  // Render Mark all as read on notifications
  renderMarkAllAsRead();

  // Emit rendered event
  $("body").dispatchEvent(new CustomEvent("page-rendered"));
};
