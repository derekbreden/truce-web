const renderComment = (comment) => {
  const note = comment.note || "";
  const note_title = note.slice(0, note.indexOf(" ")).replace(/[^a-z\-]/gi, "");
  const note_body = note.slice(note.indexOf(" ") + 1);

  let $comment_body = markdownToElements(comment.body);
  let characters_used = 0;
  let trimmed = false;
  if (state.path === "/favorites") {
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
        author[slug=$1]
          profile-picture
            image
              $2
          span $3
          $4
        $5
      $6
      $7
      $8
    `,
    [
      comment.user_slug,
      comment.profile_picture_uuid
        ? $(
            `
            img[src=$1]
            `,
            ["/image/" + comment.profile_picture_uuid],
          )
        : $("icons icon[profile-picture] svg").cloneNode(true),
      renderName(comment.display_name, comment.display_name_index),
      comment.user_verified
        ? $(
            `
            icon
              $1
            `,
            [$("icons icon[verified] svg").cloneNode(true)],
          )
        : [],
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
        reply-wrapper[detail-wrapper]
          detail[favorites][favorited=$1]
            icon
              $2
            p $3
          detail[more]
            icon
              $4
          button[small][reply] Reply
        `,
        [
          comment.favorited,
          comment.favorited
            ? $("icons icon[favorited] svg").cloneNode(true)
            : $("footer icon[favorites] svg").cloneNode(true),
          comment.favorite_count,
          $("icons icon[forward] svg").cloneNode(true),
        ],
      ),
    ],
  );
  if (!trimmed) {
    $comment.$("detail[more]")?.remove();
  }
  if (state.path === "/favorites") {
    $comment.setAttribute("trimmed", "");
  }
  $comment.$("author").forEach(($author) => {
    $author.on("click", ($event) => {
      $event.stopPropagation();
      const slug = $author.getAttribute("slug");
      goToPath(`/user/${slug}`);
    });
  });
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
      if (state.path === "/favorites") {
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
          p This action cannot be undone.
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
      bindImageClick($image, image_uuid);
      $comment.$("h3").after($image);
    }
  }
  comment.$comment = $comment;
  return $comment;
};
