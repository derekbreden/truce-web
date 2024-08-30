const pending_toggle_saves = [];
let active_toggle_save = null;
const toggleFavorite = async (topic_or_comment) => {
  // Set some variables
  const topic_id = topic_or_comment.topic_id || topic_or_comment.id;
  const comment_id = topic_or_comment.comment_id || topic_or_comment.id;
  const was_favorited = topic_or_comment.favorited;

  // Update any cached items
  if (topic_or_comment.$topic) {
    forEachCachedTopic((topic) => {
      if (topic.topic_id === topic_id) {
        if (was_favorited) {
          topic.favorite_count = String(Number(topic.favorite_count) - 1);
          topic.favorited = false;
        } else {
          topic.favorite_count = String(Number(topic.favorite_count) + 1);
          topic.favorited = true;
        }
      }
    });
  }
  if (topic_or_comment.$comment) {
    forEachCachedComment((comment) => {
      if (comment.comment_id === comment_id) {
        if (was_favorited) {
          comment.favorite_count = String(Number(comment.favorite_count) - 1);
          comment.favorited = false;
        } else {
          comment.favorite_count = String(Number(comment.favorite_count) + 1);
          comment.favorited = true;
        }
      }
    });
  }

  // Remove from the active dom / cache if unfavorited
  state.cache["/favorites"]?.activities?.forEach((activity, activity_index) => {
    if (
      (topic_or_comment.$comment &&
        activity.type === "comment" &&
        activity.id === comment_id) ||
      (topic_or_comment.$topic &&
        activity.type === "topic" &&
        activity.id === topic_id)
    ) {
      if (was_favorited) {
        state.cache["/favorites"]?.activities?.splice(activity_index, 1);
        activity.$activity.setAttribute("explode-out", "");
        setTimeout(() => {
          activity.$activity.remove();
        }, 200);
      }
    }
  });

  // Update the current DOM
  if (topic_or_comment.favorited) {
    (topic_or_comment.$topic || topic_or_comment.$comment)
      .$(":scope > [detail-wrapper] detail[favorites]")
      .setAttribute("favorited", "");
  } else {
    (topic_or_comment.$topic || topic_or_comment.$comment)
      .$(":scope > [detail-wrapper] detail[favorites]")
      .removeAttribute("favorited");
  }
  (topic_or_comment.$topic || topic_or_comment.$comment)
    .$(":scope > [detail-wrapper] detail[favorites] svg")
    .replaceWith(
      topic_or_comment.favorited
        ? $("icons icon[favorited] svg").cloneNode(true)
        : $("footer icon[favorites] svg").cloneNode(true),
    );
  (topic_or_comment.$topic || topic_or_comment.$comment)
    .$(":scope > [detail-wrapper] detail[favorites] p")
    .replaceWith(
      $(
        `
      p $1
      `,
        [topic_or_comment.favorite_count],
      ),
    );

  // Alert the user to the change
  if (was_favorited) {
    if (topic_or_comment.$topic) {
      alertInfo("Topic removed from your favorites");
    }
    if (topic_or_comment.$comment) {
      alertInfo("Comment removed from your favorites");
    }
  } else {
    if (topic_or_comment.$topic) {
      alertInfo("Topic added to your favorites");
    }
    if (topic_or_comment.$comment) {
      alertInfo("Comment added to your favorites");
    }
  }

  // Queue up the save
  pending_toggle_saves.push(() => {
    active_toggle_save = true;
    fetch("/session", {
      method: "POST",
      body: JSON.stringify({
        topic_id_to_favorite: topic_or_comment.$topic ? topic_id : 0,
        comment_id_to_favorite: topic_or_comment.$comment ? comment_id : 0,
        was_favorited: was_favorited,
      }),
    })
      .then((response) => response.json())
      .then(function (data) {
        if (data.error || !data.success) {
          console.error(data.error);
          alertError(data.error || "Server error");
        } else {
          if (data.user_id) {
            state.user_id = data.user_id;
          }
          if (data.display_name) {
            state.display_name = data.display_name;
          }
        }
        performNextSave();
      })
      .catch(function (error) {
        console.error(error);
        alertError("Network error");
        performNextSave();
      });
  });

  // Perform next save
  const performNextSave = () => {
    if (pending_toggle_saves.length > 0) {
      pending_toggle_saves.shift()();
    } else {
      active_toggle_save = false;

      // Finished all saves

      // Update the topics from favorites as applicable
      if (state.cache["/topics_from_favorites"]?.topics) {
        state.cache["/topics_from_favorites"].topics = [];
        startSession();
      }
    }
  };

  // Perform first save if none active
  if (!active_toggle_save) {
    pending_toggle_saves.shift()();
  }
};
