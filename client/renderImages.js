const renderImages = () => {
  if (state.path === "/image") {
    const $image_prompt = $(
      `
    image-prompt
      textarea[prompt][rows=10]
      select[model]
        option[value=dall-e-3][selected] dall-e-3
        option[value=dall-e-2] dall-e-2
        option[value=tts-1] tts-1
        option[value=tts-1-hd] tts-1-hd
      button[submit] Generate
    `,
    );
    $image_prompt.$("[submit]").on("click", () => {
      $image_prompt.$("textarea").setAttribute("disabled", "");
      $image_prompt.appendChild(
        $(
          `
        info Generating...
        `,
        ),
      );
      fetch("/session", {
        method: "POST",
        body: JSON.stringify({
          path: state.path,
          model: $image_prompt.$("[model]").value,
          prompt: $image_prompt.$("textarea").value,
        }),
      })
        .then((response) => response.json())
        .then(function (data) {
          $image_prompt.$("info")?.remove();
          $image_prompt.$("textarea").removeAttribute("disabled");
          if (data.image) {
            $("topics img")?.remove();
            $("topics").appendChild(
              $(
                `
                img[src=$1]
                `,
                [data.image],
              ),
            );
          } else if (data.mp3) {
            $("topics audio")?.remove();
            $("topics").appendChild(
              $(
                `
                audio[controls][src=$1][autoplay]
                `,
                [data.mp3],
              ),
            );
          } else {
            debug("A", data);
          }
        })
        .catch(function (error) {
          debug("B");
          debug(error);
        });
    });
    $("topics").appendChild($image_prompt);
  }
};
