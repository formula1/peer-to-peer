var { webSocketResponder } = require("../../util/protocol");
var { RTCPeerConnection } = global;

module.exports = function(ws, peerReady){
  var MAIN_LABEL = "main-channel";
  var users = {};
  function protectedPeerReady(peerId){
    if(peerId in users){
      peerReady(users[peerId]);
    } else{
      console.log("peer ready but peer is not in users");
    }
  }
  webSocketResponder(ws, "has-connnection", function(data){
    var { peer } = data;
    return !!((peer in users) && users[peer].rtc);
  });
  webSocketResponder(ws, "offer", function(data){
    var { originator } = data;
    return Promise.resolve(originator).then(
      createUniquePeer
    ).then(function(){
      var rtc = users[originator].rtc;
      var dataChannel = rtc.createDataChannel(MAIN_LABEL);
      handleDataChannel(originator, dataChannel);
      return rtc.createOffer();
    }).then(function(offer){
      var rtc = users[originator].rtc;
      return rtc.setLocalDescription(offer).then(function(){
        console.log("offer success");
        return offer;
      });
    }).catch(function(err){
      console.error("offer failed", err);
      cleanupPeer(originator);
      throw err;
    });
  });
  webSocketResponder(ws, "answer", function(data){
    var { originator, offer } = data;
    return Promise.resolve(originator).then(
      createUniquePeer
    ).then(function(){
      var rtc = users[originator].rtc;
      var dcList;
      rtc.addEventListener("datachannel", dcList = function(event){
        var channel = event.channel;
        if(channel.label !== MAIN_LABEL){
          return ws.send(JSON.stringify({
            for: "webrtc",
            type: "error",
            target: originator,
            message: "first channel should be " + MAIN_LABEL,
          }));
        }
        rtc.removeEventListener("datachannel", dcList);
        handleDataChannel(originator, channel);
      });
      return rtc.setRemoteDescription(offer);
    }).then(function(){
      var rtc = users[originator].rtc;
      return rtc.createAnswer();
    }).then(function(answer){
      var rtc = users[originator].rtc;
      return rtc.setLocalDescription(answer).then(function(){
        while(users[originator].ice.length){
          rtc.addIceCandidate(users[originator].ice.shift());
        }
        return answer;
      });
    }).catch(function(err){
      console.error("answer failed", err);
      cleanupPeer(originator);
      throw err;
    });
  });
  webSocketResponder(ws, "final", function(data){
    var { originator, answer } = data;
    return Promise.resolve(originator).then(
      validatePeer
    ).then(function(){
      var rtc = users[originator].rtc;
      return rtc.setRemoteDescription(answer);
    }).then(function(){
      var rtc = users[originator].rtc;
      while(users[originator].ice.length){
        rtc.addIceCandidate(users[originator].ice.shift());
      }
      console.log("final success");
      return true;
    }).catch(function(err){
      console.error("final failed", err);
      cleanupPeer(originator);
      throw err;
    });
  });

  function createUniquePeer(peerId){
    if(peerId in users && users[peerId].rtc){
      throw "client already exists";
    }
    if(!(peerId in users)){
      users[peerId] = { id: peerId, ice: [] };
    }

    users[peerId].rtc = RTCPeerConnection(
      { iceServers: [
        { url: "stun:stun.services.mozilla.com" },
        { url: "stun:stun.l.google.com:19302" }
      ] },
      { optional: [{ RtpDataChannels: false }] }
    );
    users[peerId].rtc.addEventListener("close", function(){
      delete users[peerId];
    });
    users[peerId].rtc.onicecandidate = function(event){
      if(!event || !event.candidate) return;
      ws.send(JSON.stringify({
        for: "webrtc",
        type: "ice",
        target: peerId,
        candidate: event.candidate
      }));
    };
  }

  function handleDataChannel(peerId, datachannel){
    users[peerId].datachannel = datachannel;
    datachannel.onerror = function(e){
      ws.send(JSON.stringify({
        for: "webrtc",
        type: "error",
        target: peerId,
        message: e,
      }));
    };
    datachannel.onmessage = function(e){
      console.log(e.data);
    };
    datachannel.onopen = function(){
      console.log("data cannel opened");
      datachannel.onerror = null;
      datachannel.send("hello!!");
      protectedPeerReady(peerId);
    };
    datachannel.onclose = function(){
      cleanupPeer(peerId);
    };
  }

  function validatePeer(peerId){
    console.log(users);
    if(!(peerId in users)){
      throw "peer " + peerId + " is not available";
    }
    if(!users[peerId].rtc){
      throw "peer " + peerId + " does not have an active connection";
    }
  }

  function cleanupPeer(peerId){
    if(!(peerId in users)){
      return console.log("peerId already clean");
    }
    var rtc = users[peerId].rtc;
    rtc.signalingState !== "closed" && rtc.close();
    delete users[peerId];
  }

  ws.addEventListener("message", function(e){
    var message = JSON.parse(e.data);
    if(message.for !== "webrtc"){
      return;
    }
    console.log(message);
    var peerId = message.originator;
    return Promise.resolve(peerId).then(validatePeer).then(function(){
      switch(message.type){
        case "stop":
          cleanupPeer(peerId);
          console.error("remote stop", message);
          return;
        case "error":
          cleanupPeer(peerId);
          console.error("remote error", message);
          return;
        case "ice":
          var rtc = users[peerId].rtc;
          if(!rtc.remoteDescription){
            users[peerId].ice.push(message.candidate);
          } else{
            rtc.addIceCandidate(message.candidate);
          }
          return;
      }
    }).catch(function(err){
      console.error("error in message: ", err);
      if(!(peerId in users)){
        console.log("user ", peerId, " is not recognized");
        return;
      }
      cleanupPeer(peerId);
      ws.send(JSON.stringify({
        for: "webrtc",
        type: "error",
        target: peerId,
        message: err,
      }));
    });
  });
};
