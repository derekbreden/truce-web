const renderTopics = (topics, tag) => {
  beforeDomUpdate();
  if (!$("main-content-wrapper[active] topics")) {
    const target =
      state.path === "/topics"
        ? "main-content-wrapper[active] main-content-2"
        : "main-content-wrapper[active] main-content";
    $(target).appendChild(
      $(
        `
        topics
        `,
      ),
    );
  }
  const $topics = topics
    .sort((a, b) => new Date(b.create_date) - new Date(a.create_date))
    .map(renderTopic);

  if (window.innerWidth > 1000 && state.path.substr(0, 5) === "/tag/") {
    const $topics_1 = $topics.filter((x, i) => i % 2 === 0);
    const $topics_2 = $topics.filter((x, i) => i % 2 === 1);
    $("main-content-wrapper[active] main-content topics")?.replaceChildren(
      ...$topics_1,
    );
    $("main-content-wrapper[active] main-content-2").replaceChildren(
      $(
        `
        topics
        `,
      ),
    );
    $("main-content-wrapper[active] main-content-2 topics").replaceChildren(
      ...$topics_2,
    );
  } else {
    $("main-content-wrapper[active] topics").replaceChildren(...$topics);
  }

  if (state.active_add_new_topic?.is_edit) {
    const topic = topics.find(
      (a) => a.topic_id === state.active_add_new_topic.is_edit,
    );
    topic.$topic.replaceWith(state.active_add_new_topic);
  }

  // Tag
  if (state.path.substr(0, 5) === "/tag/") {
    $("topic[tag]")?.remove();
    if (topics.length === 0) {
      $("main-content-wrapper[active] main-content topics").prepend(
        $(
          `
          topic[tag]
            h2[tags]
              span $1
              icon
                $2
            p $3
            p There are no topics in this tag yet, head on over to the topics page to add one!
          `,
          [
            tag.tag_name[0].toUpperCase() + tag.tag_name.slice(1),
            $(`icons icon[${tag.tag_name}] svg`).cloneNode(true),
            tag.subtitle,
          ],
        ),
      );
    } else {
      $("main-content-wrapper[active] main-content topics").prepend(
        $(
          `
          topic[tag]
            h2[tags]
              span $1
              icon
                $2
            p $3
          `,
          [
            tag.tag_name[0].toUpperCase() + tag.tag_name.slice(1),
            $(`icons icon[${tag.tag_name}] svg`).cloneNode(true),
            tag.subtitle,
          ],
        ),
      );
    }
  }

  afterDomUpdate();
  $("topics [href]")?.forEach(($a) => {
    const new_path = $a.getAttribute("href");
    if (new_path.substr(0, 1) === "/") {
      $a.on("click", ($event) => {
        $event.preventDefault();
        $event.stopPropagation();
        goToPath(new_path);
      });
    }
  });
};
