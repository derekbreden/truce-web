const renderReply = (reply) => {
	const note = reply.note || ""
	const note_title = note.slice(0, note.indexOf(" ")).replace(/[^a-z\-]/gi, "")
	const note_body = note.slice(note.indexOf(" ") + 1)

	let $reply_body = markdownToElements(reply.body)
	let characters_used = 0
	let trimmed = false
	if (state.path === "/favorites") {
		let added = 0
		$reply_body = $reply_body.reduce((acc, child) => {
			characters_used += child.textContent.length
			if (characters_used < 500 || !added) {
				acc.push(child)
				added++
			} else {
				trimmed = true
			}
			return acc
		}, [])
		if (trimmed) {
			$reply_body.push(
				$old(
					`
					p ...
					`,
				),
			)
		}
	}

	let $reply = $old(
		`
		reply[flex-column]
			h3
				author[slug=$1]
					profile-picture
						profile-image
							$2
					span $3
					$4
				icon[more]
			$5
			$6
			$7
		`,
		[
			reply.user_slug,
			reply.profile_picture_uuid
				? $old(
					`
						img[src=$1]
						`,
					["/image/" + reply.profile_picture_uuid],
				)
				: $old(
					`
					icon[profile-picture]
					`
				),
			renderName(reply.display_name, reply.display_name_index),
			reply.user_verified
				? $old(
					`
						icon[verified]
						`
				)
				: [],
			$reply_body,
			reply.note
				? $old(
					`
						info-wrapper
							info
								b $1
								span $2
						`,
					[note_title, note_body],
				)
				: [],
			$old(
				`
				reply-wrapper[detail-wrapper]
					detail[favorites][favorited=$1]
						$2
						p[muted] $3
					detail[more][muted]
						icon[forward]
					button[small][reply] Reply
				`,
				[
					reply.favorited,
					reply.favorited
						? $old(
							`
							icon[favorited]
							`
						)
						: $old(
							`
							icon[favorites]
							`
						),
					reply.favorite_count,
				],
			),
		],
	)
	if (!trimmed) {
		$reply.$("detail[more]")?.remove()
	}
	if (state.path === "/favorites") {
		$reply.setAttribute("trimmed", "")
	}
	$reply.$("author").forEach(($author) => {
		$author.on("click", ($event) => {
			$event.stopPropagation()
			const slug = $author.getAttribute("slug")
			goToPath(`/user/${slug}`)
		})
	})
	$reply.$("detail[favorites]").on("click", ($event) => {
		$event.stopPropagation()
		toggleFavorite(reply)
	})
	$reply.$("[reply]").on("click", () => {
		$reply.$(":scope > reply-wrapper").style.display = "none"
		$reply.$(":scope > reply-wrapper").after(showAddNewReply(null, reply))
		focusAddNewReply()
	})
	$reply.$("icon[more]").on("click", ($event) => {
		$event.preventDefault()
		$event.stopPropagation()
		const $more_modal = $old(
			`
			modal-wrapper
				modal[info]
					action[edit]
						icon[edit]
						p Edit
					action[flag]
						icon[flag]
						p Flag reply
					action[block]
						icon[block]
						p Block user
					button-wrapper
						button[alt][cancel] Cancel
					p[notice][center]
						span Email us at
						a[href="mailto:derek@truce.net"] derek@truce.net
						span to provide feedback or report inappropriate activity.
				modal-bg[full-width]
			`,
		)
		const moreModalCancel = () => {
			$more_modal.remove()
		}
		$more_modal.$("[cancel]").on("click", moreModalCancel)
		$more_modal.$("modal-bg").on("click", moreModalCancel)
		if (reply.edit) {
			$more_modal.$("action[edit]").on("click", ($event) => {
				$event.preventDefault()
				moreModalCancel()
				$reply.replaceWith(showAddNewReply(reply))
				focusAddNewReply()
			})
			$more_modal.$("action[block]").remove()
			if (state.path === "/favorites") {
				$more_modal.$("action[edit]").remove()
			}
		} else {
			$more_modal.$("action[edit]").remove()
			$more_modal.$("action[block]").on("click", ($event) => {
				$event.preventDefault()
				moreModalCancel()
				modalConfirm(
					$old(
						`
						h2
							icon[block]
							span Block user - are you sure?
						p This will hide all content from this user.
						p This action cannot be undone.
						`,
					),
					() => {
						markBlocked(reply)
					},
				)
			})
		}
		$more_modal.$("action[flag]").on("click", ($event) => {
			$event.preventDefault()
			moreModalCancel()
			modalConfirm(
				$old(
					`
					h2
						icon[flag]
						span Flag reply - are you sure?
					p This will hide this reply for everyone.
					p This action cannot be undone.
					`,
				),
				() => {
					markFlagged(reply)
				},
			)
		})
		$old("modal-wrapper")?.remove()
		$old("body").appendChild($more_modal)
	})
	if (reply.image_uuids) {
		const image_uuids = reply.image_uuids.split(",").reverse()
		for (const image_uuid of image_uuids) {
			const $image = $old(
				`
				p[img]
					img[src=$1]
				`,
				["/image/" + image_uuid],
			)
			bindImageClick($image, image_uuid)
			$reply.$("h3").after($image)
		}
	}
	reply.$reply = $reply
	return $reply
}