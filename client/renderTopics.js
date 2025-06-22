const renderTopics = (topics) => {
	if (state.path !== "/topics") {
		return
	}
	$("main-content-wrapper[active] main-content").replaceChildren(
		$(
			`
			posts
				post[line-after]
					h2[topics]
						span Topics
						$1
					p Tap on a topic to see posts related to the topic.
				topics[topics-list]
			`,
			[$("footer icon[topic] svg").cloneNode(true)],
		),
	)
	$("main-content-wrapper[active] main-content topics").replaceChildren(
		...topics.map((topic) =>
			$(
				`
				topic[topic=$1]
					icon
						$2
					topicname-subtitle
						topicname
							name $3
							count $4
						subtitle $5
				`,
				[
					topic.topic_name,
					$(`icons icon[${topic.topic_name}] svg`).cloneNode(true),
					topic.topic_name[0].toUpperCase() + topic.topic_name.slice(1),
					topic.posts,
					topic.subtitle,
				],
			),
		),
	)
	$("main-content topic").forEach(($topic) => {
		$topic.on("click", () => {
			goToPath("/topic/" + $topic.getAttribute("topic"))
		})
	})
}
