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
  const note_title = (note_keywords[note_keyword] || note_keyword).replace(
    /[^a-z\-]/gi,
    "",
  );
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
  if (!state.email) {
    $("main-content-wrapper[active] main-content").replaceChildren(
      $(
        `
        topics[notifications-header]
          topic
            h2 Alerts
            p To enable alerts, please sign in or sign up, using the menu in the top right hand corner.
        `,
      ),
    );
  } else if (state.push_available || state.fcm_push_available) {
    $("main-content-wrapper[active] main-content").replaceChildren(
      $(
        `
        topics[notifications-header]
          topic
            h2 Alerts
            p When you "Turn on alerts", you will get an alert anytime someone responds to a topic or comment you have posted.
        `,
      ),
    );
  } else if (state.fcm_push_denied) {
    $("main-content-wrapper[active] main-content").replaceChildren(
      $(
        `
        topics[notifications-header]
          topic
            h2 Alerts
            p You must enable notifications for this app in settings
        `,
      ),
    );
  } else {
    $("main-content-wrapper[active] main-content").replaceChildren(
      $(
        `
        topics[notifications-header]
          topic
            h2 Alerts
            p[add-to-home]
              span To enable alerts, tap the
              $1
              span icon on your browser and then tap "Add to Home Screen".
        `,
        [$("icons icon[share] svg").cloneNode(true)],
      ),
    );
  }
  const unread_notifications = notifications.filter((n) => !n.read);
  const read_notifications = notifications.filter((n) => n.read);
  const $unread_header = $(
    `
    h3 $1
    `,
    [state.unread_count ? `Unread (${state.unread_count})` : "Unread"],
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
  if (!$("main-content-wrapper[active] main-content notifications")) {
    $("main-content-wrapper[active] main-content").appendChild(
      $(
        `
        notifications
        `,
      ),
    );
  }
  if (!$("main-content-wrapper[active] main-content-2 notifications")) {
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
    ...unread_notifications
      .sort((a, b) => new Date(b.create_date) - new Date(a.create_date))
      .map(renderNotification),
  );
  $(
    "main-content-wrapper[active] main-content-2 notifications",
  ).replaceChildren(
    ...[$read_header],
    ...$read_allclear,
    ...read_notifications
      .sort((a, b) => new Date(b.create_date) - new Date(a.create_date))
      .map(renderNotification),
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
          alertError("Server error");
          console.error(data);
        } else {
          state.unseen_count = 0;
          getUnreadCountUnseenCount();
        }
      })
      .catch(function (error) {
        state.most_recent_error = error;
        alertError("Network error");
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
            alertError("Server error");
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
          alertError("Network error");
          console.error(error);
        });
    });
    if (
      (state.push_active || state.fcm_push_active) &&
      Boolean(state.unread_count)
    ) {
      $("main-content-wrapper[active] main-content notifications").append(
        $mark_all_as_read,
      );
    }
    const $toggle_wrapper = $(
      `
      toggle-wrapper[disabled=$1][active=$2]
        toggle-text Turn on alerts
        toggle-button
          toggle-circle
      `,
      [
        !state.push_available && !state.fcm_push_available,
        state.push_active || state.fcm_push_active,
      ],
    );
    $toggle_wrapper.on("click", () => {
      if (state.push_active) {
        state.push_active = false;
        $("toggle-wrapper").removeAttribute("active");
        navigator.serviceWorker.ready
          .then((registration) => {
            return registration.pushManager.getSubscription();
          })
          .then((subscription) => {
            subscription.unsubscribe();
            fetch("/session", {
              method: "POST",
              body: JSON.stringify({
                remove: true,
                subscription,
              }),
            })
              .then((response) => response.json())
              .then((data) => {
                if (!data || !data.success) {
                  alertError("Server error saving subscription");
                }
              })
              .catch((error) => {
                alertError("Network error saving subscription");
              });
          });
        return;
      }
      if (state.fcm_push_active) {
        state.fcm_push_active = false;
        $("toggle-wrapper").removeAttribute("active");
        fetch("/session", {
          method: "POST",
          body: JSON.stringify({
            fcm_subscription: state.fcm_token,
            deactivate: true,
          }),
        })
          .then((response) => response.json())
          .then((data) => {
            if (!data || !data.success) {
              alertError("Server error saving subscription");
            }
          })
          .catch(() => {
            alertError("Network error saving subscription");
          });
        return;
      }
      if (state.fcm_push_available) {
        state.fcm_push_active = true;
        getUnreadCountUnseenCount();
        $("toggle-wrapper").setAttribute("active", "");
        if (state.fcm_token) {
          fetch("/session", {
            method: "POST",
            body: JSON.stringify({
              fcm_subscription: state.fcm_token,
              reactivate: true,
            }),
          })
            .then((response) => response.json())
            .then((data) => {
              if (!data || !data.success) {
                alertError("Server error saving subscription");
              }
            })
            .catch(() => {
              alertError("Network error saving subscription");
            });
        }
        window.webkit.messageHandlers["push-permission-request"].postMessage(
          "push-permission-request",
        );
      } else if (state.push_available) {
        state.push_active = true;
        $("toggle-wrapper").setAttribute("active", "");
        navigator.serviceWorker.ready
          .then(async (registration) => {
            registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: (function () {
                const raw = window.atob(
                  "BP8IxEorl8eTn6QkMCyfKCo5sDdx/AQruapRiq3wWaretKdIegWr3oMXUu2WXIiQvP46DcuoZxdKRHpGNMp+UNc=",
                );
                const array = new Uint8Array(new ArrayBuffer(raw.length));
                for (let i = 0; i < raw.length; i++) {
                  array[i] = raw.charCodeAt(i);
                }
                return array;
              })(),
            });
            let retries = 0;
            const check_for_success = () => {
              registration.pushManager
                .getSubscription()
                .then((subscription) => {
                  fetch("/session", {
                    method: "POST",
                    body: JSON.stringify({
                      subscription,
                    }),
                  })
                    .then((response) => response.json())
                    .then((data) => {
                      if (!data || !data.success) {
                        if (retries < 20) {
                          retries++;
                          setTimeout(check_for_success, retries * 1000);
                        } else {
                          alertError("Server error saving subscription");
                          state.push_active = false;
                          $("toggle-wrapper").removeAttribute("active");
                          subscription.unsubscribe();
                        }
                      }
                    })
                    .catch(() => {
                      if (retries < 20) {
                        retries++;
                        setTimeout(check_for_success, retries * 1000);
                      } else {
                        modalError("Error enabling notifications");
                        state.push_active = false;
                        $("toggle-wrapper").removeAttribute("active");
                        subscription.unsubscribe();
                      }
                    });
                });
            };
            setTimeout(check_for_success, 1000);
          })
          .catch(() => {
            modalError("Subscription error");
            state.push_active = false;
            $("toggle-wrapper").removeAttribute("active");
          });
      } else {
        if (state.fcm_push_denied) {
          modalError(`You must enable notifications in settings.`);
        } else {
          modalError(`You must "Add to Home Screen" to enable notifications.`);
        }
      }
    });
    if (state.email && (state.push_available || state.fcm_push_available)) {
      $("topics[notifications-header] topic").appendChild($toggle_wrapper);
    }
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
        alertError("Server error");
        console.error(data);
      } else {
        state.unread_count = Number(data.unread_count);
        state.unseen_count = Number(data.unseen_count);
        if (navigator.setAppBadge) {
          navigator.setAppBadge(state.push_active ? state.unread_count : 0);
        }

        if (
          window.webkit &&
          window.webkit.messageHandlers &&
          window.webkit.messageHandlers["set-badge"] &&
          state.fcm_push_active
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
          (state.window_recently_focused || state.window_recently_loaded) &&
          (state.push_active || state.fcm_push_active)
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
      state.most_recent_error = error;
      alertError("Network error loading unread count");
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
        alertError("Server error");
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
      state.most_recent_error = error;
      alertError("Network error marking as read");
      console.error(error);
    });
};

window.addEventListener("focus", () => {
  state.window_recently_focused = true;
  setTimeout(() => {
    state.window_recently_focused = false;
  }, 5000);
  getMoreRecent();
  getUnreadCountUnseenCount();
});
window.addEventListener("load", () => {
  state.window_recently_loaded = true;
  setTimeout(() => {
    state.window_recently_loaded = false;
  }, 5000);
  getUnreadCountUnseenCount();
});
if (
  window.webkit ||
  window.matchMedia("(display-mode: standalone)").matches ||
  window.is_android ||
  1
) {
  $("body").setAttribute("app", "");
  state.is_app = true;
}
const focusChange = () => {
  if (
    document.activeElement?.tagName === "INPUT" ||
    document.activeElement?.tagName === "TEXTAREA"
  ) {
    $("body").removeAttribute("app");
  } else if (state.is_app) {
    $("body").setAttribute("app", "");
  }
  if (
    document.activeElement?.tagName === "INPUT" ||
    document.activeElement?.tagName === "TEXTAREA"
  ) {
    $("body").setAttribute("textarea-focused", "");
  } else {
    $("body").removeAttribute("textarea-focused");
  }
};
window.addEventListener("focusin", focusChange);
window.addEventListener("focusout", focusChange);
