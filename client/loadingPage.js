const loadingPage = (first_render, skip_state, clicked_back) => {
  if (clicked_back) {
    $("main-content-wrapper[active]")?.setAttribute("clicked-back", "");
  } else {
    $("main-content-wrapper[active]")?.removeAttribute("clicked-back");
  }
  $("main-content-wrapper[active]")?.setAttribute("inactive", "");
  $("main-content-wrapper[active]")?.removeAttribute("active");
  $("body").appendChild(
    $(
      `
      main-content-wrapper[active][skip-state=$1][clicked-back=$2]
        main-content
        main-content-2
      `,
      [Boolean(skip_state), Boolean(clicked_back)],
    ),
  );
  bindScrollEvent();
  setTimeout(() => {
    $("main-content-wrapper[inactive]")?.remove();
  }, 250);
  // $("[add-new-comment]")?.remove();
  if (!first_render) {
    $("main-content-wrapper[active] main-content").appendChild(
      $(
        `
        topics-loading
          h2
          p
          p
        `,
      ),
    );
  }
  if (state.path === "/topics" || state.path === "/topics/all") {
    if (!state.active_add_new_topic?.is_root) {
      $(
        "main-content-wrapper[active] main-content > add-new:first-child",
      )?.remove();
      $("main-content-wrapper[active] main-content").prepend(showAddNewTopic());
    }
  }

  // Render Back Button
  renderBack();

  // Welcome page
  if (state.path === "/") {
    $("main-content-wrapper[active] main-content").replaceChildren(
      $(
        `
        topics
          topic
            h2[welcome]
              span Terms and conditions
              $1
            p If you agree to:
            ul
              li Never escalate
              li Never judge
              li Never name-call
            p Then, please join us in this Truce.
            p
              a[big][href=/topics] Join the Discussion
            p[notice]
              span To be clear, there is no tolerance for objectionable content or abusive users.
            p[notice][style="margin-top:5px;"]
              span Objectionable content is defined as escalations, judgments, or name-calling.
            p[notice][style="margin-top:5px;"]
              span By clicking "Join the Discussion," you agree to these terms.
          $2
        `,
        [
          $("icons icon[welcome] svg").cloneNode(true),
          !Boolean(window.webkit) && !Boolean(window.is_android)
            ? $(
                `
              topic
                app-store-wrapper
                  a[href=https://apps.apple.com/us/app/truce/id6578447172]
                    img[src=/app_store_black.svg][black]
                    img[src=/app_store_white.svg][white]
              `,
              )
            : [],
        ],
      ),
    );
    $("main-content-wrapper[active] main-content-2").replaceChildren(
      $(
        `
        topics
          topic
            h2[moderation]
              span Our Approach to Moderation
              $1
            p If you post:
            ul
              li An escalation
              li A judgment
              li Name-calling
            p Then:
            ul
              li A label will be applied
              li The label will be explained
            comments
              expand-wrapper[above-comments]
                p Examples
              comment
                h3
                  author
                    profile-picture
                      image
                        $2
                    span John Doe:
                p You are a fascist, who attended a fascist rally and supported a fascist leader.
                info-wrapper
                  info
                    b Name-calling
                    p If someone does not identify themselves as a fascist, calling them one is an example of name-calling. This type of labeling hinders constructive and respectful dialogue.
              comment
                h3
                  author
                    profile-picture
                      image
                        $3
                    span Jane Doe:
                p Sometimes violence is the answer.
                  info
                    b Escalation
                    p This statement suggests that violence can be a solution, which promotes conflict and hostility rather than peaceful dialogue.
              comment
                h3
                  author
                    profile-picture
                      image
                        $4
                    span Sam Smith:
                p They are pure evil.
                  info
                    b Judgment
                    p Labeling anyone as "pure evil" is a critical judgment that hinders respectful dialogue and constructive conversation.
        topics
          p[notice]
            a[href="/privacy"] Privacy Policy
          p[notice]
            span Email us at
            a[href="mailto:derek@truce.net"] derek@truce.net
            span to provide feedback or report inappropriate activity.
        `,
        [
          $("icons icon[communication] svg").cloneNode(true),
          $("icons icon[profile-picture] svg").cloneNode(true),
          $("icons icon[profile-picture] svg").cloneNode(true),
          $("icons icon[profile-picture] svg").cloneNode(true),
        ],
      ),
    );

    $("main-content-wrapper[active")
      .$("[href]")
      .forEach(($el) => {
        $el.on("click", ($event) => {
          let new_path = $el.getAttribute("href");
          if (new_path.startsWith("/")) {
            $event.preventDefault();
            if (new_path === "/topics") {
              localStorage.setItem(`${window.local_storage_key}:agreed`, true);
              if (state.next_path) {
                new_path = state.next_path;
              }
            }
            goToPath(new_path);
          }
        });
      });
  }

  // Privacy page
  if (state.path === "/privacy") {
    $("main-content-wrapper[active] main-content").replaceChildren(
      $(
        `
        back-forward-wrapper
          back-wrapper
            button[expand-left]
            p Terms and conditions
        topics
          topic
            h2 Privacy Policy
            p[bold] Information Collection
            p We do not collect any personal data from users of our app. The email address and password you provide are used solely to facilitate account recovery.
            p[bold] Use of Information
            p Your email and password are used solely to facilitate account recovery.
            p[bold] Data Security
            p We take measures to protect your information from unauthorized access or disclosure.
            p[bold] No Third-Party Services
            p We do not use any third-party services or analytics.
            p[bold] Policy Changes
            p We may update this policy from time to time. Changes will be effective immediately upon posting.
            p[bold] Contact
            p For any questions, contact us at derek@truce.net
        `,
        [$("icons icon[welcome] svg").cloneNode(true)],
      ),
    );
    $("main-content-wrapper[active] main-content back-forward-wrapper").on(
      "click",
      () => {
        goToPath("/");
      },
    );
  }

  if (state.path === "/settings") {
    const $settings = $(
      `
      topics
        topic
          h2[settings]
            span Account settings
            button[profile][small][slug=$1]
              icon
                $2
              span View profile
          p You may change your profile picture or your display name here. You may also remove your account.
        topic
          p[bold] Profile picture
          label[profile-picture][large]
            image
              $3
            input[image][type=file][accept=image/*]
          p[bold] Display name
          p[input]
            input[type=text][display-name][value=$4]
          p[button]
            button[save] Save display name
        topic
          p[bold] Remove account
          p[button]
            button[remove][alt] Remove Account
      `,
      [
        state.slug,
        $("icons icon[profile-picture] svg").cloneNode(true),
        state.profile_picture_uuid
          ? $(
              `
              img[src=$1]
              `,
              ["/image/" + state.profile_picture_uuid],
            )
          : $("icons icon[profile-picture] svg").cloneNode(true),
        state.display_name,
      ],
    );
    $settings.$("button[profile]")?.forEach(($button) => {
      $button.on("click", ($event) => {
        $event.preventDefault();
        goToPath(`/user/${$button.getAttribute("slug")}`);
      });
    });
    $("main-content-wrapper[active] main-content").replaceChildren($settings);

    $("main-content-wrapper[active] [profile-picture] input[image]")?.on(
      "change",
      editProfilePicture,
    );

    $settings.$("[save]").on("click", ($event) => {
      $event.preventDefault();
      alertInfo("Saving display name...");
      const new_display_name = $settings.$("[display-name]").value;
      fetch("/session", {
        method: "POST",
        body: JSON.stringify({
          display_name: new_display_name,
        }),
      })
        .then((response) => response.json())
        .then(function (data) {
          if (data.error || !data.success) {
            modalError(data.error || "Server error");
          } else {
            state.display_name = new_display_name;
            alertInfo("Display name saved.");
          }
        })
        .catch(function () {
          modalError("Network error");
        });
    });
    $settings.$("[remove]").on("click", ($event) => {
      $event.preventDefault();
      const $remove_modal = $(
        `
          modal-wrapper
            modal[info]
              error
                b Warning
                p This will permanently remove your account. This action cannot be undone.
              p Everything you posted will be deleted:
              ul
                li Comments
                li Topics
                li Images
                li Favorites
              p Tap remove to confirm.
              button-wrapper
                button[remove] Remove
                button[alt][cancel] Cancel
            modal-bg
          `,
      );
      const removeModalCancel = () => {
        $remove_modal.remove();
      };
      $remove_modal.$("[remove]").on("click", () => {
        removeModalCancel();
        modalInfo("Removing account...");
        fetch("/session", {
          method: "POST",
          body: JSON.stringify({
            remove_account: true,
          }),
        })
          .then((response) => response.json())
          .then((data) => {
            if (!data || !data.success) {
              modalError("Server error removing account");
            } else {
              $("modal-wrapper")?.remove();
              modalInfo("Account removed");
              state.user_id = "";
              state.display_name = "";
              state.profile_picture_uuid = "";
              state.email = "";
              state.reset_token_uuid = "";
              localStorage.removeItem("session_uuid");
              state.cache = {};
              goToPath("/");
            }
          })
          .catch((error) => {
            modalError("Network error removing account");
          });
      });
      $remove_modal.$("[cancel]").on("click", removeModalCancel);
      $remove_modal.$("modal-bg").on("click", removeModalCancel);
      $("modal-wrapper")?.remove();
      $("body").appendChild($remove_modal);
    });
  }
};
