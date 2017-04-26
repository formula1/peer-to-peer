var blessed = require("blessed");

module.exports = function(){
  // Create a screen object.
  var screen = blessed.screen({
    terminal: "xterm-256color"
  });
  screen._listenedMouse = true;

  screen.title = "<3";

  // Create a box perfectly centered horizontally and vertically.
  var box = blessed.box({
    top: "center",
    left: "center",
    width: "100%",
    height: "100%",
    content: "",
    tags: true,
    border: {
      type: "line"
    },
    style: {
      fg: "#000000",
      bg: "#ffffff",
      border: {
        fg: "#f0f0f0"
      },
    }
  });

  screen.append(box);
  setImmediate(function(){
    screen.render();
  });

  return {
    setText(text){
      box.setText(text);
      screen.render();
    }
  };

};
