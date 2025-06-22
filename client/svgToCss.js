const css_rules = []
$("icons icon").forEach(($icon) => {
	const icon_name = $icon.getAttributeNames()
	const svg = $icon.$("svg")
	const svg_content = svg.outerHTML
	const svg_base64 = btoa(svg_content)
	const css_rule = `
		icon[${icon_name}] {
			mask: url("data:image/svg+xml;base64,${svg_base64}");
			mask-size: cover;
			mask-position: center;
		}
	`
	css_rules.push(css_rule)
	$icon.setAttribute("excluded", "")
})
const $style = $(`
	style`)
$style.appendChild(document.createTextNode(css_rules.join("\n")))
document.head.appendChild($style)