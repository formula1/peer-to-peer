/* global document window, WebSocket */

require("webrtc-adapter");

var React = require("react");
var { render } = require("react-dom");
var { Provider } = require("react-redux");
var PeerHandler = require("./peer-handler");
var DataHandler = require("./data-handler");
var MainView = require("./view/MainView");

var ws = new WebSocket(
  "ws://" + window.location.hostname + ":" + window.location.port + window.location.pathname
);

const peerHandler = PeerHandler(ws);
const dataHandler = DataHandler(peerHandler.getStore());

render(
  <Provider store={peerHandler.getStore()}>
    <MainView peerHandler={peerHandler} dataHandler={dataHandler} />
  </Provider>,
  document.getElementById("root")
);
