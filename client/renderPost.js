const getPostDisplayMode = () => {
	return state.path === "/posts"
		|| state.path === "/posts/all"
		|| state.path === "/favorites"
		|| state.path.startsWith("/topic/")
		|| state.path.startsWith("/user/")
}


const renderPost = (post) => {
	const note = post.note || ""
	const note_title = note.slice(0, note.indexOf(" ")).replace(/[^a-z\-]/gi, "")
	const note_body = note.slice(note.indexOf(" ") + 1)
	let $post_body = markdownToElements(post.body)
	let characters_used = 0
	let trimmed = false
	const summary_only = getPostDisplayMode()
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
				$last_topic.textContent = $last_topic.textContent + "\n..."
			}
		}
	}
	const $post = $(
		`
		post[line-after]
			h2
				$1
				icon[more]
			$2
			$3
			$4
			$5
			$6
		`,
		[
			post.title,
			$(
				`
				author-topics
					author[slug=$1]
						profile-picture
							profile-image
								$2
						by[muted] by
						name
							span[muted] $3
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
						: $(
							`
							icon[profile-picture]
							`
						),
					renderName(post.display_name, post.display_name_index),
					post.user_verified
						? $(
							`
								icon[verified][muted]
								`
						)
						: [],
					(post.topics || "")
						.split(",")
						.filter((x) => x)
						.map((topic) =>
							$(
								`
								topic[topic=$1]
									icon[$1]
									span $2
								`,
								[
									topic,
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
						$2
						p[muted] $3
					detail[replies][muted]
						$4
						p $5
					detail[more][muted]
						icon[forward]
				`,
				[
					post.favorited,
					post.favorited
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
					post.favorite_count,
					post.replyed
						? $(
							`
							icon[replyed]
							`
						)
						: $(
							`
							icon[reply]
							`
						),
					post.reply_count,
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
		const calculatePercentages = (votes) => {
			const total = votes.reduce((sum, count) => sum + count, 0)
			return total > 0 ? votes.map(count => Math.round((count / total) * 100)) : votes.map(() => 0)
		}

		const updatePollDisplay = (type, percentages) => {
			percentages.forEach((percent, index) => {
				const option_num = index + 1
				$post.$(`poll-counts-${type} poll-${option_num} percent`).textContent = percent + "%"
				$post.$(`poll-counts-${type} poll-${option_num} bg`).style.width = percent + "%"
			})
		}

		const actual_votes = post.poll_counts.split(",").map(count => Number(count || 0))
		const actual_total = actual_votes.reduce((sum, count) => sum + count, 0)
		$post.$("p[results][actual]").textContent =
			`Actual results: (${actual_total} ${actual_total === 1 ? `vote` : `votes`})`
		const actual_percentages = calculatePercentages(actual_votes)
		updatePollDisplay("actual", actual_percentages)

		const estimated_votes = post.poll_counts_estimated.split(",").map(count => Number(count || 0))
		const estimated_percentages = calculatePercentages(estimated_votes)
		updatePollDisplay("estimated", estimated_percentages)
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
				.then((data) => {
					if (data.error || !data.success) {
						alertError("Server error saving choice")
					} else {
						post.voted = true
						alertInfo("Poll choice saved")
					}
					getMoreRecent()
				})
				.catch((error) => {
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
						p Edit
					action[share]
						icon[share]
						p Share Post
					action[flag]
						icon[flag]
						p Flag post
					action[block]
						icon[block]
						p Block user
					button-wrapper
						button[alt][cancel] Cancel
					p[notice][center]
						span Email us at
						a[href="mailto:derek@truce.net"] derek@truce.net
						span to provide feedback or report inappropriate activity.
				modal-bg
			`,
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
							span Block user - are you sure?
						p This will hide all content from this user.
						p This action cannot be undone.
						`,
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
				window.webkit
				&& window.webkit.messageHandlers
				&& window.webkit.messageHandlers["share-link"]
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
						icon[flag]
						span Flag post - are you sure?
					p This will hide this post for everyone.
					p This action cannot be undone.
					`,
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