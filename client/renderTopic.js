const renderTopic = (topic) => {
  const note = topic.note || "";
  const note_title = note.slice(0, note.indexOf(" ")).replace(/[^a-z\-]/gi, "");
  const note_body = note.slice(note.indexOf(" ") + 1);
  let $topic_body = markdownToElements(topic.body);
  let characters_used = 0;
  let trimmed = false;
  if (
    state.path === "/topics" ||
    state.path === "/topics/all" ||
    state.path === "/favorites" ||
    state.path.substr(0, 5) === "/tag/" ||
    state.path.substr(0, 6) === "/user/"
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
      $6
      $7
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
      $(
        `
        author-tags
          author[slug=$1]
            profile-picture
              image
                $2
            by by
            name
              span $3
              $4
          tags
            $5
        `,
        [
          topic.user_slug,
          topic.profile_picture_uuid
            ? $(
                `
                img[src=$1]
                `,
                ["/image/" + topic.profile_picture_uuid],
              )
            : $("icons icon[profile-picture] svg").cloneNode(true),
          renderName(topic.display_name, topic.display_name_index),
          topic.user_verified
            ? $(
                `
                icon
                  $1
                `,
                [$("icons icon[verified] svg").cloneNode(true)],
              )
            : [],
          topic.tags
            .split(",")
            .filter((x) => x)
            .map((tag) =>
              $(
                `
                tag[tag=$1]
                  icon
                    $2
                  span $3
                `,
                [
                  tag,
                  $(`icons icon[${tag}] svg`).cloneNode(true),
                  tag[0].toUpperCase() + tag.slice(1),
                ],
              ),
            ),
        ],
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
      topic.poll_1
        ? $(
            `
          poll-wrapper
            poll-vote-wrapper
              poll-1 $1
              poll-2 $2
              poll-3 $3
              poll-4 $4
            p[results][actual] Actual results:
            poll-counts-actual
              poll-1
                text
                  bg
                  $1
                percent
              poll-2
                text
                  bg
                  $2
                percent
              poll-3
                text
                  bg
                  $3
                percent
              poll-4
                text
                  bg
                  $4
                percent
            p[results] Estimated results:
            poll-counts-estimated
              poll-1
                text
                  bg
                  $1
                percent
              poll-2
                text
                  bg
                  $2
                percent
              poll-3
                text
                  bg
                  $3
                percent
              poll-4
                text
                  bg
                  $4
                percent
          `,
            [topic.poll_1, topic.poll_2, topic.poll_3, topic.poll_4],
          )
        : [],
      $(
        `
        topic-details[detail-wrapper]
          detail[favorites][favorited=$1]
            icon
              $2
            p $3
          detail[comments]
            icon
              $4
            p $5
          detail[more]
            icon
              $6
        `,
        [
          topic.favorited,
          topic.favorited
            ? $("icons icon[favorited] svg").cloneNode(true)
            : $("footer icon[favorites] svg").cloneNode(true),
          topic.favorite_count,
          topic.commented
            ? $("icons icon[commented] svg").cloneNode(true)
            : $("icons icon[comment] svg").cloneNode(true),
          topic.comment_count,
          $("icons icon[forward] svg").cloneNode(true),
        ],
      ),
    ],
  );
  $topic.$("author").forEach(($author) => {
    $author.on("click", ($event) => {
      $event.stopPropagation();
      const slug = $author.getAttribute("slug");
      goToPath(`/user/${slug}`);
    });
  });
  $topic.$("tag").forEach(($tag) => {
    $tag.on("click", ($event) => {
      $event.stopPropagation();
      goToPath("/tag/" + $tag.getAttribute("tag"));
    });
  });
  if (topic.poll_1) {
    const counts_actual = topic.poll_counts.split(",");
    const votes_1 = Number(counts_actual[0] || 0);
    const votes_2 = Number(counts_actual[1] || 0);
    const votes_3 = Number(counts_actual[2] || 0);
    const votes_4 = Number(counts_actual[3] || 0);
    const votes_sum = votes_1 + votes_2 + votes_3 + votes_4;
    $topic.$("p[results][actual]").innerText =
      `Actual results: (${votes_sum} ${votes_sum === 1 ? `vote` : `votes`})`;
    const percent_1 = Math.round((votes_1 / votes_sum) * 100) || 0;
    const percent_2 = Math.round((votes_2 / votes_sum) * 100) || 0;
    const percent_3 = Math.round((votes_3 / votes_sum) * 100) || 0;
    const percent_4 = Math.round((votes_4 / votes_sum) * 100) || 0;
    $topic.$("poll-counts-actual poll-1 percent").innerText = percent_1 + "%";
    $topic.$("poll-counts-actual poll-1 bg").style.width = percent_1 + "%";
    $topic.$("poll-counts-actual poll-2 percent").innerText = percent_2 + "%";
    $topic.$("poll-counts-actual poll-2 bg").style.width = percent_2 + "%";
    $topic.$("poll-counts-actual poll-3 percent").innerText = percent_3 + "%";
    $topic.$("poll-counts-actual poll-3 bg").style.width = percent_3 + "%";
    $topic.$("poll-counts-actual poll-4 percent").innerText = percent_4 + "%";
    $topic.$("poll-counts-actual poll-4 bg").style.width = percent_4 + "%";
    const counts_estimated = topic.poll_counts_estimated.split(",");
    const est_votes_1 = Number(counts_estimated[0] || 0);
    const est_votes_2 = Number(counts_estimated[1] || 0);
    const est_votes_3 = Number(counts_estimated[2] || 0);
    const est_votes_4 = Number(counts_estimated[3] || 0);
    const est_votes_sum = est_votes_1 + est_votes_2 + est_votes_3 + est_votes_4;
    const est_percent_1 = Math.round((est_votes_1 / est_votes_sum) * 100);
    const est_percent_2 = Math.round((est_votes_2 / est_votes_sum) * 100);
    const est_percent_3 = Math.round((est_votes_3 / est_votes_sum) * 100);
    const est_percent_4 = Math.round((est_votes_4 / est_votes_sum) * 100);
    $topic.$("poll-counts-estimated poll-1 percent").innerText =
      est_percent_1 + "%";
    $topic.$("poll-counts-estimated poll-1 bg").style.width =
      est_percent_1 + "%";
    $topic.$("poll-counts-estimated poll-2 percent").innerText =
      est_percent_2 + "%";
    $topic.$("poll-counts-estimated poll-2 bg").style.width =
      est_percent_2 + "%";
    $topic.$("poll-counts-estimated poll-3 percent").innerText =
      est_percent_3 + "%";
    $topic.$("poll-counts-estimated poll-3 bg").style.width =
      est_percent_3 + "%";
    $topic.$("poll-counts-estimated poll-4 percent").innerText =
      est_percent_4 + "%";
    $topic.$("poll-counts-estimated poll-4 bg").style.width =
      est_percent_4 + "%";
    const savePollChoice = (poll_choice) => {
      $topic.$("poll-vote-wrapper").replaceWith(
        $(
          `
          p
            info[small] Loading results...
          `,
        ),
      );
      fetch("/session", {
        method: "POST",
        body: JSON.stringify({
          topic_id: topic.topic_id,
          poll_choice,
        }),
      })
        .then((response) => response.json())
        .then(function (data) {
          if (data.error || !data.success) {
            alertError("Server error saving choice");
          } else {
            topic.voted = true;
            alertInfo("Poll choice saved");
          }
          getMoreRecent();
        })
        .catch(function (error) {
          console.error(error);
          alertError("Network error saving choice");
          getMoreRecent();
        });
    };
    $topic.$("poll-vote-wrapper poll-1").on("click", ($event) => {
      $event.stopPropagation();
      savePollChoice(1);
    });
    $topic.$("poll-vote-wrapper poll-2").on("click", ($event) => {
      $event.stopPropagation();
      savePollChoice(2);
    });
    $topic.$("poll-vote-wrapper poll-3").on("click", ($event) => {
      $event.stopPropagation();
      savePollChoice(3);
    });
    $topic.$("poll-vote-wrapper poll-4").on("click", ($event) => {
      $event.stopPropagation();
      savePollChoice(4);
    });
    if (topic.edit || topic.voted) {
      $topic.$("poll-vote-wrapper").remove();
    } else {
      $topic.$("poll-counts-actual").remove();
      $topic.$("[results][actual]").remove();
    }
    if (!topic.poll_3) {
      $topic.$("poll-vote-wrapper poll-3")?.remove();
      $topic.$("poll-counts-estimated poll-3")?.remove();
      $topic.$("poll-counts-actual poll-3")?.remove();
    }
    if (!topic.poll_4) {
      $topic.$("poll-vote-wrapper poll-4")?.remove();
      $topic.$("poll-counts-estimated poll-4")?.remove();
      $topic.$("poll-counts-actual poll-4")?.remove();
    }
  }
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
          action[share]
            icon[share]
              $2
            p Share Topic
          action[flag]
            icon[flag]
              $3
            p Flag topic
          action[block]
            icon[block]
              $4
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
        $("icons icon[share] svg").cloneNode(true),
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
        state.path === "/topics/all" ||
        state.path === "/favorites" ||
        state.path.substr(0, 5) === "/tag/" ||
        state.path.substr(0, 6) === "/user/"
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
            p This will hide all content from this user.
            p This action cannot be undone.
            `,
            [$("icons icon[block] svg").cloneNode(true)],
          ),
          () => {
            markBlocked(topic);
          },
        );
      });
    }
    $more_modal.$("action[share]").on("click", ($event) => {
      $event.preventDefault();
      moreModalCancel();
      if (
        window.webkit &&
        window.webkit.messageHandlers &&
        window.webkit.messageHandlers["share-link"]
      ) {
        window.webkit.messageHandlers["share-link"].postMessage(
          JSON.stringify({
            url: window.location.href,
            text: state.cache[state.path].topics[0].title,
          }),
        );
      } else {
        navigator.clipboard.writeText(window.location.href);
      }
      alertInfo("Link copied to clipboard");
    });
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
          p This action cannot be undone.
          `,
          [$("icons icon[flag] svg").cloneNode(true)],
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
        p[img][total-images=$1]
          img[src=$2]
        `,
        [image_uuids.length, "/image/" + image_uuid],
      );
      bindImageClick($image, image_uuid);
      $topic.$("author-tags").after($image);
    }
  }
  if (
    state.path === "/topics" ||
    state.path === "/topics/all" ||
    state.path === "/favorites" ||
    state.path.substr(0, 5) === "/tag/" ||
    state.path.substr(0, 6) === "/user/"
  ) {
    $topic.setAttribute("trimmed", "");
    $topic.on("click", ($event) => {
      if ($event.target.tagName !== "A") {
        $event.preventDefault();
        goToPath("/topic/" + topic.slug);
      }
    });
  }
  topic.$topic = $topic;
  return $topic;
};
