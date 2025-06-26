const renderFavorites = (favorites) => {
	// Empty favorites?
	if (state.path === "/favorites") {
		if (favorites.length === 0) {
			$("post[favorites]")?.remove()
			$("main-content-wrapper[active] posts").prepend(
				$(
					`
					post[line-after][favorites]
						h2[favorites]
							span Favorites
							icon[favorites]
						p[favorites-empty]
							span When you tap the favorite icon
							icon[favorites][inline]
							span on a post or reply, it will display here.
					`,
					[],
				),
			)
		} else {
			$("post[favorites]")?.remove()
			$("main-content-wrapper[active] posts").prepend(
				$(
					`
					post[line-after][favorites]
						h2[favorites]
							span Favorites
							icon[favorites]
						p[favorites-empty]
							span When you tap the favorite icon
							icon[favorites][inline]
							span on a post or reply, it will display here.
					`,
					[],
				),
			)
		}
	}

	// Render favorites
	if (!$("main-content-wrapper[active] main-content favorites")) {
		$("main-content-wrapper[active] main-content").appendChild(
			$(
				`
				favorites[favorites=$1]
				`,
				[state.path === "/favorites"],
			),
		)
	}
	if (!$("main-content-wrapper[active] main-content-2 favorites")) {
		$("main-content-wrapper[active] main-content-2").appendChild(
			$(
				`
				favorites[favorites=$1]
				`,
				[state.path === "/favorites"],
			),
		)
	}
	const reply_ids_rendered = []
	const $favorites = favorites
		.sort(
			(a, b) =>
				new Date(b.favorite_create_date || b.create_date)
				- new Date(a.favorite_create_date || a.create_date),
		)
		.filter((favorite) => {
			if (favorite.type === "reply") {
				if (
					reply_ids_rendered.includes(favorite.id)
					&& state.path !== "/favorites"
				) {
					return false
				}
				reply_ids_rendered.push(favorite.id)
				reply_ids_rendered.push(favorite.parent_reply_id)
			}
			if (state.version > 1) {
			} else {
				if (favorite.type === "post" && favorite.poll_1) {
					return false
				}
			}
			return true
		})
		.map((favorite) => {
			if (favorite.type === "reply") {
				// Normalize favorite data structure to match what renderReply expects
				const reply_data = {
					...favorite,
					reply_id: favorite.id,
				}
				const $reply = renderReply(reply_data)
				$reply.$("reply-wrapper button")?.remove()
				let $reply_wrapper = $reply
				if (favorite.parent_reply_body) {
					const parent_reply = {
						display_name: favorite.parent_reply_display_name,
						display_name_index: favorite.parent_reply_display_name_index,
						user_slug: favorite.parent_reply_user_slug,
						profile_picture_uuid: favorite.parent_reply_profile_picture_uuid,
						body: favorite.parent_reply_body,
						note: favorite.parent_reply_note,
						reply_id: "parent_" + favorite.id, // Give it a unique ID
					}
					const $parent_reply = renderReply(parent_reply)
					$parent_reply.setAttribute("parent-reply", "")
					$parent_reply.$("reply-wrapper")?.remove()
					$parent_reply.appendChild($reply)
					$reply_wrapper = $parent_reply
				}
				const $favorite = $(
					`
						favorite[reply]
							h2 $1
							$2
					`,
					[favorite.parent_post_title, $reply_wrapper],
				)
				$favorite.on("click", ($event) => {
					if ($event.target.tagName !== "A") {
						$event.preventDefault()
						goToPath("/reply/" + favorite.id)
					}
				})
				favorite.$favorite = $favorite
				return $favorite
			} else {
				const $post = renderPost(favorite)
				const $favorite = $(
					`
						favorite[post]
							$1
					`,
					[$post],
				)
				favorite.$favorite = $favorite
				return $favorite
			}
		})
	if (window.innerWidth > 1000 && state.path === "/favorites") {
		const $favorites_1 = $favorites.filter((x, i) => i % 2 === 0)
		const $favorites_2 = $favorites.filter((x, i) => i % 2 === 1)
		$("main-content-wrapper[active] main-content favorites")?.replaceChildren(
			...$favorites_1,
		)
		$(
			"main-content-wrapper[active] main-content-2 favorites",
		)?.replaceChildren(...$favorites_2)
	} else if (
		state.path.startsWith("/user")
		&& state.path.split("/")[3] === "replies"
	) {
		$("main-content-wrapper[active] main-content-2 favorites").replaceChildren(
			$(
				`
				posts
				`,
			),
		)
		$("main-content-wrapper[active] main-content-2 posts").replaceChildren(
			...$favorites,
		)
		if ($favorites.length === 0) {
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
		$("main-content-wrapper[active] main-content favorites")?.replaceChildren(
			...$favorites,
		)
	}

	$("favorites [href]")?.forEach(($a) => {
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
