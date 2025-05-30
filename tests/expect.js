let passed = 0;
let failed = "";
const expect = (elem, text) => {
  $("main-content > test-wrapper")?.remove();
  if (!$(elem)) {
    failed = `${elem} not found`;
  } else if (text && $(elem).innerText !== text) {
    failed = `${elem} should be ${text} but is ${$(elem).innerText}`;
  } else {
    passed++;
  }
  if (failed) {
    $("main-content").prepend(
      $(
        `
        test-wrapper[style=margin-top:20px;]
          error $1
          info $2
        `,
        [
          failed,
          `${passed} tests passed`
        ],
      ),
    );
  } else {
    $("main-content").prepend(
      $(
        `
        test-wrapper
          pass $1
        `,
        [
          `${passed} tests passed`
        ],
      ),
    );
  }
};