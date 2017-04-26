var React = require("react");
var { connect } = require("react-redux");

const mapStateToProps = function(state){
  return {
    treeNode: state.treeNode,
    broadcasters: state.broadcasters
  };
};

const mapDispatchToProps = function(){
  return {};
};

module.exports = connect(
  mapStateToProps,
  mapDispatchToProps
)(function(props){
  var { broadcasters, treeNode, chooseBroadcaster, broadcastSelf, stopWatching } = props;
  var parent = treeNode && treeNode.parent;
  var self = treeNode && treeNode.id;
  return (
    <ul>{
      [
        (<li>
          <a href="#" onClick={(e)=>{
            e.preventDefault();
            stopWatching();
          }}>Stop Watching</a>
        </li>),
        (<li>
          <a href="#" onClick={(e)=>{
            e.preventDefault();
            broadcastSelf();
          }}>Broadcast</a>
        </li>),

      ].concat(
        broadcasters.map(function(broadcaster){
          return (<li>
            <a href="#" className={[
              parent === broadcaster ? "watching" : self === broadcaster ? "self" : ""
            ]} onClick={(e)=>{
              e.preventDefault();
              chooseBroadcaster(broadcaster);
            }}>{broadcaster}</a>
          </li>);
        })
      )
    }</ul>
  );
});
