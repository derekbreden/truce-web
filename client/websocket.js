const reconnectWs = () => {
  state.ws = new WebSocket(`wss://${window.location.host}`);
  state.ws.addEventListener("message", (event) => {
    if (event?.data === "UPDATE") {
      getMoreRecent();
    }
  });
  state.ws.addEventListener("open", () => {
    // Tell the websocket we are on a new path
    try {
      state.ws.send(JSON.stringify({ path: state.path }));
    } catch(e) {
      console.error(e);
    }
  });
  state.ws.addEventListener("close", (event) => {
    state.ws.close();
    setTimeout(reconnectWs, 10000);
  });
};
reconnectWs();