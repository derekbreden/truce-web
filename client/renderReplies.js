const renderReplies = (replies) => {
	// Creates a $reply element on each reply in the array
	replies.forEach(renderReply)

	// Attach the reply elements to each other in a hierarchy
	replies.forEach((reply) => {
		if (reply.parent_reply_id) {
			const parent = replies.find(
				(c) => c.reply_id === reply.parent_reply_id,
			)

			// When all ancestors are an only child we act like a sibling instead of a child
			let ancestor = parent
			if (!ancestor) {
				return
			}
			let found_siblings = false
			while (!found_siblings && ancestor.parent_reply_id) {
				const siblings = replies.filter(
					(c) =>
						c.parent_reply_id === ancestor.parent_reply_id &&
						c.reply_id !== ancestor.reply_id,
				)
				if (siblings.length === 0) {
					ancestor = replies.find(
						(c) => c.reply_id === ancestor.parent_reply_id,
					)
				} else {
					siblings.forEach((sibling) => {
						const $reply = sibling.$reply.$(":scope > reply-wrapper [reply]")
						if ($reply) {
							$reply.setAttribute("alt", "")
							$reply.setAttribute("faint", "")
						}
					})
					found_siblings = true
				}
			}
			ancestor.$reply.appendChild(reply.$reply)
			const $reply = parent.$reply.$(":scope > reply-wrapper [reply]")
			if ($reply) {
				$reply.setAttribute("alt", "")
				$reply.setAttribute("faint", "")
			}
		}
	})

	// Identify the root replies (threads) to be displayed
	const $root_replies = replies
		.filter((c) => !c.parent_reply_id)
		.sort((a, b) => new Date(b.create_date) - new Date(a.create_date))
		.map((c) => {
			c.$reply.reply_id = c.reply_id
			return c.$reply
		})

	// Collapse all the intermediates in each thread, if present
	$root_replies.forEach(($root_reply) => {
		const $child_replies = Array.from($root_reply.$("reply") || [])
		if ($child_replies.length > 1) {
			const $last_reply = $child_replies.pop()
			const $original_parent = $last_reply.parentElement

			// Collapse button
			const $collapse_button = $(
				`
				expand-wrapper[collapse]
					button[expand-left]
					p $1
					button[expand-right]
				`,
				[`Hide ${$child_replies.length} replies`],
			)
			$collapse_button.on("click", () => {
				// Track what is collapsed
				const index = state.expanded_reply_ids.indexOf(
					$root_reply.reply_id,
				)
				if (index !== -1) {
					state.expanded_reply_ids.splice(index, 1)
					localStorage.setItem(
						`${window.local_storage_key}:expanded_reply_ids`,
						JSON.stringify(state.expanded_reply_ids),
					)
				}

				// Add and remove the buttons
				$root_reply.$(":scope > reply-wrapper").after($expand_button)
				$collapse_button.remove()

				// Move last child to bottom of root
				$root_reply.appendChild($last_reply)

				// Show intermediates
				$child_replies.forEach(($child_reply) => {
					$child_reply.style.display = "none"
					$child_reply.$expand_button = $expand_button
				})
			})

			// Expand button
			const $expand_button = $(
				`
				expand-wrapper[expand]
					button[expand-up]
					p $1
					button[expand-down]
				`,
				[`Show ${$child_replies.length} hidden replies`],
			)
			$expand_button.on("click", ($event) => {
				// Track what is expanded
				const index = state.expanded_reply_ids.indexOf(
					$root_reply.reply_id,
				)
				if (index === -1) {
					state.expanded_reply_ids.push($root_reply.reply_id)
					localStorage.setItem(
						`${window.local_storage_key}:expanded_reply_ids`,
						JSON.stringify(state.expanded_reply_ids),
					)
				}

				// Track for scroll position
				const original_rect = $last_reply.getBoundingClientRect()

				// Add and remove the buttons
				$expand_button.remove()
				$root_reply.$(":scope > reply-wrapper").after($collapse_button)

				// Bring all the collapsed nodes back and flash them
				$child_replies.forEach(($child_reply) => {
					$child_reply.style.display = "flex"
					if (!$event.detail?.skip_flash) {
						$child_reply.setAttribute("flash-focus", "")
					}
				})

				// Slightly shift the last element horizontally after that flash finishes
				// setTimeout(() => {
				$original_parent.appendChild($last_reply)
				// }, 500)

				// When they click down, keep scroll on the last reply
				if ($event.target?.hasAttribute("expand-down")) {
					const final_rect = $last_reply.getBoundingClientRect()
					$("main-content-wrapper[active]").scrollTop =
						$("main-content-wrapper[active]").scrollTop +
						(final_rect.y - original_rect.y)
				}
			})
			if (state.expanded_reply_ids.includes($root_reply.reply_id)) {
				$expand_button.dispatchEvent(
					new CustomEvent("click", { detail: { skip_flash: true } }),
				)
			} else {
				$collapse_button.click()
			}
		}
	})

	// Add each thread to the DOM
	beforeDomUpdate()
	const showReplyList = state.path.substr(0, 6) === "/post/"
	if (!$("main-content-wrapper[active] replies")) {
		const target =
			state.path.substr(0, 7) === "/reply/"
				? "main-content-wrapper[active] main-content"
				: "main-content-wrapper[active] main-content-2"
		$(target).appendChild(
			$(
				`
				replies
				`,
			),
		)
	}
	$("main-content-wrapper[active] replies").replaceChildren(
		...[
			...(showReplyList
				? [
						state.active_add_new_reply?.is_root_1
							? state.active_add_new_reply
							: showAddNewReplyButton("1"),
						$(
							`
							expand-wrapper[above-replies]
								p $1
							`,
							[
								replies.length +
									(replies.length === 1 ? " reply" : " replies"),
							],
						),
					]
				: []),
			...$root_replies,
			...(showReplyList && $root_replies.length
				? [
						state.active_add_new_reply?.is_root_2
							? state.active_add_new_reply
							: showAddNewReplyButton("2"),
					]
				: []),
		],
	)
	if (state.active_add_new_reply?.is_edit) {
		const reply = replies.find(
			(c) => c.reply_id === state.active_add_new_reply.is_edit,
		)
		reply.$reply.replaceWith(state.active_add_new_reply)
	}
	if (state.active_add_new_reply?.is_reply) {
		const reply = replies.find(
			(c) => c.reply_id === state.active_add_new_reply.is_reply,
		)
		reply.$reply.$(":scope > reply-wrapper").style.display = "none"
		reply.$reply
			.$(":scope > reply-wrapper")
			.after(state.active_add_new_reply)
	}
	if (state.path === "/" || state.path === "/privacy") {
		$("reply-wrapper")?.forEach(
			($reply_wrapper) => ($reply_wrapper.style.display = "none"),
		)
		$("p[add-new-reply]")?.remove()
		$("expand-wrapper[above-replies]")?.remove()
	}
	afterDomUpdate()

	// Highlight a reply in a thread we've navigated to specifically
	if (state.path.substr(0, 6) === "/reply") {
		const reply_id = state.path.substr(9)
		const reply = replies.find((c) => c.reply_id === reply_id)
		if (reply.$reply.style.display === "none") {
			reply.$reply.$expand_button.dispatchEvent(
				new CustomEvent("click", { detail: { skip_flash: true } }),
			)
		}
		reply.$reply.setAttribute("flash-long-focus", "")
		// Wait for slide in animation before scrolling
		setTimeout(() => {
			reply.$reply.scrollIntoView({ behavior: "smooth", block: "nearest" })
		}, 250)
		setTimeout(() => {
			reply.$reply.removeAttribute("flash-long-focus")
		}, 2500)
	}

	// Only render a single reply thread as a thread
	if (state.path.substr(0, 6) === "/reply") {
		$("main-content-wrapper[active] replies").setAttribute("thread", "")
	} else {
		$("main-content-wrapper[active] replies").removeAttribute("thread")
	}
}