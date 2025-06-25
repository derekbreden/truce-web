const renderPosts = (posts, topic, user) => {
	let skip_posts = false
	if (
		state.path === "/settings"
		|| (state.path.startsWith("/user/") && state.path.split("/")[3])
		|| state.path === "/favorites"
		|| state.path === "/notifications"
		|| state.path.startsWith("/reply/")
		|| state.path.startsWith("/messages/")
		|| state.path === "/conversations"
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
		if (window.innerWidth > 1000 && state.path.startsWith("/topic/")) {
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
		} else if (state.path.startsWith("/user/")) {
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

	if (state.active_add_new_post?.is_edit) {
		const post = posts.find(
			(a) => a.post_id === state.active_add_new_post.is_edit,
		)
		post.$post.replaceWith(state.active_add_new_post)
	}

	// User
	if (state.path.startsWith("/user/")) {
		$("post[user]")?.remove()
		$("main-content-wrapper[active] main-content posts").prepend(
			$(
				`
					post[line-after][user]
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
								icon[verified]
								`
						)
						: [],
					user.user_id === state.user_id
						? $(
							`
								button[edit][small][href=/settings]
									icon[settings]
									span Edit
								`
						)
						: state.user_id ? $(
							`
								user-actions
									button[alt][message][small][userid=$1]
										icon[mail]
										span Message
									$2
								`,
							[
								user.user_id,
								user.subscribed
									? $(
										`
												button[subscribe][small]
													icon[subscribe]
													span Unsubscribe
												`
									)
									: $(
										`
												button[subscribe][small][alt]
													icon[subscribe]
													span Subscribe
												`
									),
							]
						) : user.subscribed
							? $(
								`
									button[subscribe][small]
										icon[subscribe]
										span Unsubscribe
									`
							)
							: $(
								`
									button[subscribe][small][alt]
										icon[subscribe]
										span Subscribe
									`
							),
					user.profile_picture_uuid
						? $(
							`
								img[src=$1]
								`,
							["/image/" + user.profile_picture_uuid],
						)
						: $(
							`
							icon[profile-picture]
							`
						),
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
		bindSubscribeUser($("post[user] button[subscribe]"), user)
		$("post[user] button[message]")?.on("click", ($event) => {
			$event.preventDefault()
			const user_id = Number($("post[user] button[message]").getAttribute("userid"))
			createConversationWithUser(user_id)
		})
		$("button[edit][small]")?.on("click", ($event) => {
			$event.preventDefault()
			goToPath("/settings")
		})
		$("main-content-wrapper[active] [profile-picture] input[image]")?.on(
			"change",
			editProfilePicture,
		)
	}

	// Topic
	if (state.path.startsWith("/topic/")) {
		$("post[topic]")?.remove()
		if (posts.length === 0) {
			$("main-content-wrapper[active] main-content posts").prepend(
				$(
					`
					topics[topics-list][big][line-after]
						topic[topic=$1]
							icon[$1]
							topicname-subtitle
								topicname
									name $2
								subtitle $3
						p There are no posts in this topic yet, head on over to the posts page to add one!
					`,
					[
						topic.topic_name,
						topic.topic_name[0].toUpperCase() + topic.topic_name.slice(1),
						topic.subtitle,
					],
				),
			)
		} else {
			$("main-content-wrapper[active] main-content posts").prepend(
				$(
					`
					topics[topics-list][big][line-after]
						topic[topic=$1]
							icon[$1]
							topicname-subtitle
								topicname
									name $2
								subtitle $3
					`,
					[
						topic.topic_name,
						topic.topic_name[0].toUpperCase() + topic.topic_name.slice(1),
						topic.subtitle,
					],
				),
			)
		}
	}

	// User profile navigation

	if (state.path.startsWith("/user")) {
		if (state.path.split("/")[3] === "subscribers") {
			$("main-content-wrapper[active] main-content-2").prepend(
				$(
					`
					tab-wrapper[line-after]
						tab-item[posts]
							p Posts
						tab-item[replies]
							p Replies
						tab-item[active]
							span Subscribers
						tab-item[subscribed-to-users]
							p Subscribed to
					`,
					[],
				),
			)
		} else if (state.path.split("/")[3] === "subscribed_to_users") {
			$("main-content-wrapper[active] main-content-2").prepend(
				$(
					`
					tab-wrapper[line-after]
						tab-item[posts]
							p Posts
						tab-item[replies]
							p Replies
						tab-item[subscribers]
							p Subscribers
						tab-item[active]
							span Subscribed to
					`,
					[],
				),
			)
		} else if (state.path.split("/")[3] === "replies") {
			$("main-content-wrapper[active] main-content-2").prepend(
				$(
					`
					tab-wrapper[line-after]
						tab-item[posts]
							p Posts
						tab-item[active]
							span Replies
						tab-item[subscribers]
							p Subscribers
						tab-item[subscribed-to-users]
							p Subscribed to
					`,
					[],
				),
			)
		} else {
			$("main-content-wrapper[active] main-content-2").prepend(
				$(
					`
					tab-wrapper[line-after]
						tab-item[active]
							span Posts
						tab-item[replies]
							p Replies
						tab-item[subscribers]
							p Subscribers
						tab-item[subscribed-to-users]
							p Subscribed to
					`,
					[],
				),
			)
		}
		const this_user_slug = state.path.split("/")[2]
		$(
			"main-content-wrapper[active] main-content-2 tab-wrapper [posts]",
		)?.on("click", ($event) => {
			$event.preventDefault()
			goToPath(`/user/${this_user_slug}`)
		})
		$(
			"main-content-wrapper[active] main-content-2 tab-wrapper [replies]",
		)?.on("click", ($event) => {
			$event.preventDefault()
			goToPath(`/user/${this_user_slug}/replies`)
		})
		$(
			"main-content-wrapper[active] main-content-2 tab-wrapper [subscribers]",
		)?.on("click", ($event) => {
			$event.preventDefault()
			goToPath(`/user/${this_user_slug}/subscribers`)
		})
		$(
			"main-content-wrapper[active] main-content-2 tab-wrapper [subscribed-to-users]",
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
				tab-wrapper[line-after]
					tab-item[active]
						span Posts from subscriptions
					tab-item
						p All posts
						icon[forward]
				`,
				[],
			),
		)
		$(
			"main-content-wrapper[active] main-content-2 posts tab-wrapper tab-item:not([active])",
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
				tab-wrapper[line-after]
					tab-item
						icon[back]
						p Posts from subscriptions
					tab-item[active]
						span All posts
				`,
				[],
			),
		)
		$(
			"main-content-wrapper[active] main-content-2 posts tab-wrapper tab-item:not([active])",
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
		if (new_path.startsWith("/")) {
			$a.on("click", ($event) => {
				$event.stopPropagation()
				$event.preventDefault()
				goToPath(new_path)
			})
		}
	})
}