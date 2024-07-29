const forEachCachedTopic = (callback) => {
  const cache_keys = Object.keys(state.cache);
  for (const cache_key of cache_keys) {
    state.cache[cache_key].topics.forEach(callback);
    state.cache[cache_key].activities.forEach((activity) => {
      if (activity.type === "topic") {
        activity.topic_id = activity.id;
        callback(activity);
      }
    });
  }
}
const forEachCachedComment = (callback) => {
  const cache_keys = Object.keys(state.cache);
  for (const cache_key of cache_keys) {
    state.cache[cache_key].comments.forEach(callback);
    state.cache[cache_key].activities.forEach((activity) => {
      if (activity.type === "comment") {
        activity.comment_id = activity.id;
        callback(activity);
      }
    });
  }
}