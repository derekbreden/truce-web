const showAddNewReplyButton = (root_index) => {
	const $add_new_button = $(
		`
    p[add-new-comment]
      button[alt] Reply to post
    `,
	)
	$add_new_button.on("click", ($event) => {
		$event.preventDefault()
		$add_new_button.replaceWith(showAddNewReply(null, null, root_index))
		focusAddNewReply()
	})
	return $add_new_button
}
const showAddNewReply = (reply, parent_reply, root_index) => {
	const $add_new = $(
		`
    add-new[comment]
      input[display-name][placeholder=Your name][maxlength=50][value=$2]
      textarea[body][placeholder=Reply][rows=8][maxlength=8000] $3
      title-wrapper
        label[image]
          icon
            $1
          input[image][type=file][accept=image/*]
      button[submit] $4
      button[alt][cancel] Cancel
    `,
		[
			$("icons icon[image] svg").cloneNode(true),
			...(reply
				? [state.display_name, reply.body, "Save changes"]
				: parent_reply
					? [state.display_name, "", "Reply"]
					: [state.display_name, "", "Add reply"]),
		],
	)
	if (reply) {
		$add_new.$("[cancel]").on("click", () => {
			$add_new.replaceWith(reply.$reply)
			delete state.active_add_new_comment
		})
	} else if (parent_reply) {
		$add_new.$("[cancel]").on("click", () => {
			parent_reply.$reply.$(":scope > reply-wrapper").style.display = "flex"
			$add_new.remove()
			delete state.active_add_new_comment
		})
	} else {
		$add_new.$("[cancel]").on("click", () => {
			$add_new.replaceWith(showAddNewReplyButton(root_index))
			delete state.active_add_new_comment
		})
	}
	const addReplyError = (error) => {
		$add_new.appendChild(
			$(
				`
        error $1
        `,
				[error],
			),
		)
	}

	const pngs = []

	if (reply?.image_uuids) {
		const image_uuids = reply.image_uuids.split(",")
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
					pngs.pop()
					pngs.push(png)
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
				const $preview = $(
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

	$add_new.$("[display-name]").on("focus", () => {
		$add_new.$("error")?.remove()
	})
	$add_new.$("[body]").on("focus", () => {
		$add_new.$("error")?.remove()
		setTimeout(() => {
			$add_new.scrollIntoView()
		}, 50)
	})
	const hideDisplayNameInput = () => {
		const $display_name = $add_new.$("[display-name]")
		if (state.display_name && $display_name) {
			const $display_name_wrapper = $(
				`
        display-name-wrapper
          b
            profile-picture
              image
                $1
            span $2
        `,
				[
					state.profile_picture_uuid
						? $(
								`
                img[src=$1]
                `,
								["/image/" + state.profile_picture_uuid],
							)
						: $("icons icon[profile-picture] svg").cloneNode(true),
					state.display_name + ":",
				],
			)
			$display_name_wrapper.on("click", () => {
				$display_name_wrapper.replaceWith($display_name)
				$display_name.focus()
			})
			$display_name.replaceWith($display_name_wrapper)
		}
	}
	const saveDisplayName = () => {
		if (state.display_name === $add_new.$("[display-name]").value) {
			hideDisplayNameInput()
			return
		}
		state.display_name = $add_new.$("[display-name]").value
		$add_new.$("[display-name]").setAttribute("disabled", "")
		if (!state.display_name) {
			addReplyError("Please enter your name")
			return
		}
		$add_new.appendChild(
			$(
				`
          info Validating...
        `,
			),
		)
		fetch("/session", {
			method: "POST",
			body: JSON.stringify({
				display_name: state.display_name,
			}),
		})
			.then((response) => response.json())
			.then(function (data) {
				$add_new.$("[display-name]")?.removeAttribute("disabled")
				$add_new.$("info")?.remove()
				if (data.error || !data.success) {
					addReplyError(data.error || "Server error")
					state.display_name = ""
				} else {
					updateDisplayName(data)
					getMoreRecent()
				}
				hideDisplayNameInput()
			})
			.catch(function (error) {
				$add_new.$("[display-name]")?.removeAttribute("disabled")
				$add_new.$("info")?.remove()
				addReplyError("Network error")
			})
	}
	$add_new.$("[display-name]").on("blur", () => {
		saveDisplayName()
	})
	hideDisplayNameInput()
	$add_new.$("[submit]").on("click", () => {
		$add_new.$("error")?.remove()
		state.display_name =
			$add_new.$("[display-name]")?.value || state.display_name
		const body = $add_new.$("[body]").value
		if (!state.display_name) {
			addReplyError("Please enter your name")
			return
		}
		if (!body && !pngs.length) {
			addReplyError("Please enter a reply")
			return
		}
		$add_new.appendChild(
			$(
				`
          info Validating...
        `,
			),
		)
		$add_new.$("[body]").setAttribute("disabled", "")
		$add_new.$("[display-name]")?.setAttribute("disabled", "")
		$add_new.$("[submit]").setAttribute("disabled", "")
		$add_new.$("[cancel]").setAttribute("disabled", "")
		fetch("/session", {
			method: "POST",
			body: JSON.stringify({
				path: state.path,
				display_name: state.display_name,
				body,
				pngs,
				comment_id: reply ? reply.comment_id : undefined,
				parent_comment_id: parent_reply
					? parent_reply.comment_id
					: reply && reply.parent_comment_id
						? reply.parent_comment_id
						: undefined,
			}),
		})
			.then((response) => response.json())
			.then(function (data) {
				if (data.error || !data.success) {
					$add_new.$("info")?.remove()
					$add_new.$("[body]").removeAttribute("disabled")
					$add_new.$("[display-name]")?.removeAttribute("disabled")
					$add_new.$("[submit]").removeAttribute("disabled")
					$add_new.$("[cancel]").removeAttribute("disabled")
					addReplyError(data.error || "Server error")
					return
				}
				delete state.active_add_new_comment
				updateDisplayName(data)
				getMoreRecent()
			})
			.catch(function (error) {
				$add_new.$("info")?.remove()
				$add_new.$("[body]").removeAttribute("disabled")
				$add_new.$("[display-name]")?.removeAttribute("disabled")
				$add_new.$("[submit]").removeAttribute("disabled")
				$add_new.$("[cancel]").removeAttribute("disabled")
				addReplyError("Network error")
			})
	})
	if (state.active_add_new_comment) {
		state.active_add_new_comment.$("[cancel]").click()
	}
	state.active_add_new_comment = $add_new
	if (reply) {
		state.active_add_new_comment.is_edit = reply.comment_id
	} else if (parent_reply) {
		state.active_add_new_comment.is_reply = parent_reply.comment_id
	} else {
		state.active_add_new_comment[`is_root_${root_index}`] = true
	}
	return $add_new
}
const focusAddNewReply = () => {
	if (!state.display_name) {
		state.active_add_new_comment.$("[display-name]").focus()
	} else {
		state.active_add_new_comment.$("[body]").focus()
	}
	setTimeout(() => {
		state.active_add_new_comment.scrollIntoView()
	}, 50)
}