var Promise = require("es6-promise");

module.exports.delay = {
  resolve: function(timeout, result){
    return new Promise(function(res){
      setTimeout(function(){
        res(result);
      }, timeout);
    });
  },
  reject: function(timeout, err){
    return new Promise(function(res, rej){
      setTimeout(function(){
        rej(err);
      }, timeout);
    });
  }
};

module.exports.eventTargetListen = function(ee, ops, startFn){
  var resKey = ops.res;
  var rejKey = ops.rej;
  return new Promise(function(resolve, reject){
    var resListener = function(){
      ee.removeEventListener(resKey, resListener);
      ee.removeEventListener(rejKey, rejListener);
      resolve(ee);
    }, rejListener = function(err){
      ee.removeEventListener(resKey, resListener);
      ee.removeEventListener(rejKey, rejListener);
      reject(err);
    };
    ee.addEventListener(resKey, resListener);
    ee.addEventListener(rejKey, rejListener);
    try{
      if(startFn()) resListener();
    }catch(e){
      rejListener(e);
    }
  });
};

module.exports.eventEmitterListen = function(ee, ops, startFn){
  var resKey = ops.res;
  var rejKey = ops.rej;
  return new Promise(function(resolve, reject){
    var resListener, rejListener;
    ee.once(resKey, resListener = function(){
      ee.removeListener(rejKey, rejListener);
      resolve(ee);
    });
    ee.once(rejKey, rejListener = function(err){
      ee.removeListener(resKey, resListener);
      reject(err);
    });
    startFn();
  });
};
