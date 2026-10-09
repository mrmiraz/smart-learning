/* Menus opened from the top bars:
   - "Courses" (top bar) and "Menu" (lessons): the list of courses;
   - the three-dot button (small screens, where the bar's own items are hidden): Home, courses, theme and QR. The language switcher stays in the bar, beside the button.
   Lists the courses only (each links to its course page, which lists the topics).
   Data: window.__NAV__ = { up, current, course, courses: { <lang>: [{ id, path, title }] } }. Redrawn when the language changes. */
(function () {
  'use strict';
  var N = window.__NAV__, SL = window.SL;
  if (!N || !SL) return;
  var panel = null, anchor = null;
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  function courseList() {
    var courses = N.courses[SL.lang] || N.courses[SL.defaultLang];
    return '<ul class="sn-list">' + courses.map(function (c, i) {
      return '<li><a href="' + esc(N.up + c.path) + '"' + (c.id === N.course ? ' aria-current="page"' : '') + ' style="--h:' + ((235 + i * 70) % 360) + '"><span class="sn-dot"></span>' + esc(c.title) + '</a></li>';
    }).join('') + '</ul>';
  }
  var ICON = {
    home: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10', theme: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z', qr: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM20 14v3M14 20h3M20 20v1'
  };
  var row = function (ic, text) { return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + ICON[ic] + '"/></svg><span>' + esc(text) + '</span>'; };
  function build(mode) {
    var el = document.createElement('div'); el.className = 'sn-panel' + (mode === 'more' ? ' more' : ''); el.setAttribute('role', 'dialog');
    if (mode === 'more') {
      el.setAttribute('aria-label', SL.t('menu.more'));
      el.innerHTML = '<a class="sn-row" href="' + esc(N.up + 'index.html') + '">' + row('home', SL.t('menu.home')) + '</a>' +
        '<div class="sn-sep">' + esc(SL.t('menu.courses')) + '</div>' + courseList() + '<div class="sn-sep"></div>' +
        '<button type="button" class="sn-row" data-act="theme">' + row('theme', SL.t('theme.switch')) + '</button>' +
        (document.querySelector('.sn-qr') ? '<button type="button" class="sn-row" data-act="qr">' + row('qr', SL.t('slides.qrTitle')) + '</button>' : '');
      el.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('[data-act]'); if (!b) return;
        if (b.getAttribute('data-act') === 'theme' && window.slToggleTheme) window.slToggleTheme();
        else if (b.getAttribute('data-act') === 'qr') { var q = document.querySelector('.sn-qr'); close(); if (q) q.click(); }
      });
    } else {
      el.setAttribute('aria-label', SL.t('menu.courses'));
      el.innerHTML = courseList();
    }
    // arrow keys and letters inside the menu must not reach a lesson's own keyboard shortcuts
    el.addEventListener('keydown', function (e) { if (e.key === 'Escape') { close(true); } else if (e.key !== 'Tab' && e.key !== 'Enter') { e.stopPropagation(); } });
    el.addEventListener('click', function (e) { e.stopPropagation(); });
    return el;
  }
  function place() {
    if (!panel || !anchor) return;
    var r = anchor.getBoundingClientRect(), w = panel.offsetWidth;
    panel.style.top = Math.round(r.bottom + 8) + 'px';
    var left = anchor.getAttribute('data-mode') === 'more' ? r.right - w : r.left; // the three-dot button sits at the right edge
    panel.style.left = Math.max(8, Math.min(Math.round(left), window.innerWidth - w - 8)) + 'px';
  }
  function close(refocus) {
    if (!panel) return;
    panel.remove(); panel = null;
    if (anchor) { anchor.setAttribute('aria-expanded', 'false'); if (refocus) anchor.focus(); }
    anchor = null;
  }
  function toggle(btn) {
    if (panel && anchor === btn) { close(); return; }
    close(); anchor = btn; panel = build(btn.getAttribute('data-mode')); document.body.appendChild(panel);
    btn.setAttribute('aria-expanded', 'true'); place();
    var cur = panel.querySelector('[aria-current]') || panel.querySelector('a'); if (cur) { cur.focus({ preventScroll: true }); if (cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest' }); }
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.sn-courses, .sn-more');
    if (b) { e.stopPropagation(); toggle(b); } else if (panel && !panel.contains(e.target)) close();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && panel) close(true); });
  window.addEventListener('resize', place);
  SL.onChange(function () { if (panel) { var b = anchor; close(); toggle(b); } });
  window.SLNAV = { toggle: toggle, close: close, isOpen: function () { return !!panel; } };
})();
