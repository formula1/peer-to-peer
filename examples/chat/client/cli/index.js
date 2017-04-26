var webrtc = require("wrtc");
var program = require("commander");
var fetch = require("isomorphic-fetch");
var url = require("url");
var Promise = require("es6-promise");
var util = require("util");
var WebSocket = require("websocket").w3cwebsocket;
var { delay, eventTargetListen } = require("../../../../util/promise");

global.RTCPeerConnection = function(){
  return new webrtc.RTCPeerConnection(arguments[0], arguments[1], arguments[2], arguments[3]);
};
global.RTCSessionDescription = webrtc.RTCSessionDescription;
global.RTCIceCandidate = webrtc.RTCIceCandidate;

require("webrtc-adapter");

var PeerHandler = require("../peer-handler");
var DataHandler = require("../data-handler");
var View = require("./view");

function createWebsocket(urlstring){
  console.log(urlstring);
  return Promise.resolve().then(function(){
    return Object.assign({ protocol: "http:" }, url.parse(urlstring));
  }).then(function(urlObject){
    return fetch(url.format(
      urlObject
    )).then(function(resp){
      console.log(resp.headers.get("set-cookie"));
      var cookie = resp.headers.get("set-cookie");
      var wsstring = url.format(Object.assign({}, urlObject,
        { protocol: urlObject.protocol === "https:" ? "wss:" : "ws:" }
      ));
      var ws = new WebSocket(wsstring, void 0, void 0, { cookie: cookie });
      return eventTargetListen(ws, { res: "open", rej: "error" }, function(){
        console.log(ws.readyState);
        switch(ws.readyState){
          case 1: return true;
          case 0: return false;
          default:
            throw new Error("bad ready state: " + ws.readyState);
        }
      });
    });
  });
}

function defaultUrl(){
  switch(process.env.NODE_ENV){
    case "docker": return "http://172.17.0.1:8080/chat";
    default: return "http://localhost:8080/chat";
  }
}

setImmediate(function(){
  program.parse(process.argv);
});
program.version("0.0.1");
program.command("watch")
  .option("-u, --url <url>", "specify the host url", defaultUrl())
  .option("-b, --broadcaster <n>", "specify which broadcaster to connect to", "0")
  .option("-t, --times <n>", "number of watchers to run", "1")
  .action(function(options){
    var times = parseInt(options.times);
    for(var i = 0; i < times; i++){
      createWatcher(options);
    }
  });
program.command("broadcast")
  .option("-u, --url <url>", "specify the host url", defaultUrl()).action(function(options){
    console.log(options.url);
    return createWebsocket(options.url).then(function(ws){
      const peerHandler = PeerHandler(ws);
      const dataHandler = DataHandler(peerHandler.getStore());

      var {
        broadcastSelf,
      } = peerHandler;
      var {
        broadcastData,
        getDataEmitter,
      } = dataHandler;
      var view = View();

      getDataEmitter().on("data", function(message){
        view.setText(message);
      });

      var v8 = require("v8");

      broadcastSelf();
      setInterval(function(){
        broadcastData(util.inspect(v8.getHeapStatistics()));
      }, 500);
    }).catch(function(e){
      console.error(e);
    });
  });


function createWatcher(options){
  return createWebsocket(options.url).then(function(ws){
    const peerHandler = PeerHandler(ws);
    const dataHandler = DataHandler(peerHandler.getStore());
    const store = peerHandler.getStore();

    var {
      chooseBroadcaster,
    } = peerHandler;
    var {
      getDataEmitter,
    } = dataHandler;
    var view = View();

    getDataEmitter().on("data", function(message){
      view.setText(message);
    });

    var broadcasterIndex = parseInt(options.broadcaster);

    return Promise.race([
      new Promise((res) =>{
        var unsubscribe = store.subscribe(tryToResolve);

        function tryToResolve(){
          var snapshot = store.getState();
          console.log("next broadcasters", snapshot);
          if(snapshot.broadcasters.length <= broadcasterIndex){
            return;
          }
          unsubscribe();
          res(snapshot.broadcasters[broadcasterIndex]);
        }
        tryToResolve();
      }),
      delay.reject(10000, "broadcasters timedout"),
    ]).then(function(broadcaster){
      chooseBroadcaster(broadcaster);

    });
  });
}
