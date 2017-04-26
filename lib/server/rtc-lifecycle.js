var Promise = require("es6-promise");

var { webSocketRequest } = require("../../util/protocol");

var active = new Set();
module.exports.constructRTC = function(a, b){
  var id = [a, b].map((p)=> p.id).sort((a, b)=>a.localeCompare(b)).join("-");
  if(active.has(id)){
    return Promise.reject("currently constructing");
  }
  active.add(id);
  var aML, bML, aCL, bCL;
  return Promise.race([
    new Promise(function(res, rej){
      var alreadyError = false;
      function hadError(peer, message){
        if(alreadyError) return;
        alreadyError = true;
        rej(peer.id + " : " + message);
      }

      a.on("message", aML = function(rawStr){
        var message = JSON.parse(rawStr);
        if(message.for !== "webrtc"){
          return;
        }
        if(message.target !== b.id){
          return;
        }
        message.originator = a.id;
        switch(message.type){
          case "error":
            return hadError(a, message.message);
          case "ice":
            return b.send(JSON.stringify(message));
        }
      });
      b.on("message", bML = function(rawStr){
        var message = JSON.parse(rawStr);
        if(message.for !== "webrtc"){
          return;
        }
        if(message.target !== a.id){
          return;
        }
        message.originator = b.id;
        switch(message.type){
          case "error":
            return hadError(b, message.message);
          case "ice":
            return a.send(JSON.stringify(message));
        }
      });
      a.on("close", aCL = function(){
        hadError(a, "closed");
      });
      b.on("close", bCL = function(){
        hadError(b, "closed");
      });
    }),
    Promise.all([
      webSocketRequest(a, "has-connnection", { peer: b.id }),
      webSocketRequest(b, "has-connnection", { peer: a.id }),
    ]).then(function(boos){
      if(boos[0] && boos[1]){
        return;
      }
      return webSocketRequest(a, "offer", { originator: b.id });
    }).then(function(offer){
      return webSocketRequest(b, "answer", { originator: a.id, offer });
    }).then(function(answer){
      return webSocketRequest(a, "final", { originator: b.id, answer });
    }),
  ]).then(function(result){
    cleanupListeners();
    active.delete(id);
    return result;
  }, function(err){
    cleanupListeners();
    active.delete(id);
    a.send(JSON.stringify({
      for: "webrtc",
      originator: b.id,
      target: a.id,
      type: "error",
      data: err.toString(),
    }));
    b.send(JSON.stringify({
      for: "webrtc",
      originator: a.id,
      target: b.id,
      type: "error",
      data: err.toString(),
    }));
    throw err;
  });

  function cleanupListeners(){
    a.removeListener("message", aML);
    b.removeListener("message", bML);
    a.removeListener("close", aCL);
    b.removeListener("close", bCL);
  }
};

module.exports.destroyRTC = function(a, b){
  a && a.send(JSON.stringify({
    for: "webrtc",
    type: "stop",
    originator: b.id,
    target: a.id,
  }));
  b && b.send(JSON.stringify({
    for: "webrtc",
    type: "stop",
    originator: a.id,
    target: b.id,
  }));
};
