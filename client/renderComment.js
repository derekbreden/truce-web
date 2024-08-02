const renderComment = (comment) => {
  const note = comment.note || "";
  const note_title = note.slice(0, note.indexOf(" ")).replace(/[^a-z\-]/gi, "");
  const note_body = note.slice(note.indexOf(" ") + 1);

  let $comment_body = markdownToElements(comment.body);
  let characters_used = 0;
  let trimmed = false;
  if (state.path === "/recent" || state.path === "/favorites") {
    let added = 0;
    $comment_body = $comment_body.reduce((acc, child) => {
      characters_used += child.textContent.length;
      if (characters_used < 500 || !added) {
        acc.push(child);
        added++;
      } else {
        trimmed = true;
      }
      return acc;
    }, []);
    if (trimmed) {
      $comment_body.push(
        $(
          `
          p ...
          `,
        ),
      );
    }
  }

  let $comment = $(
    `
    comment
      h3
        b $1
        $2
      $3
      $4
      $5
    `,
    [
      renderName(comment.display_name, comment.display_name_index) + ":",
      $(
        `
        icon[more]
          $1
        `,
        [$("icons icon[more] svg").cloneNode(true)],
      ),
      $comment_body,
      comment.note
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
      $(
        `
        reply-wrapper
          detail[favorites]
            icon
              $1
            p $2
          detail[more]
            p Read more
            icon
              $3
          button[small][reply] Reply
        `,
        [
          comment.favorited
            ? $("icons icon[favorited] svg").cloneNode(true)
            : $("footer icon[favorites] svg").cloneNode(true),
          comment.favorite_count +
            (comment.favorite_count === "1" ? " favorite" : " favorites"),
          $("icons icon[forward] svg").cloneNode(true),
        ],
      ),
    ],
  );
  if (!trimmed) {
    $comment.$("detail[more]")?.remove();
  }
  $comment.$("detail[favorites]").on("click", ($event) => {
    $event.stopPropagation();
    toggleFavorite(comment);
  });
  $comment.$("[reply]").on("click", () => {
    $comment.$(":scope > reply-wrapper").style.display = "none";
    $comment
      .$(":scope > reply-wrapper")
      .after(showAddNewComment(null, comment));
    focusAddNewComment();
  });
  $comment.$("icon[more]").on("click", ($event) => {
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
            p Flag comment
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
    if (comment.edit) {
      $more_modal.$("action[edit]").on("click", ($event) => {
        $event.preventDefault();
        moreModalCancel();
        $comment.replaceWith(showAddNewComment(comment));
        focusAddNewComment();
      });
      $more_modal.$("action[block]").remove();
      if (state.path === "/favorites" || state.path === "/recent") {
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
            [$("icons icon[block] svg").cloneNode(true)],
          ),
          () => {
            markBlocked(comment);
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
            span Flag comment - are you sure?
          p This will hide this comment for everyone.
          p You are giving the person you are censoring martyrdom.
          p This may have the opposite of the intended result.
          `,
          [$("icons icon[flag] svg").cloneNode(true)],
        ),
        () => {
          markFlagged(comment);
        },
      );
    });
    $("modal-wrapper")?.remove();
    $("body").appendChild($more_modal);
  });
  if (comment.image_uuids) {
    const image_uuids = comment.image_uuids.split(",").reverse();
    for (const image_uuid of image_uuids) {
      const $image = $(
        `
        p[img]
          img[src=$1]
        `,
        ["/image/" + image_uuid],
      );
      $image.$("img").on("click", ($event) => {
        $event.stopPropagation();
        const $modal = $(
          `
          modal[image]
            p[img]
              img[src=$1]
            button[close] Done
          modal-bg
          `,
          ["/image/" + image_uuid],
        );
        const modalCancel = () => {
          $modal.remove();
        };
        $modal.$("[close]").on("click", modalCancel);
        $modal.$("modal-bg").on("click", modalCancel);
        $("body").appendChild($modal);
      });
      $comment.$("h3").after($image);
    }
  }
  comment.$comment = $comment;
  return $comment;
};
