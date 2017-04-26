var Server = require("http").Server,
  path = require("path"),
  express = require("express"),
  Cookies = require("cookies"),
  bodyParser = require("body-parser"),
  browserify = require("browserify"),
  WebSocketServer = require("ws").Server,
  fs = require("fs"),
  url = require("url"),
  resolve = require("resolve");

var __examples = path.resolve(__dirname, "../examples");

var server = new Server(),
app = express();

var users = {};

app.use(function(req, res, next){
  req.cookies = new Cookies(req, res);
  var id = req.cookies.get("user");
  if(!id){
    id = Date.now().toString(32) + Math.random().toString(32);
    users[id] = {
      id: id,
      name: "Anonymous",
      ws: false
    };
    req.cookies.set("user", id);
  }
  req.user = users[id];
  next();
});

app.post("/username", bodyParser.urlencoded(), function(req, res){
  req.user.name = req.body;
  res.success("ok");
});
app.get("/users", function(req, res){
  res.success(users);
});

var clientJs = browserify(
  path.join(
    __dirname, "./client.jsx"
  ),
  {
    extensions: [".jsx"],
    insertGlobalVars: {
      examples: function(){
        return JSON.stringify(fs.readdirSync(__examples));
      }
    }
  }
).transform("babelify", { presets: ["es2015", "react"] });
app.get("/", function(req, res){
  fs.createReadStream(__dirname + "/client.html").pipe(res);
});

app.get("/client.js", function(req, res){
  clientJs.bundle().pipe(res);
});

app.get("/:example/", function(req, res){
  fs.createReadStream(__dirname + "/client.html").pipe(res);
});

var bundles = {};
app.get("/:example/client.js", function(req, res){
  if(!(req.params.example in bundles)){
    var filepath = resolve.sync(path.join(
      __examples, req.params.example, "./client"
    ), { extensions: [".js", ".jsx"] });
    console.log("request: ", filepath);
    bundles[req.params.example] = browserify(
      filepath,
      {
        extensions: [".js", ".jsx"],
      }
    ).transform("babelify", { presets: ["es2015", "react"] });
  }
  var b = bundles[req.params.example];
  b.bundle().pipe(res);
});

var wss = new WebSocketServer({ server: server });

var wsMap = {};
wss.on("connection", function(ws){
  var req = ws.upgradeReq;
  var pathname = url.parse(req.url).pathname;
  var cookies = new Cookies(req, null);
  var websocketHandler;
  try{
    websocketHandler = require(resolve.sync(path.join(
      __examples, pathname, "./server"
    ), { extensions: [".js", ".jsx"] }));
  }catch(e){
    console.error(e);
    return ws.close();
  }
  if(!cookies.get("user")){
    console.log("no cookie set");
    return ws.close();
  }
  var user = cookies.get("user");
  if(wsMap[user]){
    console.log("already connected");
    return ws.close();
  }
  wsMap[user] = ws;
  ws.id = user;
  ws.on("close", function(){
    delete wsMap[user];
  });
  websocketHandler(ws);
});

server.on("request", app);
server.listen(process.env.PORT, function(){
  console.log("Listening on " + server.address().port);
});
