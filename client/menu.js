const showMenu = () => {
  if (!localStorage.getItem(`${window.local_storage_key}:agreed`)) {
    modalInfo(`Please tap "Join the Discussion" to agree to these terms.`);
    return;
  }
  const $menu = $(
    `
    menu-wrapper
      modal-bg
      menu
        links
          a[href=/]
            icon[welcome]
            p Terms and conditions
          a[href=/topics]
            icon[topics]
            p Topics
          a[href=/tags]
            icon[tag]
            p Tags
          a[href=/favorites]
            icon[favorites]
            p Favorites
          a[href=/notifications][unread=$1]
            icon[notifications]
            p Alerts
    `,
    [Boolean(state.unread_count)],
  );
  $menu
    .$("icon[welcome]")
    .appendChild($("icons icon[welcome] svg").cloneNode(true));
  $menu
    .$("icon[topics]")
    .appendChild($("footer icon[topics] svg").cloneNode(true));
  $menu.$("icon[tag]").appendChild($("footer icon[tag] svg").cloneNode(true));
  $menu
    .$("icon[favorites]")
    .appendChild($("footer icon[favorites] svg").cloneNode(true));
  $menu
    .$("icon[notifications]")
    .appendChild($("footer icon[notifications] svg").cloneNode(true));
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
  if (state.user_id) {
    const $settings = $(
      `
        a[href=/]
          icon[settings]
          p Account settings
      `,
    );
    $settings
      .$("icon[settings]")
      .appendChild($("icons icon[settings] svg").cloneNode(true));
    $settings.on("click", ($event) => {
      $event.preventDefault();
      menuCancel();
      goToPath("/settings");
    });
    $menu.$("links").appendChild($settings);
  }
  if (state.email) {
    const $signed_in = $(
      `
      signed-in
        button[sign-out] Log out
      `,
    );
    $signed_in.$("[sign-out]").on("click", () => {
      $signed_in.$("[sign-out]").setAttribute("disabled", "");
      state.user_id = "";
      state.display_name = "";
      state.profile_picture_uuid = "";
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
          goToPath("/topics");
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
            modalInfo("You have been signed in to your existing account");
          } else if (data.created_account) {
            modalInfo("You have created a new account");
          }
        })
        .catch(function (error) {
          $sign_in.$("info")?.remove();
          signInError("Network error");
        });
    });
    $menu.$("menu").appendChild($sign_in);
  }
  $menu.$("menu").appendChild(
    $(
      `
      p[notice]
        span Email us at
        a[href="mailto:derek@truce.net"] derek@truce.net
        span to provide feedback or report inappropriate activity.
      `,
    ),
  );
  $("modal-bg")?.parentElement?.remove();
  $("body").appendChild($menu);
};
$("header").on("click", () => {
  goToPath(state.path);
})
$("hamburger").forEach(($el) => {
  $el.on("click", ($event) => {
    $event.stopPropagation();
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
