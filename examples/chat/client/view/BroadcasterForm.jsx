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

class BroadcasterForm extends React.Component {
  constructor(props, o){
    super(props, o);
    this.state = { buffer: "" };
    this.sendData = this.sendData.bind(this);
  }
  sendData(e){
    e.preventDefault();
    this.props.broadcastData && this.props.broadcastData(this.state.buffer);
    this.setState({ buffer: "" });
  }
  render(){
    var { treeNode } = this.props;
    if(!treeNode || treeNode.parent !== null){
      console.log("not broadcasting", treeNode);
      return null;
    }
    var { buffer } = this.state;
    return (
      <form onSubmit={this.sendData}>
        <input
          type="text" value={buffer}
          onChange={(e)=> this.setState({ buffer: e.target.value }) }
        />
        <button type="submit">Send</button>
      </form>
    );
  }
}

module.exports = connect(
  mapStateToProps,
  mapDispatchToProps
)(BroadcasterForm);
