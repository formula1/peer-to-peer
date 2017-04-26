const rebuildDiff = require("../rebuild-diff");
const Promise = require("es6-promise");
const TreeNode = require("./TreeNode");

const { findHead } = TreeNode;

module.exports = function(handler){
  var peerNodes = new Map();
  var broadcasters = new Set();
  handler.on("new-peer", function(info){
    peerNodes.set(info.id, {
      node: null,
      dirty: false,
    });
    refreshPeer(info.socket);
  });
  handler.on("refresh-peer", function(info){
    console.log("refreshing");
    var nodeInfo = peerNodes.get(info.id);
    nodeInfo.dirty = false;
    refreshPeer(info.socket);
  });
  function refreshPeer(peer){
    peer.send(JSON.stringify({
      type: "update-broadcaster-list",
      data: Array.from(broadcasters.values()),
    }));
    updateRemoteTree(peer.id);
    peer.on("message", (rawStr)=>{
      console.log("new message");
      var message = JSON.parse(rawStr);
      var info = peerNodes.get(peer.id);
      var oldInfo = !info.node ? null : info.node;
      switch(message.type){
        case "stop":
          return stopCommand(oldInfo, peer.id);
        case "broadcast":
          return broadcastCommand(oldInfo, peer.id);
        case "watch":
          return watchCommand(oldInfo, peer.id, message);
      }
    });
  }

  handler.on("delete-peer", function(info){
    if(!peerNodes.has(info.id)){
      return;
    }
    const nodeInfo = peerNodes.get(info.id);
    if(nodeInfo.dirty){
      clearTimeout(nodeInfo.dirty);
      nodeInfo.dirty = false;
    }
    nodeInfo.node && nodeInfo.node.destroySelf();
    peerNodes.delete(info.id);
  });

  function stopCommand(nodeInfo, peerId){
    console.log("stopped");
    if(!nodeInfo){
      return console.log(peerId, "isn't viewing anyone");
    }
    nodeInfo.destroySelf();
    peerNodes.set(peerId, {
      node: null,
      dirty: false,
    });
  }

  function broadcastCommand(nodeInfo, peerId){
    console.log("broadcasting");
    if(nodeInfo && !nodeInfo.parent){
      return console.log(peerId, "is already broadcasting");
    }
    nodeInfo && nodeInfo.destroySelf();
    createNode(peerId);
  }

  function watchCommand(nodeInfo, peerId, message){
    console.log("hit watch");
    if(!peerNodes.has(message.target)){
      return console.error("broadcaster ", message.target, " does not exist");
    }
    var target = peerNodes.get(message.target);
    var tHead = findHead(target.node);
    if(nodeInfo && findHead(nodeInfo).id === tHead.id){
      return console.log("already viewing this user");
    }
    if(nodeInfo){
      console.log("previously watching different broadcaster");
      nodeInfo.destroySelf();
    } else{
      console.log("no old node found");
    }
    var newNode = createNode(peerId);
    return tHead.addChild(newNode);
  }

  function updateRemoteTree(peerId){
    var node = peerNodes.get(peerId).node;
    const peerInfo = handler.getPeer(peerId);
    peerInfo.socket && peerInfo.socket.send(JSON.stringify({
      type: "update-tree-node",
      data: node ? node.formatToJSON() : null,
    }));
  }

  function broadcastBroadcasters(){
    var list = Array.from(broadcasters.values());
    console.log("updated broadcasters: ", list);
    Array.from(peerNodes.keys()).forEach(function(peerId){
      const peerInfo = handler.getPeer(peerId);
      peerInfo && peerInfo.socket && peerInfo.socket.send(JSON.stringify({
        type: "update-broadcaster-list",
        data: list,
      }));
    });
  }

  function createNode(id){
    var node = new TreeNode(id);
    peerNodes.set(id, {
      id,
      node,
      dirty: false,
    });
    node.on("dirty", function(){
      if(!peerNodes.has(id)){
        return;
      }
      var info = peerNodes.get(id);
      if(info.dirty){
        return;
      }
      var oldInfo = info.node ? info.node.formatToJSON() : null;
      var dirtyImmediate = setTimeout(function(){
        if(!peerNodes.has(id)){
          return;
        }
        var newInfo = peerNodes.get(id).node;
        newInfo = newInfo ? newInfo.formatToJSON() : null;
        nodeUpdated(oldInfo, newInfo);
        updateRemoteTree(id);
        info.dirty = false;
      });
      info.dirty = dirtyImmediate;
    });
    node.emit("dirty");
    return node;
  }

  function nodeUpdated(oldInfo, newInfo){
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
    rebuildConnections(oldInfo, newInfo);
  }

  function rebuildConnections(oldInfo, newInfo){
    var diff = rebuildDiff(oldInfo, newInfo);
    console.log("rebuilding", diff);
    return Promise.all(
      diff.remove.map(function(peer){
        return handler.deleteConnection(handler.formatConnectionId(oldInfo.id, peer));
      }).concat(
        diff.add.map(function(peer){
          return handler.createConnection(newInfo.id, peer);
        })
      )
    );
  }
};
