const { EventEmitter } = require("events");
const MAX_CHILDREN = 4;

class TreeNode extends EventEmitter {
  constructor(id){
    super();
    this.id = id;
    this.parent = null;
    this.children = new Map();
    this.weight = 1;
    this.alive = true;
  }
  formatToJSON(){
    return !this.alive ? null : {
      head: findHead(this),
      alive: this.alive,
      id: this.id,
      parent: this.parent ? this.parent.id : null,
      children: Array.from(this.children.keys()),
    };
  }
  addChild(treeNode){
    if(treeNode.parent){
      throw "node is parent of another tree";
    }
    if(this.children.length === MAX_CHILDREN){
      return findAvailableParent(this).addChild(treeNode);
    }
    this.emit("dirty");
    treeNode.emit("dirty");
    this.children.set(treeNode.id, treeNode);
    treeNode.parent = this;
    this.weight = this.weight + treeNode.weight;
  }
  removeChild(treeNode){
    if(!this.children.has(treeNode.id)){
      throw "this node is not a child";
    }
    this.emit("dirty");
    treeNode.emit("dirty");
    this.children.delete(treeNode.id);
    treeNode.parent = null;
    this.weight = this.weight - treeNode.weight;
  }
  destroySelf(){
    this.emit("dirty");
    this.alive = false;
    var head = findHead(this);
    if(head === this){
      return this.destroyTree();
    } else{
      return this.replaceSelf();
    }
  }
  destroyTree(){
    return Array.from(this.children.values()).map((child) =>{
      this.removeChild(child);
      child.destroySelf();
    });
  }
  replaceSelf(){
    var head = findHead(this);
    var children = this.children;
    var availableNode = this.parent;
    this.parent.removeChild(this);
    Array.from(children.values()).map((child)=>{
      if(availableNode.children.length === MAX_CHILDREN){
        availableNode = findAvailableParent(head);
      }
      this.removeChild(child);
      availableNode.addChild(child);
    });
  }
}

module.exports = TreeNode;
function findHead(curNode){
  while(curNode.parent){
    curNode = curNode.parent;
  }
  return curNode;
}
module.exports.findHead = findHead;

function findAvailableParent(curNode){
  do{
    var weightedChildren = Array.from(curNode.children.values()).sort(function(a, b){
      return a.weight - b.weight;
    });
    for(var i = 0, l = weightedChildren.length; i < l; i++){
      if(weightedChildren[i].children.length < MAX_CHILDREN){
        return weightedChildren[i];
      }
    }
    curNode = weightedChildren[0];
  }while(curNode);
}
