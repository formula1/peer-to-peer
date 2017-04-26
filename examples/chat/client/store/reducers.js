const rebuildDiff = require("../../rebuild-diff");
const initialState = { treeNode: null, broadcasters: [], peers: {} };
module.exports = function(state = initialState, action){
  switch(action.type){
    case "UPDATE_BROADCASTERS":
      return Object.assign({}, state, {
        broadcasters: action.data
      });
    case "UPDATE_TREENODE":
      var peers = state.peers;
      var diff = rebuildDiff(state.treeNode, action.data);
      diff.remove.forEach(function(peerId){
        if(!(peerId in  peers)){
          return;
        }
        var peer = peers[peerId];
        peer.rtc && peer.rtc.close();
      });
      var updatedPeers = Object.keys(peers).filter(function(peerId){
        return diff.remove.indexOf(peerId) === -1;
      });
      return Object.assign({}, state, {
        treeNode: action.data,
        peers: updatedPeers.reduce(function(obj, peerId){
          obj[peerId] = peers[peerId];
          return obj;
        }, {})
      });
    case "ADD_PEER":{
      let peer = action.data;
      return Object.assign({}, state, {
        peers: Object.assign({}, state.peers, {
          [peer.id]: peer
        }),
      });
    }
    case "DELETE_PEER":{
      let peer = action.data;
      if(!(peer.id in state.peers)){
        return state;
      }
      return Object.assign({}, state, {
        peers: Object.keys(state.peers).reduce(function(obj, peerId){
          if(peerId !== peer.id){
            obj[peerId] = state.peers[peerId];
          }
          return obj;
        }, {}),
      });
    }
    default:
      return state;
  }
};
