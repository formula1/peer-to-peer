var React = require("react");

var BroadcasterForm = require("./BroadcasterForm");
var DataView = require("./DataView");
var Broadcasters = require("./Broadcasters");
var TreeNode = require("./TreeNode");

module.exports = MainView;
function MainView(props){
  var {
    chooseBroadcaster,
    broadcastSelf,
    stopWatching,
  } = props.peerHandler;
  var {
    getDataEmitter,
    broadcastData,
  } = props.dataHandler;
  return (
    <div style={{ display: "flex", flexDirection: "row", justifyContent: "center" }}>
      <div style={{ width: "20%" }}>
        <Broadcasters
          chooseBroadcaster={chooseBroadcaster}
          broadcastSelf={broadcastSelf}
          stopWatching={stopWatching}
        />
        <TreeNode />
      </div>
      <div style={{ flexGrow: 1, textAlign: "center" }}>
        <BroadcasterForm broadcastData={broadcastData}/>
        <DataView dataEmitter={getDataEmitter()}/>
      </div>
    </div>
  );
}
