const pending_toggle_saves = []
let active_toggle_save = null
const toggleFavorite = async (topic_or_comment) => {
	// Set some variables
	const topic_id = topic_or_comment.topic_id || topic_or_comment.id
	const comment_id = topic_or_comment.comment_id || topic_or_comment.id
	const was_favorited = topic_or_comment.favorited

	// Update any cached items
	if (topic_or_comment.$post) {
		forEachCachedTopic((topic) => {
			if (topic.topic_id === topic_id) {
				if (was_favorited) {
					topic.favorite_count = String(Number(topic.favorite_count) - 1)
					topic.favorited = false
				} else {
					topic.favorite_count = String(Number(topic.favorite_count) + 1)
					topic.favorited = true
				}
			}
		})
	}
	if (topic_or_comment.$reply) {
		forEachCachedComment((comment) => {
			if (comment.comment_id === comment_id) {
				if (was_favorited) {
					comment.favorite_count = String(Number(comment.favorite_count) - 1)
					comment.favorited = false
				} else {
					comment.favorite_count = String(Number(comment.favorite_count) + 1)
					comment.favorited = true
				}
			}
		})
	}

	// Remove from the active dom / cache if unfavorited
	state.cache["/favorites"]?.activities?.forEach((activity, activity_index) => {
		if (
			(topic_or_comment.$reply &&
				activity.type === "comment" &&
				activity.id === comment_id) ||
			(topic_or_comment.$post &&
				activity.type === "topic" &&
				activity.id === topic_id)
		) {
			if (was_favorited) {
				state.cache["/favorites"]?.activities?.splice(activity_index, 1)
				activity.$activity.setAttribute("explode-out", "")
				setTimeout(() => {
					activity.$activity.remove()
				}, 200)
			}
		}
	})

	// Update the current DOM
	const $element = topic_or_comment.$post || topic_or_comment.$reply
	if ($element) {
		const $favoritesDetail = $element.$(":scope > [detail-wrapper] detail[favorites]")
		if ($favoritesDetail) {
			if (topic_or_comment.favorited) {
				$favoritesDetail.setAttribute("favorited", "")
			} else {
				$favoritesDetail.removeAttribute("favorited")
			}
		}
		const $favoritesSvg = $element.$(":scope > [detail-wrapper] detail[favorites] svg")
		if ($favoritesSvg) {
			$favoritesSvg.replaceWith(
				topic_or_comment.favorited
					? $("icons icon[favorited] svg").cloneNode(true)
					: $("footer icon[favorites] svg").cloneNode(true),
			)
		}
		const $favoritesP = $element.$(":scope > [detail-wrapper] detail[favorites] p")
		if ($favoritesP) {
			$favoritesP.replaceWith(
				$(
					`
				p $1
				`,
					[topic_or_comment.favorite_count],
				),
			)
		}
	}

	// Alert the user to the change
	if (was_favorited) {
		if (topic_or_comment.$post) {
			alertInfo("Post removed from your favorites")
		}
		if (topic_or_comment.$reply) {
			alertInfo("Reply removed from your favorites")
		}
	} else {
		if (topic_or_comment.$post) {
			alertInfo("Post added to your favorites")
		}
		if (topic_or_comment.$reply) {
			alertInfo("Reply added to your favorites")
		}
	}

	// Queue up the save
	pending_toggle_saves.push(() => {
		active_toggle_save = true
		fetch("/session", {
			method: "POST",
			body: JSON.stringify({
				topic_id_to_favorite: topic_or_comment.$post ? topic_id : 0,
				comment_id_to_favorite: topic_or_comment.$reply ? comment_id : 0,
				was_favorited: was_favorited,
			}),
		})
			.then((response) => response.json())
			.then(function (data) {
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
			.catch(function (error) {
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
