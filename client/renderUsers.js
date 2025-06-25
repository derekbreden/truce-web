const renderUsers = (users) => {
	if (users) {
		$("main-content-wrapper[active] main-content-2").replaceChildren(
			$(
				`
				users
					${state.path === "/settings" ? `h2 Subscribed to:` : ""}
					$1
				`,
				[
					users.map((user) =>
						$(
							`
							user[line-after]
								author-name[slug=$1]
									author
										profile-picture
											image
												$2
									name $3
									$4
								$5
							`,
							[
								user.user_slug,
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
								renderName(user.display_name, user.display_name_index),
								user.user_verified
									? $(
										`
											icon[verified]
											`
									)
									: [],
								state.user_id && Number(state.user_id) !== Number(user.user_id) ? (
									user.subscribed
										? $(
											`
												button[subscribe][small][userid=$1]
													icon[subscribe]
													span Unsubscribe
												`,
											[
												user.user_id,
											],
										)
										: $(
											`
												button[subscribe][small][alt][userid=$1]
													icon[subscribe]
													span Subscribe
												`,
											[
												user.user_id,
											],
										)
								) : [],
							],
						),
					),
				],
			),
		)
		if (users.length === 0) {
			$("main-content-wrapper[active] main-content-2 users").appendChild(
				$(
					`
					all-clear-wrapper
						p Nothing to see here
					`,
				),
			)
		}
		$("main-content-wrapper[active] main-content-2 author-name")?.forEach(
			($author) => {
				$author.on("click", ($event) => {
					$event.preventDefault()
					goToPath(`/user/${$author.getAttribute("slug")}`)
				})
			},
		)
		$("main-content-wrapper[active] main-content-2 button[subscribe]")?.forEach(
			($button) => {
				const user_id = $button.getAttribute("userid")
				const user = users.find((user) => Number(user.user_id) === Number(user_id))
				bindSubscribeUser($button, user)
			},
		)
	}
}

const bindSubscribeUser = ($button, user) => {
	$button?.on("click", ($event) => {
		$event.preventDefault()
		if (user.subscribed) {
			$button.$("span").textContent = "Unsubscribing..."
			fetch("/session", {
				method: "POST",
				body: JSON.stringify({
					subscribe_to_user_id: user.user_id,
					remove: true,
				}),
			})
				.then((response) => response.json())
				.then((data) => {
					if (data.error || !data.success) {
						alertError("Server error removing subscription")
						$button.$("span").textContent = "Unsubscribe"
					} else {
						user.subscribed = false
						state.subscribed_to_users--
						$button.setAttribute("alt", "")
						$button.$("span").textContent = "Subscribe"
						alertInfo(
							"Unsubscribed from "
								+ renderName(user.display_name, user.display_name_index),
						)
						delete state.cache["/posts"]
						delete state.cache["/settings"]
						for (const key of Object.keys(state.cache)) {
							if (state.cache[key].users) {
								delete state.cache[key]
							}
						}
						startSession()
					}
				})
				.catch((error) => {
					console.error(error)
					alertError("Network error removing subscription")
					$button.$("span").textContent = "Unsubscribe"
				})
		} else {
			$button.$("span").textContent = "Subscribing..."
			fetch("/session", {
				method: "POST",
				body: JSON.stringify({
					subscribe_to_user_id: user.user_id,
				}),
			})
				.then((response) => response.json())
				.then((data) => {
					if (data.error || !data.success) {
						alertError("Server error saving subscription")
						$button.$("span").textContent = "Subscribe"
					} else {
						user.subscribed = true
						state.subscribed_to_users++
						$button.removeAttribute("alt")
						$button.$("span").textContent = "Unsubscribe"
						alertInfo(
							"Subscribed to "
								+ renderName(user.display_name, user.display_name_index),
						)
						delete state.cache["/posts"]
						delete state.cache["/settings"]
						for (const key of Object.keys(state.cache)) {
							if (state.cache[key].users) {
								delete state.cache[key]
							}
						}
						startSession()
					}
				})
				.catch((error) => {
					console.error(error)
					alertError("Network error saving subscription")
					$button.$("span").textContent = "Subscribe"
				})
		}
	})
}