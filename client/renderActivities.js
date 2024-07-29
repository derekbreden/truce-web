const renderActivities = (activities) => {
  // Empty favorites?
  if (state.path === "/favorites" && activities.length === 0) {
    $("main-content-wrapper[active] main-content").replaceChildren(
      $(
        `
        topics[favorites-empty]
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
  } else {
    $("topics[favorites-empty]")?.remove();
  }

  // Render activities
  if (!$("main-content-wrapper[active] main-content activities")) {
    $("main-content-wrapper[active] main-content").appendChild(
      $(
        `
        activities[favorites=$1]
        `,
        [state.path === "/favorites"],
      ),
    );
  }
  if (!$("main-content-wrapper[active] main-content-2 activities")) {
    $("main-content-wrapper[active] main-content-2").appendChild(
      $(
        `
        activities[favorites=$1]
        `,
        [state.path === "/favorites"],
      ),
    );
  }
  const $activities = activities.map((activity) => {
    if (activity.type === "comment") {
      const $comment = renderComment(activity);
      $comment.$("reply-wrapper button")?.remove();
      let preamble = `Comment:`;
      if (activity.parent_comment_display_name) {
        preamble = `Reply:`;
      }
      let $comment_wrapper = $comment;
      if (activity.parent_comment_body) {
        const parent_comment = {
          display_name: activity.parent_comment_display_name,
          body: activity.parent_comment_body,
          note: activity.parent_comment_note,
        };
        const $parent_comment = renderComment(parent_comment);
        $parent_comment.setAttribute("parent-comment", "");
        $parent_comment.$("reply-wrapper")?.remove();
        $parent_comment.appendChild($comment);
        $comment_wrapper = $parent_comment;
      }
      const $activity = $(
        `
            activity[comment]
              h2
                span $1
                span $2
              $3
          `,
        [preamble, activity.parent_topic_title, $comment_wrapper],
      );
      $activity.on("click", ($event) => {
        $event.preventDefault();
        goToPath("/comment/" + activity.id);
      });
      activity.$activity = $activity;
      return $activity;
    } else {
      const $topic = renderTopic(activity);
      let preamble = `Topic:`;
      const $activity = $(
        `
            activity[topic]
              h2 $1
              $2
          `,
        [preamble, $topic],
      );
      activity.$activity = $activity;
      return $activity;
    }
  });
  if (window.innerWidth > 1000) {
    const $activities_1 = $activities.filter((x, i) => i % 2 === 0);
    const $activities_2 = $activities.filter((x, i) => i % 2 === 1);
    $("main-content-wrapper[active] main-content activities")?.replaceChildren(
      ...$activities_1,
    );
    $("main-content-wrapper[active] main-content-2 activities")?.replaceChildren(
      ...$activities_2,
    );
  } else {
    $("main-content-wrapper[active] main-content activities")?.replaceChildren(
      ...$activities,
    );
  }
};
