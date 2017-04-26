

module.exports = {
  updateBroadcasters(newList){
    return {
      type: "UPDATE_BROADCASTERS",
      data: newList
    };
  },
  updateTreeNode(newNode){
    return {
      type: "UPDATE_TREENODE",
      data: newNode
    };
  },
  addPeer(peerConnection){
    return {
      type: "ADD_PEER",
      data: peerConnection
    };
  },
  deletePeer(peerConnection){
    return {
      type: "DELETE_PEER",
      data: peerConnection
    };
  },
};
