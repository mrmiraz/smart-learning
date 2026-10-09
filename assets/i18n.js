/* Smart Learning language runtime. No dependencies, loaded on every page after assets/locales.js.
   window.__LOCALES__ = { en: { _meta: {...}, "key": "text", ... }, bn: {...} }  (built from locales/*.json)

   SL.t(key, vars)        look up a UI string in the current language, falling back to the default language.
                          {name} is replaced from vars. When vars.n is a number, key_one / key_other (CLDR plural
                          categories) are tried first, so "3 topics" and "1 topic" can differ per language.
   SL.lang                current language code.            SL.langs  [{ code, name, short, dir }]
   SL.setLang(code)       switch from anywhere; stores the choice, updates the page, calls onChange listeners.
   SL.onChange(fn)        fn(code) runs after every switch (also when another tab switches).
   SL.apply(root)         translates data-i18n="key", data-i18n-attr="title:key,aria-label:key" and fills
                          <span data-lang-switch></span> with the language switcher.
   SL.switcher()          the language switcher element (segmented buttons for up to 3 languages, else a select).
   SL.n(number, digits)   number formatted with the language's numbering system (locale _meta.numerals). */
(function () {
  'use strict';
  // The login page carries its own small copy of this runtime; once the password unlocks a page the new document runs this
  // file again in the same window, so retire the old copy first (its storage listener would otherwise fight the new one).
  if (window.SL && window.SL.dispose) window.SL.dispose();
  var KEY = 'sl-lang';
  var D = window.__LOCALES__ || {};
  var codes = Object.keys(D);
  var def = codes.filter(function (c) { return D[c]._meta && D[c]._meta.default; })[0] || codes[0] || 'en';
  codes.sort(function (a, b) { return a === def ? -1 : b === def ? 1 : (D[a]._meta.order || 0) - (D[b]._meta.order || 0) || (a < b ? -1 : 1); });
  var listeners = [];

  function stored() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function detect() {
    var q = /[?&]lang=([\w-]+)/.exec(location.search); // ?lang=bn opens a page in that language (and remembers it)
    if (q && D[q[1]]) { try { localStorage.setItem(KEY, q[1]); } catch (e) { /* storage unavailable */ } return q[1]; }
    var s = stored(); if (s && D[s]) return s;
    var prefs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ''];
    for (var i = 0; i < prefs.length; i++) { var base = String(prefs[i]).toLowerCase().split('-')[0]; if (D[base]) return base; }
    return def;
  }
  var lang = detect();

  function meta(code) { return (D[code] && D[code]._meta) || {}; }
  function fmtNum(x, digits) {
    var nu = meta(lang).numerals || 'latn';
    try { return new Intl.NumberFormat((meta(lang).numberLocale || lang) + '-u-nu-' + nu, { maximumFractionDigits: digits == null ? 2 : digits }).format(x); } catch (e) { return String(x); }
  }
  function pick(code, key, n) {
    var d = D[code]; if (!d) return null;
    if (n != null) {
      var cat = 'other'; try { cat = new Intl.PluralRules(code).select(n); } catch (e) { /* plural rules unavailable */ }
      if (d[key + '_' + cat] != null) return d[key + '_' + cat];
      if (d[key + '_other'] != null) return d[key + '_other'];
    }
    return d[key] != null ? d[key] : null;
  }
  function t(key, vars) {
    var n = vars && typeof vars.n === 'number' ? vars.n : null;
    var s = pick(lang, key, n); if (s == null && lang !== def) s = pick(def, key, n);
    if (s == null) return key;
    return vars ? s.replace(/\{(\w+)\}/g, function (m, k) { return k in vars ? (typeof vars[k] === 'number' ? fmtNum(vars[k]) : vars[k]) : m; }) : s;
  }

  function apply(root) {
    root = root || document;
    var i, els = root.querySelectorAll('[data-i18n]');
    for (i = 0; i < els.length; i++) els[i].textContent = t(els[i].getAttribute('data-i18n'));
    els = root.querySelectorAll('[data-i18n-attr]');
    for (i = 0; i < els.length; i++) els[i].getAttribute('data-i18n-attr').split(',').forEach(function (pair) { var p = pair.split(':'); if (p.length === 2) els[i].setAttribute(p[0].trim(), t(p[1].trim())); });
    els = root.querySelectorAll('[data-lang-switch]');
    for (i = 0; i < els.length; i++) { els[i].replaceChildren(switcher()); }
  }
  function setRoot() {
    var r = document.documentElement; r.setAttribute('lang', meta(lang).htmlLang || lang); r.setAttribute('dir', meta(lang).dir || 'ltr');
  }

  function switcher() {
    var wrap = document.createElement('div'); wrap.className = 'lang-switch'; wrap.setAttribute('role', 'group'); wrap.setAttribute('aria-label', t('lang.label'));
    if (codes.length < 2) { wrap.hidden = true; return wrap; }
    if (codes.length <= 3) {
      codes.forEach(function (c) {
        var b = document.createElement('button'); b.type = 'button'; b.textContent = meta(c).short || meta(c).name || c; b.title = meta(c).name || c;
        b.setAttribute('lang', meta(c).htmlLang || c); b.setAttribute('aria-pressed', String(c === lang));
        b.addEventListener('click', function () { setLang(c); }); wrap.appendChild(b);
      });
    } else {
      var s = document.createElement('select'); s.setAttribute('aria-label', t('lang.label'));
      codes.forEach(function (c) { var o = document.createElement('option'); o.value = c; o.textContent = meta(c).name || c; o.selected = c === lang; s.appendChild(o); });
      s.addEventListener('change', function () { setLang(s.value); }); wrap.appendChild(s);
    }
    return wrap;
  }

  // Switching shows the site's main loader (templates/loader.js keeps a copy of it) over the re-render, so it feels smooth.
  var veil = null, veilTimer = 0;
  function showVeil() {
    var tpl = window.__slLoaderTpl;
    if (!tpl || !document.body) return false;
    clearTimeout(veilTimer); if (veil && veil.parentNode) veil.parentNode.removeChild(veil);
    veil = tpl.cloneNode(true); veil.removeAttribute('id'); veil.className = 'sl-loader sl-done sl-switch';
    veil.style.transition = 'opacity .15s ease, visibility .15s'; apply(veil);
    document.body.appendChild(veil); void veil.offsetWidth; veil.classList.remove('sl-done');
    return true;
  }
  function hideVeil() {
    var v = veil; if (!v) return;
    v.style.transition = ''; v.classList.add('sl-done');
    veilTimer = setTimeout(function () { if (v.parentNode) v.parentNode.removeChild(v); if (veil === v) veil = null; }, 450);
  }
  function setLang(code, fromStorage) {
    if (!D[code] || code === lang) return;
    lang = code; if (!fromStorage) { try { localStorage.setItem(KEY, code); } catch (e) { /* storage unavailable */ } }
    var run = function () {
      setRoot(); apply();
      listeners.slice().forEach(function (fn) { try { fn(code); } catch (e) { console.error(e); } });
    };
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !showVeil()) { run(); return; }
    // let the loader fade in and paint before the (synchronous) re-render, then hold it briefly so it is seen
    setTimeout(function () { try { run(); } finally { setTimeout(hideVeil, 400); } }, 170);
  }
  function onStorage(e) { if (e.key === KEY && e.newValue) setLang(e.newValue, true); }
  window.addEventListener('storage', onStorage);

  setRoot();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { apply(); }); else apply();

  window.SL = {
    dispose: function () { window.removeEventListener('storage', onStorage); },
    t: t, n: fmtNum, apply: apply, switcher: switcher, setLang: setLang,
    onChange: function (fn) { listeners.push(fn); },
    get lang() { return lang; }, get defaultLang() { return def; },
    get langs() { return codes.map(function (c) { return { code: c, name: meta(c).name || c, short: meta(c).short || c, dir: meta(c).dir || 'ltr' }; }); },
  };
})();
