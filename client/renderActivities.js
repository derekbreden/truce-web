const renderActivities = (activities) => {
  if (!$("main-content-wrapper[active] activities")) {
    $("main-content-wrapper[active] main-content").appendChild(
      $(
        `
        activities
        `,
      ),
    );
    $("main-content-wrapper[active] main-content-2").appendChild(
      $(
        `
        activities
        `,
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
            activity
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
            activity
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
    const $activities_1 = $activities.filter((x, i) => i % 2 === 1);
    const $activities_2 = $activities.filter((x, i) => i % 2 === 0);
    $("main-content-wrapper[active] main-content activities").replaceChildren(
      ...$activities_1,
    );
    $("main-content-wrapper[active] main-content-2 activities").replaceChildren(
      ...$activities_2,
    );
  } else {
    $("main-content-wrapper[active] main-content activities").replaceChildren(
      ...$activities,
    );
  }
};
