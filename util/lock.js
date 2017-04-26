var Promise = require("es6-promise");

class Lock {
  constructor(){
    this.locks = [];
  }
  lockAll(fn){
    return lockAll(this.locks).then(fn).then((result)=>{
      finishAllLock(this.locks);
      return result;
    }, (err) =>{
      finishAllLock(this.locks);
      throw err;
    });
  }
  lock(id, fn){
    return idLock(id, this.locks).then(fn).then((result)=>{
      finishIdLock(id, this.locks);
      return result;
    }, function(err){
      finishIdLock(id, this.locks);
      throw err;
    });
  }
  lockIfNotExists(id, fn){
    return idLockIfNotExists(id, this.locks).then(fn).then((result)=>{
      finishIdLock(id, this.locks);
      return result;
    }, function(err){
      finishIdLock(id, this.locks);
      throw err;
    });
  }
}

module.exports = Lock;

function idLockIfNotExists(id, locks){
  return new Promise(function(res, rej){
    if(locks.length === 0){
      locks.push({
        type: "id",
        active: { [id]: [] },
      });
      res();
      return;
    }
    for(var i = 0; i < locks.length; i++){
      if(locks[i].type === "id"){
        if(id in this.locks[i].active){
          rej("already exists");
          return;
        }
      }
    }

    var lastLock = locks[locks.length - 1];
    if(lastLock.type !== "id"){
      locks.push({
        type: "id",
        active: { [id]: [res] },
      });
      return;
    }
    lastLock.active[id] = [];
    res();
  });
}

function idLock(id, locks){
  return new Promise(function(res){
    if(locks.length === 0){
      locks.push({
        type: "id",
        active: { [id]: [] },
      });
      res();
      return;
    }
    var lastLock = locks[locks.length - 1];
    if(lastLock.type !== "id"){
      locks.push({
        type: "id",
        active: { [id]: [res] },
      });
      return;
    }
    if(id in lastLock){
      lastLock.active[id].push(res);
      return;
    }
    lastLock.active[id] = [];
    res();
  });
}

function finishIdLock(id, locks){
  var currentLock = locks[0].active;
  if(currentLock[id].length > 0){
    currentLock[id].shift()();
    return;
  }
  delete currentLock[id];
  if(Object.keys(currentLock).length > 0){
    return;
  }
  locks.shift();
  if(locks.length === 0){
    return;
  }
  locks[0].resolve();
}

function lockAll(locks){
  return new Promise(function(res){
    if(locks.length === 0){
      return res();
    }
    locks.push({
      type: "all",
      resolve: res
    });
  });
}

function finishAllLock(locks){
  locks.shift();
  if(locks.length === 0){
    return;
  }
  if(locks[0].type === "all"){
    locks[0].resolve();
    return;
  }
  Object.keys(locks[0].active).forEach(function(key){
    locks[0].active[key].shift()();
  });
}
