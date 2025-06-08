const forEachCachedPost = (callback) => {
	const cache_keys = Object.keys(state.cache)
	for (const cache_key of cache_keys) {
		state.cache[cache_key].posts.forEach(callback)
		state.cache[cache_key].activities.forEach((activity) => {
			if (activity.type === "post") {
				activity.post_id = activity.id
				callback(activity)
			}
		})
	}
}
const forEachCachedReply = (callback) => {
	const cache_keys = Object.keys(state.cache)
	for (const cache_key of cache_keys) {
		state.cache[cache_key].replies.forEach(callback)
		state.cache[cache_key].activities.forEach((activity) => {
			if (activity.type === "reply") {
				activity.reply_id = activity.id
				callback(activity)
			}
		})
	}
}
