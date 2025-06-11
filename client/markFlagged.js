const pending_flag_saves = []
let active_flag_save = null
const markFlagged = async (post_or_reply) => {
	// Set some variables
	const post_id = post_or_reply.post_id || post_or_reply.id
	const reply_id = post_or_reply.reply_id || post_or_reply.id

	// Alert the user to the change
	if (post_or_reply.$post) {
		alertInfo("Post was flagged")
	}
	if (post_or_reply.$reply) {
		alertInfo("Reply was flagged")
	}

	// Queue up the save
	pending_flag_saves.push(() => {
		active_flag_save = true
		fetch("/session", {
			method: "POST",
			body: JSON.stringify({
				post_id_to_flag: post_or_reply.$post ? post_id : 0,
				reply_id_to_flag: post_or_reply.$reply ? reply_id : 0,
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
		if (pending_flag_saves.length > 0) {
			pending_flag_saves.shift()()
		} else {
			active_flag_save = false
			state.cache = {}
			goToPath("/posts")
		}
	}

	// Perform first save if none active
	if (!active_flag_save) {
		pending_flag_saves.shift()()
	}
}
