const renderPage = (data) => {
  // Update global state
  if (state.path !== data.path) {
    state.path = data.path;
    history.replaceState({ path_index: state.path_index }, "", data.path);
  }
  state.path_history.push(state.path);

  // Remove loading indicator
  $("main-content-wrapper[active] topics-loading")?.remove();

  // Render Topics
  renderTopics(data.topics);

  // Render Comments
  renderComments(data.comments);

  // Render Activities
  renderActivities(data.activities);

  // Render Notifications
  renderNotifications(data.notifications);

  // Render Images
  renderImages();

  // Render Forward Button on comment thread
  renderForward(data.parent_topic);

  // Render Mark all as read on notifications
  renderMarkAllAsRead();

  // Empty favorites?
  if (state.path === "/favorites" && data.activities.length === 0) {
    $("main-content-wrapper[active] main-content").replaceChildren(
      $(
        `
        topics
          topic
            h2 Favorites
            p[favorites-empty]
              span When you tap the favorite icon
              $1
              span on a topic or comment, it will display here.
            p[favorites-empty]
              span Head over to "Topics" and start tapping 
              $2
              span to get started!
        `,
        [
          $("footer icon[favorites] svg").cloneNode(true),
          $("footer icon[favorites] svg").cloneNode(true),
        ]
      ),
    );
  }

  // Emit rendered event
  $("body").dispatchEvent(new CustomEvent("page-rendered"));
};
