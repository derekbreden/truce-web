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
      $(
        `
        icon[more]
          $1
        `,
        [$("icons icon[more] svg").cloneNode(true)],
      ),
      topic.note
        ? $(
            `
            info-wrapper
              info
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
          $("icons icon[forward] svg").cloneNode(true),
        ],
      ),
    ],
  );
  $topic.$("detail[favorites]").on("click", ($event) => {
    $event.stopPropagation();
    toggleFavorite(topic);
  });
  $topic.$("icon[more]").on("click", ($event) => {
    $event.preventDefault();
    $event.stopPropagation();
    const $more_modal = $(
      `
      modal-wrapper
        modal[info]
          action[edit]
            icon[edit]
              $1
            p Edit
          action[flag]
            icon[flag]
              $2
            p Flag topic
          action[block]
            icon[block]
              $3
            p Block user
          button-wrapper
            button[alt][cancel] Cancel
          p[notice]
            span Email us at
            a[href="mailto:derek@truce.net"] derek@truce.net
            span to provide feedback or report inappropriate activity.
        modal-bg
      `,
      [
        $("icons icon[edit] svg").cloneNode(true),
        $("icons icon[flag] svg").cloneNode(true),
        $("icons icon[block] svg").cloneNode(true),
      ],
    );
    const moreModalCancel = () => {
      $more_modal.remove();
    };
    $more_modal.$("[cancel]").on("click", moreModalCancel);
    $more_modal.$("modal-bg").on("click", moreModalCancel);
    if (topic.edit) {
      $more_modal.$("action[edit]").on("click", ($event) => {
        $event.preventDefault();
        moreModalCancel();
        $topic.replaceWith(showAddNewTopic(topic));
        focusAddNewTopic();
      });
      $more_modal.$("action[block]").remove();
      if (
        state.path === "/topics" ||
        state.path === "/favorites" ||
        state.path === "/recent"
      ) {
        $more_modal.$("action[edit]").remove();
      }
    } else {
      $more_modal.$("action[edit]").remove();
      $more_modal.$("action[block]").on("click", ($event) => {
        $event.preventDefault();
        moreModalCancel();
        modalConfirm(
          $(
            `
            h2
              icon[block]
                $1
              span Block user - are you sure?
            p This will hide all content from this user for you, but it will not silence them on this app, effectively creating an information bubble.
            p This app will lose the balancing effect of your voice being able to respond to them.
            `,
            [ $("icons icon[block] svg").cloneNode(true) ]
          ),
          () => {
            markBlocked(topic);
          },
        );
      });
    }
    $more_modal.$("action[flag]").on("click", ($event) => {
      $event.preventDefault();
      moreModalCancel();
      modalConfirm(
        $(
          `
          h2
            icon
              $1
            span Flag topic - are you sure?
          p This will hide this topic for everyone.
          p You are giving the person you are censoring martyrdom.
          p This may have the opposite of the intended result.
          `,
          [ $("icons icon[flag] svg").cloneNode(true) ]
        ),
        () => {
          markFlagged(topic);
        },
      );
    });
    $("modal-wrapper")?.remove();
    $("body").appendChild($more_modal);
  });
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
