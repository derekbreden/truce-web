const renderBack = () => {
	// Always remove previous wrapper
	$("main-content-wrapper[active] main-content back-forward-wrapper")?.remove()

	// Sometimes add new wrapper
	if (
		state.path.startsWith("/post/")
		|| state.path.startsWith("/reply")
		|| state.path.startsWith("/user/")
	) {
		let previous_path = state.path_history[state.path_history.length - 1]
		if (previous_path === state.path) {
			state.path_history.pop()
			previous_path = state.path_history[state.path_history.length - 1]
		}
		if (state.path.split("/")[3]) {
			previous_path = state.path_history[state.path_history.length - 2]
		}
		const $back_forward = $(
			`
			back-forward-wrapper
				back-wrapper
					button[expand-left]
					p $1
			`,
			[
				previous_path === "/posts" || previous_path === "/posts/all"
					? "Posts"
					: previous_path?.startsWith("/reply")
						? "Reply thread"
						: previous_path?.startsWith("/post/")
							? state.cache[previous_path].posts[0].title
							: previous_path === "/"
								? "Terms and conditions"
								: previous_path === "/notifications"
									? "Notifications"
									: previous_path === "/favorites"
										? "Favorites"
										: previous_path?.startsWith("/topic/")
											? previous_path.split("/")[2][0].toUpperCase()
												+ previous_path.split("/")[2].slice(1)
											: previous_path?.startsWith("/user/")
												? renderName(
														state.cache[previous_path].user.display_name,
														state.cache[previous_path].user.display_name_index,
													)
												: "Back",
			],
		)
		$("main-content-wrapper[active] main-content").prepend($back_forward)
		$back_forward.$("back-wrapper").on("click", () => {
			state.path_index--
			state.path_index--
			state.path_history = state.path_history.slice(0, -2)
			goToPath(previous_path, false, true)
		})

		if (!previous_path) {
			$back_forward.remove()
		}
	}
}
