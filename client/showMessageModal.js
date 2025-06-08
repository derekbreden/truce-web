const showMessageModal = (participantUserIds, existingConversationId = null) => {
	const isNewConversation = !existingConversationId
	const title = isNewConversation ? "New Message" : "Reply"

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
			isNewConversation ? $(
				`
				label To:
				participants-display
				`
			) : "",
			$("icons icon[image] svg").cloneNode(true)
		]
	)

	// Handle new conversation participant display
	if (isNewConversation && participantUserIds) {
		// For now, we'll just show the user IDs
		// In a full implementation, you'd fetch user details
		$modal.$("participants-display").textContent = `Users: ${participantUserIds.join(", ")}`
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
				try {
					const pngData = await imageToPng(file)
					selectedImages.push({ url: pngData })
					
					const $preview = $(
						`
						image-preview-item
							img[src=$1]
							remove-button
								icon
									$2
						`,
						[
							pngData,
							$("icons icon[remove] svg").cloneNode(true)
						]
					)
					
					$preview.$("remove-button").on("click", () => {
						const index = selectedImages.findIndex(img => img.url === pngData)
						if (index > -1) {
							selectedImages.splice(index, 1)
							$preview.remove()
						}
					})
					
					$imagePreview.appendChild($preview)
				} catch (error) {
					console.error("Error processing image:", error)
					modalError("Error processing image. Please try again.")
				}
			}
		}
	})

	// Handle sending
	const $submitButton = $modal.$("button[submit]")
	const $textarea = $modal.$("textarea[body]")
	
	$submitButton.on("click", async () => {
		const messageBody = $textarea.value.trim()
		if (!messageBody) {
			modalError("Please enter a message")
			return
		}

		$submitButton.disabled = true
		$submitButton.textContent = "Sending..."

		try {
			if (isNewConversation) {
				// Create conversation first
				const conversationResponse = await send({
					participant_user_ids: participantUserIds
				}, "createConversation")

				if (conversationResponse.success) {
					// Send the message
					await send({
						conversation_id: conversationResponse.conversation_id,
						body: messageBody,
						pngs: selectedImages
					}, "sendMessage")

					modalCancel()
					// Navigate to the new conversation
					goToPath(`/messages/${conversationResponse.conversation_id}`)
				} else {
					throw new Error(conversationResponse.error || "Failed to create conversation")
				}
			} else {
				// Send message to existing conversation
				await send({
					conversation_id: existingConversationId,
					body: messageBody,
					pngs: selectedImages
				}, "sendMessage")

				modalCancel()
			}
		} catch (error) {
			console.error("Error sending message:", error)
			modalError("Failed to send message. Please try again.")
			$submitButton.disabled = false
			$submitButton.textContent = "Send"
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
				try {
					const pngData = await imageToPng(file)
					selectedImages.push({ url: pngData })
					
					const $preview = $(
						`
						image-preview-item
							img[src=$1]
							remove-button
								icon
									$2
						`,
						[
							pngData,
							$("icons icon[remove] svg").cloneNode(true)
						]
					)
					
					$preview.$("remove-button").on("click", () => {
						const index = selectedImages.findIndex(img => img.url === pngData)
						if (index > -1) {
							selectedImages.splice(index, 1)
							$preview.remove()
						}
					})
					
					$imagePreview.appendChild($preview)
				} catch (error) {
					console.error("Error processing image:", error)
					modalError("Error processing image. Please try again.")
				}
			}
		}
	})

	// Handle saving
	const $submitButton = $modal.$("button[submit]")
	const $textarea = $modal.$("textarea[body]")
	
	$submitButton.on("click", async () => {
		const messageBody = $textarea.value.trim()
		if (!messageBody) {
			modalError("Please enter a message")
			return
		}

		$submitButton.disabled = true
		$submitButton.textContent = "Saving..."

		try {
			await send({
				message_id: message.message_id,
				conversation_id: message.conversation_id || state.active_conversation_id,
				body: messageBody,
				pngs: selectedImages
			}, "sendMessage")

			modalCancel()
		} catch (error) {
			console.error("Error updating message:", error)
			modalError("Failed to update message. Please try again.")
			$submitButton.disabled = false
			$submitButton.textContent = "Save Changes"
		}
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