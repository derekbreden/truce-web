const updateDisplayName = (data) => {
	// Workaround for back button not updating
	if ($old("tab-wrapper")) {
		const previous_path = state.path_history[state.path_history.length - 2]
		if (previous_path === `/user/${state.user_slug}`) {
			state.path_history[state.path_history.length - 2] =
				`/user/${data.user_slug}`

			// Best argument for using reactive framework right here?
			$old("tab-wrapper tab-item p").textContent = renderName(
				data.display_name,
				data.display_name_index,
			)
		}
	}

	// Update state from data
	state.user_id = data.user_id
	state.display_name = data.display_name
	state.display_name_index = data.display_name_index
	state.user_slug = data.user_slug

	// Iterate each cache key
	Object.keys(state.cache).forEach((cache_key) => {
		const cache = state.cache[cache_key]

		// Update the relevant user display name data for each category of data
		cache.posts?.forEach((post) => {
			if (post.user_id === state.user_id) {
				post.display_name = state.display_name
				post.display_name_index = state.display_name_index
				post.user_slug = state.user_slug
			}
		})
		cache.replies?.forEach((reply) => {
			if (reply.user_id === state.user_id) {
				reply.display_name = state.display_name
				reply.display_name_index = state.display_name_index
				reply.user_slug = state.user_slug
			}
		})
		cache.users?.forEach((user) => {
			if (user.user_id === state.user_id) {
				user.display_name = state.display_name
				user.display_name_index = state.display_name_index
				user.user_slug = state.user_slug
			}
		})
		cache.favorites?.forEach((favorite) => {
			if (favorite.user_id === state.user_id) {
				favorite.display_name = state.display_name
				favorite.display_name_index = state.display_name_index
				favorite.user_slug = state.user_slug
			}
		})
		if (cache.user && cache.user.user_id === state.user_id) {
			cache.user.display_name = state.display_name
			cache.user.display_name_index = state.display_name_index
			cache.user.user_slug = state.user_slug
		}
	})
}
