const showAddNewPost = (post) => {
	// If this is the main prompt, show a post prompt
	let content_placeholder = `Content`
	if (!post) {
		let post_prompts_index =
			localStorage.getItem(`${window.local_storage_key}:post_prompts_index`)
			|| -1
		post_prompts_index++
		if (post_prompts_index >= post_prompts.length) {
			post_prompts_index = 0
		}
		localStorage.setItem(
			`${window.local_storage_key}:post_prompts_index`,
			post_prompts_index,
		)
		content_placeholder = `Content



e.g. ${post_prompts[post_prompts_index]}`
	}

	const $add_new = $old(
		`
		add-new[post]
			input[title][placeholder=Title][maxlength=140][value=$2]
			title-wrapper
				label[poll]
					icon[poll]
				label[image]
					icon[image]
					input[image][type=file][multiple][accept=image/*]
			textarea[body][placeholder=$1][rows=10][maxlength=8000] $3
			button[submit] $4
			button[alt][cancel] Cancel
		`,
		[
			content_placeholder,
			...(post
				? [post.title, post.body, "Save changes"]
				: ["", "", "Add post"]),
		],
	)

	let mode = "post"
	if (state.version > 1) {
		$add_new.$("label[poll]").on("click", () => {
			if (mode === "post") {
				mode = "poll"
				$add_new.$("[body]").setAttribute("placeholder", "Question")
				$add_new.$("[body]").setAttribute("rows", "3")
				$add_new.$("[body]").after(
					$old(
						`
						poll-input-wrapper
							poll-text
								input[poll-1][placeholder=Choice 1][maxlength=50]
							poll-text
								input[poll-2][placeholder=Choice 2][maxlength=50]
							poll-text[add]
								icon[add]
								p Add choice
						`,
						[],
					),
				)
				$add_new.$("poll-text[add]").on("click", () => {
					const choice_number = $add_new.querySelectorAll(
						"poll-input-wrapper poll-text",
					).length
					const $new_choice = $old(
						`
						poll-text
							input[$1][placeholder=$2][maxlength=50]
							icon[remove]
						`,
						[
							`poll-${choice_number}`,
							`Choice ${choice_number}`,
						],
					)
					$add_new.$("poll-text[add]").before($new_choice)
					$new_choice.$("[remove]").on("click", () => {
						$new_choice.remove()
						$add_new.$("poll-text[add]").style.display = "flex"
						$add_new
							.$("poll-input-wrapper poll-text:nth-child(3) input")
							?.removeAttribute("poll-4")
						$add_new
							.$("poll-input-wrapper poll-text:nth-child(3) input")
							?.setAttribute("poll-3", "")
						$add_new
							.$("poll-input-wrapper poll-text:nth-child(3) input")
							?.setAttribute("placeholder", `Choice 3`)
					})
					if (choice_number > 3) {
						$add_new.$("poll-text[add]").style.display = "none"
					}
				})
			} else {
				mode = "post"
				$add_new.$("[body]").setAttribute("placeholder", "Content")
				$add_new.$("[body]").setAttribute("rows", "10")
				$add_new.$("poll-input-wrapper").remove()
			}
		})
		if (post && post.poll_1) {
			$add_new.$("[poll]").click()
			$add_new.$("input[poll-1]").value = post.poll_1
			$add_new.$("input[poll-2]").value = post.poll_2
			if (post.poll_3) {
				$add_new.$("poll-text[add]").click()
				$add_new.$("input[poll-3]").value = post.poll_3
			}
			if (post.poll_4) {
				$add_new.$("poll-text[add]").click()
				$add_new.$("input[poll-4]").value = post.poll_4
			}
		}
	} else {
		$add_new.$("[poll]").remove()
	}

	const addPostError = (error) => {
		$add_new.appendChild(
			$old(
				`
				error
					$1
				`,
				[error],
			),
		)
	}

	const pngs = []

	if (post?.image_uuids) {
		const image_uuids = post.image_uuids.split(",")
		for (const image_uuid of image_uuids) {
			imageToPng("/image/" + image_uuid, (png) => {
				pngs.push(png)
				previewPngs()
			})
		}
	}

	$add_new.$("input[image]").on("change", () => {
		Array.from($add_new.$("input[image]").files).forEach((file) => {
			const reader = new FileReader()
			reader.onload = ($event) => {
				imageToPng($event.target.result, (png) => {
					pngs.push(png)
					if (pngs.length > 4) {
						pngs.splice(4, pngs.length - 4)
						if (!$old("modal[error]")) {
							modalError("Each post is limited to 4 images")
						}
					}
					previewPngs()
				})
			}
			reader.readAsDataURL(file)
		})
	})

	const previewPngs = () => {
		$add_new.$("image-previews")?.remove()
		if (pngs.length) {
			$add_new
				.$("title-wrapper")
				.after(document.createElement("image-previews"))
			pngs.forEach((png, i) => {
				const $preview = $old(
					`
					preview
						remove-icon
						img[src=$1]
					`,
					[png.url],
				)
				$preview.$("remove-icon").on("click", () => {
					pngs.splice(i, 1)
					previewPngs()
				})
				$add_new.$("image-previews").appendChild($preview)
			})
		}
	}

	$add_new.$("[title]").on("focus", () => {
		$add_new.$("error")?.remove()
	})
	$add_new.$("[body]").on("focus", () => {
		$add_new.$("error")?.remove()
	})
	if (post) {
		$add_new.$("[cancel]").on("click", () => {
			$add_new.replaceWith(post.$post)
			delete state.active_add_new_post
		})
	} else {
		$add_new.$("[cancel]").remove()
	}
	$add_new.$("[submit]").on("click", () => {
		$add_new.$("error")?.remove()
		const title = $add_new.$("[title]").value
		const body = $add_new.$("[body]").value
		const poll_1 = $add_new.$("[poll-1]")?.value || ""
		const poll_2 = $add_new.$("[poll-2]")?.value || ""
		const poll_3 = $add_new.$("[poll-3]")?.value || ""
		const poll_4 = $add_new.$("[poll-4]")?.value || ""
		if (!title) {
			addPostError("Please enter a title")
			return
		}
		if (!body && !pngs.length) {
			addPostError("Please enter some content")
			return
		}
		if (title.length >= body.length && !pngs.length) {
			addPostError("The content must be longer than the title")
			return
		}
		if (
			(poll_1.length && !poll_2.length)
			|| (poll_2.length && !poll_1.length)
		) {
			addPostError("Please fill in 2 choices for a poll")
			return
		}
		$add_new.appendChild(
			$old(
				`
					info Validating...
				`,
			),
		)
		$add_new.$("[title]").setAttribute("disabled", "")
		$add_new.$("[body]").setAttribute("disabled", "")
		$add_new.$("[poll-1]")?.setAttribute("disabled", "")
		$add_new.$("[poll-2]")?.setAttribute("disabled", "")
		$add_new.$("[poll-3]")?.setAttribute("disabled", "")
		$add_new.$("[poll-4]")?.setAttribute("disabled", "")
		$add_new.$("[submit]").setAttribute("disabled", "")
		$add_new.$("[cancel]")?.setAttribute("disabled", "")
		fetch("/session", {
			method: "POST",
			body: JSON.stringify({
				path: state.path,
				title,
				body,
				poll_1,
				poll_2,
				poll_3,
				poll_4,
				pngs,
				post_id: post ? post.post_id : undefined,
			}),
		})
			.then((response) => response.json())
			.then((data) => {
				if (data.error || !data.success) {
					$add_new.$("info")?.remove()
					$add_new.$("[title]").removeAttribute("disabled")
					$add_new.$("[body]").removeAttribute("disabled")
					$add_new.$("[poll-1]")?.removeAttribute("disabled")
					$add_new.$("[poll-2]")?.removeAttribute("disabled")
					$add_new.$("[poll-3]")?.removeAttribute("disabled")
					$add_new.$("[poll-4]")?.removeAttribute("disabled")
					$add_new.$("[submit]").removeAttribute("disabled")
					$add_new.$("[cancel]")?.removeAttribute("disabled")
					addPostError(data.error || "Server error")
					return
				}
				if (!post) {
					$add_new.$("[body]").value = ""
					$add_new.$("[title]").value = ""
					if (mode === "poll") {
						$add_new.$("[poll]").click()
					}
					pngs.splice(0, pngs.length)
					previewPngs()
					$add_new.$("info")?.remove()
					$add_new.$("[title]").removeAttribute("disabled")
					$add_new.$("[body]").removeAttribute("disabled")
					$add_new.$("[poll-1]")?.removeAttribute("disabled")
					$add_new.$("[poll-2]")?.removeAttribute("disabled")
					$add_new.$("[poll-3]")?.removeAttribute("disabled")
					$add_new.$("[poll-4]")?.removeAttribute("disabled")
					$add_new.$("[submit]").removeAttribute("disabled")
					$add_new.$("[cancel]")?.removeAttribute("disabled")
				}
				// Handle case where title changes slug when updating a post
				delete state.active_add_new_post
				if (post && data.slug) {
					state.path = `/post/${data.slug}`
					startSession()
				} else {
					getMoreRecent()
				}
			})
			.catch((error) => {
				$add_new.$("info")?.remove()
				$add_new.$("[title]").removeAttribute("disabled")
				$add_new.$("[body]").removeAttribute("disabled")
				$add_new.$("[poll-1]")?.removeAttribute("disabled")
				$add_new.$("[poll-2]")?.removeAttribute("disabled")
				$add_new.$("[poll-3]")?.removeAttribute("disabled")
				$add_new.$("[poll-4]")?.removeAttribute("disabled")
				$add_new.$("[submit]").removeAttribute("disabled")
				$add_new.$("[cancel]")?.removeAttribute("disabled")
				addPostError("Network error")
			})
	})
	state.active_add_new_post = $add_new
	if (post) {
		state.active_add_new_post.is_edit = post.post_id
	} else {
		state.active_add_new_post.is_root = true
	}
	return $add_new
}
const focusAddNewPost = () => {
	state.active_add_new_post.$("[title]").focus()
}