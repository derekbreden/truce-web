const renderActivities = (activities) => {

  // Empty favorites?
  if (state.path === "/favorites") {
    if (activities.length === 0) {
      $("topic[favorites]")?.remove();
      $("main-content-wrapper[active] topics").prepend(
        $(
          `
          topic[favorites]
            h2[favorites]
              span Manage favorites
              icon
                $1
                $2
            p[favorites-empty]
              span When you tap the favorite icon
              $3
              span on a topic or comment, it will display here.
            p[favorites-empty]
              span Head over to "Topics" and start tapping 
              $4
              span to get started!
          `,
          [
            $("icons icon[settings] svg").cloneNode(true),
            $("footer icon[favorites] svg").cloneNode(true),
            $("footer icon[favorites] svg").cloneNode(true),
            $("footer icon[favorites] svg").cloneNode(true),
          ],
        ),
      );
    } else {
      $("topic[favorites]")?.remove();
      $("main-content-wrapper[active] topics").prepend(
        $(
          `
          topic[favorites]
            h2[favorites]
              span Manage favorites
              icon
                $1
                $2
            p[favorites-empty]
              span When you tap the favorite icon
              $3
              span on a topic or comment, it will display here.
            p
              button[href="/topics_from_favorites"]
                span Topics from favorites
                icon
                  $4
                  $5
          `,
          [
            $("icons icon[settings] svg").cloneNode(true),
            $("footer icon[favorites] svg").cloneNode(true),
            $("footer icon[favorites] svg").cloneNode(true),
            $("footer icon[topics] svg").cloneNode(true),
            $("footer icon[favorites] svg").cloneNode(true),
          ],
        ),
      );
      $("topics [href]")?.forEach(($a) => {
        const new_path = $a.getAttribute("href");
        if (new_path.substr(0, 1) === "/") {
          $a.on("click", ($event) => {
            $event.preventDefault();
            $event.stopPropagation();
            goToPath(new_path);
          });
        }
      });
    }
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
  const comment_ids_rendered = [];
  const $activities = activities
    .sort(
      (a, b) =>
        new Date(b.favorite_create_date || b.create_date) -
        new Date(a.favorite_create_date || a.create_date),
    )
    .filter((activity) => {
      if (activity.type === "comment") {
        if (
          comment_ids_rendered.includes(activity.id) &&
          state.path !== "/favorites"
        ) {
          return false;
        }
        comment_ids_rendered.push(activity.id);
        comment_ids_rendered.push(activity.parent_comment_id);
      }
      if (state.version > 1) {
      } else {
        if (activity.type === "topic" && activity.poll_1) {
          return false;
        }
      }
      return true;
    })
    .map((activity) => {
      if (activity.type === "comment") {
        const $comment = renderComment(activity);
        $comment.$("reply-wrapper button")?.remove();
        let $comment_wrapper = $comment;
        if (activity.parent_comment_body) {
          const parent_comment = {
            display_name: activity.parent_comment_display_name,
            profile_picture_uuid: activity.parent_comment_profile_picture_uuid,
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
              h2 $1
              $2
          `,
          [activity.parent_topic_title, $comment_wrapper],
        );
        $activity.on("click", ($event) => {
          $event.preventDefault();
          goToPath("/comment/" + activity.id);
        });
        activity.$activity = $activity;
        return $activity;
      } else {
        const $topic = renderTopic(activity);
        const $activity = $(
          `
            activity[topic]
              $1
          `,
          [$topic],
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
    $(
      "main-content-wrapper[active] main-content-2 activities",
    )?.replaceChildren(...$activities_2);
  } else {
    $("main-content-wrapper[active] main-content activities")?.replaceChildren(
      ...$activities,
    );
  }
};
