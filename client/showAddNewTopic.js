const showAddNewTopic = (topic) => {
  const $add_new = $(
    `
    add-new[topic]
      title-wrapper
        input[title][placeholder=Title][maxlength=140][value=$1]
        label[img-icon]
          input[img][type=file][multiple][accept=image/*]
      textarea[body][placeholder=Content][rows=10][maxlength=8000] $2
      button[submit] $3
      button[alt][cancel] Cancel
    `,
    topic
      ? [topic.title, topic.body, "Save changes"]
      : ["", "", "Add topic"],
  );

  const addTopicError = (error) => {
    $add_new.appendChild(
      $(
        `
        error
          $1
        `,
        [error],
      ),
    );
  };

  const pngs = [];

  if (topic?.image_uuids) {
    const image_uuids = topic.image_uuids.split(",");
    for (const image_uuid of image_uuids) {
      imageToPng("/image/" + image_uuid, (png) => {
        pngs.push(png);
        previewPngs();
      });
    }
  }

  $add_new.$("[img]").on("change", () => {
    Array.from($add_new.$("[img]").files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = ($event) => {
        imageToPng($event.target.result, (png) => {
          pngs.push(png);
          if (pngs.length > 4) {
            pngs.splice(4, pngs.length - 4);
            if (!$("modal[error]")) {
              modalError("Each topic is limited to 4 images");
            }
          }
          previewPngs();
        });
      };
      reader.readAsDataURL(file);
    });
  });

  const previewPngs = () => {
    $add_new.$("image-previews")?.remove();
    $add_new.$("title-wrapper").after(document.createElement("image-previews"));
    pngs.forEach((png, i) => {
      const $preview = $(
        `
        preview
          remove-icon
          img[src=$1]
        `,
        [png.url],
      );
      $preview.$("remove-icon").on("click", () => {
        pngs.splice(i, 1);
        previewPngs();
      });
      $add_new.$("image-previews").appendChild($preview);
    });
  };

  $add_new.$("[title]").on("focus", () => {
    $add_new.$("error")?.remove();
  });
  $add_new.$("[body]").on("focus", () => {
    $add_new.$("error")?.remove();
  });
  if (topic) {
    $add_new.$("[cancel]").on("click", () => {
      $add_new.replaceWith(topic.$topic);
      delete state.active_add_new_topic;
    });
  } else {
    $add_new.$("[cancel]").remove();
  }
  $add_new.$("[submit]").on("click", () => {
    $add_new.$("error")?.remove();
    const title = $add_new.$("[title]").value;
    const body = $add_new.$("[body]").value;
    if (!title) {
      addTopicError("Please enter a title");
      return;
    }
    if (!body) {
      addTopicError("Please enter some content");
      return;
    }
    if (title.length >= body.length) {
      addTopicError("The content must be longer than the title");
      return;
    }
    $add_new.appendChild(
      $(
        `
          info Validating...
        `,
      ),
    );
    $add_new.$("[title]").setAttribute("disabled", "");
    $add_new.$("[body]").setAttribute("disabled", "");
    $add_new.$("[submit]").setAttribute("disabled", "");
    $add_new.$("[cancel]")?.setAttribute("disabled", "");
    fetch("/session", {
      method: "POST",
      body: JSON.stringify({
        path: state.path,
        title,
        body,
        pngs,
        topic_id: topic ? topic.topic_id : undefined,
      }),
    })
      .then((response) => response.json())
      .then(function (data) {
        if (data.error || !data.success) {
          $add_new.$("info")?.remove();
          $add_new.$("[title]").removeAttribute("disabled");
          $add_new.$("[body]").removeAttribute("disabled");
          $add_new.$("[submit]").removeAttribute("disabled");
          $add_new.$("[cancel]")?.removeAttribute("disabled");
          addTopicError(data.error || "Server error");
          return;
        }
        if (!topic) {
          $add_new.$("[body]").value = "";
          $add_new.$("[title]").value = "";
          pngs.splice(0, pngs.length);
          previewPngs();
          $add_new.$("info")?.remove();
          $add_new.$("[title]").removeAttribute("disabled");
          $add_new.$("[body]").removeAttribute("disabled");
          $add_new.$("[submit]").removeAttribute("disabled");
          $add_new.$("[cancel]")?.removeAttribute("disabled");
        }
        // Handle case where title changes slug when updating an topic
        delete state.active_add_new_topic;
        if (topic && data.slug) {
          state.path = `/topic/${data.slug}`;
          startSession();
        } else {
          getMoreRecent();
        }
      })
      .catch(function (error) {
        $add_new.$("info")?.remove();
        $add_new.$("[title]").removeAttribute("disabled");
        $add_new.$("[body]").removeAttribute("disabled");
        $add_new.$("[submit]").removeAttribute("disabled");
        $add_new.$("[cancel]")?.removeAttribute("disabled");
        addTopicError("Network error");
      });
  });
  state.active_add_new_topic = $add_new;
  if (topic) {
    state.active_add_new_topic.is_edit = topic.topic_id;
  } else {
    state.active_add_new_topic.is_root = true;
  }
  return $add_new;
};
const focusAddNewTopic = () => {
  state.active_add_new_topic.$("[title]").focus();
}
