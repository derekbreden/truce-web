const pending_block_saves = [];
let active_block_save = null;
const markBlocked = async (topic_or_comment) => {
  // Set some variables
  const topic_id = topic_or_comment.topic_id || topic_or_comment.id;
  const comment_id = topic_or_comment.comment_id || topic_or_comment.id;

  // Alert the user to the change
  alertInfo("User was blocked");

  // Queue up the save
  pending_block_saves.push(() => {
    active_block_save = true;
    fetch("/session", {
      method: "POST",
      body: JSON.stringify({
        topic_id_to_block: topic_or_comment.$topic ? topic_id : 0,
        comment_id_to_block: topic_or_comment.$comment ? comment_id : 0,
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
    if (pending_block_saves.length > 0) {
      pending_block_saves.shift()();
    } else {
      active_block_save = false;
      state.cache = {};
      goToPath("/topics");
    }
  };

  // Perform first save if none active
  if (!active_block_save) {
    pending_block_saves.shift()();
  }
};
