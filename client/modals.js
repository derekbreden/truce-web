// Generic modal info
const modalInfo = (message) => {
  const $modal = $(
    `
    modal-wrapper
      modal[info]
        info $1
        button[close] Okay
      modal-bg
    `,
    [ message ]
  );
  const modalCancel = () => {
    $modal.remove();
  };
  $modal.$("[close]").on("click", modalCancel);
  $modal.$("modal-bg").on("click", modalCancel);
  $("modal-wrapper")?.remove();
  $("body").appendChild($modal);
};

// Generic modal error
const modalError = (message) => {
  const $modal = $(
    `
    modal-wrapper
      modal[error]
        error $1
        button[close] Okay
      modal-bg
    `,
    [ message ]
  );
  const modalCancel = () => {
    $modal.remove();
  };
  $modal.$("[close]").on("click", modalCancel);
  $modal.$("modal-bg").on("click", modalCancel);
  $("modal-wrapper")?.remove();
  $("body").appendChild($modal);
};

// Generic alert sliding down from top
let alert_timeout = 0;
const alertInfo = (message) => {
  const $alert = $(
      `
      alert
        info $1
      `,
      [message]
    );
  clearTimeout(alert_timeout);
  if ($("alert-wrapper")) {
    $alert.style.zIndex = (Number($("alert-wrapper alert").length || 1) + 1) * -1;
    $("alert-wrapper").appendChild($alert);
  } else {
    $alert.style.zIndex = -1;
    const $alert_wrapper = $(
      `
      alert-wrapper
        $1
      `,
      [ $alert ]
    );
    $("body").appendChild($alert_wrapper);
  }
  alert_timeout = setTimeout(() => {
    $("alert-wrapper")?.remove();
  }, 5000);
}

// Generic alert error sliding down from top
const alertError = (message) => {
  const $alert = $(
      `
      alert
        error $1
      `,
      [message]
    );
  clearTimeout(alert_timeout);
  if ($("alert-wrapper")) {
    $alert.style.zIndex = (Number($("alert-wrapper alert").length || 1) + 1) * -1;
    $("alert-wrapper").appendChild($alert);
  } else {
    $alert.style.zIndex = -1;
    const $alert_wrapper = $(
      `
      alert-wrapper
        $1
      `,
      [ $alert ]
    );
    $("body").appendChild($alert_wrapper);
  }
  alert_timeout = setTimeout(() => {
    $("alert-wrapper")?.remove();
  }, 5000);
}