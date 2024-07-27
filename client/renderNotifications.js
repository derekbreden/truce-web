const renderNotification = (notification) => {
  const short_body =
    notification.body.length > 50
      ? notification.body.substr(0, 50) + "..."
      : notification.body;
  const short_title =
    notification.title.length > 20
      ? notification.title.substr(0, 20) + "..."
      : notification.title;

  const reply_text =
    notification.reply_type === "comment"
      ? "to your comment on"
      : notification.reply_type === "topic_comment"
        ? "to a comment on your topic"
        : "to your topic";

  const note = notification.note || "";
  const note_keyword = note.split(" ")[0];
  const note_title = note_keywords[note_keyword] || note_keyword;
  const $notification = $(
    `
    notification[unread=$1]
      first-column
        summary
          b $2
          span $3
          i $4
          span $5
          b $6
        $7
      read-more-wrapper
        p Read more
        button[expand-right]
    `,
    [
      !notification.read,
      renderName(notification.display_name, notification.display_name_index),
      "replied",
      `"${short_body}"`,
      reply_text,
      short_title,
      notification.note
        ? $(
            `
          info[tiny][$1]
            b $2
          `,
            [note_keyword, note_title],
          )
        : [],
    ],
  );
  $notification.on("click", () => {
    goToPath("/comment/" + notification.comment_id);

    // Mark as read
    if (!notification.read) {
      markAsRead(notification.notification_id);
    }
  });
  notification.$notification = $notification;
  return $notification;
};

const renderNotifications = (notifications) => {
  if (state.path !== "/notifications") {
    return;
  }
  const unread_notifications = notifications.filter((n) => !n.read);
  const read_notifications = notifications.filter((n) => n.read);
  const $unread_header = $(
    `
    h3[unread=$1] $2
    `,
    [
      Boolean(state.unread_count),
      state.unread_count ? `Unread (${state.unread_count})` : "Unread",
    ],
  );
  const $read_header = $(
    `
    h3 Read
    `,
  );
  let $unread_allclear = [];
  if (!state.unread_count) {
    $unread_allclear = [
      $(
        `
      all-clear-wrapper
        p All clear
      `,
      ),
    ];
  }
  let $read_allclear = [];
  if (!read_notifications.length) {
    $read_allclear = [
      $(
        `
      all-clear-wrapper
        p All clear
      `,
      ),
    ];
  }
  if (!$("main-content-wrapper[active] notifications")) {
    $("main-content-wrapper[active] main-content").appendChild(
      $(
        `
        notifications
        `,
      ),
    );
    $("main-content-wrapper[active] main-content-2").appendChild(
      $(
        `
        notifications
        `,
      ),
    );
  }
  $("main-content-wrapper[active] main-content notifications").replaceChildren(
    ...[$unread_header],
    ...$unread_allclear,
    ...unread_notifications.map(renderNotification),
  );
  $("main-content-wrapper[active] main-content-2 notifications").replaceChildren(
    ...[$read_header],
    ...$read_allclear,
    ...read_notifications.map(renderNotification),
  );

  // On notifications render, mark all as seen
  if (state.unseen_count && notifications.length) {
    fetch("/session", {
      method: "POST",
      body: JSON.stringify({
        mark_all_as_seen: true,
      }),
    })
      .then((response) => response.json())
      .then(function (data) {
        if (!data || !data.success) {
          modalError("Server error");
          console.error(data);
        } else {
          state.unseen_count = 0;
          getUnreadCountUnseenCount();
        }
      })
      .catch(function (error) {
        modalError("Network error");
        console.error(error);
      });
  }
};

const renderMarkAllAsRead = () => {
  if (state.path === "/notifications") {
    const $mark_all_as_read = $(
      `
      mark-all-as-read-wrapper
        button[mark-all-as-read][small][alt][faint=$1] Mark all as read
      `,
      [!Boolean(state.unread_count)],
    );
    $("main-content-wrapper[active] back-forward-wrapper").$("mark-all-as-read-wrapper")?.remove();
    $("main-content-wrapper[active] back-forward-wrapper").appendChild($mark_all_as_read);
    $mark_all_as_read.on("click", () => {
      $mark_all_as_read.$("button").setAttribute("alt", "");
      $mark_all_as_read.$("button").setAttribute("faint", "");
      fetch("/session", {
        method: "POST",
        body: JSON.stringify({
          mark_all_as_read: true,
        }),
      })
        .then((response) => response.json())
        .then(function (data) {
          if (!data || !data.success) {
            modalError("Server error");
            console.error(data);
          } else {
            state.unread_count = 0;
            state.cache["/notifications"].notifications = state.cache[
              "/notifications"
            ].notifications.filter((n) => n.read);
            renderNotifications(state.cache["/notifications"].notifications);
            getMoreRecent();
            getUnreadCountUnseenCount();
          }
        })
        .catch(function (error) {
          modalError("Network error");
          console.error(error);
        });
    });
  }
};

const getUnreadCountUnseenCount = () => {
  fetch("/session", {
    method: "POST",
    body: JSON.stringify({
      path: "/unread_count_unseen_count",
    }),
  })
    .then((response) => response.json())
    .then(function (data) {
      if (!data) {
        modalError("Server error");
        console.error(data);
      } else {
        state.unread_count = Number(data.unread_count);
        state.unseen_count = Number(data.unseen_count);
        if (navigator.setAppBadge) {
          navigator.setAppBadge(state.unread_count);
        }

        if (
          window.webkit &&
          window.webkit.messageHandlers &&
          window.webkit.messageHandlers["push-permission-request"] &&
          window.webkit.messageHandlers["push-permission-state"]
        ) {
          window.webkit.messageHandlers["set-badge"].postMessage(
            JSON.stringify({
              badge: state.unread_count,
            }),
          );
        }
        if (Boolean(state.unread_count)) {
          $("hamburger").setAttribute("unread", "");
          $("footer a[notifications]").setAttribute("unread", "");
        } else {
          $("hamburger").removeAttribute("unread");
          $("footer a[notifications]").removeAttribute("unread");
        }
        if (
          state.unseen_count &&
          (state.window_recently_focused || state.window_recently_loaded)
        ) {
          // When exactly one, just go to the comment
          if (
            state.unseen_count === 1 &&
            data.comment_id &&
            data.notification_id
          ) {
            goToPath("/comment/" + data.comment_id);
            markAsRead(data.notification_id);

            // Otherwise load the list of notifications
          } else {
            goToPath("/notifications");
          }
        }
      }
    })
    .catch(function (error) {
      modalError("Network error");
      console.error(error);
    });
};

const markAsRead = (notification_id) => {
  fetch("/session", {
    method: "POST",
    body: JSON.stringify({
      mark_as_read: [notification_id],
    }),
  })
    .then((response) => response.json())
    .then(function (data) {
      if (!data || !data.success) {
        modalError("Server error");
        console.error(data);
      } else {
        // Update cache for this item
        const notification = state.cache["/notifications"]?.notifications?.find(
          (n) => n.notification_id === notification_id,
        );
        if (notification) {
          notification.read = true;
          notification.seen = true;
        }

        // Ensure counts are accurate as well
        getUnreadCountUnseenCount();
      }
    })
    .catch(function (error) {
      modalError("Network error");
      console.error(error);
    });
};

window.addEventListener("focus", () => {
  state.window_recently_focused = true;
  setTimeout(() => {
    state.window_recently_focused = false;
  }, 5000);
  getMoreRecent();
  if (state.push_active || state.fcm_push_active) {
    getUnreadCountUnseenCount();
  }
});
window.addEventListener("load", () => {
  state.window_recently_loaded = true;
  setTimeout(() => {
    state.window_recently_loaded = false;
  }, 5000);
});
