// Hides the loader once the page and all its stylesheets have loaded.
// If a stylesheet failed, or loading stalls, it offers a reload instead of revealing an unstyled page.
(function () {
  var root = document.documentElement;
  root.classList.add('sl-loading');
  var finished = false;
  var cssFailed = false;
  // Failed resource loads fire a non-bubbling error event, so listen in the capture phase.
  window.addEventListener('error', function (e) {
    var t = e.target;
    if (t && t.tagName === 'LINK' && t.rel === 'stylesheet') { cssFailed = true; stall(); }
  }, true);

  function el() { return document.getElementById('sl-loader'); }
  function stylesFailed() {
    if (cssFailed) return true;
    var links = document.querySelectorAll('link[rel="stylesheet"]');
    for (var i = 0; i < links.length; i++) if (!links[i].sheet) return true;
    return false;
  }
  function stall() {
    var l = el();
    if (l) l.classList.add('sl-stalled');
  }
  function done() {
    if (finished) return;
    if (stylesFailed()) return stall();
    finished = true;
    clearTimeout(timer);
    var l = el();
    root.classList.remove('sl-loading');
    if (!l) return;
    // keep a copy of the loader so a language switch can show the very same screen (assets/i18n.js)
    window.__slLoaderTpl = l.cloneNode(true);
    l.classList.add('sl-done');
    setTimeout(function () { if (l.parentNode) l.parentNode.removeChild(l); }, 450);
  }

  var timer = setTimeout(stall, 10000);
  window.slReload = function () { location.reload(); };
  if (document.readyState === 'complete') done();
  else window.addEventListener('load', done);
  // When a remembered password unlocks the page, the new document is written during the old page's
  // own load event, so its 'load' event never fires. Poll the ready state so the loader still goes away.
  var poll = setInterval(function () {
    if (finished) return clearInterval(poll);
    if (document.readyState === 'complete') done();
  }, 100);
})();
