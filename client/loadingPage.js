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
  if (state.path === "/topics") {
    if (!state.active_add_new_topic?.is_root) {
      $(
        "main-content-wrapper[active] main-content > add-new:first-child",
      )?.remove();
      $("main-content-wrapper[active] main-content").prepend(showAddNewTopic());
    }
  }

  // Render Back Button
  renderBack();

  // Render Share Button on topic
  renderShare();

  // Welcome page
  if (state.path === "/") {
    $("main-content-wrapper[active] main-content").replaceChildren(
      $(
        `
        topics
          topic
            h2[welcome]
              span Welcome
              $1
            p If you agree to:
            ul
              li Never escalate
              li Never judge
              li Never name-call
            p Then, please join us in this Truce.
            p
              a[big][href=/topics] Join the Discussion
            p[style="opacity:.5;font-size:.786rem;text-align:center;"]
              span By clicking "Join the Discussion," you agree to these terms.
        `,
        [ $("icons icon[welcome] svg").cloneNode(true) ]
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
                h3 John Doe:
                p You are a fascist, who attended a fascist rally and supported a fascist leader.
                info-wrapper
                  info
                    b Name-calling
                    p If someone does not identify themselves as a fascist, calling them one is an example of name-calling. This type of labeling hinders constructive and respectful dialogue.
              comment
                h3 Jane Doe:
                p Sometimes violence is the answer.
                  info
                    b Escalation
                    p This statement suggests that violence can be a solution, which promotes conflict and hostility rather than peaceful dialogue.
              comment
                h3 Sam Smith:
                p They are pure evil.
                  info
                    b Judgement
                    p Labeling anyone as "pure evil" is a critical judgment that hinders respectful dialogue and constructive conversation.
        topics
          p[style="opacity:.5;text-align:center;font-size:.786rem;"]
            a[href="/privacy"] Privacy Policy
        `,
        [ $("icons icon[communication] svg").cloneNode(true) ]
      ),
    );

    $("main-content-wrapper[active")
      .$("[href]")
      .forEach(($el) => {
        $el.on("click", ($event) => {
          $event.preventDefault();
          goToPath($el.getAttribute("href"));
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
            p Back to welcome
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
        [ $("icons icon[welcome] svg").cloneNode(true) ]
      ),
    );
    $("main-content-wrapper[active] main-content back-forward-wrapper").on("click", () => {
      goToPath("/");
    })
  }
};
