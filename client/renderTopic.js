const renderTopic = (topic) => {
  const note = topic.note || "";
  const note_title = note.slice(0, note.indexOf(" ")).replace(/[^a-z\-]/gi, "");
  const note_body = note.slice(note.indexOf(" ") + 1);
  let $topic_body = markdownToElements(topic.body);
  let characters_used = 0;
  let trimmed = false;
  if (
    state.path === "/topics" ||
    state.path === "/recent" ||
    state.path === "/favorites"
  ) {
    trimmed = true;
    topic.edit = false;
    $topic_body = $topic_body.reduce((acc, child) => {
      characters_used += child.textContent.length;
      if (characters_used < 500) {
        acc.push(child);
      }
      return acc;
    }, []);
  }
  const $topic = $(
    `
    topic
      h2
        $1
        $2
      $3
      $4
      $5
    `,
    [
      topic.title,
      topic.edit
        ? $(
            `
            button[edit][small][alt][faint] Edit
            `,
            [],
          )
        : [],
      topic.note
        ? $(
            `
            info-wrapper
              info[show]
                b $1
                span $2
            `,
            [note_title, note_body],
          )
        : [],
      $topic_body,
      $(
        `
        topic-details
          detail[favorites]
            icon
              $1
            p $2
          detail[comments]
            icon
              $3
            p $4
          detail[more]
            p Read more
            icon
              $5
        `,
        [
          topic.favorited
            ? $("icons icon[favorited] svg").cloneNode(true)
            : $("footer icon[favorites] svg").cloneNode(true),
          topic.favorite_count +
            (topic.favorite_count === "1" ? " favorite" : " favorites"),
          topic.commented
            ? $("icons icon[commented] svg").cloneNode(true)
            : $("footer icon[recent] svg").cloneNode(true),
          topic.comment_count +
            (topic.comment_count === "1" ? " comment" : " comments"),
          $("icons icon[forward] svg").cloneNode(true)
        ],
      ),
    ],
  );
  if (topic.edit) {
    $topic.$("[edit]").on("click", ($event) => {
      $event.preventDefault();
      $topic.replaceWith(showAddNewTopic(topic));
      focusAddNewTopic();
    });
  }
  if (topic.image_uuids) {
    const image_uuids = topic.image_uuids.split(",").reverse();
    for (const image_uuid of image_uuids) {
      const $image = $(
        `
        p[img]
          img[src=$1]
        `,
        ["/image/" + image_uuid],
      );
      $topic.$("h2").after($image);
    }
  }
  if (
    state.path === "/topics" ||
    state.path === "/recent" ||
    state.path === "/favorites"
  ) {
    $topic.setAttribute("trimmed", "");
    $topic.on("click", ($event) => {
      $event.preventDefault();
      goToPath("/topic/" + topic.slug);
    });
  }
  topic.$topic = $topic;
  return $topic;
};
