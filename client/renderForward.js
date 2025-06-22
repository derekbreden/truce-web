const renderForward = (parent_post) => {
	if (parent_post) {
		const $forward = $(
			`
			tab-item[right]
				p $1
				button[expand-right]
			`,
			[parent_post.title],
		)
		if (!$("main-content-wrapper[active] back-forward-wrapper")) {
			$("main-content-wrapper[active] main-content").prepend(
				$(
					`
					back-forward-wrapper
					`,
				),
			)
		}
		$("main-content-wrapper[active] back-forward-wrapper")
			.$("tab-item")
			?.remove()
		$("main-content-wrapper[active] back-forward-wrapper").appendChild($forward)
		$forward.on("click", () => {
			let new_path = `/post/${parent_post.slug}`
			if (parent_post.slug === "Home") {
				new_path = "/"
			} else if (parent_post.slug === "Posts") {
				new_path = "/posts"
			}
			goToPath(new_path)
		})
	}
}
