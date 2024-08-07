const showAddNewTopic = (topic) => {
  const $add_new = $(
    `
    add-new[topic]
      input[title][placeholder=Title][maxlength=140][value=$3]
      title-wrapper
        label[poll]
          icon
            $1
        label[image]
          icon
            $2
          input[image][type=file][multiple][accept=image/*]
      textarea[body][placeholder=Content][rows=10][maxlength=8000] $4
      button[submit] $5
      button[alt][cancel] Cancel
    `,
    [
      $("icons icon[poll] svg").cloneNode(true),
      $("icons icon[image] svg").cloneNode(true),
      ...(topic
        ? [topic.title, topic.body, "Save changes"]
        : ["", "", "Add topic"]),
    ],
  );

  let mode = "topic";
  if (state.version > 1) {
    $add_new.$("[poll]").on("click", () => {
      if (mode === "topic") {
        mode = "poll";
        $add_new.$("[body]").setAttribute("placeholder", "Question");
        $add_new.$("[body]").setAttribute("rows", "3");
        $add_new.$("[body]").after(
          $(
            `
            poll-input-wrapper
              poll-text
                input[poll-1][placeholder=Choice 1][maxlength=50]
              poll-text
                input[poll-2][placeholder=Choice 2][maxlength=50]
              poll-text[add]
                icon
                  $1
                p Add choice
            `,
            [$("icons icon[add] svg").cloneNode(true)],
          ),
        );
        $add_new.$("poll-text[add]").on("click", () => {
          const choice_number = $add_new.querySelectorAll(
            "poll-input-wrapper poll-text",
          ).length;
          const $new_choice = $(
            `
            poll-text
              input[$1][placeholder=$2][maxlength=50]
              icon[remove]
                $3
            `,
            [
              `poll-${choice_number}`,
              `Choice ${choice_number}`,
              $("icons icon[remove] svg").cloneNode(true),
            ],
          );
          $add_new.$("poll-text[add]").before($new_choice);
          $new_choice.$("[remove]").on("click", () => {
            $new_choice.remove();
            $add_new.$("poll-text[add]").style.display = "flex";
            $add_new
              .$("poll-input-wrapper poll-text:nth-child(3) input")
              ?.removeAttribute("poll-4");
            $add_new
              .$("poll-input-wrapper poll-text:nth-child(3) input")
              ?.setAttribute("poll-3", "");
            $add_new
              .$("poll-input-wrapper poll-text:nth-child(3) input")
              ?.setAttribute("placeholder", `Choice 3`);
          });
          if (choice_number > 3) {
            $add_new.$("poll-text[add]").style.display = "none";
          }
        });
      } else {
        mode = "topic";
        $add_new.$("[body]").setAttribute("placeholder", "Content");
        $add_new.$("[body]").setAttribute("rows", "10");
        $add_new.$("poll-input-wrapper").remove();
      }
    });
    if (topic && topic.poll_1) {
      $add_new.$("[poll]").click();
      $add_new.$("input[poll-1]").value = topic.poll_1;
      $add_new.$("input[poll-2]").value = topic.poll_2;
      if (topic.poll_3) {
        $add_new.$("poll-text[add]").click();
        $add_new.$("input[poll-3]").value = topic.poll_3;
      }
      if (topic.poll_4) {
        $add_new.$("poll-text[add]").click();
        $add_new.$("input[poll-4]").value = topic.poll_4;
      }
    }
  } else {
    $add_new.$("[poll]").remove();
  }

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

  $add_new.$("input[image]").on("change", () => {
    Array.from($add_new.$("input[image]").files).forEach((file) => {
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
    if (pngs.length) {
      $add_new
        .$("title-wrapper")
        .after(document.createElement("image-previews"));
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
    }
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
    const poll_1 = $add_new.$("[poll-1]")?.value || "";
    const poll_2 = $add_new.$("[poll-2]")?.value || "";
    const poll_3 = $add_new.$("[poll-3]")?.value || "";
    const poll_4 = $add_new.$("[poll-4]")?.value || "";
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
    if (
      (poll_1.length && !poll_2.length) ||
      (poll_2.length && !poll_1.length)
    ) {
      addTopicError("Please fill in 2 choices for a poll");
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
    $add_new.$("[poll-1]")?.setAttribute("disabled", "");
    $add_new.$("[poll-2]")?.setAttribute("disabled", "");
    $add_new.$("[poll-3]")?.setAttribute("disabled", "");
    $add_new.$("[poll-4]")?.setAttribute("disabled", "");
    $add_new.$("[submit]").setAttribute("disabled", "");
    $add_new.$("[cancel]")?.setAttribute("disabled", "");
    fetch("/session", {
      method: "POST",
      body: JSON.stringify({
        path: state.path,
        title,
        body,
        poll_1,
        poll_2,
        poll_3,
        poll_4,
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
          $add_new.$("[poll-1]")?.removeAttribute("disabled");
          $add_new.$("[poll-2]")?.removeAttribute("disabled");
          $add_new.$("[poll-3]")?.removeAttribute("disabled");
          $add_new.$("[poll-4]")?.removeAttribute("disabled");
          $add_new.$("[submit]").removeAttribute("disabled");
          $add_new.$("[cancel]")?.removeAttribute("disabled");
          addTopicError(data.error || "Server error");
          return;
        }
        if (!topic) {
          $add_new.$("[body]").value = "";
          $add_new.$("[title]").value = "";
          if (mode === "poll") {
            $add_new.$("[poll]").click();
          }
          pngs.splice(0, pngs.length);
          previewPngs();
          $add_new.$("info")?.remove();
          $add_new.$("[title]").removeAttribute("disabled");
          $add_new.$("[body]").removeAttribute("disabled");
          $add_new.$("[poll-1]")?.removeAttribute("disabled");
          $add_new.$("[poll-2]")?.removeAttribute("disabled");
          $add_new.$("[poll-3]")?.removeAttribute("disabled");
          $add_new.$("[poll-4]")?.removeAttribute("disabled");
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
        $add_new.$("[poll-1]")?.removeAttribute("disabled");
        $add_new.$("[poll-2]")?.removeAttribute("disabled");
        $add_new.$("[poll-3]")?.removeAttribute("disabled");
        $add_new.$("[poll-4]")?.removeAttribute("disabled");
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
};
