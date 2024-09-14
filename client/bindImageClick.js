const bindImageClick = ($image, image_uuid) => {
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
    let last_distance = null;

    $modal.$("p[img]").on("touchstart", ($start) => {
      if ($start.touches.length >= 2) {
        $event.preventDefault();
      }
      last_distance = null;
    });
    $modal.$("p[img]").on("touchmove", ($move) => {
      if ($move.touches.length >= 2) {
        $move.preventDefault();
        const distance_x = Math.abs(
          $move.touches[0].clientX - $move.touches[1].clientX,
        );
        const distance_y = Math.abs(
          $move.touches[0].clientY - $move.touches[1].clientY,
        );
        const total_distance = distance_x + distance_y;
        if (last_distance !== null) {
          const moved_distance = total_distance - last_distance;
          const moved_distance_scaled =
            ((moved_distance * $modal.$("img").clientWidth) /
              $modal.$("img").clientHeight) *
            2;
          const new_size = $modal.$("img").clientWidth + moved_distance_scaled;
          const new_scroll_left =
            $modal.$("p[img]").scrollLeft + moved_distance_scaled / 2;
          if (new_size >= $modal.$("p[img]").clientWidth) {
            $modal.$("img").style.width = new_size + "px";
            $modal.$("p[img]").scrollLeft = new_scroll_left;
          }
        }
        last_distance = total_distance;
      }
    });
    const modalCancel = () => {
      $modal.remove();
    };
    $modal.$("[close]").on("click", modalCancel);
    $modal.$("modal-bg").on("click", modalCancel);
    $("body").appendChild($modal);
  });
};
