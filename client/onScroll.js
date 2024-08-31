const bindScrollEvent = () => {
  $("main-content-wrapper[active]")?.on("scroll", () => {
    // Never do anything if already loading something
    if (state.loading_path) {
      return;
    }

    // Recent load older
    if (
      state.path === "/recent" &&
      state.cache["/recent"] &&
      !state.cache["/recent"].finished
    ) {
      // A threshold based on how much is left to scroll
      const threshold =
        $("main-content-wrapper[active]").scrollHeight -
        $("main-content-wrapper[active]").clientHeight * 3;

      // When we pass the threshold
      if ($("main-content-wrapper[active]").scrollTop > threshold) {
        // Find the oldest (min) create_date of what we have so far
        const max_create_date = state.cache["/recent"].activities.reduce(
          (min, activity) => {
            return min < activity.create_date ? min : activity.create_date;
          },
          new Date().toISOString(),
        );

        // Use that to load anything older than that (our min is the max of what we want returned)
        state.loading_path = true;
        fetch("/session", {
          method: "POST",
          body: JSON.stringify({
            path: "/recent",
            max_create_date,
          }),
        })
          .then((response) => response.json())
          .then(function (data) {
            // Stop when we reach the end (no more results returned)
            if (data.activities && !data.activities.length) {
              state.cache["/recent"].finished = true;
            }

            // Append what we found to the existing cache
            state.cache["/recent"].activities.push(...data.activities);

            // And re-render if any activities added
            if (data.activities.length) {
              renderActivities(state.cache["/recent"].activities);
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

    // Favorites load older
    if (
      state.path === "/favorites" &&
      state.cache["/favorites"] &&
      !state.cache["/favorites"].finished
    ) {
      // A threshold based on how much is left to scroll
      const threshold =
        $("main-content-wrapper[active]").scrollHeight -
        $("main-content-wrapper[active]").clientHeight * 3;

      // When we pass the threshold
      if ($("main-content-wrapper[active]").scrollTop > threshold) {
        // Find the oldest (min) create_date of what we have so far
        const max_create_date = state.cache["/favorites"].activities.reduce(
          (min, activity) => {
            return min < activity.favorite_create_date ? min : activity.favorite_create_date;
          },
          new Date().toISOString(),
        );

        // Use that to load anything older than that (our min is the max of what we want returned)
        state.loading_path = true;
        fetch("/session", {
          method: "POST",
          body: JSON.stringify({
            path: "/favorites",
            max_create_date,
          }),
        })
          .then((response) => response.json())
          .then(function (data) {
            // Stop when we reach the end (no more results returned)
            if (data.activities && !data.activities.length) {
              state.cache["/favorites"].finished = true;
            }

            // Append what we found to the existing cache
            state.cache["/favorites"].activities.push(...data.activities);

            // And re-render if any activities added
            if (data.activities.length) {
              renderActivities(state.cache["/favorites"].activities);
            }
            state.loading_path = false;
          })
          .catch(function (error) {
            state.loading_path = false;
            state.most_recent_error = error;
            alertError("Network error loading more");
          });
      }
    }

    // Topics load older
    if (
      state.path === "/topics" &&
      state.cache["/topics"] &&
      !state.cache["/topics"].finished
    ) {
      // A threshold based on how much is left to scroll
      const threshold =
        $("main-content-wrapper[active]").scrollHeight -
        $("main-content-wrapper[active]").clientHeight * 3;

      // When we pass the threshold
      if ($("main-content-wrapper[active]").scrollTop > threshold) {
        // Find the oldest (min) create_date of what we have so far
        const max_topic_create_date = state.cache["/topics"].topics.reduce(
          (min, topic) => {
            return min < topic.create_date ? min : topic.create_date;
          },
          new Date().toISOString(),
        );

        // Use that to load anything older than that (our min is the max of what we want returned)
        state.loading_path = true;
        fetch("/session", {
          method: "POST",
          body: JSON.stringify({
            path: "/topics",
            max_topic_create_date,
          }),
        })
          .then((response) => response.json())
          .then(function (data) {
            // Stop when we reach the end (no more results returned)
            if (data.topics && !data.topics.length) {
              state.cache["/topics"].finished = true;
            }

            // Append what we found to the existing cache
            state.cache["/topics"].topics.push(...data.topics);

            // And re-render if any topics added
            if (data.topics.length) {
              renderTopics(state.cache["/topics"].topics);
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

    // Topics from favorites load older
    if (
      state.path === "/topics_from_favorites" &&
      state.cache["/topics_from_favorites"] &&
      !state.cache["/topics_from_favorites"].finished
    ) {
      // A threshold based on how much is left to scroll
      const threshold =
        $("main-content-wrapper[active]").scrollHeight -
        $("main-content-wrapper[active]").clientHeight * 3;

      // When we pass the threshold
      if ($("main-content-wrapper[active]").scrollTop > threshold) {
        // Find the oldest (min) create_date of what we have so far
        const max_topic_create_date = state.cache["/topics"].topics.reduce(
          (min, topic) => {
            return min < topic.create_date ? min : topic.create_date;
          },
          new Date().toISOString(),
        );

        // Use that to load anything older than that (our min is the max of what we want returned)
        state.loading_path = true;
        fetch("/session", {
          method: "POST",
          body: JSON.stringify({
            path: "/topics_from_favorites",
            max_topic_create_date,
          }),
        })
          .then((response) => response.json())
          .then(function (data) {
            // Stop when we reach the end (no more results returned)
            if (data.topics && !data.topics.length) {
              state.cache["/topics_from_favorites"].finished = true;
            }

            // Append what we found to the existing cache
            state.cache["/topics_from_favorites"].topics.push(...data.topics);

            // And re-render if any topics added
            if (data.topics.length) {
              renderTopics(state.cache["/topics_from_favorites"].topics);
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

    // Tags load older
    if (
      state.path.substr(0,5) === "/tag/" &&
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
        const max_topic_create_date = state.cache["/topics"].topics.reduce(
          (min, topic) => {
            return min < topic.create_date ? min : topic.create_date;
          },
          new Date().toISOString(),
        );

        // Use that to load anything older than that (our min is the max of what we want returned)
        state.loading_path = true;
        fetch("/session", {
          method: "POST",
          body: JSON.stringify({
            path: state.path,
            max_topic_create_date,
          }),
        })
          .then((response) => response.json())
          .then(function (data) {
            // Stop when we reach the end (no more results returned)
            if (data.topics && !data.topics.length) {
              state.cache[state.path].finished = true;
            }

            // Append what we found to the existing cache
            state.cache[state.path].topics.push(...data.topics);

            // And re-render if any topics added
            if (data.topics.length) {
              renderTopics(state.cache[state.path].topics);
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
      (state.path.substr(0, 7) === "/topic/") &&
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
