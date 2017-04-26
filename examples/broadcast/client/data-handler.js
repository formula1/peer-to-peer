var { EventEmitter } = require("events");

module.exports = function(store){
  var dataEmitter = new EventEmitter();
  var currentState = store.getState();

  dataEmitter.on("data", function(data){
    var { peers, treeNode } = currentState;
    treeNode.children.forEach(function(id){
      if(peers[id]){
        peers[id].datachannel.send(data);
      }
    });
  });

  function isBroadcasting(){
    return currentState.treeNode && currentState.treeNode.parent === null;
  }

  function listenForData(e){
    dataEmitter.emit("data", e.data);
  }

  function parentExists(tree, peers){
    if(!tree){
      console.log("no tree found");
      return false;
    }
    if(!tree.parent){
      console.log("we are broadcasting");
      return false;
    }
    if(!(tree.parent in peers)){
      console.log("tree parent is not an availabel rtc connection");
      return false;
    }
    if(!peers[tree.parent].datachannel){
      console.log("There is no data channel to bind to");
      return false;
    }
    return true;
  }

  store.subscribe(()=>{
    var nextState = store.getState();
    var prevState = currentState;
    currentState = nextState;

    var prevPeers = prevState.peers;
    var nextPeers = nextState.peers;
    var prevTree = prevState.treeNode;
    var nextTree = nextState.treeNode;

    var hasPrevParent = parentExists(prevTree, prevPeers);
    var hasNextParent = parentExists(nextTree, nextPeers);

    if(!hasPrevParent && !hasNextParent){
      return console.log("wasn't watching, still not watching");
    }
    if(!hasPrevParent){
      console.log("wasn't watching, now watching");
      var nextParent = nextPeers[nextTree.parent];
      nextParent.datachannel.addEventListener("message", listenForData);
      return;
    }
    if(!hasNextParent){
      console.log("was watching, no longer watching");
      var prevParent = prevPeers[prevTree.parent];
      prevParent.datachannel.removeEventListener("message", listenForData);
      return;
    }
    var prevP = prevPeers[prevTree.parent];
    var nextP = nextPeers[nextTree.parent];
    if(prevP === nextP){
      console.log("watching same parent");
      return;
    }
    console.log("watching diff parents parent");
    prevP.datachannel.removeEventListener("message", listenForData);
    nextP.datachannel.addEventListener("message", listenForData);
  });

  return {
    isBroadcasting(){
      return isBroadcasting();
    },
    getDataEmitter(){
      return dataEmitter;
    },
    broadcastData(data){
      if(isBroadcasting()){
        dataEmitter.emit("data", data);
      }
    }
  };
};
