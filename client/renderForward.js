const renderForward = (parent_post) => {
	if (parent_post) {
		const $forward = $old(
			`
			tab-item[right]
				p $1
				icon[forward]
			`,
			[parent_post.title],
		)
		if (!$old("main-content-wrapper[active] tab-wrapper")) {
			$old("main-content-wrapper[active] main-content").prepend(
				$old(
					`
					tab-wrapper[line-after]
					`,
				),
			)
		}
		$old("main-content-wrapper[active] tab-wrapper")
			.$("tab-item[right]")
			?.remove()
		$old("main-content-wrapper[active] tab-wrapper").appendChild($forward)
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
