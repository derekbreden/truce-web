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
				$(
					`
					p ...
					`,
				),
			)
		}
	}

	let $reply = $(
		`
		reply
			h3
				author[slug=$1]
					profile-picture
						image
							$2
					span $3
					$4
				$5
			$6
			$7
			$8
		`,
		[
			reply.user_slug,
			reply.profile_picture_uuid
				? $(
						`
						img[src=$1]
						`,
						["/image/" + reply.profile_picture_uuid],
					)
				: $("icons icon[profile-picture] svg").cloneNode(true),
			renderName(reply.display_name, reply.display_name_index),
			reply.user_verified
				? $(
						`
						icon
							$1
						`,
						[$("icons icon[verified] svg").cloneNode(true)],
					)
				: [],
			$(
				`
				icon[more]
					$1
				`,
				[$("icons icon[more] svg").cloneNode(true)],
			),
			$reply_body,
			reply.note
				? $(
						`
						info-wrapper
							info
								b $1
								span $2
						`,
						[note_title, note_body],
					)
				: [],
			$(
				`
				reply-wrapper[detail-wrapper]
					detail[favorites][favorited=$1]
						icon
							$2
						p $3
					detail[more]
						icon
							$4
					button[small][reply] Reply
				`,
				[
					reply.favorited,
					reply.favorited
						? $("icons icon[favorited] svg").cloneNode(true)
						: $("footer icon[favorites] svg").cloneNode(true),
					reply.favorite_count,
					$("icons icon[forward] svg").cloneNode(true),
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
		const $more_modal = $(
			`
			modal-wrapper
				modal[info]
					action[edit]
						icon[edit]
							$1
						p Edit
					action[flag]
						icon[flag]
							$2
						p Flag reply
					action[block]
						icon[block]
							$3
						p Block user
					button-wrapper
						button[alt][cancel] Cancel
					p[notice]
						span Email us at
						a[href="mailto:derek@truce.net"] derek@truce.net
						span to provide feedback or report inappropriate activity.
				modal-bg
			`,
			[
				$("icons icon[edit] svg").cloneNode(true),
				$("icons icon[flag] svg").cloneNode(true),
				$("icons icon[block] svg").cloneNode(true),
			],
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
					$(
						`
						h2
							icon[block]
								$1
							span Block user - are you sure?
						p This will hide all content from this user.
						p This action cannot be undone.
						`,
						[$("icons icon[block] svg").cloneNode(true)],
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
				$(
					`
					h2
						icon
							$1
						span Flag reply - are you sure?
					p This will hide this reply for everyone.
					p This action cannot be undone.
					`,
					[$("icons icon[flag] svg").cloneNode(true)],
				),
				() => {
					markFlagged(reply)
				},
			)
		})
		$("modal-wrapper")?.remove()
		$("body").appendChild($more_modal)
	})
	if (reply.image_uuids) {
		const image_uuids = reply.image_uuids.split(",").reverse()
		for (const image_uuid of image_uuids) {
			const $image = $(
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