var Promise = require("es6-promise");

module.exports.webSocketRequest = function(socket, path, sendData){
  var mListener, cListener;
  return new Promise(function(res, rej){
    var id = Date.now().toString(32);
    socket.addEventListener("message", mListener = function(e){
      var data = JSON.parse(e.data);
      if(data.id !== id){
        return;
      }
      socket.removeEventListener("message", mListener);
      socket.removeEventListener("close", cListener);
      if(data.error){
        rej(data.data);
      } else{
        res(data.data);
      }
    });
    socket.addEventListener("close", cListener = function(){
      socket.removeEventListener("message", mListener);
      socket.removeEventListener("close", cListener);
      rej("closed");
    });
    socket.send(JSON.stringify({
      type: "request",
      id: id,
      method: "request",
      path: path,
      data: sendData,
    }));
  });
};

module.exports.webSocketResponder = function(socket, path, fn){
  var evListener;
  socket.addEventListener("message", evListener = function(e){
    var data = JSON.parse(e.data);
    if(data.method !== "request"){
      return;
    }
    if(data.path !== path){
      return;
    }
    var id = data.id;
    return Promise.resolve(data.data).then(fn).then((result)=>{
      socket.send(JSON.stringify({
        id: id,
        error: false,
        data: result,
      }));
    }, (err)=>{
      socket.send(JSON.stringify({
        id: id,
        error: true,
        data: err,
      }));
    });
  });
  return evListener;
};
