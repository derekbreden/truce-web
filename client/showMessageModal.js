const showMessageModal = (participant_user_ids, existing_conversation_id = null) => {
	const is_new_conversation = !existing_conversation_id
	const title = is_new_conversation ? "New Message" : "Reply"

	const $modal = $(
		`
		modal-wrapper
			modal[message]
				h2 $1
				participants-section
					$2
				textarea[body][placeholder="Type your message..."][rows=6][maxlength=8000]
				image-section
					label[image]
						icon
							$3
						input[image][type=file][multiple][accept=image/*]
					image-preview
				button-wrapper
					button[submit] Send
					button[cancel][alt] Cancel
			modal-bg
		`,
		[
			title,
			is_new_conversation ? $(
				`
				label To:
				participants-display
				`
			) : "",
			$("icons icon[image] svg").cloneNode(true)
		]
	)

	// Handle new conversation participant display
	if (is_new_conversation && participant_user_ids) {
		// For now, we'll just show the user IDs
		// In a full implementation, you'd fetch user details
		$modal.$("participants-display").textContent = `Users: ${participant_user_ids.join(", ")}`
	}

	// Handle image uploads
	const $imageInput = $modal.$("input[image]")
	const $imagePreview = $modal.$("image-preview")
	let selectedImages = []

	$imageInput.on("change", async () => {
		selectedImages = []
		$imagePreview.replaceChildren()

		for (const file of $imageInput.files) {
			if (file.type.startsWith("image/")) {
				imageToPng(URL.createObjectURL(file), (result) => {
					if (result.error) {
						console.error("Error processing image:", result.message)
						modalError("Error processing image. Please try again.")
						return
					}
					
					selectedImages.push({ url: result.url })
					
					const $preview = $(
						`
						image-preview-item
							img[src=$1]
							remove-button
								icon
									$2
						`,
						[
							result.url,
							$("icons icon[remove] svg").cloneNode(true)
						]
					)
					
					$preview.$("remove-button").on("click", () => {
						const index = selectedImages.findIndex(img => img.url === result.url)
						if (index > -1) {
							selectedImages.splice(index, 1)
							$preview.remove()
						}
					})
					
					$imagePreview.appendChild($preview)
				})
			}
		}
	})

	// Handle sending
	const $submitButton = $modal.$("button[submit]")
	const $textarea = $modal.$("textarea[body]")
	
	$submitButton.on("click", () => {
		const message_body = $textarea.value.trim()
		if (!message_body) {
			modalError("Please enter a message")
			return
		}

		$submitButton.disabled = true
		$submitButton.textContent = "Sending..."

		if (is_new_conversation) {
			// Create conversation first
			fetch("/session", {
				method: "POST",
				body: JSON.stringify({
					participant_user_ids: participant_user_ids
				})
			})
			.then(response => response.json())
			.then(conversation_data => {
				if (conversation_data.error || !conversation_data.success) {
					modalError(conversation_data.error || "Failed to create conversation")
					$submitButton.disabled = false
					$submitButton.textContent = "Send"
					return
				}
				
				// Send the message
				fetch("/session", {
					method: "POST", 
					body: JSON.stringify({
						conversation_id: conversation_data.conversation_id,
						body: message_body,
						pngs: selectedImages
					})
				})
				.then(response => response.json())
				.then(message_data => {
					if (message_data.error || !message_data.success) {
						modalError(message_data.error || "Failed to send message")
						$submitButton.disabled = false
						$submitButton.textContent = "Send"
						return
					}
					modalCancel()
					goToPath(`/messages/${conversation_data.conversation_id}`)
				})
				.catch(error => {
					modalError("Network error")
					$submitButton.disabled = false
					$submitButton.textContent = "Send"
				})
			})
			.catch(error => {
				modalError("Network error")
				$submitButton.disabled = false
				$submitButton.textContent = "Send"
			})
		} else {
			// Send message to existing conversation
			fetch("/session", {
				method: "POST",
				body: JSON.stringify({
					conversation_id: existing_conversation_id,
					body: message_body,
					pngs: selectedImages
				})
			})
			.then(response => response.json())
			.then(data => {
				if (data.error || !data.success) {
					modalError(data.error || "Failed to send message")
					$submitButton.disabled = false
					$submitButton.textContent = "Send"
					return
				}
				modalCancel()
			})
			.catch(error => {
				modalError("Network error")
				$submitButton.disabled = false
				$submitButton.textContent = "Send"
			})
		}
	})

	// Handle canceling
	const modalCancel = () => {
		$modal.remove()
	}

	$modal.$("button[cancel]").on("click", modalCancel)
	$modal.$("modal-bg").on("click", modalCancel)

	// Handle Enter key (Shift+Enter for new line)
	$textarea.on("keydown", (e) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault()
			$submitButton.click()
		}
	})

	// Remove any existing modals and show this one
	$("modal-wrapper")?.remove()
	$("body").appendChild($modal)
	
	// Focus on textarea
	setTimeout(() => {
		$textarea.focus()
	}, 100)
}

const showEditMessageModal = (message) => {
	const $modal = $(
		`
		modal-wrapper
			modal[edit-message]
				h2 Edit Message
				textarea[body][rows=6][maxlength=8000] $1
				image-section
					label[image]
						icon
							$2
						input[image][type=file][multiple][accept=image/*]
					image-preview
				button-wrapper
					button[submit] Save Changes
					button[cancel][alt] Cancel
			modal-bg
		`,
		[
			message.body,
			$("icons icon[image] svg").cloneNode(true)
		]
	)

	// Handle existing images
	const $imagePreview = $modal.$("image-preview")
	let selectedImages = []

	if (message.image_uuids) {
		message.image_uuids.split(",").filter(x => x).forEach(uuid => {
			selectedImages.push({ url: `/image/${uuid}` })
			
			const $preview = $(
				`
				image-preview-item
					img[src=$1]
					remove-button
						icon
							$2
				`,
				[
					`/image/${uuid}`,
					$("icons icon[remove] svg").cloneNode(true)
				]
			)
			
			$preview.$("remove-button").on("click", () => {
				const index = selectedImages.findIndex(img => img.url === `/image/${uuid}`)
				if (index > -1) {
					selectedImages.splice(index, 1)
					$preview.remove()
				}
			})
			
			$imagePreview.appendChild($preview)
		})
	}

	// Handle new image uploads (similar to showMessageModal)
	const $imageInput = $modal.$("input[image]")
	$imageInput.on("change", async () => {
		for (const file of $imageInput.files) {
			if (file.type.startsWith("image/")) {
				imageToPng(URL.createObjectURL(file), (result) => {
					if (result.error) {
						console.error("Error processing image:", result.message)
						modalError("Error processing image. Please try again.")
						return
					}
					
					selectedImages.push({ url: result.url })
					
					const $preview = $(
						`
						image-preview-item
							img[src=$1]
							remove-button
								icon
									$2
						`,
						[
							result.url,
							$("icons icon[remove] svg").cloneNode(true)
						]
					)
					
					$preview.$("remove-button").on("click", () => {
						const index = selectedImages.findIndex(img => img.url === result.url)
						if (index > -1) {
							selectedImages.splice(index, 1)
							$preview.remove()
						}
					})
					
					$imagePreview.appendChild($preview)
				})
			}
		}
	})

	// Handle saving
	const $submitButton = $modal.$("button[submit]")
	const $textarea = $modal.$("textarea[body]")
	
	$submitButton.on("click", () => {
		const message_body = $textarea.value.trim()
		if (!message_body) {
			modalError("Please enter a message")
			return
		}

		$submitButton.disabled = true
		$submitButton.textContent = "Saving..."

		fetch("/session", {
			method: "POST",
			body: JSON.stringify({
				message_id: message.message_id,
				conversation_id: message.conversation_id || state.active_conversation_id,
				body: message_body,
				pngs: selectedImages
			})
		})
		.then(response => response.json())
		.then(data => {
			if (data.error || !data.success) {
				modalError(data.error || "Failed to update message")
				$submitButton.disabled = false
				$submitButton.textContent = "Save Changes"
				return
			}
			modalCancel()
		})
		.catch(error => {
			modalError("Network error")
			$submitButton.disabled = false
			$submitButton.textContent = "Save Changes"
		})
	})

	// Handle canceling
	const modalCancel = () => {
		$modal.remove()
	}

	$modal.$("button[cancel]").on("click", modalCancel)
	$modal.$("modal-bg").on("click", modalCancel)

	// Handle Enter key
	$textarea.on("keydown", (e) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault()
			$submitButton.click()
		}
	})

	// Remove any existing modals and show this one
	$("modal-wrapper")?.remove()
	$("body").appendChild($modal)
	
	// Focus on textarea
	setTimeout(() => {
		$textarea.focus()
		$textarea.setSelectionRange($textarea.value.length, $textarea.value.length)
	}, 100)
}