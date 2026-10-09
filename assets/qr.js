/* QR codes for lectures and quizzes. Shared by the home page and the lesson engine.
   Needs vendor/qrcode.js (qrcode-generator, MIT). Codes are drawn in the browser from the address the page is
   really served at, so they stay correct on localhost, a school network or GitHub Pages. */
(function () {
  'use strict';
  var KEY = 'sl-public-base';
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var store = {
    get: function () { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } },
    set: function (v) { try { if (v) localStorage.setItem(KEY, v); else localStorage.removeItem(KEY); } catch (e) { /* storage unavailable */ } },
  };
  var t = function (k, v) { return window.SL ? window.SL.t(k, v) : k; }; // strings live in locales/*.json
  var bold = function (s) { return esc(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>'); };
  var withSlash = function (u) { return /\/$/.test(u) ? u : u + '/'; };

  // Site root URL set by the teacher (override), or baked in at build time (PUBLIC_URL), else ''.
  function base() { var o = store.get(), b = o || window.__PUBLIC_URL__ || ''; return b ? withSlash(b) : ''; }
  function here() { return location.href.split('#')[0].split('?')[0]; }
  function siteRoot() {
    var b = base(); if (b) return b;
    var loc = here(), p = window.__PAGE_PATH__;
    return p && loc.slice(-p.length) === p ? loc.slice(0, -p.length) : loc.replace(/[^/]*$/, '');
  }
  function resolve(path) { try { return new URL(path, siteRoot()).href; } catch (e) { return siteRoot() + path; } }
  function isLocal() {
    if (base()) return false;
    return location.protocol === 'file:' || /^(localhost|127\.|\[?::1\]?$|0\.0\.0\.0)/.test(location.hostname);
  }

  function svg(text, label) {
    var q = window.qrcode(0, 'M'); q.addData(text); q.make();
    var n = q.getModuleCount(), m = 4, d = '', r, c;
    for (r = 0; r < n; r++) for (c = 0; c < n; c++) if (q.isDark(r, c)) d += 'M' + (c + m) + ' ' + (r + m) + 'h1v1h-1z';
    var s = n + 2 * m;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + s + ' ' + s + '" shape-rendering="crispEdges" role="img" aria-label="' + esc(label || t('qr.codeAlt')) + '"><rect width="' + s + '" height="' + s + '" fill="#fff"/><path d="' + d + '" fill="#000"/></svg>';
  }
  function el(text, label) {
    var d = document.createElement('div'); d.className = 'qr'; d.dataset.url = text;
    if (!window.qrcode) { d.textContent = t('qr.codeUnavailable'); return d; }
    d.innerHTML = svg(text, label); return d;
  }

  var dialog = null;
  function close() { if (dialog) { dialog.remove(); dialog = null; } }
  // items: [{ label, url() }]; urls are re-read so changing the site address updates the codes at once.
  function open(title, items) {
    close();
    var card = document.createElement('div'); card.className = 'qr-card';
    dialog = document.createElement('div'); dialog.className = 'qr-dialog'; dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true'); dialog.setAttribute('aria-label', title);
    dialog.appendChild(card);
    dialog.addEventListener('click', function (e) { if (e.target === dialog) close(); });
    dialog.addEventListener('keydown', function (e) { if (e.key === 'Escape') { close(); } else if (e.key !== 'Tab') { e.stopPropagation(); } });
    function render() {
      card.innerHTML = '';
      var head = document.createElement('div'); head.className = 'qr-head';
      var h2 = document.createElement('h2'); h2.textContent = title; head.appendChild(h2);
      var pr = document.createElement('button'); pr.type = 'button'; pr.className = 'qr-btn'; pr.textContent = t('qr.print'); pr.onclick = function () { window.print(); };
      var cl = document.createElement('button'); cl.type = 'button'; cl.className = 'qr-btn primary'; cl.textContent = t('qr.close'); cl.onclick = close; cl.dataset.autofocus = '1';
      head.appendChild(pr); head.appendChild(cl); card.appendChild(head);
      var grid = document.createElement('div'); grid.className = 'qr-grid'; card.appendChild(grid);
      items.forEach(function (it) {
        var url = typeof it.url === 'function' ? it.url() : it.url;
        var fig = document.createElement('figure'); fig.className = 'qr-item';
        fig.appendChild(el(url, it.label + ': ' + url));
        var cap = document.createElement('figcaption');
        cap.innerHTML = '<strong>' + esc(it.label) + '</strong><span class="qr-note">' + esc(it.note || '') + '</span><code class="qr-url">' + esc(url) + '</code>';
        var copy = document.createElement('button'); copy.type = 'button'; copy.className = 'qr-btn'; copy.textContent = t('qr.copy');
        copy.onclick = function () { (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(function () { copy.textContent = t('qr.copied'); }, function () { copy.textContent = t('qr.copyFail'); }); };
        fig.appendChild(cap); fig.appendChild(copy); grid.appendChild(fig);
      });
      var note = document.createElement('div'); note.className = 'qr-base';
      var warn = isLocal() ? '<p class="qr-warn">' + bold(t('qr.warn', { host: location.host || t('qr.thisFile') })) + '</p>' : '';
      note.innerHTML = warn + '<label>' + esc(t('qr.baseLabel')) + ' <input type="url" placeholder="https://your-name.github.io/smart-learning/" value="' + esc(store.get()) + '" aria-label="' + esc(t('qr.baseAria')) + '"></label>';
      var input = note.querySelector('input');
      var save = document.createElement('button'); save.type = 'button'; save.className = 'qr-btn'; save.textContent = t('qr.use');
      save.onclick = function () { store.set(input.value.trim()); render(); };
      var reset = document.createElement('button'); reset.type = 'button'; reset.className = 'qr-btn'; reset.textContent = t('qr.reset');
      reset.onclick = function () { store.set(''); render(); };
      note.appendChild(save); note.appendChild(reset);
      var tip = document.createElement('p'); tip.className = 'qr-tip'; tip.textContent = t('qr.tip'); note.appendChild(tip);
      card.appendChild(note);
    }
    render(); document.body.appendChild(dialog);
    var f = dialog.querySelector('[data-autofocus]'); if (f) f.focus({ preventScroll: true });
  }

  // URL of the page you are on. With a configured site address (build-time or teacher override) it is rebuilt from
  // the page's site-relative path, otherwise the page's own address is the most reliable answer.
  function pageUrl() { var p = window.__PAGE_PATH__; return base() && p ? resolve(p) : here(); }
  window.SLQR = { el: el, svg: svg, open: open, close: close, resolve: resolve, siteRoot: siteRoot, pageUrl: pageUrl, isLocal: isLocal, isOpen: function () { return !!dialog; } };
})();
