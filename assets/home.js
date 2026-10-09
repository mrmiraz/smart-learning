/* Draws the home page (one card per course) from window.__HOME__ in the current language and redraws when the language changes.
   A course's topics live on its own page (assets/course.js), so any number of courses stays easy to scan. */
(function () {
  'use strict';
  var H = window.__HOME__, SL = window.SL;
  var grid = document.getElementById('grid'), hero = document.getElementById('hero');
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  function initial(title) {
    try { return new Intl.Segmenter(SL.lang, { granularity: 'grapheme' }).segment(title)[Symbol.iterator]().next().value.segment; } catch (e) { return Array.from(title)[0] || ''; }
  }
  function render() {
    var courses = H.courses[SL.lang] || H.courses[SL.defaultLang];
    var accent = '\u0001';
    hero.innerHTML = esc(SL.t('home.hero1', { accent: accent })).replace(accent, '<span>' + esc(SL.t('home.hero1Accent')) + '</span>') + '<br>' + esc(SL.t('home.hero2'));
    grid.innerHTML = courses.map(function (c, i) {
      var mins = c.topics.reduce(function (n, t) { return n + (t.duration || 0); }, 0);
      return '<a class="course card-link" href="' + esc(c.path) + '" style="--h:' + ((235 + i * 70) % 360) + '">' +
        '<div class="course-head"><div class="badge">' + esc(initial(c.title)) + '</div><div><h2>' + esc(c.title) + '</h2>' +
        '<div class="count">' + esc(SL.t('home.topics', { n: c.topics.length })) + (mins ? ' · ' + esc(SL.t('home.hours', { n: Math.round(mins / 6) / 10 })) : '') + '</div></div></div>' +
        '<p>' + esc(c.description) + '</p><span class="open">' + esc(SL.t('home.open')) + '</span></a>';
    }).join('\n');
  }
  render();
  SL.onChange(render);
})();
