const renderShare = () => {
  if (state.path.substr(0, 7) === "/topic/") {
    const $share = $(
      `
      share-wrapper
        icon[share]
          $1
        p Share
        info[small] Link copied to clipboard!
      `,
      [
        $("icons icon[share] svg").cloneNode(true),
      ]
    );
    $("main-content-wrapper[active] back-forward-wrapper").$("share-wrapper")?.remove();
    $("main-content-wrapper[active] back-forward-wrapper").appendChild(
      $(
        `
        p
        `
      )
    );
    $("main-content-wrapper[active] back-forward-wrapper").appendChild($share);
    $share.on("click", () => {
      navigator.clipboard.writeText(window.location.href);
      $share.$("info").setAttribute("show", "");
      setTimeout(() => {
        $share?.$("info")?.removeAttribute("show");
      }, 4000);
    });
  }
};