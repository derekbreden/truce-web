const renderComment = (comment) => {
  const note = comment.note || "";
  const note_title = note.slice(0, note.indexOf(" ")).replace(/[^a-z\-]/ig, "");
  const note_body = note.slice(note.indexOf(" ") + 1);
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
      comment.edit
        ? $(
            `
            button[edit][small][alt][faint] Edit
            `,
            [],
          )
        : [],
      markdownToElements(comment.body),
      comment.note
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
      $(
        `
        reply-wrapper
          button[small][reply] Reply
        `,
      ),
    ],
  );
  $comment.$("[reply]").on("click", () => {
    $comment.$(":scope > reply-wrapper").style.display = "none";
    $comment
      .$(":scope > reply-wrapper")
      .after(showAddNewComment(null, comment));
    focusAddNewComment();
  });
  $comment.$("[edit]")?.on("click", () => {
    $comment.replaceWith(showAddNewComment(comment));
    focusAddNewComment();
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
