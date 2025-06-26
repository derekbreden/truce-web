const forEachCachedPost = (callback) => {
	const cache_keys = Object.keys(state.cache)
	for (const cache_key of cache_keys) {
		state.cache[cache_key].posts.forEach(callback)
		state.cache[cache_key].favorites.forEach((favorite) => {
			if (favorite.type === "post") {
				favorite.post_id = favorite.id
				callback(favorite)
			}
		})
	}
}
const forEachCachedReply = (callback) => {
	const cache_keys = Object.keys(state.cache)
	for (const cache_key of cache_keys) {
		state.cache[cache_key].replies.forEach(callback)
		state.cache[cache_key].favorites.forEach((favorite) => {
			if (favorite.type === "reply") {
				favorite.reply_id = favorite.id
				callback(favorite)
			}
		})
	}
}
