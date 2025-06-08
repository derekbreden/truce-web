const pending_block_saves = []
let active_block_save = null
const markBlocked = async (post_or_reply) => {
	// Set some variables
	const post_id = post_or_reply.post_id || post_or_reply.id
	const reply_id = post_or_reply.reply_id || post_or_reply.id

	// Alert the user to the change
	alertInfo("User was blocked")

	// Queue up the save
	pending_block_saves.push(() => {
		active_block_save = true
		fetch("/session", {
			method: "POST",
			body: JSON.stringify({
				post_id_to_block: post_or_reply.$post ? post_id : 0,
				reply_id_to_block: post_or_reply.$reply ? reply_id : 0,
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
		if (pending_block_saves.length > 0) {
			pending_block_saves.shift()()
		} else {
			active_block_save = false
			state.cache = {}
			goToPath("/posts")
		}
	}

	// Perform first save if none active
	if (!active_block_save) {
		pending_block_saves.shift()()
	}
}
