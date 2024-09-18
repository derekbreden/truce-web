const bindScrollEvent = () => {
  $("main-content-wrapper[active]")?.on("scroll", () => {
    // Never do anything if already loading something
    if (state.loading_path) {
      return;
    }

    // Topics load older
    // Favorites load older
    // Tags load older
    // User load older
    if (
      (state.path === "/topics" ||
        state.path === "/topics/all" ||
        state.path === "/favorites" ||
        state.path.substr(0, 5) === "/tag/" ||
        state.path.substr(0, 6) === "/user/") &&
      state.cache[state.path] &&
      !state.cache[state.path].finished
    ) {
      // A threshold based on how much is left to scroll
      const threshold =
        $("main-content-wrapper[active]").scrollHeight -
        $("main-content-wrapper[active]").clientHeight * 3;

      // When we pass the threshold
      if ($("main-content-wrapper[active]").scrollTop > threshold) {
        // Find the oldest (min) create_date of what we have so far
        const max_topic_create_date = state.cache[state.path].topics.reduce(
          (min, topic) => {
            return min < topic.create_date ? min : topic.create_date;
          },
          new Date().toISOString(),
        );
        let max_create_date = state.cache[state.path].activities.reduce(
          (min, activity) => {
            return min < activity.create_date ? min : activity.create_date;
          },
          new Date().toISOString(),
        );
        if (state.path === "/favorites") {
          max_create_date = state.cache[state.path].activities.reduce(
            (min, activity) => {
              return min < activity.favorite_create_date
                ? min
                : activity.favorite_create_date;
            },
            new Date().toISOString(),
          );
        }

        // Use that to load anything older than that (our min is the max of what we want returned)
        state.loading_path = true;
        fetch("/session", {
          method: "POST",
          body: JSON.stringify({
            path: state.path,
            max_topic_create_date,
            max_create_date,
          }),
        })
          .then((response) => response.json())
          .then(function (data) {
            // Stop when we reach the end (no more results returned)
            if (
              state.path === "/favorites" ||
              (state.path.substr(0, 5) === "/user" &&
                state.path.split("/")[3] === "comments")
            ) {
              if (data.activities && !data.activities.length) {
                state.cache[state.path].finished = true;
              }
            } else {
              if (data.topics && !data.topics.length) {
                state.cache[state.path].finished = true;
              }
            }

            // Append what we found to the existing cache
            state.cache[state.path].topics.push(...data.topics);
            state.cache[state.path].activities.push(...data.activities);

            // And re-render if any topics added
            if (data.topics.length) {
              renderTopics(
                state.cache[state.path].topics,
                state.cache[state.path].tag,
                state.cache[state.path].user,
              );
            }
            // And re-render if any activities added
            if (data.activities.length) {
              renderActivities(state.cache[state.path].activities);
            }

            state.loading_path = false;
          })
          .catch(function (error) {
            state.loading_path = false;
            console.error(error);
            state.most_recent_error = error;
            alertError("Network error loading more");
          });
      }
    }

    // Comments load older
    if (
      state.path.substr(0, 7) === "/topic/" &&
      state.cache[state.path] &&
      !state.cache[state.path].comments_finished
    ) {
      // A threshold based on how much is left to scroll
      const threshold =
        $("main-content-wrapper[active]").scrollHeight -
        $("main-content-wrapper[active]").clientHeight * 3;

      // When we pass the threshold
      if ($("main-content-wrapper[active]").scrollTop > threshold) {
        // Find the oldest (min) create_date of what we have so far
        const max_comment_create_date = state.cache[state.path].comments.reduce(
          (min, comment) => {
            return min < comment.create_date ? min : comment.create_date;
          },
          new Date().toISOString(),
        );

        // Use that to load anything older than that (our min is the max of what we want returned)
        state.loading_path = true;
        fetch("/session", {
          method: "POST",
          body: JSON.stringify({
            path: state.path,
            max_comment_create_date,
          }),
        })
          .then((response) => response.json())
          .then(function (data) {
            // Stop when we reach the end (no more results returned)
            if (data.comments && !data.comments.length) {
              state.cache[state.path].comments_finished = true;
            }

            // Append what we found to the existing cache
            state.cache[state.path].comments.push(...data.comments);

            // And re-render if any comments added
            if (data.comments.length) {
              renderComments(state.cache[state.path].comments);
            }
            state.loading_path = false;
          })
          .catch(function (error) {
            state.loading_path = false;
            console.error(error);
            state.most_recent_error = error;
            alertError("Network error loading more");
          });
      }
    }

    // Notifications load older
    if (
      state.path === "/notifications" &&
      state.cache["/notifications"] &&
      !state.cache["/notifications"].finished
    ) {
      // A threshold based on how much is left to scroll
      const threshold =
        $("main-content-wrapper[active]").scrollHeight -
        $("main-content-wrapper[active]").clientHeight * 3;

      // When we pass the threshold
      if ($("main-content-wrapper[active]").scrollTop > threshold) {
        // Find the oldest (min) create_date of what we have so far
        const max_notification_unread_create_date = state.cache[
          "/notifications"
        ].notifications.reduce((min, notification) => {
          if (!notification.read) {
            return min < notification.create_date
              ? min
              : notification.create_date;
          } else {
            return min;
          }
        }, new Date().toISOString());
        const max_notification_read_create_date = state.cache[
          "/notifications"
        ].notifications.reduce((min, notification) => {
          if (notification.read) {
            return min < notification.create_date
              ? min
              : notification.create_date;
          } else {
            return min;
          }
        }, new Date().toISOString());

        // Use that to load anything older than that (our min is the max of what we want returned)
        state.loading_path = true;
        fetch("/session", {
          method: "POST",
          body: JSON.stringify({
            path: "/notifications",
            max_notification_unread_create_date,
            max_notification_read_create_date,
          }),
        })
          .then((response) => response.json())
          .then(function (data) {
            // Stop when we reach the end (no more results returned)
            if (data.notifications && !data.notifications.length) {
              state.cache["/notifications"].finished = true;
            }

            // Append what we found to the existing cache
            state.cache["/notifications"].notifications.push(
              ...data.notifications,
            );

            // And re-render if any results added
            if (data.notifications.length) {
              renderNotifications(state.cache["/notifications"].notifications);
            }
            state.loading_path = false;
          })
          .catch(function (error) {
            state.loading_path = false;
            console.error(error);
            state.most_recent_error = error;
            alertError("Network error loading more");
          });
      }
    }
  });
};
