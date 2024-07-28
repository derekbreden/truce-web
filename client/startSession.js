// Workaround for replit Webview not supporting Set-Cookie
const original_fetch_2 = fetch;
fetch = function (url, options) {
  const session_uuid = localStorage.getItem("session_uuid");
  if (session_uuid) {
    options.headers = options.headers || {};
    options.headers["Authorization"] = `Bearer ${session_uuid}`;
  }
  return original_fetch_2(url, options);
};
// END Workaround

const startSession = () => {
  // If cache available, render from that first
  if (state.cache[state.path]) {
    renderPage(state.cache[state.path]);

    // Restore scroll position if found
    if (state.cache[state.path].scroll_top) {
      $("main-content-wrapper[active]").scrollTop =
        state.cache[state.path].scroll_top;
      delete state.cache[state.path].scroll_top;
      // } else {
      // $body.scrollTop = 0;
    }

    // Get more recent if available
    getMoreRecent();
    if (state.path !== "/" && state.path !== "/privacy") {
      return;
    }
  }

  // Otherwise, make a network call for the entire path results
  const postBody = {
    path: state.path,
  };
  if (state.reset_token_uuid) {
    postBody.reset_token_uuid = state.reset_token_uuid;
  }
  state.loading_path = true;
  fetch("/session", {
    method: "POST",
    body: JSON.stringify(postBody),
  })
    .then((response) => response.json())
    .then(function (data) {
      // Workaround for replit Webview not supporting Set-Cookie
      if (data.session_uuid) {
        localStorage.setItem("session_uuid", data.session_uuid);
      }
      // END Workaround

      if (data.email) {
        state.email = data.email;
        if (state.reset_token_uuid) {
          showResetPassword();
        }
      }
      if (data.display_name) {
        state.display_name = data.display_name;
      }
      if (data.error) {
        modalError(data.error);
      }
      if (data.path && state.path !== "/" && state.path !== "/privacy") {
        state.cache[data.path] = data;
        renderPage(data);
      }
      state.loading_path = false;
    })
    .catch(function (error) {
      state.loading_path = false;
      console.error(error);
      modalError("Network error");
    });
};

const getMoreRecent = () => {
  // Skip for introduction
  if (state.path === "/" || state.path === "/privacy") {
    return;
  }

  // Stop if cache not loaded
  if (!state.cache[state.path]) {
    return;
  }

  // Track what path and cache we started with
  const current_path = state.path;
  const current_cache = state.cache[current_path];

  // Find the newest (max) create_date of what we have so far
  const min_create_date = current_cache.activities.reduce((max, activity) => {
    return max > activity.create_date ? max : activity.create_date;
  }, "");
  const min_comment_create_date = current_cache.comments.reduce(
    (max, comment) => {
      return max > comment.create_date ? max : comment.create_date;
    },
    "",
  );
  const min_topic_create_date = current_cache.topics.reduce((max, topic) => {
    return max > topic.create_date ? max : topic.create_date;
  }, "");
  const min_notification_unread_create_date =
    current_cache.notifications.reduce((max, notification) => {
      if (!notification.read) {
        return max > notification.create_date ? max : notification.create_date;
      } else {
        return max;
      }
    }, "");
  const min_notification_read_create_date = current_cache.notifications.reduce(
    (max, notification) => {
      if (notification.read) {
        return max > notification.create_date ? max : notification.create_date;
      } else {
        return max;
      }
    },
    "",
  );

  // Find oldest topic create_date for comment count, and max of the counts_max_create_date for the topics
  const min_create_date_for_counts_1 = current_cache.topics.reduce(
    (min, topic) => {
      return min < topic.create_date ? min : topic.create_date;
    },
    new Date().toISOString(),
  );
  const min_create_date_for_counts_2 = current_cache.comments.reduce(
    (min, comment) => {
      return min < comment.create_date ? min : comment.create_date;
    },
    new Date().toISOString(),
  );
  const min_create_date_for_counts_3 = current_cache.activities.reduce(
    (min, activity) => {
      return min < activity.create_date ? min : activity.create_date;
    },
    new Date().toISOString(),
  );
  let min_create_date_for_counts = min_create_date_for_counts_1;
  if (min_create_date_for_counts_2 < min_create_date_for_counts) {
    min_create_date_for_counts = min_create_date_for_counts_2;
  }
  if (min_create_date_for_counts_3 < min_create_date_for_counts) {
    min_create_date_for_counts = min_create_date_for_counts_3;
  }
  const min_counts_create_date_1 = current_cache.topics.reduce((max, topic) => {
    return max > topic.counts_max_create_date
      ? max
      : topic.counts_max_create_date;
  }, "");
  const min_counts_create_date_2 = current_cache.comments.reduce(
    (max, comment) => {
      return max > comment.counts_max_create_date
        ? max
        : comment.counts_max_create_date;
    },
    "",
  );
  const min_counts_create_date_3 = current_cache.activities.reduce(
    (max, activity) => {
      return max > activity.counts_max_create_date
        ? max
        : activity.counts_max_create_date;
    },
    "",
  );
  let min_counts_create_date = min_counts_create_date_1;
  if (min_counts_create_date_2 > min_counts_create_date) {
    min_counts_create_date = min_counts_create_date_2;
  }
  if (min_counts_create_date_3 > min_counts_create_date) {
    min_counts_create_date = min_counts_create_date_3;
  }
  // Indicate if there are comments or topics cached on page
  const has_comments = Boolean(
    current_cache.comments.length ||
      current_cache.activities.filter((a) => a.type === "comment").length,
  );
  const has_topics = Boolean(
    current_cache.topics.length ||
      current_cache.activities.filter((a) => a.type === "topic").length,
  );

  // Use that to load anything newer than that (our max is the min of what we want returned)
  state.loading_path = true;
  fetch("/session", {
    method: "POST",
    body: JSON.stringify({
      path: current_path,
      min_create_date,
      min_comment_create_date,
      min_topic_create_date,
      min_notification_unread_create_date,
      min_notification_read_create_date,
      min_counts_create_date,
      min_create_date_for_counts,
      has_topics,
      has_comments,
    }),
  })
    .then((response) => response.json())
    .then(function (data) {
      // Stop if the path changed while we were loading
      if (state.path !== current_path) {
        return;
      }

      // Track current scrollHeight
      const scroll_height = $("main-content-wrapper[active]").scrollHeight;
      const scroll_top = $("main-content-wrapper[active]").scrollTop;

      // Render notifications if appropriate
      if (data.notifications?.length) {
        const new_ids = data.notifications.map((n) => n.notification_id);
        current_cache.notifications = current_cache.notifications.filter(
          (n) => new_ids.indexOf(n.notification_id) === -1,
        );
        current_cache.notifications.unshift(...data.notifications);
        renderNotifications(current_cache.notifications);
      }

      // Render activities if appropriate
      if (data.activities?.length) {
        const new_ids = data.activities.map((activity) => activity.id);
        current_cache.activities = current_cache.activities.filter(
          (a) => new_ids.indexOf(a.id) === -1,
        );
        current_cache.activities.unshift(...data.activities);
        renderActivities(current_cache.activities);
      }

      // Render comments if appropriate
      if (data.comments?.length) {
        const new_ids = data.comments.map((comment) => comment.comment_id);
        current_cache.comments = current_cache.comments.filter(
          (c) => new_ids.indexOf(c.comment_id) === -1,
        );
        current_cache.comments.push(...data.comments);
        renderComments(current_cache.comments);

        // Flash any newly added items
        data.comments.forEach((comment) => {
          comment.$comment.setAttribute("flash-long-focus", "");
        });
      }

      // Render topics if appropriate
      if (data.topics?.length) {
        const new_ids = data.topics.map((topic) => topic.topic_id);
        current_cache.topics = current_cache.topics.filter(
          (a) => new_ids.indexOf(a.topic_id) === -1,
        );
        current_cache.topics.unshift(...data.topics);
        renderTopics(current_cache.topics);

        // Flash any newly added items
        data.topics.forEach((topic) => {
          topic.$topic.setAttribute("flash-long-focus", "");
        });
      }

      // Restore scroll position if we re-rendered anything
      if (
        data.activities?.length ||
        data.comments?.length ||
        data.topics?.length ||
        data.notifications?.length
      ) {
        // Set a min threshold of scroll to do anything
        let min_threshold = 0;

        // For /topics specifically we have the add-new element that won't be shifted so we want to be (mostly) past it (~200px of it still showing means shift it away?)
        if (current_path === "/topics") {
          const $add_new = $("main-content > add-new:first-child");
          if ($add_new) {
            min_threshold = $add_new?.offsetTop + $add_new?.offsetHeight - 200;
          }
        }

        // If we are past the threshold, then maintain our position
        if (scroll_top > min_threshold) {
          $("main-content-wrapper[active]").scrollTop =
            scroll_top +
            ($("main-content-wrapper[active]").scrollHeight - scroll_height);
        }
      }

      // Render updated topic comment counts
      // if (data.topic_counts?.length) {
      //   data.topic_counts.forEach((topic_comment_count) => {
      //     const found_topic = current_cache.topics.find(
      //       (topic) => topic.topic_id === topic_comment_count.topic_id,
      //     );
      //     const found_activity = current_cache.activities.find(
      //       (activity) =>
      //         activity.id === topic_comment_count.topic_id &&
      //         activity.type === "topic",
      //     );
      //     const text =
      //       topic_comment_count.comment_count +
      //       (topic_comment_count.comment_count === "1"
      //         ? " comment"
      //         : " comments");
      //     if (found_topic) {
      //       found_topic.$topic.$("[comments]").innerText = text;
      //     }
      //     if (found_activity) {
      //       found_activity.$topic.$("[comments]").innerText = text;
      //     }
      //   });
      // }

      // Acknowledge we finished loading
      state.loading_path = false;

      // Emit rendered event
      $("body").dispatchEvent(new CustomEvent("page-updated"));
    })
    .catch(function (error) {
      state.loading_path = false;
      console.error(error);
      modalError("Network error");
    });
};
