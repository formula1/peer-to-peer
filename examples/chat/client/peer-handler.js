var { createStore } = require("redux");

var onRTCPeer = require("../../../lib/client/on-rtc-peer");
var peerReducer = require("./store/reducers");
var { updateBroadcasters, updateTreeNode, addPeer, deletePeer } = require("./store/actions");

module.exports = function(ws){
  var store = createStore(peerReducer);

  ws.addEventListener("message", (e) =>{
    var message = JSON.parse(e.data);
    switch(message.type){
      case "update-tree-node":
        var newInfo = message.data;
        return store.dispatch(updateTreeNode(newInfo));
      case "update-broadcaster-list":
        console.log("recieved broadcaster event", message);
        return store.dispatch(updateBroadcasters(message.data));
    }
  });

  function isExpectingPeer(treeNode, peerId){
    if(peerId === treeNode.parent){
      return true;
    }
    if(treeNode.children.indexOf(peerId) > -1){
      return true;
    }
    return false;
  }

  function tryToClosePeer(peer){
    console.log(peer.rtc.signalingState);
    peer.rtc.signalingState.toLowerCase() !== "closed" && peer.rtc.close();
  }

  onRTCPeer(ws, function(peer){
    var { treeNode, peers } = store.getState();
    if(!treeNode){
      tryToClosePeer(peer);
      throw new Error("peer " + peer.id + " was not expected");
    }
    if(!isExpectingPeer(treeNode, peer.id)){
      tryToClosePeer(peer);
      throw new Error("peer " + peer.id + " was not expected");
    }
    if(peer.id in peers){
      tryToClosePeer(peers[peer.id]);
      console.log("closing old peer");
    }
    peer.rtc.addEventListener("close", function(){
      store.dispatch(deletePeer(peer));
    });
    store.dispatch(addPeer(peer));
  });

  return {
    chooseBroadcaster(peerId){
      if(store.getState().broadcasters.indexOf(peerId) === -1){
        console.error("this broadcaster is not available");
        throw "this broadcaster is not available";
      }
      console.log(peerId);
      ws.send(JSON.stringify({
        type: "watch",
        target: peerId,
      }));
    },
    broadcastSelf(){
      ws.send(JSON.stringify({
        type: "broadcast"
      }));
    },
    stopWatching(){
      ws.send(JSON.stringify({
        type: "stop"
      }));
    },
    getStore(){
      return store;
    }
  };
};
