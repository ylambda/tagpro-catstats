(function() {

  // simple ignore
  if(location.port < 8000)
    return;

  function injectScript(path) {
    var script = document.createElement('script');
    script.setAttribute("type", "application/javascript");
    script.src = chrome.extension.getURL(path);
    script.onload = removeScript;
    (document.head||document.documentElement).appendChild(script);
  }

  function removeScript() {
    this.parentNode.removeChild(this);
  }

  var scripts = ["js/catstats.js"];
  scripts.forEach(injectScript);

})();
