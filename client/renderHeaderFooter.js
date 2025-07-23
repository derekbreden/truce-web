const renderHeader = () => {
	const $header = _(
		`
		header[full-width]
			h1[ellipsis] Truce.
			icon[logo]
			hamburger[unread=$1]
				icon[hamburger]
		`,
		[
			() => {
				return Boolean(_.unread_count)
			}
		]
	)
	
	$header.on("click", () => {
		goToPath(state.path)
	})
	
	const $hamburger = $header.$("hamburger")
	$hamburger.on("click", ($event) => {
		$event.stopPropagation()
		if ($old("menu-wrapper")) {
			$old("menu-wrapper").remove()
		} else {  
			showMenu()
		}
	})
	
	return $header
}

const renderFooter = () => {
	// Use same path_sequence logic as path.js
	const path_sequence = [
		"/",
		"/privacy", 
		"/posts",
		"/posts/all", 
		"/topics",
		"/conversations",
		"/messages",
		"/notifications",
		"/settings",
		"/favorites"
	]
	
	const $footer = _(
		`
		footer[full-width]
			a[href=/posts]
				icon[posts]
				p Posts
			a[href=/topics]
				icon[topic]  
				p Topics
			a[href=/conversations][unread=$1]
				icon[mail]
				p Messages
			a[href=/notifications][notifications][unread=$2]
				icon[notifications]
				p Alerts
			dot[index=$3]
		`,
		[
			() => Boolean(state.unread_messages_count),
			() => Boolean(_.unread_count),
			() => {
				let new_path_parsed = state.path
				if (state.path.startsWith("/topic/")) {
					new_path_parsed = "/topics"
				}
				return Math.max(path_sequence.indexOf(new_path_parsed) - 1, 0)
			}
		]
	)
	
	return $footer
}

$("body").appendChild(
	_(
		`
			$1
			$2
		`,
		[
			renderHeader,
			renderFooter
		]
	)
)