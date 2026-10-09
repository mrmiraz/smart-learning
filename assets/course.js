/* Draws one course page: its title, description and topic list (with the QR button for each lecture and quiz),
   from window.__HOME__ in the current language. */
(function () {
  'use strict';
  var H = window.__HOME__, SL = window.SL;
  var root = document.getElementById('course'), idx = +root.getAttribute('data-index');
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  function initial(title) {
    try { return new Intl.Segmenter(SL.lang, { granularity: 'grapheme' }).segment(title)[Symbol.iterator]().next().value.segment; } catch (e) { return Array.from(title)[0] || ''; }
  }
  function render() {
    var c = (H.courses[SL.lang] || H.courses[SL.defaultLang])[idx];
    root.style.setProperty('--h', (235 + idx * 70) % 360);
    document.title = c.title + ' - Smart Learning';
    root.innerHTML = '<header class="course-hero"><div class="badge">' + esc(initial(c.title)) + '</div><div><h1>' + esc(c.title) + '</h1><p>' + esc(c.description) + '</p>' +
      '<div class="count">' + esc(SL.t('home.topics', { n: c.topics.length })) + '</div></div></header>' +
      '<section class="course"><ol class="topics">' + c.topics.map(function (t) {
        return '<li><a href="../' + esc(t.path) + '">' + esc(t.title) + (t.duration ? '<span class="tag">' + esc(SL.t('home.interactive', { n: t.duration })) + '</span>' : '') + '</a>' +
          '<button class="qrbtn" type="button" data-path="' + esc(t.path) + '" data-title="' + esc(t.title) + '"' + (t.quiz ? ' data-quiz="' + esc(t.quiz) + '"' : '') +
          ' aria-label="' + esc(SL.t('home.qr', { title: t.title })) + '" title="' + esc(SL.t('home.qrTitle')) + '">' + esc(SL.t('home.qrShort')) + '</button></li>';
      }).join('') + '</ol></section>';
  }
  render();
  SL.onChange(render);

  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.qrbtn');
    if (!b || !window.SLQR) return;
    var p = b.dataset.path, items = [{ label: SL.t('qr.lecture'), note: SL.t('qr.lectureNote'), url: function () { return SLQR.resolve(p); } }];
    if (b.dataset.quiz) items.push({ label: SL.t('qr.quiz'), note: SL.t('qr.quizNote'), url: function () { return SLQR.resolve(p) + '#s=' + b.dataset.quiz; } });
    SLQR.open(b.dataset.title, items);
  });
})();
