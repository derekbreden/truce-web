const renderTopics = (topics, tag, user) => {
  beforeDomUpdate();
  if (!$("main-content-wrapper[active] topics")) {
    const target =
      (state.path === "/topics" || state.path === "/topics/all")
        ? "main-content-wrapper[active] main-content-2"
        : "main-content-wrapper[active] main-content";
    $(target).appendChild(
      $(
        `
        topics
        `,
      ),
    );
  }
  const $topics = topics
    .sort((a, b) => new Date(b.create_date) - new Date(a.create_date))
    .map(renderTopic);

  if (
    window.innerWidth > 1000 &&
    (state.path.substr(0, 5) === "/tag/" ||
      state.path.substr(0, 6) === "/user/")
  ) {
    const $topics_1 = $topics.filter((x, i) => i % 2 === 0);
    const $topics_2 = $topics.filter((x, i) => i % 2 === 1);
    $("main-content-wrapper[active] main-content topics")?.replaceChildren(
      ...$topics_1,
    );
    $("main-content-wrapper[active] main-content-2").replaceChildren(
      $(
        `
        topics
        `,
      ),
    );
    $("main-content-wrapper[active] main-content-2 topics").replaceChildren(
      ...$topics_2,
    );
  } else {
    $("main-content-wrapper[active] topics").replaceChildren(...$topics);
  }

  if (state.active_add_new_topic?.is_edit) {
    const topic = topics.find(
      (a) => a.topic_id === state.active_add_new_topic.is_edit,
    );
    topic.$topic.replaceWith(state.active_add_new_topic);
  }

  // User
  if (state.path.substr(0, 6) === "/user/") {
    $("topic[user]")?.remove();
    $("main-content-wrapper[active] main-content topics").prepend(
      $(
        `
          topic[user]
            h2[user]
              span $1
              $2
            label[profile-picture][large]
              image
                $3
              $4
          `,
        [
          renderName(user.display_name, user.display_name_index),
          user.user_id === state.user_id
            ? $(
                `
                button[edit][small][href=/settings]
                  icon[settings]
                    $1
                  span Edit
                `,
                [$("icons icon[settings] svg").cloneNode(true)],
              )
            : user.subscribed
              ? $(
                  `
                  button[subscribe][small]
                    icon[subscribe]
                      $1
                    span Unsubscribe
                  `,
                  [$("icons icon[subscribe] svg").cloneNode(true)],
                )
              : $(
                  `
                  button[subscribe][small][alt]
                    icon[subscribe]
                      $1
                    span Subscribe
                  `,
                  [$("icons icon[subscribe] svg").cloneNode(true)],
                ),
          user.profile_picture_uuid
            ? $(
                `
                img[src=$1]
                `,
                ["/image/" + user.profile_picture_uuid],
              )
            : $("icons icon[profile-picture] svg").cloneNode(true),
          user.user_id === state.user_id
            ? $(
                `
                input[image][type=file][accept=image/*]
                `,
              )
            : [],
        ],
      ),
    );
    $("topic[user] button[subscribe]")?.on("click", ($event) => {
      $event.preventDefault();
      if (user.subscribed) {
        $("topic[user] button[subscribe] span").textContent =
          "Unsubscribing...";
        fetch("/session", {
          method: "POST",
          body: JSON.stringify({
            subscribe_to_user_id: user.user_id,
            remove: true,
          }),
        })
          .then((response) => response.json())
          .then(function (data) {
            if (data.error || !data.success) {
              alertError("Server error removing subscription");
              $("topic[user] button[subscribe] span").textContent =
                "Unsubscribe";
            } else {
              user.subscribed = false;
              state.subscribed_to_users--;
              $("topic[user] button[subscribe]").setAttribute("alt", "");
              $("topic[user] button[subscribe] span").textContent = "Subscribe";
              alertInfo(
                "Unsubscribed from " +
                  renderName(user.display_name, user.display_name_index),
              );
              delete state.cache["/topics"];
            }
          })
          .catch(function (error) {
            console.error(error);
            alertError("Network error removing subscription");
            $("topic[user] button[subscribe] span").textContent = "Unsubscribe";
          });
      } else {
        $("topic[user] button[subscribe] span").textContent = "Subscribing...";
        fetch("/session", {
          method: "POST",
          body: JSON.stringify({
            subscribe_to_user_id: user.user_id,
          }),
        })
          .then((response) => response.json())
          .then(function (data) {
            if (data.error || !data.success) {
              alertError("Server error saving subscription");
              $("topic[user] button[subscribe] span").textContent = "Subscribe";
            } else {
              user.subscribed = true;
              state.subscribed_to_users++;
              $("topic[user] button[subscribe]").removeAttribute("alt");
              $("topic[user] button[subscribe] span").textContent =
                "Unsubscribe";
              alertInfo(
                "Subscribed to " +
                  renderName(user.display_name, user.display_name_index),
              );
              delete state.cache["/topics"];
            }
          })
          .catch(function (error) {
            console.error(error);
            alertError("Network error saving subscription");
            $("topic[user] button[subscribe] span").textContent = "Subscribe";
          });
      }
    });
    $("button[edit][small]")?.on("click", ($event) => {
      $event.preventDefault();
      goToPath("/settings");
    });
    $("main-content-wrapper[active] [profile-picture] input[image]")?.on(
      "change",
      editProfilePicture,
    );
  }

  // Tag
  if (state.path.substr(0, 5) === "/tag/") {
    $("topic[tag]")?.remove();
    if (topics.length === 0) {
      $("main-content-wrapper[active] main-content topics").prepend(
        $(
          `
          topic[tag]
            h2[tags]
              span $1
              icon
                $2
            p $3
            p There are no topics in this tag yet, head on over to the topics page to add one!
          `,
          [
            tag.tag_name[0].toUpperCase() + tag.tag_name.slice(1),
            $(`icons icon[${tag.tag_name}] svg`).cloneNode(true),
            tag.subtitle,
          ],
        ),
      );
    } else {
      $("main-content-wrapper[active] main-content topics").prepend(
        $(
          `
          topic[tag]
            h2[tags]
              span $1
              icon
                $2
            p $3
          `,
          [
            tag.tag_name[0].toUpperCase() + tag.tag_name.slice(1),
            $(`icons icon[${tag.tag_name}] svg`).cloneNode(true),
            tag.subtitle,
          ],
        ),
      );
    }
  }


  if (state.path === "/topics" && state.subscribed_to_users) {
    $("main-content-wrapper[active] main-content-2 topics").prepend(
      $(
        `
        back-forward-wrapper
          center-wrapper
            span Topics from subscriptions
          forward-wrapper
            p All topics
            button[expand-right]
        `,
        [],
      ),
    );
    $("main-content-wrapper[active] main-content-2 topics back-forward-wrapper forward-wrapper").on("click", ($event) => {
      $event.preventDefault();
      localStorage.setItem(`${window.local_storage_key}:topics_preference`, "/topics/all")
      goToPath("/topics/all");
    })
  }
  if (state.path === "/topics/all" && state.subscribed_to_users) {
    $("main-content-wrapper[active] main-content-2 topics").prepend(
      $(
        `
        back-forward-wrapper
          back-wrapper
            button[expand-left]
            p Topics from subscriptions
          center-wrapper
            span All topics
        `,
        [],
      ),
    );
    $("main-content-wrapper[active] main-content-2 topics back-forward-wrapper back-wrapper").on("click", ($event) => {
      $event.preventDefault();
      localStorage.setItem(`${window.local_storage_key}:topics_preference`, "/topics")
      goToPath("/topics");
    })
  }

  afterDomUpdate();
  $("topics [href]")?.forEach(($a) => {
    const new_path = $a.getAttribute("href");
    if (new_path.substr(0, 1) === "/") {
      $a.on("click", ($event) => {
        $event.preventDefault();
        $event.stopPropagation();
        goToPath(new_path);
      });
    }
  });
};
