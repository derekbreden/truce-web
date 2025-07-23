// Reactive header and footer rendering  
// Replaces static HTML with function-as-placeholder reactive architecture

// Initialize reactive header/footer (creates new elements since static ones removed)
const initializeReactiveApp = () => {
	// Create reactive header and footer and add to body
	const $reactive_header = renderHeader()
	const $reactive_footer = renderFooter()
	
	$old("body").prepend($reactive_header)
	$old("body").appendChild($reactive_footer)
	
	// Bind events to the reactive elements immediately after creation
	bindReactiveEvents($reactive_header, $reactive_footer)
}

const renderHeader = () => {
	return _(
		`
		header[full-width]
			h1[ellipsis] Truce.
			icon[logo]
			hamburger[unread=$1]
				icon[hamburger]
		`,
		[
			() => Boolean(_.unread_count)
		]
	)
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
				// Same logic as path.js:68-69
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

// Bind events to reactive header/footer elements (replaces imperative binding from menu.js)
const bindReactiveEvents = ($header, $footer) => {
	// Header click handler (from menu.js:223-229)
	$header.on("click", () => {
		goToPath(state.path)
	})
	
	// Hamburger click handler (from menu.js:231-247)
	const $hamburger = $header.$("hamburger")
	if ($hamburger) {
		$hamburger.on("click", ($event) => {
			$event.stopPropagation()
			if ($old("menu-wrapper")) {
				$old("menu-wrapper").remove()
			} else {  
				showMenu()
			}
		})
	}
}