const renderPost = (post) => {
	const note = post.note || ""
	const note_title = note.slice(0, note.indexOf(" ")).replace(/[^a-z\-]/gi, "")
	const note_body = note.slice(note.indexOf(" ") + 1)
	let $post_body = markdownToElements(post.body)
	let characters_used = 0
	let trimmed = false
	let summary_only = false
	if (
		state.path === "/posts" ||
		state.path === "/posts/all" ||
		state.path === "/favorites" ||
		state.path.substr(0, 7) === "/topic/" ||
		state.path.substr(0, 6) === "/user/"
	) {
		summary_only = true
	}
	if (summary_only) {
		$post_body = $post_body.reduce((acc, child) => {
			characters_used += child.textContent.length
			if (characters_used < 500) {
				acc.push(child)
			} else {
				trimmed = true
			}
			return acc
		}, [])
		if (trimmed) {
			let $last_topic = $post_body[$post_body.length - 1]
			if ($last_topic?.tagName === "UL") {
				$last_topic = $last_topic.querySelector("li:last-child")
			}
			if ($last_topic) {
				$last_topic.innerText = $last_topic.innerText + "\n..."
			}
		}
	}
	const $post = $(
		`
		post
			h2
				$1
				$2
			$3
			$4
			$5
			$6
			$7
		`,
		[
			post.title,
			$(
				`
				icon[more]
					$1
				`,
				[$("icons icon[more] svg").cloneNode(true)],
			),
			$(
				`
				author-topics
					author[slug=$1]
						profile-picture
							image
								$2
						by by
						name
							span $3
							$4
					topics
						$5
				`,
				[
					post.user_slug,
					post.profile_picture_uuid
						? $(
								`
								img[src=$1]
								`,
								["/image/" + post.profile_picture_uuid],
							)
						: $("icons icon[profile-picture] svg").cloneNode(true),
					renderName(post.display_name, post.display_name_index),
					post.user_verified
						? $(
								`
								icon
									$1
								`,
								[$("icons icon[verified] svg").cloneNode(true)],
							)
						: [],
					(post.topics || "")
						.split(",")
						.filter((x) => x)
						.map((topic) =>
							$(
								`
								topic[topic=$1]
									icon
										$2
									span $3
								`,
								[
									topic,
									$(`icons icon[${topic}] svg`).cloneNode(true),
									topic[0].toUpperCase() + topic.slice(1),
								],
							),
						),
				],
			),
			post.note
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
			$post_body,
			post.poll_1
				? $(
						`
					poll-wrapper
						poll-vote-wrapper
							poll-1 $1
							poll-2 $2
							poll-3 $3
							poll-4 $4
						p[results][actual] Actual results:
						poll-counts-actual
							poll-1
								text
									bg
									$1
								percent
							poll-2
								text
									bg
									$2
								percent
							poll-3
								text
									bg
									$3
								percent
							poll-4
								text
									bg
									$4
								percent
						p[results][estimated] Estimated results:
						poll-counts-estimated
							poll-1
								text
									bg
									$1
								percent
							poll-2
								text
									bg
									$2
								percent
							poll-3
								text
									bg
									$3
								percent
							poll-4
								text
									bg
									$4
								percent
					`,
					[post.poll_1, post.poll_2, post.poll_3, post.poll_4],
				)
			: [],
			$(
				`
				post-details[detail-wrapper]
					detail[favorites][favorited=$1]
						icon
							$2
						p $3
					detail[replies]
						icon
							$4
						p $5
					detail[more]
						icon
							$6
				`,
				[
					post.favorited,
					post.favorited
						? $("icons icon[favorited] svg").cloneNode(true)
						: $("footer icon[favorites] svg").cloneNode(true),
					post.favorite_count,
					post.replyed
						? $("icons icon[replyed] svg").cloneNode(true)
						: $("icons icon[reply] svg").cloneNode(true),
					post.reply_count,
					$("icons icon[forward] svg").cloneNode(true),
				],
			),
		],
	)
	$post.$("author").forEach(($author) => {
		$author.on("click", ($event) => {
			$event.stopPropagation()
			const slug = $author.getAttribute("slug")
			goToPath(`/user/${slug}`)
		})
	})
	$post.$("topic").forEach(($topic) => {
		$topic.on("click", ($event) => {
			$event.stopPropagation()
			goToPath("/topic/" + $topic.getAttribute("topic"))
		})
	})
	if (post.poll_1) {
		const counts_actual = post.poll_counts.split(",")
		const votes_1 = Number(counts_actual[0] || 0)
		const votes_2 = Number(counts_actual[1] || 0)
		const votes_3 = Number(counts_actual[2] || 0)
		const votes_4 = Number(counts_actual[3] || 0)
		const votes_sum = votes_1 + votes_2 + votes_3 + votes_4
		$post.$("p[results][actual]").innerText =
			`Actual results: (${votes_sum} ${votes_sum === 1 ? `vote` : `votes`})`
		const percent_1 = Math.round((votes_1 / votes_sum) * 100) || 0
		const percent_2 = Math.round((votes_2 / votes_sum) * 100) || 0
		const percent_3 = Math.round((votes_3 / votes_sum) * 100) || 0
		const percent_4 = Math.round((votes_4 / votes_sum) * 100) || 0
		$post.$("poll-counts-actual poll-1 percent").innerText = percent_1 + "%"
		$post.$("poll-counts-actual poll-1 bg").style.width = percent_1 + "%"
		$post.$("poll-counts-actual poll-2 percent").innerText = percent_2 + "%"
		$post.$("poll-counts-actual poll-2 bg").style.width = percent_2 + "%"
		$post.$("poll-counts-actual poll-3 percent").innerText = percent_3 + "%"
		$post.$("poll-counts-actual poll-3 bg").style.width = percent_3 + "%"
		$post.$("poll-counts-actual poll-4 percent").innerText = percent_4 + "%"
		$post.$("poll-counts-actual poll-4 bg").style.width = percent_4 + "%"
		const counts_estimated = post.poll_counts_estimated.split(",")
		const est_votes_1 = Number(counts_estimated[0] || 0)
		const est_votes_2 = Number(counts_estimated[1] || 0)
		const est_votes_3 = Number(counts_estimated[2] || 0)
		const est_votes_4 = Number(counts_estimated[3] || 0)
		const est_votes_sum = est_votes_1 + est_votes_2 + est_votes_3 + est_votes_4
		const est_percent_1 = Math.round((est_votes_1 / est_votes_sum) * 100)
		const est_percent_2 = Math.round((est_votes_2 / est_votes_sum) * 100)
		const est_percent_3 = Math.round((est_votes_3 / est_votes_sum) * 100)
		const est_percent_4 = Math.round((est_votes_4 / est_votes_sum) * 100)
		$post.$("poll-counts-estimated poll-1 percent").innerText =
			est_percent_1 + "%"
		$post.$("poll-counts-estimated poll-1 bg").style.width =
			est_percent_1 + "%"
		$post.$("poll-counts-estimated poll-2 percent").innerText =
			est_percent_2 + "%"
		$post.$("poll-counts-estimated poll-2 bg").style.width =
			est_percent_2 + "%"
		$post.$("poll-counts-estimated poll-3 percent").innerText =
			est_percent_3 + "%"
		$post.$("poll-counts-estimated poll-3 bg").style.width =
			est_percent_3 + "%"
		$post.$("poll-counts-estimated poll-4 percent").innerText =
			est_percent_4 + "%"
		$post.$("poll-counts-estimated poll-4 bg").style.width =
			est_percent_4 + "%"
		const savePollChoice = (poll_choice) => {
			$post.$("poll-vote-wrapper").replaceWith(
				$(
					`
					p
						info[small] Loading results...
					`,
				),
			)
			fetch("/session", {
				method: "POST",
				body: JSON.stringify({
					post_id: post.post_id,
					poll_choice,
				}),
			})
				.then((response) => response.json())
				.then(function (data) {
					if (data.error || !data.success) {
						alertError("Server error saving choice")
					} else {
						post.voted = true
						alertInfo("Poll choice saved")
					}
					getMoreRecent()
				})
				.catch(function (error) {
					console.error(error)
					alertError("Network error saving choice")
					getMoreRecent()
				})
		}
		$post.$("poll-vote-wrapper poll-1").on("click", ($event) => {
			$event.stopPropagation()
			savePollChoice(1)
		})
		$post.$("poll-vote-wrapper poll-2").on("click", ($event) => {
			$event.stopPropagation()
			savePollChoice(2)
		})
		$post.$("poll-vote-wrapper poll-3").on("click", ($event) => {
			$event.stopPropagation()
			savePollChoice(3)
		})
		$post.$("poll-vote-wrapper poll-4").on("click", ($event) => {
			$event.stopPropagation()
			savePollChoice(4)
		})
		if (post.edit || post.voted) {
			$post.$("poll-vote-wrapper").remove()
		} else {
			$post.$("poll-counts-actual").remove()
			$post.$("[results][actual]").remove()
			$post.$("poll-counts-estimated")?.remove()
			$post.$("[results][estimated]")?.remove()
		}
		if (!post.poll_3) {
			$post.$("poll-vote-wrapper poll-3")?.remove()
			$post.$("poll-counts-estimated poll-3")?.remove()
			$post.$("poll-counts-actual poll-3")?.remove()
		}
		if (!post.poll_4) {
			$post.$("poll-vote-wrapper poll-4")?.remove()
			$post.$("poll-counts-estimated poll-4")?.remove()
			$post.$("poll-counts-actual poll-4")?.remove()
		}
	}
	$post.$("detail[favorites]").on("click", ($event) => {
		$event.stopPropagation()
		toggleFavorite(post)
	})
	$post.$("icon[more]").on("click", ($event) => {
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
					action[share]
						icon[share]
							$2
						p Share Post
					action[flag]
						icon[flag]
							$3
						p Flag post
					action[block]
						icon[block]
							$4
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
				$("icons icon[share] svg").cloneNode(true),
				$("icons icon[flag] svg").cloneNode(true),
				$("icons icon[block] svg").cloneNode(true),
			],
		)
		const moreModalCancel = () => {
			$more_modal.remove()
		}
		$more_modal.$("[cancel]").on("click", moreModalCancel)
		$more_modal.$("modal-bg").on("click", moreModalCancel)
		if (post.edit) {
			$more_modal.$("action[edit]").on("click", ($event) => {
				$event.preventDefault()
				moreModalCancel()
				$post.replaceWith(showAddNewPost(post))
				focusAddNewPost()
			})
			$more_modal.$("action[block]").remove()
			if (summary_only) {
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
						markBlocked(post)
					},
				)
			})
		}
		$more_modal.$("action[share]").on("click", ($event) => {
			$event.preventDefault()
			moreModalCancel()
			if (
				window.webkit &&
				window.webkit.messageHandlers &&
				window.webkit.messageHandlers["share-link"]
			) {
				window.webkit.messageHandlers["share-link"].postMessage(
					JSON.stringify({
						url: window.location.href,
						text: state.cache[state.path].posts[0].title,
					}),
				)
			} else {
				navigator.clipboard.writeText(window.location.href)
			}
			alertInfo("Link copied to clipboard")
		})
		$more_modal.$("action[flag]").on("click", ($event) => {
			$event.preventDefault()
			moreModalCancel()
			modalConfirm(
				$(
					`
					h2
						icon
							$1
						span Flag post - are you sure?
					p This will hide this post for everyone.
					p This action cannot be undone.
					`,
					[$("icons icon[flag] svg").cloneNode(true)],
				),
				() => {
					markFlagged(post)
				},
			)
		})
		$("modal-wrapper")?.remove()
		$("body").appendChild($more_modal)
	})
	if (post.image_uuids) {
		const image_uuids = post.image_uuids.split(",").reverse()
		for (const image_uuid of image_uuids) {
			const $image = $(
				`
				p[img][total-images=$1]
					img[src=$2]
				`,
				[image_uuids.length, "/image/" + image_uuid],
			)
			if (!summary_only) {
				bindImageClick($image, image_uuid)
			}
			$post.$("author-topics").after($image)
		}
	}
	if (summary_only) {
		$post.setAttribute("trimmed", "")
		$post.on("click", ($event) => {
			if ($event.target.tagName !== "A") {
				$event.preventDefault()
				goToPath("/post/" + post.slug)
			}
		})
	}
	post.$post = $post
	return $post
}