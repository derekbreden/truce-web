const pending_flag_saves = [];
let active_flag_save = null;
const markFlagged = async (topic_or_comment) => {
  // Set some variables
  const topic_id = topic_or_comment.topic_id || topic_or_comment.id;
  const comment_id = topic_or_comment.comment_id || topic_or_comment.id;

  // Alert the user to the change
  if (topic_or_comment.$topic) {
    alertInfo("Topic was flagged");
  }
  if (topic_or_comment.$comment) {
    alertInfo("Comment was flagged");
  }

  // Queue up the save
  pending_flag_saves.push(() => {
    active_flag_save = true;
    fetch("/session", {
      method: "POST",
      body: JSON.stringify({
        topic_id_to_flag: topic_or_comment.$topic ? topic_id : 0,
        comment_id_to_flag: topic_or_comment.$comment ? comment_id : 0,
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
    if (pending_flag_saves.length > 0) {
      pending_flag_saves.shift()();
    } else {
      active_flag_save = false;
      state.cache = {};
      goToPath("/topics");
    }
  };

  // Perform first save if none active
  if (!active_flag_save) {
    pending_flag_saves.shift()();
  }
};
