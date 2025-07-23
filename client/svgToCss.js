const css_rules = []
$old("icons icon").forEach(($icon) => {
	const icon_name = $icon.getAttributeNames()
	const svg = $icon.$("svg")
	const svg_content = svg.outerHTML
	const svg_base64 = btoa(svg_content)
	
	// Use background-image for multi-color icons, mask for single-color icons
	const use_background = icon_name.includes("logo") || icon_name.includes("hamburger")
	const css_rule = use_background ? `
		icon[${icon_name}] {
			background-image: url("data:image/svg+xml;base64,${svg_base64}");
			background-size: cover;
			background-position: center;
		}
	` : `
		icon[${icon_name}] {
			mask: url("data:image/svg+xml;base64,${svg_base64}");
			mask-size: cover;
			mask-position: center;
		}
	`
	css_rules.push(css_rule)
	$icon.setAttribute("excluded", "")
})
const $style = $old(`
	style`)
$style.appendChild(document.createTextNode(css_rules.join("\n")))
document.head.appendChild($style)