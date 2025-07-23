// Reactive attribute management for static elements
let reactive_attributes_initialized = false

const initializeReactiveAttributes = () => {
	if (reactive_attributes_initialized) return
	reactive_attributes_initialized = true
	
	// Set up reactive tracking for hamburger unread attribute
	const updateHamburger = () => {
		const $hamburger = $old("hamburger")
		if ($hamburger) {
			if (Boolean(_.unread_count)) {
				$hamburger.setAttribute("unread", "")
			} else {
				$hamburger.removeAttribute("unread")
			}
		}
	}
	
	// Set up reactive tracking for footer notifications unread attribute
	const updateFooterNotifications = () => {
		const $footer_notifications = $old("footer a[notifications]")
		if ($footer_notifications) {
			if (Boolean(_.unread_count)) {
				$footer_notifications.setAttribute("unread", "")
			} else {
				$footer_notifications.removeAttribute("unread")
			}
		}
	}
	
	// Create reactive functions that track _.unread_count
	const $reactive_hamburger = _(`$1`, [() => {
		updateHamburger()
		return ""
	}])
	const $reactive_footer = _(`$1`, [() => {
		updateFooterNotifications()
		return ""
	}])
	
	// Execute initially to set correct state
	updateHamburger()
	updateFooterNotifications()
}

const updateReactiveAttributes = () => {
	initializeReactiveAttributes()
}

const renderNotification = (notification) => {
	const short_body =
		notification.body.length > 50
			? notification.body.slice(0, 50) + "..."
			: notification.body

	// Handle different notification types
	const is_message = notification.notification_type === "message"
	
	if (is_message) {
		// Determine display text for message notifications
		let display_text = short_body
		if (!notification.body && notification.image_uuids) {
			const image_count = notification.image_uuids.split(",").filter(uuid => uuid).length
			display_text = image_count > 1 ? `[${image_count} photos]` : `[Photo]`
		}
		
		// Message notification rendering
		const $notification = $old(
			`
	    notification[line-after][unread=$1]
	      first-column
	        summary
	          b $2
	          span messaged you
	          i $3
	      second-column
	        icon[forward]
	    `,
			[
				!notification.read,
				renderName(notification.display_name, notification.display_name_index),
				`"${display_text}"`
			],
		)
		$notification.on("click", () => {
			goToPath("/messages/" + notification.conversation_id)

			// Mark as read
			if (!notification.read) {
				markAsRead(notification.notification_id, "message")
			}
		})
		return $notification
	} else {
		// Reply notification rendering (existing logic)
		const short_title =
			notification.title.length > 20
				? notification.title.slice(0, 20) + "..."
				: notification.title

		const reply_text =
			notification.reply_type === "reply"
				? "to your reply on"
				: notification.reply_type === "post_reply"
					? "to a reply on your post"
					: "to your post"

		const note = notification.note || ""
		const note_keyword = note.split(" ")[0]
		const note_title = (note_keywords[note_keyword] || note_keyword).replace(
			/[^a-z\-]/gi,
			"",
		)
		const $notification = $old(
			`
	    notification[line-after][unread=$1]
	      column[flex-column]
	        summary
	          b $2
	          span replied
	          i $3
	          span $4
	          b $5
	        $6
	      column[flex-column]
	        icon[forward]
	    `,
			[
				!notification.read,
				renderName(notification.display_name, notification.display_name_index),
				`"${short_body}"`,
				reply_text,
				short_title,
				notification.note
					? $old(
						`
	          info[tiny][$1]
	            b $2
	          `,
						[note_keyword, note_title],
					)
					: [],
			],
		)
		$notification.on("click", () => {
			goToPath("/reply/" + notification.reply_id)

			// Mark as read
			if (!notification.read) {
				markAsRead(notification.notification_id, "reply")
			}
		})
		return $notification
	}
}

// Helper function to create reactive notifications header with toggle
const createNotificationsHeader = () => {
	const createToggleHandler = ($toggle_wrapper) => {
		if (state.email) {
			$toggle_wrapper.on("click", () => {
				if (state.push_active) {
					state.push_active = false
					$old("toggle-wrapper").removeAttribute("active")
					navigator.serviceWorker.ready
						.then((registration) => {
							return registration.pushManager.getSubscription()
						})
						.then((subscription) => {
							subscription.unsubscribe()
							fetch("/session", {
								method: "POST",
								body: JSON.stringify({
									remove: true,
									subscription,
								}),
							})
								.then((response) => response.json())
								.then((data) => {
									if (!data || !data.success) {
										alertError("Server error saving subscription")
									}
								})
								.catch((error) => {
									alertError("Network error saving subscription")
								})
						})
					return
				}
				if (state.fcm_push_active) {
					state.fcm_push_active = false
					$old("toggle-wrapper").removeAttribute("active")
					fetch("/session", {
						method: "POST",
						body: JSON.stringify({
							fcm_subscription: state.fcm_token,
							deactivate: true,
						}),
					})
						.then((response) => response.json())
						.then((data) => {
							if (!data || !data.success) {
								alertError("Server error saving subscription")
							}
						})
						.catch(() => {
							alertError("Network error saving subscription")
						})
					return
				}
				if (state.fcm_push_available) {
					state.fcm_push_active = true
					getUnreadCountUnseenCount()
					$old("toggle-wrapper").setAttribute("active", "")
					if (state.fcm_token) {
						fetch("/session", {
							method: "POST",
							body: JSON.stringify({
								fcm_subscription: state.fcm_token,
								reactivate: true,
							}),
						})
							.then((response) => response.json())
							.then((data) => {
								if (!data || !data.success) {
									alertError("Server error saving subscription")
								}
							})
							.catch(() => {
								alertError("Network error saving subscription")
							})
					}
					window.webkit.messageHandlers["push-permission-request"].postMessage(
						"push-permission-request",
					)
				} else if (state.push_available) {
					state.push_active = true
					$old("toggle-wrapper").setAttribute("active", "")
					navigator.serviceWorker.ready
						.then(async (registration) => {
							registration.pushManager.subscribe({
								userVisibleOnly: true,
								applicationServerKey: (function () {
									const raw = window.atob(
										"BP8IxEorl8eTn6QkMCyfKCo5sDdx/AQruapRiq3wWaretKdIegWr3oMXUu2WXIiQvP46DcuoZxdKRHpGNMp+UNc=",
									)
									const array = new Uint8Array(new ArrayBuffer(raw.length))
									for (let i = 0; i < raw.length; i++) {
										array[i] = raw.charCodeAt(i)
									}
									return array
								})(),
							})
							let retries = 0
							const check_for_success = () => {
								registration.pushManager
									.getSubscription()
									.then((subscription) => {
										fetch("/session", {
											method: "POST",
											body: JSON.stringify({
												subscription,
											}),
										})
											.then((response) => response.json())
											.then((data) => {
												if (!data || !data.success) {
													if (retries < 20) {
														retries++
														setTimeout(check_for_success, retries * 1000)
													} else {
														alertError("Server error saving subscription")
														state.push_active = false
														$old("toggle-wrapper").removeAttribute("active")
														subscription.unsubscribe()
													}
												}
											})
											.catch(() => {
												if (retries < 20) {
													retries++
													setTimeout(check_for_success, retries * 1000)
												} else {
													modalError("Error enabling notifications")
													state.push_active = false
													$old("toggle-wrapper").removeAttribute("active")
													subscription.unsubscribe()
												}
											})
								})
						}
						setTimeout(check_for_success, 1000)
					})
					.catch(() => {
						modalError("Subscription error")
						state.push_active = false
						$old("toggle-wrapper").removeAttribute("active")
					})
			} else {
				if (state.fcm_push_denied) {
					modalError(`You must enable notifications in settings.`)
				} else {
					modalError(`You must "Add to Home Screen" to enable notifications.`)
				}
			}
		})
		}
	}
	
	return _(`
		posts[notifications-header]
			post[line-after]
				h2 Alerts
				$1
				$2
				$3
	`, [
		() => {
			if (!state.email) {
				return _(`p To enable push notification alerts, please sign in or sign up, using the menu in the top right hand corner.`)
			} else if (state.push_available || state.fcm_push_available) {
				return _(`p When you "Turn on notifications", you will get a push notification alert anytime someone responds to a post or reply you have posted.`)
			} else if (state.fcm_push_denied) {
				return _(`p You must enable notifications for this app in settings`)
			} else {
				return _(`
					p[add-to-home]
						span To enable alerts, tap the
						icon[share][inline]
						span icon on your browser and then tap "Add to Home Screen".
				`)
			}
		},
		(afterRender) => {
			// Mark all as read button - only show when conditions are met
			if ((state.push_active || state.fcm_push_active) && Boolean(_.unread_count)) {
				const $mark_all_as_read = _(`
					mark-all-as-read-wrapper
						button[mark-all-as-read][small][alt][faint=$1] Mark all as read
				`, [() => !Boolean(_.unread_count)])
				
				$mark_all_as_read.on("click", () => {
					$mark_all_as_read.$("button").setAttribute("alt", "")
					$mark_all_as_read.$("button").setAttribute("faint", "")
					fetch("/session", {
						method: "POST",
						body: JSON.stringify({
							mark_all_as_read: true,
						}),
					})
						.then((response) => response.json())
						.then((data) => {
							if (!data || !data.success) {
								alertError("Server error")
								console.error(data)
							} else {
								_.unread_count = 0
								state.cache["/notifications"].notifications = state.cache[
									"/notifications"
								].notifications.filter((n) => n.read)
								getMoreRecent()
								getUnreadCountUnseenCount()
							}
						})
						.catch((error) => {
							alertError("Network error")
							console.error(error)
						})
				})
				return $mark_all_as_read
			}
			return document.createComment("no-mark-all-as-read")
		},
		(afterRender) => {
			// Toggle wrapper - only show when push available
			if (state.push_available || state.fcm_push_available) {
				const $toggle_wrapper = _(`
					toggle-wrapper[disabled=$1][active=$2]
						toggle-text Turn on notifications
						toggle-button
							toggle-circle
				`, [
					!state.push_available && !state.fcm_push_available,
					state.push_active || state.fcm_push_active,
				])
				
				createToggleHandler($toggle_wrapper)
				
				if (!state.email) {
					$toggle_wrapper.setAttribute("disabled", "")
				}
				return $toggle_wrapper
			}
			return document.createComment("no-toggle")
		}
	])
}

// Update notifications data at top level for reactive access
const updateNotificationsData = (notifications) => {
	_.notifications = notifications
}

// Create reactive template for main-content (header + unread notifications)
const createNotificationsMainContent = () => {
	return _(`$1`, [
		(afterRender) => {
			if (_.path === "/notifications") {
				// Mark all as seen side effect
				const notifications = _.notifications || []
				if (state.unseen_count && notifications.length) {
					afterRender(() => {
						fetch("/session", {
							method: "POST",
							body: JSON.stringify({
								mark_all_as_seen: true,
							}),
						})
							.then((response) => response.json())
							.then((data) => {
								if (!data || !data.success) {
									alertError("Server error")
									console.error(data)
								} else {
									state.unseen_count = 0
									getUnreadCountUnseenCount()
								}
							})
							.catch((error) => {
								state.most_recent_error = error
								alertError("Network error")
								console.error(error)
							})
					})
				}
				
				return [
					createNotificationsHeader(),
					_(`
						notifications[flex-column]
							h3[unread-header] $1
							$2
							$3
					`, [
						() => _.unread_count > 0 ? `Unread (${_.unread_count})` : "Unread",
						() => !Boolean(_.unread_count) ? [_(`
							all-clear-wrapper
								p Nothing to see here
						`)] : [],
						() => {
							const unread_notifications = (_.notifications || []).filter((n) => !n.read)
							return unread_notifications
								.sort((a, b) => new Date(b.create_date) - new Date(a.create_date))
								.map(renderNotification)
						}
					])
				]
			}
			
			return document.createComment("notifications-main-content-placeholder")
		}
	])
}

// Create reactive template for main-content-2 (read notifications)
const createNotificationsMainContent2 = () => {
	return _(`$1`, [
		() => {
			if (_.path === "/notifications") {
				
				return _(`
					notifications[flex-column]
						h3 Read
						$1
						$2
				`, [
					() => {
						const read_notifications = (_.notifications || []).filter((n) => n.read)
						return !read_notifications.length ? [_(`
							all-clear-wrapper
								p Nothing to see here
						`)] : []
					},
					() => {
						const read_notifications = (_.notifications || []).filter((n) => n.read)
						return read_notifications
							.sort((a, b) => new Date(b.create_date) - new Date(a.create_date))
							.map(renderNotification)
					}
				])
			}
			
			return document.createComment("notifications-main-content-2-placeholder")
		}
	])
}

// Just update data - reactive templates will handle rendering
const renderNotifications = (notifications) => {
	updateNotificationsData(notifications)
	
	// Update counts when notifications data arrives (not in reactive function)
	if (state.path === "/notifications") {
		getUnreadCountUnseenCount()
	}
}

// renderMarkAllAsRead is now integrated into createNotificationsHeader
// This function is no longer needed as the mark all as read button and toggle
// are now part of the reactive header template
const renderMarkAllAsRead = () => {
	// This function is deprecated - functionality moved to createNotificationsHeader
}

const getUnreadCountUnseenCount = () => {
	fetch("/session", {
		method: "POST",
		body: JSON.stringify({
			path: "/unread_count_unseen_count",
		}),
	})
		.then((response) => response.json())
		.then((data) => {
			if (!data) {
				alertError("Server error")
				console.error(data)
			} else {
				_.unread_count = Number(data.unread_count)
				state.unseen_count = Number(data.unseen_count)
				if (navigator.setAppBadge) {
					navigator.setAppBadge(state.push_active ? _.unread_count : 0)
				}

				if (
					window.webkit
					&& window.webkit.messageHandlers
					&& window.webkit.messageHandlers["set-badge"]
					&& state.fcm_push_active
				) {
					window.webkit.messageHandlers["set-badge"].postMessage(
						JSON.stringify({
							badge: _.unread_count,
						}),
					)
				}
				// Reactive attribute management for static elements
				updateReactiveAttributes()
				// Notification header now reactive - no manual update needed
				if (
					state.unseen_count
					&& (state.window_recently_focused || state.window_recently_loaded)
					&& (state.push_active || state.fcm_push_active)
				) {
					// When exactly one, just go to the reply
					if (
						state.unseen_count === 1
						&& data.reply_id
						&& data.notification_id
					) {
						goToPath("/reply/" + data.reply_id)
						markAsRead(data.notification_id, "reply")

						// Otherwise load the list of notifications
					} else {
						goToPath("/notifications")
					}
				}
			}
		})
		.catch((error) => {
			state.most_recent_error = error
			alertError("Network error loading unread count")
			console.error(error)
		})
}

const markAsRead = (notification_id, notification_type) => {
	const request_body = {}
	if (notification_type === "reply") {
		request_body.mark_reply_notifications_as_read = [notification_id]
	} else if (notification_type === "message") {
		request_body.mark_message_notifications_as_read = [notification_id]
	}
	
	fetch("/session", {
		method: "POST",
		body: JSON.stringify(request_body),
	})
		.then((response) => response.json())
		.then((data) => {
			if (!data || !data.success) {
				alertError("Server error")
				console.error(data)
			} else {
				// Update cache for this item
				const notification = state.cache["/notifications"]?.notifications?.find(
					(n) => n.notification_id === notification_id && n.notification_type === notification_type,
				)
				if (notification) {
					notification.read = true
					notification.seen = true
				}

				// Ensure counts are accurate as well
				getUnreadCountUnseenCount()
			}
		})
		.catch((error) => {
			state.most_recent_error = error
			alertError("Network error marking as read")
			console.error(error)
		})
}

window.addEventListener("focus", () => {
	state.window_recently_focused = true
	setTimeout(() => {
		state.window_recently_focused = false
	}, 5000)
	getMoreRecent()
	getUnreadCountUnseenCount()
})
window.addEventListener("load", () => {
	state.window_recently_loaded = true
	setTimeout(() => {
		state.window_recently_loaded = false
	}, 5000)
	getUnreadCountUnseenCount()
})
if (
	window.webkit
	|| window.matchMedia("(display-mode: standalone)").matches
	|| window.is_android
	|| 1
) {
	$old("body").setAttribute("app", "")
	state.is_app = true
}
