const renderName = (display_name, display_name_index) => {
  return (
    display_name +
    (Number(display_name_index) ? " (" + display_name_index + ")" : "")
  );
};