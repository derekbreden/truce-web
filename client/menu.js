const showMenu = () => {
  const $menu = $(
    `
    menu-wrapper
      modal-bg
      menu
        links
          a[href=/]
            icon[welcome]
            p Welcome
          a[href=/topics]
            icon[topics]
            p Topics
          a[href=/recent]
            icon[recent]
            p Comments
          a[href=/favorites]
            icon[favorites]
            p Favorites
          a[href=/notifications][unread=$1]
            icon[notifications]
            p Notifications
    `,
    [ Boolean(state.unread_count) ]
  );
  $menu.$("icon[welcome]").appendChild(
    $("icons icon[welcome] svg").cloneNode(true),
  );
  $menu.$("icon[topics]").appendChild(
    $("footer icon[topics] svg").cloneNode(true),
  );
  $menu.$("icon[recent]").appendChild(
    $("footer icon[recent] svg").cloneNode(true),
  );
  $menu.$("icon[favorites]").appendChild(
    $("footer icon[favorites] svg").cloneNode(true),
  );
  $menu.$("icon[notifications]").appendChild(
    $("footer icon[notifications] svg").cloneNode(true),
  );
  const menuCancel = () => {
    $menu.remove();
  };
  $menu.$("modal-bg").on("click", menuCancel);

  $menu.$("links a").forEach(($el) => {
    $el.on("click", ($event) => {
      $event.preventDefault();
      menuCancel();
      goToPath($el.getAttribute("href"));
    });
  });
  if (state.email) {
    const $settings = $(
      `
        a[href=/]
          icon[settings]
          p Account Settings
      `,
    );
    $settings.$("icon[settings]").appendChild(
      $("icons icon[settings] svg").cloneNode(true),
    );
    $settings.on("click", ($event) => {
        $event.preventDefault();
        menuCancel();
        const $settings_modal = $(
          `
          modal-wrapper
            modal[info]
              p You may change your display name here.
              input[type=text][display-name][value=$1]
              button-wrapper
                button[alt][cancel] Cancel
                button[save] Save Changes
              p You may also remove your account.
              button[remove][alt] Remove Account
            modal-bg
          `,
          [ state.display_name ]
        );
        const settingsModalCancel = () => {
          $settings_modal.remove();
        };
        $settings_modal.$("[save]").on("click", () => {
          settingsModalCancel();
          modalInfo("Saving display name...");
          const new_display_name = $settings_modal.$("[display-name]").value;
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
                modalInfo("Display name saved.")
              }
            })
            .catch(function () {
              alertError("Network error");
            });
        });
        $settings_modal.$("[remove]").on("click", () => {
          $event.preventDefault();
          menuCancel();
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
                  alertError("Server error removing account");
                } else {
                  $("modal-wrapper")?.remove();
                  modalInfo("Account removed");
                  state.user_id = "";
                  state.display_name = "";
                  state.email = "";
                  state.reset_token_uuid = "";
                  localStorage.removeItem("session_uuid");
                  state.cache = {};
                  goToPath("/");
                }
              })
              .catch((error) => {
                alertError("Network error removing account");
              });
            });
            $remove_modal.$("[cancel]").on("click", removeModalCancel);
            $remove_modal.$("modal-bg").on("click", removeModalCancel);
            $("modal-wrapper")?.remove();
            $("body").appendChild($remove_modal);
        });
        $settings_modal.$("[cancel]").on("click", settingsModalCancel);
        $settings_modal.$("modal-bg").on("click", settingsModalCancel);
        $("modal-wrapper")?.remove();
        $("body").appendChild($settings_modal);
    });
    $menu.$("links").appendChild($settings);
    const $signed_in = $(
      `
      signed-in
        toggle-wrapper[disabled=$1][active=$2]
          toggle-text Subscribe to replies
          toggle-button
            toggle-circle
        button[sign-out] Log out
      `,
      [
        !state.push_available && !state.fcm_push_available,
        state.push_active || state.fcm_push_active,
      ],
    );
    $signed_in.$("toggle-wrapper").on("click", () => {
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
        menuCancel();
        if (state.fcm_push_denied) {
          modalError(`You must enable notifications in settings.`);
        } else {
          modalError(`You must "Add to Home Screen" to enable notifications.`);
        }
      }
    });
    $signed_in.$("[sign-out]").on("click", () => {
      $signed_in.$("[sign-out]").setAttribute("disabled", "");
      state.user_id = "";
      state.display_name = "";
      state.email = "";
      state.reset_token_uuid = "";

      // Workaround for replit Webview not supporting Set-Cookie
      localStorage.removeItem("session_uuid");
      // END Workaround

      // Tell server to clear the cookie and set a new one
      fetch("/session", {
        method: "POST",
        body: JSON.stringify({
          logout: true,
        }),
      })
        .then((response) => response.json())
        .then(function (data) {
          state.cache = {};
          startSession();
          menuCancel();
        });
    });
    $menu.$("menu").appendChild($signed_in);
  } else {
    const $sign_in = $(
      `
      sign-in
        input[type=email][placeholder=Email][autocomplete=email][maxlength=255]
        password-wrapper
          input[type=password][placeholder=Password][autocomplete=current-password][maxlength=255]
          password-help
        button[submit] Sign up / Sign in
        button[alt][cancel] Cancel
      `,
    );
    $sign_in.$("password-help").on("click", () => {
      menuCancel();
      showForgotPassword();
    });
    $sign_in.$("[cancel]").on("click", menuCancel);
    const signInError = (error) => {
      $sign_in.appendChild(
        $(
          `
          error
            $1
          `,
          [error],
        ),
      );
    };
    $sign_in.$("[type=email]").on("focus", () => {
      $sign_in.$("error")?.remove();
    });
    $sign_in.$("[type=password]").on("focus", () => {
      $sign_in.$("error")?.remove();
    });
    $sign_in.$("[type=email]").on("keyup", (ev) => {
      if (ev.key === "Enter") {
        $sign_in.$("[submit]").click();
      }
    });
    $sign_in.$("[type=password]").on("keyup", (ev) => {
      if (ev.key === "Enter") {
        $sign_in.$("[submit]").click();
      }
    });
    $sign_in.$("[submit]").on("click", () => {
      $sign_in.$("error")?.remove();
      const email = $sign_in.$("[type=email]").value;
      if (!$sign_in.$("[type=email]").checkValidity() || !email) {
        signInError("Please enter a valid email address");
        return;
      }
      const password = $sign_in.$("[type=password]").value;
      if (!password) {
        signInError("Please enter a password");
        return;
      }
      $sign_in.appendChild(
        $(
          `
        info Validating...
        `,
        ),
      );
      $sign_in.$("[type=email]").setAttribute("disabled", "");
      $sign_in.$("[type=password]").setAttribute("disabled", "");
      $sign_in.$("[submit]").setAttribute("disabled", "");
      $sign_in.$("[cancel]").setAttribute("disabled", "");
      fetch("/session", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
        }),
      })
        .then((response) => response.json())
        .then(function (data) {
          $sign_in.$("info")?.remove();
          if (data.error || !data.success) {
            $sign_in.$("[type=email]").removeAttribute("disabled");
            $sign_in.$("[type=password]").removeAttribute("disabled");
            $sign_in.$("[submit]").removeAttribute("disabled");
            $sign_in.$("[cancel]").removeAttribute("disabled");
            signInError(data.error || "Server error");
            return;
          }
          if (data.user_id) {
            state.user_id = data.user_id;
          }
          if (data.display_name) {
            state.display_name = data.display_name;
          }
          state.email = email;
          state.cache = {};
          startSession();
          menuCancel();
          if (data.signed_in) {
            modalInfo("You have been signed in to your existing account")
          } else if (data.created_account) {
            modalInfo("You have created a new account")
          }
        })
        .catch(function (error) {
          $sign_in.$("info")?.remove();
          signInError("Network error");
        });
    });
    $menu.$("menu").appendChild($sign_in);
  }
  $("modal-bg")?.parentElement?.remove();
  $("body").appendChild($menu);
};
$("hamburger").forEach(($el) => {
  $el.on("click", () => {
    if ($("menu-wrapper")) {
      $("menu-wrapper").remove();
    } else {
      showMenu();
    }
  });
});
$("[href]").forEach(($el) => {
  $el.on("click", ($event) => {
    $("menu-wrapper")?.remove();
    $event.preventDefault();
    goToPath($el.getAttribute("href"));
  });
});
