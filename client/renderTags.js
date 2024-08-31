const renderTags = (tags) => {
  if (state.path !== "/tags") {
    return;
  }
  $("main-content-wrapper[active] main-content").replaceChildren(
    $(
      `
      topics
        topic
          h2[tags]
            span Tags
            $1
          p Tap on a tag to see topics related to the tag.
        tags[tags-list]
      `,
      [$("footer icon[tag] svg").cloneNode(true)],
    ),
  );
  $("main-content-wrapper[active] main-content tags").replaceChildren(
    ...tags.map((tag) =>
      $(
        `
        tag[tag=$1]
          icon
            $2
          tagname-subtitle
            tagname $3
            subtitle $4
        `,
        [
          tag.tag_name,
          $(`icons icon[${tag.tag_name}] svg`).cloneNode(true),
          tag.tag_name[0].toUpperCase() + tag.tag_name.slice(1),
          tag.subtitle,
        ],
      ),
    ),
  );
  $("main-content tag").forEach(($tag) => {
    $tag.on("click", () => {
      goToPath("/tag/" + $tag.getAttribute("tag"));
    });
  });
};
