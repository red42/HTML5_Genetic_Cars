var debugbox = document.getElementById("debug");

module.exports = debug;

function debug(str, clear) {
  if (clear) {
    debugbox.innerHTML = "";
  }
  debugbox.innerHTML += str + "<br />";
}
