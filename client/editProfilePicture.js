window.editProfilePicture = () => {
  Array.from($("[profile-picture] input[image]").files).forEach((file) => {
    const reader = new FileReader();
    reader.onload = ($event) => {
      window.imageToPng( // Call via window
        $event.target.result,
        (png) => {
          const $imagePreviewContainerById = window.document.getElementById("testImagePreviewArea");
          const $original = $imagePreviewContainerById ? $imagePreviewContainerById.childNodes[0] : null;

          const $image = $(
            `
              img[src=$1]
              `,
            [png.url],
          );

          if ($imagePreviewContainerById) { // Guard actual replacement
            $imagePreviewContainerById.replaceChildren($image);
          }

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
                if ($imagePreviewContainerById && $original) {
                  $imagePreviewContainerById.replaceChildren($original);
                } else if ($imagePreviewContainerById) {
                  $imagePreviewContainerById.innerHTML = '';
                }
              } else {
                alertInfo("Profile picture saved.");
                // Reload content
                state.cache = {};
                startSession();
              }
            })
            .catch(function () {
              modalError("Network error");
              if ($imagePreviewContainerById && $original) {
                $imagePreviewContainerById.replaceChildren($original);
              } else if ($imagePreviewContainerById) {
                $imagePreviewContainerById.innerHTML = '';
              }
            });
        },
        512,
        true,
      );
    };
    reader.readAsDataURL(file);
  });
};
