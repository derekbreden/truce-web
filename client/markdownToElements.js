const markdownToElements = (text) => {
	const p_contents = text.split("\n\n")

	return p_contents.map((p_content) => {
		p_content = p_content.trim()
		const p_element = document.createElement("p")

		if (p_content.includes("http")) {
			const autoLinkRegex = /(?<!]\()http[^\s]*/g
			const matches = p_content.match(autoLinkRegex)
			if (matches) {
				for (let match of matches) {
					if (match.endsWith(".")) {
						match = match.slice(0, -1)
					}
					let abbreviated = match.replace(/(https?:\/\/)(www\.)?/, "")
					if (abbreviated.length > 32) {
						const extension = abbreviated.split(".").pop()
						if (extension.length < 5) {
							abbreviated = abbreviated.slice(0, 27) + "..." + extension
						} else {
							abbreviated = abbreviated.slice(0, 30) + "..."
						}
					}
					p_content = p_content.replace(match, `[${abbreviated}](${match})`)
				}
			}
		}

		if (p_content.startsWith("> ")) {
			p_element.setAttribute("quote", "")
			p_content = p_content.replace(/> /g, "")
		}

		if (p_content.startsWith("# ") || p_content.startsWith("##")) {
			p_element.setAttribute("bold", "")
			p_content = p_content.replace(/#{1,} /g, "").replace(/\*{2,}/g, "")
		}

		if (p_content.startsWith("**")) {
			p_element.setAttribute("bold", "")
			p_content = p_content.replace(/\*{2,}/g, "")
		}

		if (p_content.startsWith("*")) {
			p_element.setAttribute("italic", "")
			p_content = p_content.replace(/\*{1,}/g, "")
		}

		if (p_content === "---") {
			p_element.setAttribute("hr", "")
			p_content = ""
		}

		if (p_content.startsWith("- ")) {
			const li_contents = p_content.split("\n")
			if (
				li_contents.length > 1
				|| (li_contents.length === 1 && li_contents[0].startsWith("- "))
			) {
				const $ul = document.createElement("ul")
				li_contents.forEach((li_content) => {
					li_content = li_content.trim()
					$ul.appendChild(
						$old(
							`
							li $1
							`,
							[li_content.replace(/^- /g, "").replace(/\*\*/g, "")],
						),
					)
				})
				return $ul
			}
		}

		if (/^\d+\. /.test(p_content)) {
			const li_contents = p_content.split("\n")
			if (li_contents.length > 0) {
				const $ol = document.createElement("ol")
				li_contents.forEach((li_content) => {
					$ol.appendChild(
						$old(
							`
							li $1
							`,
							[li_content.replace(/^\d+\. /g, "").replace(/\*\*/g, "")],
						),
					)
				})
				return $ol
			}
		}

		if (p_content.startsWith("/mp3/")) {
			return $old(
				`
				audio[controls][src=$1]
				`,
				[p_content],
			)
		}

		let inserts = []
		const original = p_content
		let placeholders = p_content

		const parseElements = (regex, createElement, placeholder_char) => {
			let current_search_offset = 0
			while (current_search_offset < placeholders.length) {
				const search_space = placeholders.slice(current_search_offset)
				const match_result = search_space.match(regex)
				if (!match_result) break

				const matched_text = match_result[0]
				const absolute_match_start =
					current_search_offset + search_space.indexOf(matched_text)
				const absolute_match_end = absolute_match_start + matched_text.length

				const element = createElement(match_result, original)
				inserts.push([absolute_match_start, absolute_match_end, element])

				placeholders = placeholders.slice(0, absolute_match_start) + placeholder_char.repeat(matched_text.length) + placeholders.slice(absolute_match_end)
				current_search_offset = absolute_match_start + matched_text.length
			}
		}

		const imgRegex = /!\[([^\]]*)\]\(((?:[^\(\)]|\([^\)]*\))*)\)/
		parseElements(imgRegex, (match_result) => {
			const alt_text = match_result[1]
			const src_text = match_result[2]
			return $old(
				`
				img[alt=$1][src=$2]
				`,
				[alt_text, src_text],
			)
		}, "X")

		const linkRegex = /\[([^\]]*)\]\(((?:[^\(\)]|\([^\)]*\))*)\)/
		parseElements(linkRegex, (match_result, original) => {
			const link_text = match_result[1]
			const href_text = match_result[2]
			const big = match_result[0] === original
			return $old(
				`
				a[href=$1][big=$2] $3
				`,
				[href_text, big, link_text],
			)
		}, "Y")

		inserts.sort((a, b) => a[0] - b[0])

		let current_offset_in_original = 0
		inserts.forEach((insert) => {
			const text_before_insert = original.slice(current_offset_in_original, insert[0])
			if (text_before_insert.length > 0) {
				p_element.appendChild(
					$old(
						`
					span $1
					`,
						[text_before_insert],
					),
				)
			}
			p_element.appendChild(insert[2])
			current_offset_in_original = insert[1]
		})

		const remaining_text = original.slice(current_offset_in_original)
		if (remaining_text.length > 0) {
			p_element.appendChild(
				$old(
					`
				span $1
				`,
					[remaining_text],
				),
			)
		}

		return p_element
	})
}
