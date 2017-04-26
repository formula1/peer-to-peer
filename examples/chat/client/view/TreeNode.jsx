var React = require("react");
var { connect } = require("react-redux");

const mapStateToProps = function(state){
  return {
    treeNode: state.treeNode
  };
};

const mapDispatchToProps = function(){
  return {};
};

module.exports = connect(
  mapStateToProps,
  mapDispatchToProps
)(function(props){
  var { treeNode } = props;
  if(!treeNode){
    return (<h1>Not Connected</h1>);
  }
  console.log(treeNode);
  return (
    <div>
      <h3>{treeNode.parent ? treeNode.parent : "Broadcasting"}</h3>
      <ul>{
        treeNode.children.map(function(child){
          return (<li>{child}</li>);
        })
      }</ul>

    </div>
  );
});
