/* global document setInterval clearInterval */

var React = require("react");
var { connect } = require("react-redux");
var ascii = require("../api/ascii-image");
var getUserMedia = require("get-user-media-promise");

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
    this.stopCamera = this.stopCamera.bind(this);
    this.startCamera = this.startCamera.bind(this);
  }
  sendData(e){
    e.preventDefault();
    this.props.broadcastData && this.props.broadcastData(this.state.buffer);
    this.setState({ buffer: "" });
  }
  stopCamera(){
    if(!this.state.timer) return;
    clearInterval(this.state.timer);
    Array.from(this.state.stream.getVideoTracks()).forEach(function(track){
      return track.stop();
    });
    this.setState({
      timer: false,
      stream: false
    });
  }
  startCamera(){
    if(this.state.timer) return;
    var options = {
      width: 160,
      height: 120,
      fps: 30,
      mirror: true,
    };
    var video = document.createElement("video");
    video.setAttribute("width", options.width);
    video.setAttribute("height", options.height);

    getUserMedia({
      video: true
    }).then((stream) =>{
      video.srcObject = stream;
      var canvas = document.createElement("canvas");
      canvas.setAttribute("width", options.width);
      canvas.setAttribute("height", options.height);

      var context = canvas.getContext("2d");

      // mirror video
      if(options.mirror){
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
      }
      video.play();

      var timer = setInterval(() =>{
        try{
          context.drawImage(video, 0, 0, video.width, video.height);
          var str = ascii.fromCanvas(canvas);
          this.props.broadcastData && this.props.broadcastData(str);
        } catch (e){
          // TODO
        }
      }, Math.round(1000 / options.fps));
      this.setState({
        timer: timer,
        stream: stream,
      });
    });
  }

  render(){
    var { treeNode } = this.props;
    if(!treeNode || treeNode.parent !== null){
      console.log("not broadcasting", treeNode);
      return null;
    }
    var { buffer, timer } = this.state;
    if(timer){
      return (<button onClick={this.stopCamera} >Stop Video</button>);
    }
    return (
      <div>
        <button onClick={this.startCamera} >Start Video</button>
        <form onSubmit={this.sendData}>
          <input
            type="text" value={buffer}
            onChange={(e)=> this.setState({ buffer: e.target.value }) }
          />
          <button type="submit">Send</button>
        </form>
      </div>
    );
  }
}

module.exports = connect(
  mapStateToProps,
  mapDispatchToProps
)(BroadcasterForm);
