var React = require("react");

module.exports = class DataView extends React.Component {
  constructor(props, o){
    super(props, o);
    this.state = { buffer: "", content: "" };
    this.handleData = this.handleData.bind(this);
  }
  componentDidMount(){
    if(this.props.dataEmitter){
      this.props.dataEmitter.on("data", this.handleData);
    }
  }
  componentWillUmmount(){
    if(this.props.dataEmitter){
      this.props.dataEmitter.removeListener("data", this.handleData);
    }
  }
  componentWillReceiveProps(newProps){
    if(this.props.dataEmitter !== newProps.dataEmitter){
      if(this.props.dataEmitter){
        let dataEmitter = this.props.dataEmitter;
        dataEmitter.removeListener("data", this.handleData);
      }
      if(newProps.dataEmitter){
        let dataEmitter = newProps.dataEmitter;
        dataEmitter.removeListener("data", this.handleData);
      }
    }
  }
  handleData(content){
    this.setState({ content });
  }
  render(){
    var { content } = this.state;
    return (<pre style={{ fontSize: "8px" }}>{content}</pre>);
  }
};
