/* global document window */
var React = require("react");
var { render } = require("react-dom");

render(
  <ul>{
    examples.map(function(example){
      return (
        <li>
          <a href={"/" + example + "/"}>{example}</a>
        </li>
      );
    })
  }</ul>,
  document.getElementById("root")
);
