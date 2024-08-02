const renderTopics = (topics) => {
  beforeDomUpdate();
  if (!$("main-content-wrapper[active] topics")) {
    const target =
      state.path === "/topics"
        ? "main-content-wrapper[active] main-content-2"
        : "main-content-wrapper[active] main-content";
    $(target).appendChild(
      $(
        `
        topics
        `,
      ),
    );
  }
  $("main-content-wrapper[active] topics").replaceChildren(
    ...topics
      .sort((a, b) => new Date(b.create_date) - new Date(a.create_date))
      .map(renderTopic),
  );

  if (state.active_add_new_topic?.is_edit) {
    const topic = topics.find(
      (a) => a.topic_id === state.active_add_new_topic.is_edit,
    );
    topic.$topic.replaceWith(state.active_add_new_topic);
  }
  afterDomUpdate();
  $("topics a")?.forEach(($a) => {
    const new_path = $a.getAttribute("href");
    if (new_path.substr(0, 1) === "/") {
      $a.on("click", ($event) => {
        $event.preventDefault();
        $event.stopPropagation();
        goToPath(new_path);
      });
    }
  });
};
