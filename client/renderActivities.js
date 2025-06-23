const renderActivities = (activities) => {
	// Empty favorites?
	if (state.path === "/favorites") {
		if (activities.length === 0) {
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

	// Render activities
	if (!$("main-content-wrapper[active] main-content activities")) {
		$("main-content-wrapper[active] main-content").appendChild(
			$(
				`
				activities[favorites=$1]
				`,
				[state.path === "/favorites"],
			),
		)
	}
	if (!$("main-content-wrapper[active] main-content-2 activities")) {
		$("main-content-wrapper[active] main-content-2").appendChild(
			$(
				`
				activities[favorites=$1]
				`,
				[state.path === "/favorites"],
			),
		)
	}
	const reply_ids_rendered = []
	const $activities = activities
		.sort(
			(a, b) =>
				new Date(b.favorite_create_date || b.create_date)
				- new Date(a.favorite_create_date || a.create_date),
		)
		.filter((activity) => {
			if (activity.type === "reply") {
				if (
					reply_ids_rendered.includes(activity.id)
					&& state.path !== "/favorites"
				) {
					return false
				}
				reply_ids_rendered.push(activity.id)
				reply_ids_rendered.push(activity.parent_reply_id)
			}
			if (state.version > 1) {
			} else {
				if (activity.type === "post" && activity.poll_1) {
					return false
				}
			}
			return true
		})
		.map((activity) => {
			if (activity.type === "reply") {
				const $reply = renderReply(activity)
				$reply.$("reply-wrapper button")?.remove()
				let $reply_wrapper = $reply
				if (activity.parent_reply_body) {
					const parent_reply = {
						display_name: activity.parent_reply_display_name,
						display_name_index: activity.parent_reply_display_name_index,
						user_slug: activity.parent_reply_user_slug,
						profile_picture_uuid: activity.parent_reply_profile_picture_uuid,
						body: activity.parent_reply_body,
						note: activity.parent_reply_note,
					}
					const $parent_reply = renderReply(parent_reply)
					$parent_reply.setAttribute("parent-reply", "")
					$parent_reply.$("reply-wrapper")?.remove()
					$parent_reply.appendChild($reply)
					$reply_wrapper = $parent_reply
				}
				const $activity = $(
					`
						activity[reply]
							h2 $1
							$2
					`,
					[activity.parent_post_title, $reply_wrapper],
				)
				$activity.on("click", ($event) => {
					if ($event.target.tagName !== "A") {
						$event.preventDefault()
						goToPath("/reply/" + activity.id)
					}
				})
				activity.$activity = $activity
				return $activity
			} else {
				const $post = renderPost(activity)
				const $activity = $(
					`
						activity[post]
							$1
					`,
					[$post],
				)
				activity.$activity = $activity
				return $activity
			}
		})
	if (window.innerWidth > 1000 && state.path === "/favorites") {
		const $activities_1 = $activities.filter((x, i) => i % 2 === 0)
		const $activities_2 = $activities.filter((x, i) => i % 2 === 1)
		$("main-content-wrapper[active] main-content activities")?.replaceChildren(
			...$activities_1,
		)
		$(
			"main-content-wrapper[active] main-content-2 activities",
		)?.replaceChildren(...$activities_2)
	} else if (
		state.path.startsWith("/user")
		&& state.path.split("/")[3] === "replies"
	) {
		$("main-content-wrapper[active] main-content-2 activities").replaceChildren(
			$(
				`
				posts
				`,
			),
		)
		$("main-content-wrapper[active] main-content-2 posts").replaceChildren(
			...$activities,
		)
		if ($activities.length === 0) {
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
		$("main-content-wrapper[active] main-content activities")?.replaceChildren(
			...$activities,
		)
	}

	$("activities [href]")?.forEach(($a) => {
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
