const loadingPage = (first_render, skip_state, clicked_back) => {
	if (!first_render) {
		if (clicked_back) {
			$old("main-content-wrapper[active]").setAttribute("clicked-back", "")
		} else {
			$old("main-content-wrapper[active]").removeAttribute("clicked-back")
		}
		$old("main-content-wrapper[active]").setAttribute("inactive", "")
		$old("main-content-wrapper[active]").removeAttribute("active")
	}
	$old("body").appendChild(
		$old(
			`
			main-content-wrapper[active][full-width][skip-state=$1][clicked-back=$2]
				main-content
				main-content-2
			`,
			[Boolean(skip_state), Boolean(clicked_back)],
		),
	)
	bindScrollEvent()
	setTimeout(() => {
		$old("main-content-wrapper[inactive]")?.remove()
	}, 250)
	// $old("[add-new-reply]")?.remove()
	if (!first_render) {
		$old("main-content-wrapper[active] main-content").appendChild(
			$old(
				`
				posts-loading
					h2
					p
					p
				`,
			),
		)
	}
	if (state.path === "/posts" || state.path === "/posts/all") {
		if (!state.active_add_new_post?.is_root) {
			$old(
				"main-content-wrapper[active] main-content > add-new:first-child",
			)?.remove()
			$old("main-content-wrapper[active] main-content").prepend(showAddNewPost())
		}
	}

	// Render Back Button
	renderBack()

	// Welcome page
	if (state.path === "/") {
		$old("main-content-wrapper[active] main-content").replaceChildren(
			$old(
				`
				posts
					post[line-after]
						h2[welcome]
							span Terms and conditions
							icon[welcome]
						p If you agree to:
						ul
							li Never escalate
							li Never judge
							li Never name-call
						p Then, please join us in this Truce.
						p
							a[big][href=/posts] Join the Discussion
						p[notice][center]
							span To be clear, there is no tolerance for objectionable content or abusive users.
						p[notice][center][style="margin-top:5px;"]
							span Objectionable content is defined as escalations, judgments, or name-calling.
						p[notice][center][style="margin-top:5px;"]
							span By clicking "Join the Discussion," you agree to these terms.
					$1
				`,
				[
					!window.webkit
					&& document.referrer !== "android-app://net.truce.twa/"
						? $old(
							`
								post[line-after]
									app-store-wrapper
										a[href=$1]
											img[src=/play_store.png]
										a[href=$2]
											img[src=/app_store_black.svg][black]
											img[src=/app_store_white.svg][white]
								`,
							[
								"https://play.google.com/store/apps/details?id=net.truce.twa",
								"https://apps.apple.com/us/app/truce/id6578447172",
							],
						)
						: [],
				],
			),
		)
		$old("main-content-wrapper[active] main-content-2").replaceChildren(
			$old(
				`
				posts
					post[line-after]
						h2[moderation]
							span Our Approach to Moderation
							icon[communication]
						p If you post:
						ul
							li An escalation
							li A judgment
							li Name-calling
						p Then:
						ul
							li A label will be applied
							li The label will be explained
						replies[flex-column]
							expand-wrapper[above-replies]
								p Examples
							reply
								h3
									author
										profile-picture
											profile-image
												icon[profile-picture]
										span John Doe:
								p You are a fascist, who attended a fascist rally and supported a fascist leader.
								info-wrapper
									info
										b Name-calling
										p If someone does not identify themselves as a fascist, calling them one is an example of name-calling. This type of labeling hinders constructive and respectful dialogue.
							reply
								h3
									author
										profile-picture
											profile-image
												icon[profile-picture]
										span Jane Doe:
								p Sometimes violence is the answer.
									info
										b Escalation
										p This statement suggests that violence can be a solution, which promotes conflict and hostility rather than peaceful dialogue.
							reply
								h3
									author
										profile-picture
											profile-image
												icon[profile-picture]
										span Sam Smith:
								p They are pure evil.
									info
										b Judgment
										p Labeling anyone as "pure evil" is a critical judgment that hinders respectful dialogue and constructive conversation.
				posts
					p[notice][center]
						a[href="/privacy"] Privacy Policy
					p[notice][center]
						span Email us at
						a[href="mailto:derek@truce.net"] derek@truce.net
						span to provide feedback or report inappropriate activity.
				`,
			),
		)

		$old("main-content-wrapper[active")
			.$("[href]")
			.forEach(($el) => {
				$el.on("click", ($event) => {
					let new_path = $el.getAttribute("href")
					if (new_path.startsWith("/")) {
						$event.preventDefault()
						if (new_path === "/posts") {
							localStorage.setItem(`${window.local_storage_key}:agreed`, true)
							if (state.next_path) {
								new_path = state.next_path
							}
						}
						goToPath(new_path)
					}
				})
			})
	}

	// Privacy page
	if (state.path === "/privacy") {
		$old("main-content-wrapper[active] main-content").replaceChildren(
			$old(
				`
				tab-wrapper[line-after]
					tab-item
						icon[back]
						p Terms and conditions
				posts
					post[line-after]
						h2 Privacy Policy
						p[bold] Information Collection
						p We do not collect any personal data from users of our app. The email address and password you provide are used solely to facilitate account recovery.
						p[bold] Use of Information
						p Your email and password are used solely to facilitate account recovery.
						p[bold] Data Security
						p We take measures to protect your information from unauthorized access or disclosure.
						p[bold] No Third-Party Services
						p We do not use any third-party services or analytics.
						p[bold] Policy Changes
						p We may update this policy from time to time. Changes will be effective immediately upon posting.
						p[bold] Contact
						p For any questions, contact us at derek@truce.net
				`,
			),
		)
		$old("main-content-wrapper[active] main-content tab-wrapper").on(
			"click",
			() => {
				goToPath("/")
			},
		)
	}

	if (state.path === "/settings") {
		const $settings = $old(
			`
			posts
				post[line-after]
					h2[settings]
						span Account settings
						button[profile][small][slug=$1]
							icon[profile-picture]
							span View profile
					p You may change your profile picture or your display name here. You may also remove your account.
				post[line-after]
					p[bold] Profile picture
					label[profile-picture][large]
						profile-image
							$2
						input[image][type=file][accept=image/*]
					p[bold] Display name
					p[input]
						input[type=text][display-name][value=$3]
					p[button]
						button[save] Save display name
				post[line-after]
					p[bold] Remove account
					p[button]
						button[remove][alt] Remove Account
			`,
			[
				state.user_slug,
				state.profile_picture_uuid
					? $old(
						`
							img[src=$1]
							`,
						["/image/" + state.profile_picture_uuid],
					)
					: $old(
						`
						icon[profile-picture]
						`
					),
				state.display_name,
			],
		)
		$settings.$("button[profile]")?.forEach(($button) => {
			$button.on("click", ($event) => {
				$event.preventDefault()
				goToPath(`/user/${$button.getAttribute("slug")}`)
			})
		})
		$old("main-content-wrapper[active] main-content").replaceChildren($settings)

		$old("main-content-wrapper[active] [profile-picture] input[image]")?.on(
			"change",
			editProfilePicture,
		)

		$settings.$("[save]").on("click", ($event) => {
			$event.preventDefault()
			alertInfo("Saving display name...")
			const new_display_name = $settings.$("[display-name]").value
			fetch("/session", {
				method: "POST",
				body: JSON.stringify({
					display_name: new_display_name,
				}),
			})
				.then((response) => response.json())
				.then((data) => {
					if (data.error || !data.success) {
						modalError(data.error || "Server error")
					} else {
						updateDisplayName(data)
						alertInfo("Display name saved.")
					}
				})
				.catch(() => {
					modalError("Network error")
				})
		})
		$settings.$("[remove]").on("click", ($event) => {
			$event.preventDefault()
			const $remove_modal = $old(
				`
					modal-wrapper
						modal[info]
							error
								b Warning
								p This will permanently remove your account. This action cannot be undone.
							p Everything you posted will be deleted:
							ul
								li Replies
								li Posts
								li Images
								li Favorites
							p Tap remove to confirm.
							button-wrapper
								button[remove] Remove
								button[alt][cancel] Cancel
						modal-bg[full-width]
					`,
			)
			const removeModalCancel = () => {
				$remove_modal.remove()
			}
			$remove_modal.$("[remove]").on("click", () => {
				removeModalCancel()
				modalInfo("Removing account...")
				fetch("/session", {
					method: "POST",
					body: JSON.stringify({
						remove_account: true,
					}),
				})
					.then((response) => response.json())
					.then((data) => {
						if (!data || !data.success) {
							modalError("Server error removing account")
						} else {
							$old("modal-wrapper")?.remove()
							modalInfo("Account removed")
							state.user_id = ""
							state.display_name = ""
							state.profile_picture_uuid = ""
							state.email = ""
							state.reset_token_uuid = ""
							localStorage.removeItem("session_uuid")
							state.cache = {}
							goToPath("/")
						}
					})
					.catch((error) => {
						modalError("Network error removing account")
					})
			})
			$remove_modal.$("[cancel]").on("click", removeModalCancel)
			$remove_modal.$("modal-bg").on("click", removeModalCancel)
			$old("modal-wrapper")?.remove()
			$old("body").appendChild($remove_modal)
		})
	}
}
