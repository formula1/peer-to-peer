

module.exports = function(oldNode, newNode){
  if(!oldNode && !newNode){
    return {
      add: [],
      remove: [],
    };
  }
  if(!oldNode){
    return {
      add: (newNode.parent ? [newNode.parent] : []).concat(newNode.children),
      remove: [],
    };
  }
  if(!newNode){
    return {
      add: [],
      remove: (oldNode.parent ? [oldNode.parent] : []).concat(oldNode.children),
    };
  }
  var toRemove = [];
  var toAdd = [];
  if(oldNode.parent !== newNode.parent){
    oldNode.parent && toRemove.push(oldNode.parent);
    newNode.parent && toAdd.push(newNode.parent);
  }
  toRemove = toRemove.concat(
    oldNode.children.filter(function(peer){
      return newNode.children.indexOf(peer) === -1;
    })
  );
  toAdd = toAdd.concat(
    newNode.children.filter(function(peer){
      return oldNode.children.indexOf(peer) === -1;
    })
  );
  return {
    remove: toRemove,
    add: toAdd
  };
};
