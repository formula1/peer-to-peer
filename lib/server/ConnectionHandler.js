const { EventEmitter } = require("events");
const Promise = require("es6-promise");

const { constructRTC } = require("./rtc-lifecycle");
const DESTROY_TIMEOUT = 5000;

module.exports = class ConnectionHandler extends EventEmitter {

  constructor(){
    super();
    this.pendingRemoval = new Map();
    this.connections = new Map();
    this.peerInfo = new Map();
  }

  addPeer(peer){
    const { pendingRemoval, peerInfo } = this;
    if(!pendingRemoval.has(peer.id)){
      console.log("new peer");
      peerInfo.set(peer.id, {
        id: peer.id,
        socket: peer,
        connections: new Set(),
      });
      this.emit("new-peer", peerInfo.get(peer.id));
    } else{
      console.log("old peer");
      var info = peerInfo.get(peer.id);
      if(info.socket){
        console.error("peer " + peer.id + " already has an active socket");
        throw new Error("peer " + peer.id + " already has an active socket");
      }
      info.socket = peer;
      clearTimeout(pendingRemoval.get(peer.id));
      pendingRemoval.delete(peer.id);
      Array.from(info.connections.values()).map((connectionId) =>
        this.recoverConnection(connectionId)
      );
      console.log("refreshing peer");
      this.emit("refresh-peer", info);
    }

    peer.on("close", ()=>{
      if(!peerInfo.has(peer.id)){
        return;
      }
      var info = peerInfo.get(peer.id);
      info.socket = null;
      pendingRemoval.set(peer.id, setTimeout(()=>{
        pendingRemoval.delete(peer.id);
        this.deletePeer(peer.id);
      }, DESTROY_TIMEOUT));
    });
  }

  listPeers(){
    return Array.from(this.peerInfo.values());

  }

  getPeer(id){
    return this.peerInfo.get(id);
  }

  deletePeer(id){
    const { peerInfo } = this;
    if(!peerInfo.has(id)){
      return;
    }
    var info = peerInfo.get(id);
    Array.from(info.connections.values()).map((connectionId)=>
      this.deleteConnection(connectionId)
    );
    peerInfo.delete(id);
    this.emit("delete-peer", info);

  }

  listConnections(){
    return Array.from(this.connections.values());
  }

  formatConnectionId(aId, bId){
    return [aId, bId].sort((a, b)=> a.localeCompare(b)).join("-");
  }
  getConnection(connectionId){
    this.connections.get(connectionId);
  }

  createConnection(aId, bId){
    var { peerInfo, connections } = this;
    if(!peerInfo.has(aId)){
      return Promise.reject("peer " + aId + " is unavailable");
    }
    if(!peerInfo.has(bId)){
      return Promise.reject("peer " + bId + " is unavailable");
    }
    var newConnectionId = this.formatConnectionId(aId, bId);
    if(connections.has(newConnectionId)){
      return Promise.reject("connection between " + aId + " and " + bId + " already exists");
    }
    this.connections.set(newConnectionId, {
      a: aId, b: bId
    });
    this.emit("create-connection", newConnectionId);
    return this.recoverConnection(newConnectionId);
  }

  recoverConnection(connectionId){
    var { peerInfo, connections } = this;
    if(!connections.has(connectionId)){
      return Promise.reject(connectionId + " is not an existant connection");
    }
    var { a, b } = connections.get(connectionId);
    var aSocket = peerInfo.get(a).socket;
    if(!aSocket){
      return Promise.reject("peer " + a + " socket not connected");
    }
    var bSocket = peerInfo.get(b).socket;
    if(!bSocket){
      return Promise.reject("peer " + b + " socket not connected");
    }
    return constructRTC(aSocket, bSocket).then((result)=>{
      console.log("constructed connection");
      this.emit("refresh-connection", connectionId);
      return result;
    }, function(err){
      console.error("failed construction of connection", err);
      throw err;
    });
  }

  deleteConnection(connectionId){
    var { peerInfo, connections } = this;
    if(!connections.has(connectionId)){
      return console.log("connection doesn't exist");
    }
    var connection = connections.get(connectionId);
    [connection.a, connection.b].forEach(function(id){
      if(!peerInfo.has(id)) return;
      var oId = id === connection.a ? connection.b : connection.a;
      var { socket, connections } = peerInfo.get(id);
      socket && socket.send(JSON.stringify({
        for: "webrtc",
        type: "stop",
        originator: oId,
        target: id,
      }));
      connections.delete(connectionId);
    });
    connections.delete(connectionId);
    this.emit("delete-connection", connectionId);
  }
};
