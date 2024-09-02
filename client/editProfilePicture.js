const editProfilePicture = () => {
  Array.from($("[profile-picture] input[image]").files).forEach((file) => {
    const reader = new FileReader();
    reader.onload = ($event) => {
      imageToPng(
        $event.target.result,
        (png) => {
          const $image = $(
            `
              img[src=$1]
              `,
            [png.url],
          );
          const $original = $("[profile-picture] image").childNodes[0];
          $("[profile-picture] image").replaceChildren($image);
          alertInfo("Saving profile picture...");
          fetch("/session", {
            method: "POST",
            body: JSON.stringify({
              profile_picture: png.url,
            }),
          })
            .then((response) => response.json())
            .then(function (data) {
              if (data.error || !data.success) {
                modalError(data.error || "Server error");
                $("[profile-picture] image").replaceChildren($original);
              } else {
                alertInfo("Profile picture saved.");

                // Reload content
                state.cache = {};
                startSession();
              }
            })
            .catch(function () {
              modalError("Network error");
              $("[profile-picture] image").replaceChildren($original);
            });
        },
        512,
        true,
      );
    };
    reader.readAsDataURL(file);
  });
};
