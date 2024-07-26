// Forgot Password
const showForgotPassword = () => {
  const $modal = $(
    `
    modal-bg
    modal[password-help]
      input[type=email][placeholder=Email][autocomplete=email][maxlength=255]
      button[submit] Reset password
      button[alt][cancel] Cancel
    `
  );
  const modalCancel = () => {
    $modal.remove();
  };
  $modal.$("[cancel]").on("click", modalCancel);
  $modal.$("modal-bg").on("click", modalCancel);
  const passwordError = (message) => {
    $modal.$("[password-help]").appendChild(
      $(
        `
        error[show] $1
        `,
        [ message ]
      )
    );
  };
  $modal.$("[type=email]").on("focus", () => {
    $modal.$("error")?.remove();
  });
  $modal.$("[type=email]").on("keyup", (ev) => {
    if (ev.key === "Enter") {
      $modal.$("[submit]").click();
    }
  });
  $modal.$("[submit]").on("click", () => {
    $modal.$("error")?.remove();
    const email = $modal.$("[type=email]").value;
    if (!$modal.$("[type=email]").checkValidity() || !email) {
      passwordError("Please enter a valid email address");
      return;
    }
    $modal.$("[password-help]").appendChild(
      $(
        `
        info[show] Validating...
        `
      )
    );
    $modal.$("[type=email]").setAttribute("disabled", "");
    $modal.$("[submit]").setAttribute("disabled", "");
    $modal.$("[cancel]").setAttribute("disabled", "");
    fetch("/session", {
      method: "POST",
      body: JSON.stringify({
        email,
      }),
    })
      .then((response) => response.json())
      .then(function (data) {
        $modal.$("info")?.remove();
        if (data.error || !data.success) {
          $modal.$("[type=email]").removeAttribute("disabled");
          $modal.$("[submit]").removeAttribute("disabled");
          $modal.$("[cancel]").removeAttribute("disabled");
          passwordError(data.error || "Server error");
          return;
        }
        modalCancel();
        modalInfo("An email was sent with password reset instructions.");
      })
      .catch(function (error) {
        $modal.$("info")?.remove();
        passwordError("Network error");
      });
  });
  $("body").appendChild($modal);
};

// Resetting Password
const showResetPassword = () => {
  const $modal = $(
    `
    modal-bg
    modal[password-reset]
      input[type=password][placeholder=New password][autocomplete=new-password][maxlength=255]
      button[submit] Set password
      button[alt][cancel] Cancel
    `
  );
  const modalCancel = () => {
    $modal.remove();
    state.reset_token_uuid = "";
  };
  $modal.$("[cancel]").on("click", modalCancel);
  $modal.$("modal-bg").on("click", modalCancel);
  const passwordError = (message) => {
    $modal.$("[password-reset]").appendChild(
      $(
        `
        error[show] $1
        `,
        [ message ]
      )
    );
  };
  $modal.$("[type=password]").on("focus", () => {
    $modal.$("error")?.remove();
  });
  $modal.$("[type=password]").on("keyup", (ev) => {
    if (ev.key === "Enter") {
      $modal.$("[submit]").click();
    }
  });
  $modal.$("[submit]").on("click", () => {
    passwordError();
    const password = $modal.$("[type=password]").value;
    if (!password) {
      passwordError("Please enter a new password");
      return;
    }
    $modal.$("[password-reset]").appendChild(
      $(
        `
        info[show] Validating...
        `
      )
    );
    $modal.$("[type=password]").setAttribute("disabled", "");
    $modal.$("[submit]").setAttribute("disabled", "");
    $modal.$("[cancel]").setAttribute("disabled", "");
    fetch("/session", {
      method: "POST",
      body: JSON.stringify({
        reset_token_uuid: state.reset_token_uuid,
        password,
      }),
    })
      .then((response) => response.json())
      .then(function (data) {
        $modal.$("info")?.remove();
        if (data.error || !data.success) {
          $modal.$("[type=password]").removeAttribute("disabled");
          $modal.$("[submit]").removeAttribute("disabled");
          $modal.$("[cancel]").removeAttribute("disabled");
          passwordError(data.error || "Server error");
          return;
        }
        passwordResetCancel();
        modalInfo("Your password has been set");
      })
      .catch(function (error) {
        $modal.$("info")?.remove();
        passwordError("Network error");
      });
  });
  $("body").appendChild($modal);
};