// Keep track of focused element and its cursor
const beforeDomUpdate = () => {
  state.active_element = document.activeElement;
  state.active_element_state = {
    selectionStart: state.active_element?.selectionStart,
    selectionEnd: state.active_element?.selectionEnd,
    bodyScrollTop: $("main-content-wrapper[active]").scrollTop,
  };
};

// Restore focused element and its cursor
const afterDomUpdate = () => {
  if (state.active_element) {
    state.active_element.focus();
    state.active_element.selectionStart =
      state.active_element_state.selectionStart;
    state.active_element.selectionEnd =
      state.active_element_state.selectionEnd;
    $("main-content-wrapper[active]").scrollTop = state.active_element_state.bodyScrollTop;
  }
};