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
						icon[topic]
					p Tap on a topic to see posts related to the topic.
				topics[topics-list]
			`,
			[],
		),
	)
	$("main-content-wrapper[active] main-content topics").replaceChildren(
		...topics.map((topic) =>
			$(
				`
				topic[topic=$1]
					icon[$1]
					topicname-subtitle
						topicname
							name $2
							count $3
						subtitle $4
				`,
				[
					topic.topic_name,
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
