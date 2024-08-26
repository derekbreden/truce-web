// Get url params for options
const search_string = document.location.search.split("?").pop();
const params = search_string
  .split("&")
  .map((p) => p.split("="))
  .reduce((p, c) => {
    p[c[0]] = c[1];
    return p;
  }, {});

// Set Defaults
const test_mode = params.test_mode || "playback"; // "record"; // "end2end"; // "playback";
const delay = params.delay || 0;
const original_session_uuid = localStorage.getItem(`:session_uuid`);
if (test_mode === "record") {
  localStorage.removeItem("session_uuid");
}
const tests = [];

// Sleep function for delay specified
const sleep = (ms) => {
  expect("main-content");
  return new Promise((resolve) => setTimeout(resolve, ms || delay));
}

// Sign up
tests.push(async () => {
  $("header hamburger").click();
  await sleep();
  $("sign-in [submit]").click();
  await sleep();
  expect("sign-in error", "Please enter a valid email address");
  await sleep();
  $("sign-in [type=email]").value = "testemail@testemail.com";
  await sleep();
  $("sign-in [type=password]").value = "1234";
  await sleep();
  $("sign-in [submit]").click();
  expect("sign-in info", "Validating...");
});

// Signed in
tests.push(async () => {
  $("header hamburger").click();
  await sleep();
  expect("signed-in button", "Log out");
  await sleep();
  $('menu [href="/topics"]').click();
});

// Clicked /topics
tests.push(async () => {
  expect("add-new [submit]", "Add topic");
  await sleep();
  $("add-new [title]").value = "Go to your local food pantry";
  await sleep();
  $("add-new [body]").value =
    "Many people are hungry, and the network of food pantries in the United States is an excellent resource for meeting the needs of many. They too, need our help.";
  await sleep();
  $("add-new [submit]").click();
  $("test-wrapper")?.remove();

  // Expect page-updated
  $("body").on(
    "page-updated",
    async () => {
      const this_test = tests.shift();
      $("test-wrapper")?.remove();
      await sleep();
      if (this_test) {
        this_test();
      }
    },
    { once: true },
  );
});

// Submitted topic
tests.push(async () => {
  expect("topic:first-child h2", "Go to your local food pantry");
  $("test-wrapper")?.remove();
  $("topic:first-child h2").click();
  $("test-wrapper")?.remove();
});

// Clicked topic
tests.push(async () => {
  expect("[add-new-comment] button", "Add comment");
  await sleep();
  $("[add-new-comment] button").click();
  await sleep();
  $("add-new[comment] [display-name]").value = "John Testerson Sr";
  await sleep();
  $("add-new[comment] [body]").value =
    "Would you like to come visit my town and help?";
  await sleep();
  $("add-new[comment] [submit]").click();
  $("test-wrapper")?.remove();

  // Expect page-updated
  $("body").on(
    "page-updated",
    async () => {
      const this_test = tests.shift();
      await sleep();
      if (this_test) {
        this_test();
      }
    },
    { once: true },
  );
});

// Submitted comment
tests.push(async () => {
  expect("comments comment");
  await sleep();
  expect("comments comment h3 b", "John Testerson Sr:");
  await sleep();
  $("header hamburger").click();
  await sleep();
  $('menu [href="/recent"]').click();
  $("test-wrapper")?.remove();
});

// Clicked /recent
tests.push(async () => {
  expect("activities h3");
  await sleep();
  testCleanup();
});

// Fire each test function on each page render
$("body").on("page-rendered", async () => {
  const this_test = tests.shift();
  await sleep();
  if (this_test) {
    this_test();
  }
});

const testCleanup = () => {
  localStorage.setItem(`:session_uuid`, original_session_uuid);
  history.replaceState({ path_index: state.path_index }, "", "/test");
  if (test_mode !== "playback") {
    originalFetch("/test_cleanup", {
      method: "POST",
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("Cleanup returned", data);
      });
  }
};
