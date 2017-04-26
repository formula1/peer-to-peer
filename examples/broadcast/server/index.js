const rebuildDiff = require("../rebuild-diff");
const Promise = require("es6-promise");
const TreeNode = require("./TreeNode");
const { findHead } = TreeNode;

const { constructRTC } = require("../../../lib/server/rtc-lifecycle");
const DESTROY_TIMEOUT = 5000;

var pending = new Map();
var peerNodes = new Map();
var broadcasters = new Set();
module.exports = function(peer){
  if(pending.has(peer.id)){
    var info = peerNodes.get(peer.id);
    if(info.connection){
      throw new Error("this peer already has a connection");
    }
    info.connection = peer;
    clearTimeout(pending.get(peer.id));
    if(info.dirty){
      info.dirty = false;
      var node = peerNodes.get(peer.id).node;
      peer.send(JSON.stringify({
        type: "update-tree-node",
        data: node ? node.formatToJSON() : null,
      }));
    }
  } else{
    peerNodes.set(peer.id, {
      connection: peer,
      node: null,
      dirty: false,
    });
  }
  refreshPeer(peer);
  function refreshPeer(peer){
    peer.send(JSON.stringify({
      type: "update-broadcaster-list",
      data: Array.from(broadcasters.values()),
    }));
    var node = peerNodes.get(peer.id).node;
    peer.send(JSON.stringify({
      type: "update-tree-node",
      data: node ? node.formatToJSON() : null,
    }));
    if(node){
      if(node.parent){
        createRTCConnection(peerNodes, node.parent.id, peer.id);
      }
      node.children.forEach(function(child){
        createRTCConnection(peerNodes, peer.id, child.id);
      });
    }
  }

  peer.on("close", ()=>{
    var info = peerNodes.get(peer.id);
    info.connection = null;
    pending.set(peer.id, setTimeout(()=>{
      pending.delete(peer.id);
      var info = peerNodes.get(peer.id);
      if(!info){
        return;
      }
      if(info.dirty){
        clearTimeout(info.dirty);
        info.dirty = false;
      }
      info.node && info.node.destroySelf();
      peerNodes.delete(peer.id);
    }, DESTROY_TIMEOUT));
  });
  peer.on("message", (rawStr)=>{
    var message = JSON.parse(rawStr);
    var info = peerNodes.get(peer.id);
    var oldInfo = !info.node ? null : info.node;
    switch(message.type){
      case "stop":
        console.log("stopped");
        if(!oldInfo){
          return console.log(peer.id, "isn't viewing anyone");
        }
        oldInfo.destroySelf();
        info.node = null;
        peerNodes.set(peer.id, {
          connection: peer,
          node: null,
          dirty: false,
        });
        return;
      case "broadcast":
        console.log("broadcasting");
        if(oldInfo && !oldInfo.parent){
          return console.log(peer.id, "is already broadcasting");
        }
        oldInfo && oldInfo.destroySelf();
        createNode(peer);
        return;
      case "watch":
        console.log("hit watch");
        if(!peerNodes.has(message.target)){
          return console.error("broadcaster ", message.target, " does not exist");
        }
        var target = peerNodes.get(message.target);
        var tHead = findHead(target.node);
        if(oldInfo && findHead(oldInfo).id === tHead.id){
          return console.log("already viewing this user");
        }
        if(oldInfo){
          console.log("previously watching different broadcaster");
          oldInfo.destroySelf();
        } else{
          console.log("no old node found");
        }
        var newNode = createNode(peer);
        return tHead.addChild(newNode);
    }
  });
};

function broadcastBroadcasters(){
  var list = Array.from(broadcasters.values());
  console.log(list);
  Array.from(peerNodes.values()).forEach(function(info){
    info.connection && info.connection.send(JSON.stringify({
      type: "update-broadcaster-list",
      data: list,
    }));
  });
}

function createNode(connection){
  var node = new TreeNode(connection.id);
  peerNodes.set(connection.id, {
    connection,
    node,
    dirty: false,
  });
  node.on("dirty", function(){
    var info = peerNodes.get(connection.id);
    if(!info || info.dirty){
      return;
    }
    var oldInfo = info.node ? info.node.formatToJSON() : null;
    var dirtyImmediate = setTimeout(function(){
      var newInfo = info.node ? info.node.formatToJSON() : null;
      function isDead(info){
        return !info || !info.alive;
      }
      if(isDead(oldInfo) && isDead(newInfo)){
        return console.log("dead node should not be dirty");
      }
      if(isDead(newInfo)){
        if(!oldInfo.parent){
          console.log("was a broadcaster");
          if(broadcasters.has(oldInfo.id)){
            broadcasters.delete(oldInfo.id);
            broadcastBroadcasters();
          }
        }
      } else if(!newInfo.parent){
        if(!broadcasters.has(newInfo.id)){
          broadcasters.add(newInfo.id);
          broadcastBroadcasters();
        }
      }
      if(info.connection){
        info.connection.send(JSON.stringify({
          type: "update-tree-node",
          data: newInfo,
        }));
      }
      rebuildConnections(oldInfo, newInfo, peerNodes);
      info.dirty = false;
    });
    info.dirty = dirtyImmediate;
  });
  node.emit("dirty");
  return node;
}

function rebuildConnections(oldInfo, newInfo, peers){
  var diff = rebuildDiff(oldInfo, newInfo);
  console.log("rebuilding", diff);
  return Promise.all(
    diff.remove.map(function(peer){
      return remoteStopConnection(peers, oldInfo.id, peer);
    }).concat(
      diff.add.map(function(peer){
        return createRTCConnection(peers, newInfo.id, peer);
      })
    )
  );
}

function remoteStopConnection(peers, aId, bId){
  if(peers.has(aId)){
    var aConnection = peers.get(aId).connection;
    aConnection && aConnection.send(JSON.stringify({
      for: "webrtc",
      type: "stop",
      originator: bId,
      target: aId,
    }));
  }
  if(peers.has(bId)){
    var bConnection = peers.get(bId).connection;
    bConnection && bConnection.send(JSON.stringify({
      for: "webrtc",
      type: "stop",
      originator: aId,
      target: bId,
    }));
  }
}

function createRTCConnection(peers, aId, bId){
  if(!peers.has(aId)){
    return;
  }
  if(!peers.has(bId)){
    return;
  }
  var aConnection = peers.get(aId).connection;
  var bConnection = peers.get(bId).connection;
  if(aConnection && bConnection){
    constructRTC(aConnection, bConnection).then(function(){
      console.log("constructed connection");
    }, function(err){
      console.error("failed construction of connection", err);
    });
  }
}
