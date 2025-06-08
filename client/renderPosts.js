const renderPosts = (posts, tag, user) => {
	let skip_posts = false
	if (
		state.path === "/settings" ||
		(state.path.substr(0, 6) === "/user/" && state.path.split("/")[3]) ||
		state.path === "/favorites" ||
		state.path === "/notifications" ||
		state.path.substr(0, 7) === "/reply/"
	) {
		skip_posts = true
	}

	beforeDomUpdate()
	if (!$("main-content-wrapper[active] posts")) {
		const target =
			state.path === "/posts" || state.path === "/posts/all"
				? "main-content-wrapper[active] main-content-2"
				: "main-content-wrapper[active] main-content"
		$(target).appendChild(
			$(
				`
				posts
				`,
			),
		)
	}
	const $posts = posts
		.sort((a, b) => new Date(b.create_date) - new Date(a.create_date))
		.map(renderPost)

	if (!skip_posts) {
		if (window.innerWidth > 1000 && state.path.substr(0, 5) === "/tag/") {
			const $posts_1 = $posts.filter((x, i) => i % 2 === 0)
			const $posts_2 = $posts.filter((x, i) => i % 2 === 1)
			$("main-content-wrapper[active] main-content posts")?.replaceChildren(
				...$posts_1,
			)
			$("main-content-wrapper[active] main-content-2").replaceChildren(
				$(
					`
					posts
					`,
				),
			)
			$("main-content-wrapper[active] main-content-2 posts").replaceChildren(
				...$posts_2,
			)
			if ($posts.length === 0) {
				$("main-content-wrapper[active] main-content posts").appendChild(
					$(
						`
						all-clear-wrapper
							p Nothing to see here
						`,
					),
				)
			}
		} else if (state.path.substr(0, 6) === "/user/") {
			$("main-content-wrapper[active] main-content-2").replaceChildren(
				$(
					`
					posts
					`,
				),
			)
			$("main-content-wrapper[active] main-content-2 posts").replaceChildren(
				...$posts,
			)
			if ($posts.length === 0) {
				$("main-content-wrapper[active] main-content-2 posts").appendChild(
					$(
						`
						all-clear-wrapper
							p Nothing to see here
						`,
					),
				)
			}
		} else {
			$("main-content-wrapper[active] posts").replaceChildren(...$posts)
			if ($posts.length === 0) {
				$("main-content-wrapper[active] posts").appendChild(
					$(
						`
						all-clear-wrapper
							p Nothing to see here
						`,
					),
				)
			}
		}
	}

	if (state.active_add_new_topic?.is_edit) {
		const post = posts.find(
			(a) => a.topic_id === state.active_add_new_topic.is_edit,
		)
		post.$topic.replaceWith(state.active_add_new_topic)
	}

	// User
	if (state.path.substr(0, 6) === "/user/") {
		$("topic[user]")?.remove()
		$("main-content-wrapper[active] main-content posts").prepend(
			$(
				`
					topic[user]
						h2[user]
							author
								span $1
								$2
							$3
						label[profile-picture][large]
							image
								$4
							$5
					`,
				[
					renderName(user.display_name, user.display_name_index),
					user.user_verified
						? $(
								`
								icon
									$1
								`,
								[$("icons icon[verified] svg").cloneNode(true)],
							)
						: [],
					user.user_id === state.user_id
						? $(
								`
								button[edit][small][href=/settings]
									icon[settings]
										$1
									span Edit
								`,
								[$("icons icon[settings] svg").cloneNode(true)],
							)
						: user.subscribed
							? $(
									`
									button[subscribe][small]
										icon[subscribe]
											$1
										span Unsubscribe
									`,
									[$("icons icon[subscribe] svg").cloneNode(true)],
								)
							: $(
									`
									button[subscribe][small][alt]
										icon[subscribe]
											$1
										span Subscribe
									`,
									[$("icons icon[subscribe] svg").cloneNode(true)],
								),
					user.profile_picture_uuid
						? $(
								`
								img[src=$1]
								`,
								["/image/" + user.profile_picture_uuid],
							)
						: $("icons icon[profile-picture] svg").cloneNode(true),
					user.user_id === state.user_id
						? $(
								`
								input[image][type=file][accept=image/*]
								`,
							)
						: [],
				],
			),
		)
		bindSubscribeUser($("topic[user] button[subscribe]"), user)
		$("button[edit][small]")?.on("click", ($event) => {
			$event.preventDefault()
			goToPath("/settings")
		})
		$("main-content-wrapper[active] [profile-picture] input[image]")?.on(
			"change",
			editProfilePicture,
		)
	}

	// Tag
	if (state.path.substr(0, 5) === "/tag/") {
		$("topic[tag]")?.remove()
		if (posts.length === 0) {
			$("main-content-wrapper[active] main-content posts").prepend(
				$(
					`
					tags[tags-list][big]
						tag[tag=$1]
							icon
								$2
							tagname-subtitle
								tagname
									name $3
								subtitle $4
						p There are no posts in this tag yet, head on over to the posts page to add one!
					`,
					[
						tag.tag_name,
						$(`icons icon[${tag.tag_name}] svg`).cloneNode(true),
						tag.tag_name[0].toUpperCase() + tag.tag_name.slice(1),
						tag.subtitle,
					],
				),
			)
		} else {
			$("main-content-wrapper[active] main-content posts").prepend(
				$(
					`
					tags[tags-list][big]
						tag[tag=$1]
							icon
								$2
							tagname-subtitle
								tagname
									name $3
								subtitle $4
					`,
					[
						tag.tag_name,
						$(`icons icon[${tag.tag_name}] svg`).cloneNode(true),
						tag.tag_name[0].toUpperCase() + tag.tag_name.slice(1),
						tag.subtitle,
					],
				),
			)
		}
	}

	// User profile navigation

	if (state.path.substr(0, 5) === "/user") {
		if (state.path.split("/")[3] === "subscribers") {
			$("main-content-wrapper[active] main-content-2").prepend(
				$(
					`
					back-forward-wrapper
						back-wrapper[posts]
							p Posts
						back-wrapper[replies]
							p Replies
						center-wrapper
							span Subscribers
						forward-wrapper[subscribed-to-users]
							p Subscribed to
					`,
					[],
				),
			)
		} else if (state.path.split("/")[3] === "subscribed_to_users") {
			$("main-content-wrapper[active] main-content-2").prepend(
				$(
					`
					back-forward-wrapper
						back-wrapper[posts]
							p Posts
						back-wrapper[replies]
							p Replies
						back-wrapper[subscribers]
							p Subscribers
						center-wrapper
							span Subscribed to
					`,
					[],
				),
			)
		} else if (state.path.split("/")[3] === "replies") {
			$("main-content-wrapper[active] main-content-2").prepend(
				$(
					`
					back-forward-wrapper
						back-wrapper[posts]
							p Posts
						center-wrapper
							span Replies
						forward-wrapper[subscribers]
							p Subscribers
						forward-wrapper[subscribed-to-users]
							p Subscribed to
					`,
					[],
				),
			)
		} else {
			$("main-content-wrapper[active] main-content-2").prepend(
				$(
					`
					back-forward-wrapper
						center-wrapper
							span Posts
						forward-wrapper[replies]
							p Replies
						forward-wrapper[subscribers]
							p Subscribers
						forward-wrapper[subscribed-to-users]
							p Subscribed to
					`,
					[],
				),
			)
		}
		const this_user_slug = state.path.split("/")[2]
		$(
			"main-content-wrapper[active] main-content-2 back-forward-wrapper [posts]",
		)?.on("click", ($event) => {
			$event.preventDefault()
			goToPath(`/user/${this_user_slug}`)
		})
		$(
			"main-content-wrapper[active] main-content-2 back-forward-wrapper [replies]",
		)?.on("click", ($event) => {
			$event.preventDefault()
			goToPath(`/user/${this_user_slug}/replies`)
		})
		$(
			"main-content-wrapper[active] main-content-2 back-forward-wrapper [subscribers]",
		)?.on("click", ($event) => {
			$event.preventDefault()
			goToPath(`/user/${this_user_slug}/subscribers`)
		})
		$(
			"main-content-wrapper[active] main-content-2 back-forward-wrapper [subscribed-to-users]",
		)?.on("click", ($event) => {
			$event.preventDefault()
			goToPath(`/user/${this_user_slug}/subscribed_to_users`)
		})
	}

	// Subscribed or all posts
	if (state.path === "/posts" && state.subscribed_to_users) {
		$("main-content-wrapper[active] main-content-2 posts").prepend(
			$(
				`
				back-forward-wrapper
					center-wrapper
						span Posts from subscriptions
					forward-wrapper
						p All posts
						button[expand-right]
				`,
				[],
			),
		)
		$(
			"main-content-wrapper[active] main-content-2 posts back-forward-wrapper forward-wrapper",
		).on("click", ($event) => {
			$event.preventDefault()
			localStorage.setItem(
				`${window.local_storage_key}:posts_preference`,
				"/posts/all",
			)
			goToPath("/posts/all")
		})
	}
	if (state.path === "/posts/all" && state.subscribed_to_users) {
		$("main-content-wrapper[active] main-content-2 posts").prepend(
			$(
				`
				back-forward-wrapper
					back-wrapper
						button[expand-left]
						p Posts from subscriptions
					center-wrapper
						span All posts
				`,
				[],
			),
		)
		$(
			"main-content-wrapper[active] main-content-2 posts back-forward-wrapper back-wrapper",
		).on("click", ($event) => {
			$event.preventDefault()
			localStorage.setItem(
				`${window.local_storage_key}:posts_preference`,
				"/posts",
			)
			goToPath("/posts")
		})
	}

	afterDomUpdate()
	$("posts [href]")?.forEach(($a) => {
		const new_path = $a.getAttribute("href")
		if (new_path.substr(0, 1) === "/") {
			$a.on("click", ($event) => {
				$event.stopPropagation()
				$event.preventDefault()
				goToPath(new_path)
			})
		}
	})
}