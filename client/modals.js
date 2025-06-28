// Confirm modal
const modalConfirm = (message, callback) => {
	const $modal = $(
		`
		modal-wrapper
			modal[confirm][center-x]
				$1
				button-wrapper
					button[confirm][close] Yes, I am sure
					button[cancel][close][alt] Cancel
			modal-bg
		`,
		[message],
	)
	const modalCancel = () => {
		$modal.remove()
	}
	$modal.$("button[confirm]").on("click", () => {
		modalCancel()
		callback()
	})
	$modal.$("button[cancel]").on("click", modalCancel)
	$modal.$("modal-bg").on("click", modalCancel)
	$("modal-wrapper")?.remove()
	$("body").appendChild($modal)
}

// Generic modal info
const modalInfo = (message) => {
	const $modal = $(
		`
		modal-wrapper
			modal[info][center-x]
				info $1
				button[close] Okay
			modal-bg
		`,
		[message],
	)
	const modalCancel = () => {
		$modal.remove()
	}
	$modal.$("[close]").on("click", modalCancel)
	$modal.$("modal-bg").on("click", modalCancel)
	$("modal-wrapper")?.remove()
	$("body").appendChild($modal)
}

// Generic modal error
const modalError = (message) => {
	const $modal = $(
		`
		modal-wrapper
			modal[error][center-x]
				error $1
				button[close] Okay
			modal-bg
		`,
		[message],
	)
	const modalCancel = () => {
		$modal.remove()
	}
	$modal.$("[close]").on("click", modalCancel)
	$modal.$("modal-bg").on("click", modalCancel)
	$("modal-wrapper")?.remove()
	$("body").appendChild($modal)
}

// Generic alert sliding down from top
let alert_timeout = 0
const alertInfo = (message) => {
	const $alert = $(
		`
			alert
				info $1
			`,
		[message],
	)
	clearTimeout(alert_timeout)
	if ($("alert-wrapper")) {
		$alert.style.zIndex =
			(Number($("alert-wrapper alert").length || 1) + 1) * -1
		$("alert-wrapper").appendChild($alert)
	} else {
		$alert.style.zIndex = -1
		const $alert_wrapper = $(
			`
			alert-wrapper[center-x]
				$1
			`,
			[$alert],
		)
		$("body").appendChild($alert_wrapper)
	}
	alert_timeout = setTimeout(() => {
		$("alert-wrapper")?.remove()
	}, 5000)
}

// Generic alert error sliding down from top
const alertError = (message) => {
	const $alert = $(
		`
			alert
				error $1
			`,
		[message],
	)
	clearTimeout(alert_timeout)
	if ($("alert-wrapper")) {
		$alert.style.zIndex =
			(Number($("alert-wrapper alert").length || 1) + 1) * -1
		$("alert-wrapper").appendChild($alert)
	} else {
		$alert.style.zIndex = -1
		const $alert_wrapper = $(
			`
			alert-wrapper[center-x]
				$1
			`,
			[$alert],
		)
		$("body").appendChild($alert_wrapper)
	}
	alert_timeout = setTimeout(() => {
		$("alert-wrapper")?.remove()
	}, 5000)
}
