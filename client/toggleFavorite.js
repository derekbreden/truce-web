const pending_toggle_saves = []
let active_toggle_save = null
const toggleFavorite = async (post_or_reply) => {
	// Set some variables
	const post_id = post_or_reply.post_id || post_or_reply.id
	const reply_id = post_or_reply.reply_id || post_or_reply.id
	const was_favorited = post_or_reply.favorited

	// Update any cached items
	if (post_or_reply.$post) {
		forEachCachedPost((post) => {
			if (post.post_id === post_id) {
				if (was_favorited) {
					post.favorite_count = String(Number(post.favorite_count) - 1)
					post.favorited = false
				} else {
					post.favorite_count = String(Number(post.favorite_count) + 1)
					post.favorited = true
				}
			}
		})
	}
	if (post_or_reply.$reply) {
		forEachCachedReply((reply) => {
			if (reply.reply_id === reply_id) {
				if (was_favorited) {
					reply.favorite_count = String(Number(reply.favorite_count) - 1)
					reply.favorited = false
				} else {
					reply.favorite_count = String(Number(reply.favorite_count) + 1)
					reply.favorited = true
				}
			}
		})
	}

	// Remove from the active dom / cache if unfavorited
	state.cache["/favorites"]?.favorites?.forEach((favorite, favorite_index) => {
		if (
			(post_or_reply.$reply
				&& favorite.type === "reply"
				&& favorite.id === reply_id)
			|| (post_or_reply.$post
				&& favorite.type === "post"
				&& favorite.id === post_id)
		) {
			if (was_favorited) {
				state.cache["/favorites"]?.favorites?.splice(favorite_index, 1)
				favorite.$favorite.setAttribute("explode-out", "")
				setTimeout(() => {
					favorite.$favorite.remove()
				}, 200)
			}
		}
	})

	// Update the current DOM
	const $element = post_or_reply.$post || post_or_reply.$reply
	const $favoritesDetail = $element.$(":scope > [detail-wrapper] detail[favorites]")
	if (post_or_reply.favorited) {
		$favoritesDetail.setAttribute("favorited", "")
	} else {
		$favoritesDetail.removeAttribute("favorited")
	}
	const $favoritesIcon = $element.$(":scope > [detail-wrapper] detail[favorites] icon")
	$favoritesIcon.replaceWith(
		post_or_reply.favorited
			? $(
				`
				icon[favorited]
				`
			)
			: $(
				`
				icon[favorites]
				`
			),
	)
	const $favoritesP = $element.$(":scope > [detail-wrapper] detail[favorites] p")
	$favoritesP.textContent = post_or_reply.favorite_count

	// Alert the user to the change
	const action = was_favorited ? "removed from" : "added to"
	const type = post_or_reply.$post ? "Post" : "Reply"
	alertInfo(`${type} ${action} your favorites`)

	// Queue up the save
	pending_toggle_saves.push(() => {
		active_toggle_save = true
		fetch("/session", {
			method: "POST",
			body: JSON.stringify({
				post_id_to_favorite: post_or_reply.$post ? post_id : 0,
				reply_id_to_favorite: post_or_reply.$reply ? reply_id : 0,
				was_favorited: was_favorited,
			}),
		})
			.then((response) => response.json())
			.then((data) => {
				if (data.error || !data.success) {
					console.error(data.error)
					alertError(data.error || "Server error")
				} else {
					if (data.user_id) {
						state.user_id = data.user_id
					}
					if (data.display_name) {
						state.display_name = data.display_name
					}
				}
				performNextSave()
			})
			.catch((error) => {
				console.error(error)
				alertError("Network error")
				performNextSave()
			})
	})

	// Perform next save
	const performNextSave = () => {
		if (pending_toggle_saves.length > 0) {
			pending_toggle_saves.shift()()
		} else {
			active_toggle_save = false

			// Finished all saves
		}
	}

	// Perform first save if none active
	if (!active_toggle_save) {
		pending_toggle_saves.shift()()
	}
}
