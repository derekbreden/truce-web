// Confirm modal
const modalConfirm = (message, callback) => {
	const $modal = $old(
		`
		modal-wrapper
			modal[confirm]
				$1
				button-wrapper
					button[confirm][close] Yes, I am sure
					button[cancel][close][alt] Cancel
			modal-bg[full-width]
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
	$old("modal-wrapper")?.remove()
	$old("body").appendChild($modal)
}

// Generic modal info
const modalInfo = (message) => {
	const $modal = $old(
		`
		modal-wrapper
			modal[info]
				info $1
				button[close] Okay
			modal-bg[full-width]
		`,
		[message],
	)
	const modalCancel = () => {
		$modal.remove()
	}
	$modal.$("[close]").on("click", modalCancel)
	$modal.$("modal-bg").on("click", modalCancel)
	$old("modal-wrapper")?.remove()
	$old("body").appendChild($modal)
}

// Generic modal error
const modalError = (message) => {
	const $modal = $old(
		`
		modal-wrapper
			modal[error]
				error $1
				button[close] Okay
			modal-bg[full-width]
		`,
		[message],
	)
	const modalCancel = () => {
		$modal.remove()
	}
	$modal.$("[close]").on("click", modalCancel)
	$modal.$("modal-bg").on("click", modalCancel)
	$old("modal-wrapper")?.remove()
	$old("body").appendChild($modal)
}

// Generic alert sliding down from top
let alert_timeout = 0
const alertInfo = (message) => {
	const $alert = $old(
		`
			alert
				info $1
			`,
		[message],
	)
	clearTimeout(alert_timeout)
	if ($old("alert-wrapper")) {
		$alert.style.zIndex =
			(Number($old("alert-wrapper alert").length || 1) + 1) * -1
		$old("alert-wrapper").appendChild($alert)
	} else {
		$alert.style.zIndex = -1
		const $alert_wrapper = $old(
			`
			alert-wrapper
				$1
			`,
			[$alert],
		)
		$old("body").appendChild($alert_wrapper)
	}
	alert_timeout = setTimeout(() => {
		$old("alert-wrapper")?.remove()
	}, 5000)
}

// Generic alert error sliding down from top
const alertError = (message) => {
	const $alert = $old(
		`
			alert
				error $1
			`,
		[message],
	)
	clearTimeout(alert_timeout)
	if ($old("alert-wrapper")) {
		$alert.style.zIndex =
			(Number($old("alert-wrapper alert").length || 1) + 1) * -1
		$old("alert-wrapper").appendChild($alert)
	} else {
		$alert.style.zIndex = -1
		const $alert_wrapper = $old(
			`
			alert-wrapper
				$1
			`,
			[$alert],
		)
		$old("body").appendChild($alert_wrapper)
	}
	alert_timeout = setTimeout(() => {
		$old("alert-wrapper")?.remove()
	}, 5000)
}
