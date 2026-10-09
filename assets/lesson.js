/* Smart Learning interactive lesson engine. No dependencies.
   Data comes from window.__LESSON__ (format: .claude/skills/new-lesson/reference.md). */
(() => {
  'use strict';
  // One lesson file per language (window.__LESSONS__ = { en: {...}, bn: {...} }); a language without a translation falls back to the default.
  const LESSONS = window.__LESSONS__ || { en: window.__LESSON__ };
  const t = (k, v) => window.SL.t(k, v);
  let L = LESSONS[window.SL.lang] || LESSONS[window.SL.defaultLang] || LESSONS[Object.keys(LESSONS)[0]];
  const KEY = 'sl-lesson-' + L.id;

  /* ---------- helpers ---------- */
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const pad = (n) => String(n).padStart(2, '0');
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const md = (s) => esc(s == null ? '' : s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*\s][^*]*)\*/g, '<em>$1</em>');
  const mmss = (s) => `${Math.floor(s / 60)}:${pad(Math.floor(s % 60))}`;
  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'style') el.style.cssText = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(kid));
    return el;
  }
  // replaceChildren() would print "null"/"undefined" for empty slots, so drop them first.
  const fill = (el, ...kids) => { el.replaceChildren(...kids.flat().filter((k) => k != null && k !== false)); return el; };
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
  };
  function shuffle(arr, seed) { // deterministic, never returns the original order; yields [value, originalIndex]
    const a = arr.map((v, i) => [v, i]);
    let s = [...String(seed)].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);
    const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    if (a.length > 1 && a.every(([, i], k) => i === k)) a.push(a.shift());
    return a;
  }
  const ICON = {
    prev: 'M15 18l-6-6 6-6', next: 'M9 18l6-6-6-6', play: 'M7 4l13 8-13 8z', pause: 'M6 4h4v16H6zM14 4h4v16h-4z',
    auto: 'M13 2L3 14h8l-1 8 10-12h-8z', restart: 'M3 12a9 9 0 1 0 3-6.7M3 4v5h5',
    full: 'M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3',
    quiz: 'M9 9a3 3 0 1 1 4.5 2.6c-.9.5-1.5 1.2-1.5 2.4M12 18h.01M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z',
    notes: 'M4 4h16v12l-6 6H4zM14 22v-6h6', sliders: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
    speaker: 'M11 5L6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14', help: 'M12 17h.01M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z',
    qr: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM20 14v3M14 20h3M20 20v1', timer: 'M12 8v4l3 2M12 4a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9 2h6', pen: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  };
  const icon = (n, size = 18) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICON[n]}"/></svg>`;
  const THEME_ICON = '<svg class="sun" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg><svg class="moon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';

  /* ---------- data ---------- */
  // Derived from L; rebuilt by useLesson() when the language changes. The step list has the same shape in every language
  // (lesson-validate.js enforces this), so the current position and the student's progress carry over.
  let steps, concepts, conceptById, quizSection, practiceTotal;
  const useLesson = (lesson) => {
    L = lesson; steps = [];
    L.sections.forEach((sec, si) => sec.steps.forEach((st, k) => steps.push({ ...st, sec: si, id: st.id || `${sec.id}-${k + 1}` })));
    concepts = L.concepts || [];
    conceptById = Object.fromEntries(concepts.map((c) => [c.id, c]));
    quizSection = L.sections.find((sec) => sec.steps.some((x) => x.type === 'quiz'));
    practiceTotal = steps.filter((x) => x.type === 'practice').length;
  };
  useLesson(L);
  const firstStepOf = (si) => steps.findIndex((s) => s.sec === si);
  const sectionIndex = (id) => Math.max(0, L.sections.findIndex((s) => s.id === id));
  const MAXLV = L.practiceLevels === 4 ? 4 : 3; // 4 = Easy, Medium, Hard, Challenge (Computer Architecture brief)
  const levelName = (n) => t(`level.${MAXLV}.${n}`);
  const QUIZ_PTS = { easy: 10, medium: 15, hard: 20, challenge: 30 };
  const badgeName = (id) => t('badge.' + id);
  const tm = (k, v) => md(t(k, v));
  const lookup = (key, fallback) => { const v = t(key); return v === key ? fallback : v; }; // lesson data may name a skill or level the locale does not know
  const L10n = (key) => ({ 'data-i18n': key, text: t(key) }); // static chrome text: re-translated in place by SL.apply

  /* ---------- state ---------- */
  const S = { i: 0, r: 0, mode: 'study', started: false, points: 0, streak: 0, best: 0, events: [], awarded: {}, badges: [], practice: {}, quizResult: null, recallResult: null, paused: false, auto: false, wait: 0, elapsed: 0 };
  const saved = store.get(KEY);
  const cfg = Object.assign({ reduce: matchMedia('(prefers-reduced-motion: reduce)').matches, size: 0, narrate: false, notes: false, pace: 1 }, store.get('sl-settings') || {});
  const persist = () => store.set(KEY, { i: S.i, points: S.points, streak: S.streak, best: S.best, events: S.events, awarded: S.awarded, badges: S.badges, practice: S.practice, quizResult: S.quizResult, recallResult: S.recallResult, elapsed: S.elapsed });
  let cur = null; // controller of the visible step
  let timers = [];
  let uiMode = 'auto';
  let hideTimer = 0;

  function conceptStatus() {
    const m = Object.fromEntries(concepts.map((c) => [c.id, null]));
    const quizMiss = new Set();
    for (const e of S.events) if (e.concept in m) { m[e.concept] = e.ok; if (e.quiz && !e.ok) quizMiss.add(e.concept); } // latest outcome wins...
    quizMiss.forEach((c) => { m[c] = false; }); // ...unless the final quiz missed it
    return m;
  }
  const practiceDone = () => Object.keys(S.practice).length;
  const masteredCount = () => Object.values(conceptStatus()).filter((v) => v === true).length;
  function toast(msg) {
    const t = h('div', { class: 'toast', role: 'status', text: msg });
    app.append(t); setTimeout(() => t.remove(), 2600);
  }
  function award(step, pts) {
    if (S.awarded[step.id] || !pts) return;
    S.awarded[step.id] = 1; S.points += pts; updateHud();
  }
  function badge(id) { if (!S.badges.includes(id)) { S.badges.push(id); toast(t('toast.badge', { name: badgeName(id) })); } }
  function result(step, ok, { pts = 0, streak = true, challenge = false } = {}) {
    if (step.concept) S.events.push({ concept: step.concept, ok, step: step.id, quiz: !!step.quiz });
    if (ok) award(step, pts);
    if (streak) { if (ok) { S.streak++; S.best = Math.max(S.best, S.streak); } else S.streak = 0; }
    if (S.best >= 1 && ok && streak) badge('first');
    if (S.streak >= 3) badge('roll');
    if (S.streak >= 5) badge('five');
    if (ok && challenge) badge('challenge');
    if (concepts.length && masteredCount() === concepts.length) badge('mastery');
    updateHud(); persist();
  }

  /* ---------- syntax highlighting (tiny, line based) ---------- */
  const KW = {
    java: 'abstract boolean break byte case catch char class continue default do double else enum extends final finally float for if implements import instanceof int interface long new package private protected public return short static super switch this throw throws try void while var true false null',
    js: 'async await break case catch class const continue default do else export extends false finally for function if import in let new null return static super switch this throw true try typeof undefined var void while yield',
    python: 'and as assert break class continue def del elif else except False finally for from if import in is lambda None not or pass raise return True try while with yield',
    c: 'break case char const continue default do double else enum float for if int long return short signed sizeof static struct switch typedef union unsigned void while',
    asm: 'mov add sub mul div jmp je jne jg jl cmp push pop call ret load store lw sw addi beq bne and or xor not shl shr nop halt inc dec ld st li',
  };
  KW.cpp = KW.c; KW.ts = KW.js;
  function highlight(line, lang) {
    const kws = new Set((KW[lang] || '').split(' '));
    const cm = lang === 'python' ? '#.*' : lang === 'asm' ? ';.*|#.*' : '\\/\\/.*|\\/\\*.*?\\*\\/';
    const re = new RegExp(`(${cm})|("(?:\\\\.|[^"\\\\])*"|'(?:\\\\.|[^'\\\\])*')|\\b(0x[0-9a-fA-F]+|\\d+(?:\\.\\d+)?)\\b|\\b([A-Za-z_]\\w*)\\b`, 'g');
    let out = '', last = 0, m;
    while ((m = re.exec(line))) {
      out += esc(line.slice(last, m.index)); last = re.lastIndex;
      if (m[1]) out += `<span class="tk-c">${esc(m[1])}</span>`;
      else if (m[2]) out += `<span class="tk-s">${esc(m[2])}</span>`;
      else if (m[3]) out += `<span class="tk-n">${esc(m[3])}</span>`;
      else out += kws.has(lang === 'asm' ? m[4].toLowerCase() : m[4]) ? `<span class="tk-k">${esc(m[4])}</span>` : esc(m[4]);
    }
    return out + esc(line.slice(last));
  }

  /* ---------- reveal blocks ---------- */
  const BLOCKS = {
    text: (b) => ({ el: h('p', { class: 'blk text ' + (b.style || ''), html: md(b.text) }), n: 0 }),
    bullets: (b) => {
      const items = b.items.map((t) => { const o = typeof t === 'string' ? { text: t } : t; return h('li', { class: 'rv' }, h('span', {}, h('span', { html: md(o.text) }), o.sub && h('span', { class: 'sub', html: md(o.sub) }))); });
      return { el: h(b.numbered ? 'ol' : 'ul', { class: 'bullets blk' + (b.big ? ' objectives' : '') }, items), n: items.length, set: (l) => items.forEach((x, i) => x.classList.toggle('on', i < l)) };
    },
    flow: (b) => {
      const layout = b.layout || 'row';
      const nodes = b.nodes.map((n, i) => h('div', { class: 'node rv' + (b.zoom ? ' zoom' : ''), tabindex: '0', role: 'button', onclick: () => focusNode(i), onkeydown: (e) => { if (e.key === 'Enter') focusNode(i); } },
        n.icon && h('div', { class: 'ico', text: n.icon }), h('div', { class: 'lbl', html: md(n.label) }), n.sub && h('div', { class: 'sub', html: md(n.sub) }),
        n.children && h('div', { class: 'chips' }, n.children.map((c) => h('span', { class: 'chip', html: md(c) })))));
      const arrows = nodes.map((_, i) => (i && b.arrows !== false && layout !== 'grid') ? h('div', { class: 'arrow rv' }, h('i', { class: 'packet' })) : null);
      const parts = []; nodes.forEach((n, i) => { if (arrows[i]) parts.push(arrows[i]); parts.push(n); });
      const caption = h('div', { class: 'caption empty', 'aria-live': 'polite' });
      const flowEl = h('div', { class: 'flow ' + layout, style: layout === 'grid' ? `--cols:${b.cols || 3}` : '' }, parts);
      const el = h('div', { class: 'blk' }, flowEl, b.nodes.some((n) => n.note || n.example) && caption,
        b.replay !== false && b.nodes.length > 1 && h('div', { class: 'row', style: 'justify-content:center' }, h('button', { class: 'btn', type: 'button', onclick: replay }, t('blk.flow.replay'))));
      let level = 0, seq = [];
      const showNote = (i) => { const nd = b.nodes[i]; const note = nd && (nd.note || nd.example); caption.classList.toggle('empty', !note); if (note) { caption.innerHTML = [nd.note && md(nd.note), nd.example && `<div class="ex-line"><b>${esc(t('blk.flow.example'))}</b> ${md(nd.example)}</div>`].filter(Boolean).join(''); caption.style.animation = 'none'; void caption.offsetWidth; caption.style.animation = ''; } };
      function mark(i, fire) {
        nodes.forEach((n, k) => { n.classList.toggle('cur', k === i); n.classList.toggle('done', k < level && k !== i); n.classList.toggle('linked', i >= 0 && k !== i && ((b.nodes[i].links || []).includes(k))); });
        if (fire && arrows[i]) { arrows[i].classList.remove('fire'); void arrows[i].offsetWidth; arrows[i].classList.add('fire'); }
        showNote(i);
      }
      function focusNode(i) { if (i < level) { seq.forEach(clearTimeout); mark(i, false); } }
      function replay() {
        seq.forEach(clearTimeout); seq = [];
        nodes.forEach((n, k) => { n.classList.remove('cur', 'done'); });
        nodes.forEach((n, k) => seq.push(setTimeout(() => { mark(k, true); }, (cfg.reduce ? 400 : 1100) * (k + 1))));
        timers.push(...seq);
      }
      return {
        el, n: nodes.length,
        set: (l) => {
          const prev = level; level = l;
          nodes.forEach((n, i) => { n.classList.toggle('on', i < l); if (arrows[i]) arrows[i].classList.toggle('on', i < l); });
          if (l === 0) { mark(-1); } else mark(l - 1, l > prev);
        },
      };
    },
    compare: (b) => {
      const side = (s) => h('div', { class: 'card rv' }, h('h3', { html: md(s.title) }), h('ul', {}, s.items.map((t) => h('li', { html: md(t) }))));
      const l = side(b.left), r = side(b.right);
      return { el: h('div', { class: 'compare blk' }, l, h('div', { class: 'vs', text: t('blk.vs') }), r), n: 2, set: (k) => { l.classList.toggle('on', k > 0); r.classList.toggle('on', k > 1); } };
    },
    transform: (b) => {
      const cell = (c) => h('div', { class: 'card rv' }, h('strong', { html: md(c.title) }), c.text && h('div', { html: md(c.text) }), c.code && h('pre', { class: 'code', html: c.code.split('\n').map((x) => highlight(x, c.lang || 'asm')).join('\n') }));
      const a = cell(b.before), m = h('div', { class: 'mid rv', html: '→ ' + md(b.process) + ' →' }), z = cell(b.after);
      return { el: h('div', { class: 'transform blk' }, a, m, z), n: 3, set: (k) => [a, m, z].forEach((x, i) => x.classList.toggle('on', i < k)) };
    },
    table: (b) => {
      const rows = b.rows.map((r) => h('tr', { class: 'rv' }, r.map((c) => h('td', { html: md(c) }))));
      return { el: h('table', { class: 'blk' }, h('thead', {}, h('tr', {}, b.head.map((c) => h('th', { text: c })))), h('tbody', {}, rows)), n: rows.length, set: (l) => rows.forEach((x, i) => x.classList.toggle('on', i < l)) };
    },
    code: (b) => {
      const lines = b.code.split('\n').map((t, i) => h('span', { class: 'ln', 'data-n': i + 1, html: highlight(t, b.lang || 'java') || ' ' }));
      const pre = h('div', { class: 'code' }, h('pre', {}, lines));
      const note = h('div', { class: 'code-note caption empty' });
      const sts = b.steps || [];
      return {
        el: h('div', { class: 'blk' }, pre, sts.length ? note : null), n: sts.length, early: true,
        set: (l) => {
          pre.classList.toggle('focus', l > 0);
          const cur = sts[l - 1];
          lines.forEach((x, i) => x.classList.toggle('hl', !!cur && cur.lines.includes(i + 1)));
          note.classList.toggle('empty', !cur || !cur.note); if (cur && cur.note) note.innerHTML = md(cur.note);
        },
      };
    },
    analogy: (b) => {
      const pairs = b.pairs.map((p) => h('div', { class: 'pair rv' },
        h('div', { class: 'cell' }, h('span', { html: md(p.real) }), p.note && h('small', { html: md(p.note) })), h('div', { class: 'link', text: '⇄' }),
        h('div', { class: 'cell tech', onclick: (e) => e.currentTarget.classList.add('shown') }, h('span', { html: md(p.tech) }))));
      const wrap = h('div', { class: 'analogy blk' }, h('div', { class: 'head' }, h('span', { text: b.realTitle || t('blk.analogy.real') }), h('span'), h('span', { text: b.techTitle || t('blk.analogy.tech') })), pairs,
        h('div', { class: 'row' }, h('button', { class: 'btn', type: 'button', onclick: (e) => { const on = wrap.classList.toggle('testing'); wrap.querySelectorAll('.tech').forEach((x) => x.classList.remove('shown')); e.currentTarget.textContent = on ? t('blk.analogy.show') : t('blk.analogy.test'); } }, t('blk.analogy.test'))));
      return { el: wrap, n: pairs.length, set: (l) => pairs.forEach((x, i) => x.classList.toggle('on', i < l)) };
    },
    timeline: (b) => {
      const items = b.items.map((t) => h('li', { class: 'rv' }, h('b', { text: t.when }), ' — ', h('span', { html: md(t.label) }), t.note && h('div', { class: 'muted', html: md(t.note) })));
      return { el: h('ul', { class: 'timeline blk' }, items), n: items.length, set: (l) => items.forEach((x, i) => x.classList.toggle('on', i < l)) };
    },
    formula: (b) => {
      const terms = b.terms.map((t) => (typeof t === 'string' ? { t } : t));
      const stops = terms.map((t, i) => (t.note ? i : -1)).filter((i) => i >= 0);
      const spans = terms.map((t) => h('span', { class: 'ft' + (t.note ? ' has' : ''), html: md(t.t) }));
      const caption = h('div', { class: 'caption empty', 'aria-live': 'polite' });
      return {
        el: h('div', { class: 'blk formula' }, h('div', { class: 'eq', role: 'math', 'aria-label': terms.map((t) => t.t).join(' ') }, spans), caption), n: stops.length, early: true,
        set: (l) => {
          spans.forEach((sp, i) => { sp.classList.toggle('cur', stops[l - 1] === i); sp.classList.toggle('seen', stops.slice(0, Math.max(0, l - 1)).includes(i)); });
          const t = terms[stops[l - 1]]; caption.classList.toggle('empty', !t); if (t) caption.innerHTML = md(t.note);
        },
      };
    },
    calculator: (b) => {
      const ids = b.inputs.map((i) => i.id), base = Object.fromEntries(b.inputs.map((i) => [i.id, i.value])), vals = { ...base };
      const allowed = new Set([...ids, 'min', 'max', 'sqrt', 'log2', 'pow']);
      const compile = (expr) => { // only input names, numbers and arithmetic are allowed
        const bad = (expr.replace(/(?<![\w.])\d+\.?\d*(?:e[+-]?\d+)?/gi, '').match(/[A-Za-z_]\w*/g) || []).some((w) => !allowed.has(w)) || /[^\w\s+\-*/().,^]/.test(expr) || /[A-Za-z_\d)]\s*\.\s*[A-Za-z_]/.test(expr);
        if (bad) return () => NaN;
        try { return new Function(...ids, 'min', 'max', 'sqrt', 'log2', 'pow', `return (${expr.replace(/\^/g, '**')});`); } catch (e) { return () => NaN; }
      };
      const fns = b.results.map((r) => compile(r.formula));
      const calc = (v) => fns.map((f) => { try { return f(...ids.map((id) => v[id]), Math.min, Math.max, Math.sqrt, Math.log2, Math.pow); } catch (e) { return NaN; } });
      const num = (x, d = 2) => (Number.isFinite(x) ? window.SL.n(x, d) : '—');
      const FMT = {
        num: (x, r) => num(x, r.digits ?? 2) + (r.unit ? ' ' + r.unit : ''),
        time: (x) => (x >= 1 ? num(x, 2) + ' s' : x >= 1e-3 ? num(x * 1e3, 2) + ' ms' : x >= 1e-6 ? num(x * 1e6, 2) + ' µs' : num(x * 1e9, 2) + ' ns'),
        x: (x, r) => num(x, r.digits ?? 2) + '×', pct: (x, r) => num(x * 100, r.digits ?? 1) + '%',
      };
      const fmtRes = (x, r) => (FMT[r.format || 'num'] || FMT.num)(x, r);
      const baseRes = calc(base);
      const outs = b.inputs.map((i) => h('output', { class: 'cval' }));
      const sliders = b.inputs.map((i, k) => h('input', { type: 'range', min: i.min, max: i.max, step: i.step || 1, value: i.value, 'aria-label': i.label, oninput: (e) => { vals[i.id] = +e.target.value; update(); } }));
      const rows = b.inputs.map((i, k) => h('label', { class: 'crow' }, h('span', { class: 'clabel', text: i.label }), sliders[k], outs[k]));
      const resEls = b.results.map((r) => ({ val: h('div', { class: 'rval' }), chg: h('div', { class: 'rchg' }), b0: h('i'), b1: h('i') }));
      const resRows = b.results.map((r, i) => h('div', { class: 'rrow' }, h('div', { class: 'rlabel', text: r.label }), resEls[i].val,
        r.better ? h('div', { class: 'rbars', 'aria-hidden': 'true' }, h('div', { class: 'rbar' }, h('span', { text: t('blk.calc.baseline') }), h('div', { class: 'track' }, resEls[i].b0)), h('div', { class: 'rbar now' }, h('span', { text: t('blk.calc.now') }), h('div', { class: 'track' }, resEls[i].b1))) : null, resEls[i].chg));
      const trace = b.trace ? h('div', { class: 'trace' }) : null;
      function update() {
        const res = calc(vals);
        b.inputs.forEach((i, k) => { outs[k].textContent = num(vals[i.id], 4) + (i.unit ? ' ' + i.unit : ''); });
        b.results.forEach((r, i) => {
          resEls[i].val.textContent = fmtRes(res[i], r);
          if (r.better) {
            const ratio = r.better === 'lower' ? baseRes[i] / res[i] : res[i] / baseRes[i], mx = Math.max(baseRes[i], res[i]) || 1;
            resEls[i].b0.style.width = (baseRes[i] / mx * 100) + '%'; resEls[i].b1.style.width = (res[i] / mx * 100) + '%';
            resEls[i].chg.textContent = !Number.isFinite(ratio) ? '' : Math.abs(ratio - 1) < 0.005 ? t('blk.calc.same') : ratio > 1 ? t('blk.calc.better', { x: num(ratio, 2) }) : t('blk.calc.worse', { x: num(1 / ratio, 2) });
            resEls[i].chg.className = 'rchg ' + (Math.abs(ratio - 1) < 0.005 ? '' : ratio > 1 ? 'up' : 'down');
          }
        });
        if (trace) trace.textContent = b.trace.replace(/\{(\w+)\}/g, (m, id) => (id in vals ? num(vals[id], 4) : /^r\d+$/.test(id) && b.results[+id.slice(1)] ? fmtRes(res[+id.slice(1)], b.results[+id.slice(1)]) : m)); // input names win over {rN} result slots
      }
      const reset = h('button', { class: 'btn', type: 'button', onclick: () => { b.inputs.forEach((i, k) => { vals[i.id] = i.value; sliders[k].value = i.value; }); update(); } }, t('blk.calc.reset'));
      update();
      return { el: h('div', { class: 'blk calc card' }, b.title && h('h3', { text: b.title }), b.equation && h('div', { class: 'ceq', html: md(b.equation) }), h('div', { class: 'cinputs' }, rows), trace, h('div', { class: 'cresults' }, resRows), h('div', { class: 'row' }, reset)), n: 0 };
    },
    mistake: (b) => {
      const w = h('div', { class: 'mk wrong rv' }, h('span', { class: 'mk-tag', text: t('blk.mistake.wrong') }), h('p', { html: md(b.wrong) }));
      const r = h('div', { class: 'mk right rv' }, h('span', { class: 'mk-tag', text: t('blk.mistake.right') }), h('p', { html: md(b.right) }), b.why && h('p', { class: 'muted', html: md(b.why) }));
      return { el: h('div', { class: 'blk mkwrap' }, w, r), n: 2, set: (l) => { w.classList.toggle('on', l > 0); w.classList.toggle('struck', l > 1); r.classList.toggle('on', l > 1); } };
    },
    callout: (b) => ({ el: h('div', { class: `callout blk ${b.tone || ''}` }, b.title && h('h4', { text: b.title }), h('p', { html: md(b.text) })), n: 0 }),
    example: (b) => {
      const el = h('div', { class: 'callout example blk' }, h('h4', { text: b.title || t('blk.example') }), b.text && h('p', { html: md(b.text) }));
      if (b.code) el.append(h('div', { style: 'margin-top:.7rem' }, BLOCKS.code(b.code).el));
      return { el, n: 0 };
    },
  };
  /* ---------- interactive demo blocks (assets/demos-*.js) ---------- */
  const EXPR_FN = { min: Math.min, max: Math.max, sqrt: Math.sqrt, log2: Math.log2, pow: Math.pow, floor: Math.floor, ceil: Math.ceil, round: Math.round, abs: Math.abs,
    mod: (a, b) => ((a % b) + b) % b, xor: (a, b) => (a ^ b) >>> 0, and: (a, b) => (a & b) >>> 0, or: (a, b) => (a | b) >>> 0, shl: (a, b) => (a << b) >>> 0, shr: (a, b) => a >>> b };
  const kit = {
    h, md, esc, clamp, pad, mmss, cfg, sim: window.SLSIM, hl: highlight, fill,
    t, get lang() { return window.SL.lang; }, // UI strings for the demo blocks (locales/*.json, keys demo.*)
    later: (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; },
    every: (fn, ms) => { const t = setInterval(fn, ms); timers.push(t); return t; },
    toast: (m) => toast(m),
    expr: (expr, ids) => { // arithmetic over named inputs only; returns a function (values) => number
      const names = Object.keys(EXPR_FN); const allowed = new Set([...ids, ...names]);
      const bare = expr.replace(/(?<![\w.])\d+\.?\d*(?:e[+-]?\d+)?/gi, '');
      if ((bare.match(/[A-Za-z_]\w*/g) || []).some((w) => !allowed.has(w)) || /[^\w\s+\-*/().,%^]/.test(expr) || /[A-Za-z_\d)]\s*\.\s*[A-Za-z_]/.test(expr)) throw new Error('unsupported expression');
      const f = new Function(...ids, ...names, `return (${expr.replace(/\^/g, '**')});`);
      return (vals) => f(...ids.map((i) => vals[i]), ...names.map((n) => EXPR_FN[n]));
    },
  };
  (window.SLDEMO_PARTS || []).forEach((part) => Object.assign(BLOCKS, part(kit)));

  function makeBlocks(blocks) {
    const parts = []; let off = 0;
    for (const b of blocks) {
      const p = BLOCKS[b.type](b);
      if (b.reveal && p.n === 0) p.n = 1;
      p.off = off; off += p.n; parts.push(p);
    }
    return {
      els: parts.map((p) => p.el), n: off,
      set(r) {
        for (const p of parts) {
          const visible = p.n === 0 || p.early ? r >= p.off : r > p.off;
          p.el.classList.toggle('is-hidden', !visible);
          if (p.set) p.set(clamp(r - p.off, 0, p.n));
        }
      },
    };
  }

  /* ---------- step frame + shared UI ---------- */
  function frame(step, ...kids) {
    const sec = L.sections[step.sec];
    const c = step.type === 'concept' && conceptById[step.concept];
    return h('article', { class: 'step t-' + step.type },
      h('div', { class: 'kicker' }, h('span', { class: 'chip', text: `${pad(step.sec + 1)} ${sec.label}` }),
        step.type === 'practice' && h('span', { class: 'chip lv' + (step.level || 1), text: levelName(step.level || 1) }), step.exam && h('span', { class: 'chip', text: t('chip.exam') }), step.type === 'discussion' && h('span', { class: 'chip', text: t('chip.discussion') }),
        step.skill && h('span', { class: 'chip', text: lookup('skill.' + String(step.skill).toLowerCase(), step.skill) }), c && h('span', { class: 'chip', text: c.label })),
      step.title && h('h2', { class: 'title', html: md(step.title) }), ...kids);
  }
  const codeEl = (code) => BLOCKS.code(typeof code === 'string' ? { code, lang: 'text' } : code).el; // a plain string is accepted too
  function feedbackBox() { return h('div', { class: 'feedback is-hidden', role: 'status', 'aria-live': 'polite' }); }
  function say(box, tone, head, text) { box.className = 'feedback ' + tone; box.replaceChildren(h('strong', { text: head }), ' ', h('span', { html: md(text || '') })); }

  function mcqUI(q, o = {}) {
    const retry = o.retry !== false; let locked = false, tries = 0;
    const fb = feedbackBox();
    const opts = q.options.map((t, i) => h('button', { class: 'opt', type: 'button', onclick: () => pick(i) },
      h('span', { class: 'key', text: 'ABCDEFGH'[i] }), h('span', { class: 'otxt', html: md(t) }), h('span', { class: 'mark', 'aria-hidden': 'true' })));
    const mark = (i, good) => { opts[i].classList.add(good ? 'right' : 'wrong'); opts[i].querySelector('.mark').textContent = good ? t('mcq.correctMark') : '✗'; };
    const lockAll = () => { locked = true; opts.forEach((b) => { b.disabled = true; }); };
    function pick(i) {
      if (locked) return; tries++;
      const ok = i === q.answer;
      mark(i, ok);
      const wrongText = (q.feedback && q.feedback[i]) || q.misconception || '';
      if (ok) { lockAll(); say(fb, 'good', t('mcq.correct'), q.why); o.onSettle && o.onSettle(true, tries === 1); }
      else if (retry) { opts[i].disabled = true; say(fb, 'bad', t('mcq.notQuite'), wrongText || t('mcq.lookAgain')); }
      else { mark(q.answer, true); lockAll(); say(fb, 'bad', t('mcq.notQuite'), [wrongText, q.why].filter(Boolean).join(' ')); o.onSettle && o.onSettle(false, false); }
    }
    function reveal() { if (locked) return; mark(q.answer, true); lockAll(); say(fb, 'good', t('mcq.answer'), q.why); o.onReveal && o.onReveal(); }
    return { el: h('div', { class: 'mcq' }, h('div', { class: 'opts', role: 'group', 'aria-label': t('mcq.choices') }, opts), fb), reveal, opts, locked: () => locked };
  }

  /* ---------- textbook references (cover and report) ---------- */
  const BOOKS = { CAQA: 'Hennessy & Patterson, Computer Architecture: A Quantitative Approach (2nd edition)', COD: 'Patterson & Hennessy, Computer Organization and Design: The Hardware/Software Interface (5th edition, MIPS Edition)' }; // book titles stay as published
  function refsEl(title, asDetails) {
    const refs = L.references; if (!refs || !refs.length) return null;
    const list = h('ul', { class: 'refs-list' }, refs.map((r) => h('li', {}, h('strong', { text: BOOKS[r.book] || r.book }), ` \u2014 ${t('refs.chapter', { n: r.chapter })}${r.title ? ': ' + r.title : ''}${r.sections ? ' (' + r.sections + ')' : ''}`, r.topics && h('div', { class: 'muted', text: r.topics }))));
    return asDetails ? h('details', { class: 'refs' }, h('summary', { text: title }), list) : h('div', { class: 'refs card' }, h('h3', { text: title }), list);
  }

  /* ---------- QR codes: open this lecture, or the quiz directly ---------- */
  const hasQR = () => !!(window.SLQR && window.qrcode);
  const lectureUrl = () => window.SLQR.pageUrl();
  const quizUrl = () => lectureUrl() + '#s=' + quizSection.id;
  function openLinks() {
    if (!hasQR()) { toast(t('qr.unavailable')); return; }
    window.SLQR.open(t('qr.title'), [{ label: t('qr.lecture'), note: t('qr.lectureNote'), url: lectureUrl }, quizSection && { label: t('qr.quiz'), note: t('qr.quizNote'), url: quizUrl }].filter(Boolean));
  }
  function qrCard(url, caption) {
    if (!hasQR()) return null;
    return h('button', { class: 'qrcard', type: 'button', 'aria-label': caption + ' (' + t('qr.enlarge') + ')', title: t('qr.enlarge'), onclick: openLinks }, window.SLQR.el(url, caption), h('span', { text: caption }));
  }
  function deepLinkSection() { // #s=<section id> (or #quiz) opens that section directly, skipping the cover
    const m = /(?:^#|[&#])s=([\w-]+)/.exec(location.hash) || /^#(quiz)$/.exec(location.hash);
    if (!m) return -1;
    const i = L.sections.findIndex((sec) => sec.id === m[1]);
    return i >= 0 ? i : (m[1] === 'quiz' && quizSection ? L.sections.indexOf(quizSection) : -1);
  }

  /* ---------- step types ---------- */
  const STEP = {};

  STEP.hook = (step) => {
    const clues = (step.clues || []).map((c) => h('li', { class: 'rv', html: md(c) }));
    return {
      el: frame(step, h('p', { class: 'hook-q', html: md(step.question) }), step.context && h('p', { class: 'text lead muted', html: md(step.context) }), h('ul', { class: 'clues' }, clues)),
      max: clues.length, set: (r) => clues.forEach((c, i) => c.classList.toggle('on', i < r)),
    };
  };

  STEP.objectives = (step) => {
    const b = BLOCKS.bullets({ items: L.objectives, numbered: true, big: true });
    return { el: frame(step, h('p', { class: 'text lead' }, step.intro || t('obj.intro')), b.el), max: b.n, set: (r) => b.set(r) };
  };

  function extrasRow(step) {
    const kids = [];
    if (step.explainAgain) {
      const ea = typeof step.explainAgain === 'string' ? { beginner: step.explainAgain } : step.explainAgain;
      const panel = h('div', { class: 'panel is-hidden' });
      const render = (key) => {
        const out = [];
        if (ea.beginner && ea.technical) {
          const seg = h('div', { class: 'seg' });
          ['beginner', 'technical'].forEach((k) => seg.append(h('button', { class: 'tb', type: 'button', 'aria-pressed': String(k === key), onclick: () => render(k) }, k === 'beginner' ? t('extra.beginner') : t('extra.technical'))));
          out.push(seg);
        }
        out.push(h('p', { class: 'pre', html: md(ea[key]) }));
        if (ea.analogy && key === 'beginner') out.push(h('p', { class: 'muted', html: tm('extra.thinkLike') + ' ' + md(ea.analogy) }));
        panel.replaceChildren(...out);
      };
      kids.push(h('button', { class: 'btn', type: 'button', onclick: () => { panel.classList.toggle('is-hidden'); if (!panel.classList.contains('is-hidden')) render(ea.beginner ? 'beginner' : 'technical'); } }, t('extra.explainAgain')), panel);
    }
    if (step.deeper) {
      const d = typeof step.deeper === 'string' ? { text: step.deeper } : step.deeper;
      kids.push(h('details', { class: 'deeper' }, h('summary', { text: t('extra.deeper') }), h('div', {}, d.text && h('p', { class: 'pre', html: md(d.text) }), d.items && h('ul', {}, d.items.map((t) => h('li', { html: md(t) }))), d.code && codeEl(d.code))));
    }
    return kids.length ? h('div', { class: 'extras' }, kids) : null;
  }

  STEP.concept = (step) => {
    const blocks = makeBlocks([...(step.blocks || []), ...(step.why ? [{ type: 'callout', tone: 'why', title: t('concept.why'), text: step.why, reveal: true }] : []),
      ...(step.real ? [{ type: 'callout', tone: 'real', title: t('concept.real'), text: step.real, reveal: true }] : []),
      ...(step.mistake ? [].concat(step.mistake).map((m) => ({ type: 'mistake', ...m })) : [])]);
    const extras = extrasRow(step);
    return { el: frame(step, h('div', { class: 'body' }, blocks.els), extras), max: blocks.n, set: (r) => { blocks.set(r); if (extras) extras.classList.toggle('is-hidden', r < blocks.n); } };
  };

  STEP.mcq = (step, ctx) => {
    const ui = mcqUI(step, { onSettle: (ok, first) => { result(step, ok && first, { pts: 10 }); ctx.done(); } });
    return { el: frame(step, h('p', { class: 'q', html: md(step.question) }), step.code && h('div', { class: 'blk' }, codeEl(step.code)), ui.el), max: 0, hold: true, set() {}, showAnswer: ui.reveal, opts: ui.opts };
  };
  STEP.tf = (step, ctx) => STEP.mcq({ ...step, title: step.title || t('tf.title'), question: step.statement, options: [t('tf.true'), t('tf.false')], answer: step.answer ? 0 : 1 }, ctx);

  STEP.predict = (step, ctx) => {
    let picked = null;
    const rev = makeBlocks(step.reveal || []);
    const fb = feedbackBox();
    const box = h('div', { class: 'reveal-box is-hidden' }, rev.els);
    const opts = step.options.map((t, i) => h('button', { class: 'opt', type: 'button', onclick: () => choose(i) }, h('span', { class: 'key', text: 'ABCDEFGH'[i] }), h('span', { class: 'otxt', html: md(t) }), h('span', { class: 'mark' })));
    function choose(i) {
      if (picked !== null) return; picked = i;
      opts.forEach((b, k) => { b.disabled = true; b.classList.toggle('chosen', k === i); });
      opts[i].querySelector('.mark').textContent = t('predict.yours');
      if (step.answer != null) { opts[step.answer].classList.add('right'); if (step.answer !== i) opts[i].classList.remove('chosen'); opts[step.answer].querySelector('.mark').textContent = step.answer === i ? t('predict.yoursRight') : t('predict.happens'); }
      const good = step.answer == null || step.answer === i;
      say(fb, good ? 'good' : 'bad', good ? t('predict.good') : t('predict.bad'), step.result);
      box.classList.remove('is-hidden'); box.append(fb);
      rev.set(0); let k = 0;
      const stepFn = () => { k++; rev.set(k); if (k < rev.n) ctx.later(stepFn, cfg.reduce ? 150 : 1100); };
      ctx.later(stepFn, 350);
      award(step, 5); ctx.done();
    }
    return {
      el: frame(step, h('p', { class: 'q', html: md(step.question) }), step.code && h('div', { class: 'blk' }, codeEl(step.code)), h('p', { class: 'muted', text: t('predict.prompt') }), h('div', { class: 'opts' }, opts), box),
      max: 0, hold: true, set() {}, showAnswer: () => choose(step.answer != null ? step.answer : 0), opts,
    };
  };

  STEP.tps = (step, ctx) => {
    const think = step.think ?? 30, pair = step.pair ?? 45;
    const phases = [null, { name: t('tps.think'), secs: think }, { name: t('tps.pair'), secs: pair }];
    const num = h('span', { class: 'tnum' }), label = h('div', { class: 'tlabel' });
    const ring = h('div', { class: 'ring' }, num);
    const timer = h('div', { class: 'timer is-hidden', role: 'timer' }, ring, h('div', {}, label, h('div', { class: 'muted', text: t('tps.hint') })));
    const ans = h('div', { class: 'answer is-hidden' }, h('h3', { text: t('tps.reveal') }), h('p', { class: 'pre', html: md(step.answer) }));
    const start = h('button', { class: 'btn primary', type: 'button', onclick: () => ctx.advance() }, t('tps.start'));
    let remain = 0, total = 1, r = 0;
    const paint = () => { num.textContent = mmss(Math.max(0, Math.ceil(remain))); ring.style.setProperty('--p', ((1 - remain / total) * 100).toFixed(1) + '%'); };
    return {
      el: frame(step, h('p', { class: 'q', html: md(step.prompt) }), step.code && h('div', { class: 'blk' }, codeEl(step.code)), start, timer, ans), max: 3, hold: true,
      gap: (rr) => (rr === 0 ? 3 : rr === 3 ? 8 : Infinity),
      set(rr) {
        r = rr; start.classList.toggle('is-hidden', r !== 0); timer.classList.toggle('is-hidden', !(r === 1 || r === 2)); ans.classList.toggle('is-hidden', r < 3);
        if (r === 1 || r === 2) { total = remain = phases[r].secs; label.textContent = phases[r].name; paint(); }
        if (r === 3) { award(step, 5); ctx.done(); }
      },
      tick(dt) { if (r !== 1 && r !== 2) return; remain -= dt; paint(); if (remain <= 0) ctx.advance(); },
      showAnswer: () => ctx.jump(3),
    };
  };

  STEP.practice = (step, ctx) => {
    const lv = step.level || 1, pts = (MAXLV === 4 ? [5, 10, 15, 20] : [5, 10, 20])[lv - 1];
    const hint = step.hint && h('div', { class: 'hint is-hidden', html: tm('practice.hintLabel') + ' ' + md(step.hint) });
    const hintBtn = step.hint && h('button', { class: 'btn', type: 'button', onclick: () => { hint.classList.remove('is-hidden'); hintBtn.disabled = true; } }, t('practice.needHint'));
    const box = h('textarea', { class: 'answer-box', rows: '3', placeholder: t('practice.placeholder'), 'aria-label': t('practice.yourAnswer') });
    const checkBtn = h('button', { class: 'btn primary', type: 'button', onclick: () => ctx.advance() }, t('practice.check'));
    const explBtn = (step.solution || step.mistake) && h('button', { class: 'btn', type: 'button', onclick: () => ctx.advance() }, t('practice.explain'));
    const mine = h('div', { class: 'solution is-hidden' }, h('h3', { text: t('practice.yourAnswer') }), h('div', { class: 'pre' }));
    const ans = h('div', { class: 'answer is-hidden' }, h('h3', { text: t('practice.correct') }), h('div', { class: 'pre', html: md(step.answer) }));
    const sol = step.solution && h('div', { class: 'solution is-hidden' }, h('h3', { text: t('practice.why') }), h('div', { class: 'pre', html: md(step.solution) }));
    const mist = step.mistake && h('div', { class: 'callout warn blk is-hidden' }, h('h4', { text: t('practice.mistake') }), h('p', { html: md(step.mistake) }));
    const fb = feedbackBox();
    const rate = h('div', { class: 'row is-hidden' }, h('span', { class: 'muted', text: t('practice.how') }),
      h('button', { class: 'btn good', type: 'button', onclick: () => rated(true) }, t('practice.gotIt')), h('button', { class: 'btn bad', type: 'button', onclick: () => rated(false) }, t('practice.needReview')),
      h('button', { class: 'btn', type: 'button', onclick: () => ctx.restart() }, t('practice.tryAgain')));
    function rated(ok) {
      result(step, ok, { pts, streak: false, challenge: lv === MAXLV });
      rate.querySelectorAll('.good, .bad').forEach((b2) => { b2.disabled = true; });
      say(fb, ok ? 'good' : 'bad', ok ? t('practice.nice', { pts }) : t('practice.flagged'), '');
    }
    const max = explBtn ? 2 : 1;
    return {
      el: frame(step, h('p', { class: 'q', html: md(step.question) }), step.code && h('div', { class: 'blk' }, codeEl(step.code)), box,
        h('div', { class: 'row' }, hintBtn, checkBtn, explBtn), hint, mine, ans, sol, mist, rate, fb),
      max, pause: true, opts: null,
      set(r) {
        if (r >= 1) { mine.lastChild.textContent = box.value.trim() || t('practice.noAnswer'); S.practice[step.id] = true; persist(); }
        box.readOnly = r >= 1; mine.classList.toggle('is-hidden', r < 1); ans.classList.toggle('is-hidden', r < 1);
        if (sol) sol.classList.toggle('is-hidden', r < 2); if (mist) mist.classList.toggle('is-hidden', r < (sol ? 2 : 1)); rate.classList.toggle('is-hidden', r < 1);
        checkBtn.classList.toggle('is-hidden', r >= 1); if (explBtn) explBtn.classList.toggle('is-hidden', r !== 1);
        if (r >= max) ctx.done();
      },
      showAnswer: () => ctx.jump(max),
    };
  };

  STEP.discussion = (step, ctx) => {
    const ideas = (step.ideas || []).map((t) => h('li', { class: 'rv', html: md(t) }));
    const secs = step.seconds ?? 60; let remain = secs, running = false;
    const num = h('span', { class: 'tnum' }), ring = h('div', { class: 'ring' }, num), msg = h('div', { class: 'tlabel' });
    const timer = h('div', { class: 'timer is-hidden', role: 'timer' }, ring, h('div', {}, msg, h('div', { class: 'muted', text: t('disc.hint') })));
    const paint = () => { num.textContent = mmss(Math.max(0, Math.ceil(remain))); ring.style.setProperty('--p', ((1 - remain / secs) * 100).toFixed(1) + '%'); msg.textContent = remain <= 0 ? t('disc.timeUp') : t('disc.discuss'); };
    const startBtn = h('button', { class: 'btn primary', type: 'button', onclick: () => { running = true; remain = secs; timer.classList.remove('is-hidden'); paint(); startBtn.textContent = t('disc.restart'); } }, secs >= 60 && secs % 60 === 0 ? t('disc.startMin', { n: secs / 60 }) : t('disc.startSec', { n: secs }));
    const revealBtn = h('button', { class: 'btn', type: 'button', onclick: () => ctx.advance() }, t('disc.reveal'));
    return {
      el: frame(step, h('p', { class: 'q big-q', html: md(step.question) }), step.context && h('p', { class: 'muted', html: md(step.context) }), h('div', { class: 'row' }, startBtn, ideas.length ? revealBtn : null), timer, h('ul', { class: 'clues' }, ideas)),
      max: ideas.length, pause: true,
      set(r) { ideas.forEach((x, i) => x.classList.toggle('on', i < r)); if (ideas.length) revealBtn.textContent = r === 0 ? t('disc.reveal') : r < ideas.length ? t('disc.next') : t('disc.all'); if (r >= ideas.length) ctx.done(); },
      tick(dt) { if (!running) return; remain -= dt; paint(); if (remain <= 0) running = false; },
      showAnswer: () => ctx.jump(ideas.length),
    };
  };

  STEP.match = (step, ctx) => {
    const pairs = step.pairs; let sel = null, mistakes = 0, matched = 0; const fb = feedbackBox();
    const rightOrder = shuffle(pairs.map((p) => p.b), step.id).map((x) => x[1]);
    const mk = (side, i, text) => h('button', { class: 'opt', type: 'button', 'data-side': side, onclick: () => click(side, i) }, h('span', { class: 'num' }), h('span', { class: 'otxt', html: md(text) }));
    const L_ = pairs.map((p, i) => mk('l', i, p.a)), R_ = rightOrder.map((i) => mk('r', i, pairs[i].b));
    const rBy = Object.fromEntries(rightOrder.map((pi, k) => [pi, R_[k]]));
    const all = () => [...L_, ...R_];
    function pair(i) { matched++; const h_ = (matched * 67) % 360; [L_[i], rBy[i]].forEach((b) => { b.classList.add('done'); b.classList.remove('sel'); b.disabled = true; b.style.setProperty('--h', h_); b.querySelector('.num').textContent = matched; }); }
    function finishCheck() {
      if (matched < pairs.length) return;
      const ok = mistakes === 0;
      say(fb, 'good', ok ? t('match.perfect') : t('match.all'), ok ? step.why : `${t('match.took', { n: mistakes })} ${step.why || ''}`);
      result(step, ok, { pts: 10 }); ctx.done();
    }
    function click(side, i) {
      if (sel && sel.side === side) { all().forEach((b) => b.classList.remove('sel')); sel = null; }
      if (!sel) { sel = { side, i }; (side === 'l' ? L_[i] : rBy[i]).classList.add('sel'); return; }
      const li = side === 'l' ? i : sel.i, ri = side === 'r' ? i : sel.i;
      if (li === ri) { pair(li); sel = null; finishCheck(); }
      else { mistakes++; const els = [L_[li], rBy[ri]]; els.forEach((b) => { b.classList.add('shake'); setTimeout(() => b.classList.remove('shake'), 400); }); all().forEach((b) => b.classList.remove('sel')); sel = null; say(fb, 'bad', t('match.no'), t('match.think')); }
    }
    return {
      el: frame(step, h('p', { class: 'q', html: md(step.prompt) }), h('p', { class: 'muted', text: t('match.how') }), h('div', { class: 'match' }, h('div', { class: 'opts' }, L_), h('div', { class: 'opts' }, R_)), fb),
      max: 0, hold: true, set() {}, showAnswer: () => { all().forEach((b) => b.classList.remove('sel')); sel = null; pairs.forEach((_, i) => { if (!L_[i].classList.contains('done')) pair(i); }); mistakes = 99; finishCheck(); },
    };
  };

  STEP.arrange = (step, ctx) => {
    const n = step.items.length; const placed = []; let tries = 0; const fb = feedbackBox();
    const poolIdx = shuffle(step.items, step.id).map((x) => x[1]);
    const slots = step.items.map((_, k) => h('li', { class: 'slot', onclick: () => { if (placed[k] != null) { placed.splice(k, 1); draw(); } } }, h('span', { class: 'n', text: k + 1 }), h('span', { class: 'st' })));
    const pool = poolIdx.map((i) => h('button', { class: 'opt', type: 'button', onclick: () => { if (!placed.includes(i)) { placed.push(i); draw(); } } }, h('span', { class: 'otxt', html: md(step.items[i]) })));
    const check = h('button', { class: 'btn primary', type: 'button', onclick: doCheck }, t('arrange.check'));
    const reset = h('button', { class: 'btn', type: 'button', onclick: () => { placed.length = 0; draw(); } }, t('arrange.reset'));
    let solved = false;
    function draw(marks) {
      slots.forEach((s, k) => { const i = placed[k]; s.classList.toggle('filled', i != null); s.classList.remove('ok', 'no'); s.querySelector('.st').innerHTML = i != null ? md(step.items[i]) : `<span class="muted">${esc(t('arrange.click'))}</span>`; if (marks && i != null) { s.classList.add(marks[k] ? 'ok' : 'no'); s.querySelector('.st').innerHTML += marks[k] ? ' ✓' : ' ✗'; } });
      pool.forEach((b, p) => { b.classList.toggle('is-hidden', placed.includes(poolIdx[p])); });
    }
    function doCheck() {
      if (solved) return;
      if (placed.length < n) { say(fb, 'bad', t('arrange.unfinished'), t('arrange.placeAll', { n })); return; }
      const marks = placed.map((v, k) => v === k); tries++;
      if (marks.every(Boolean)) { solved = true; draw(marks); say(fb, 'good', t('arrange.correct'), step.why); result(step, tries === 1, { pts: 10 }); ctx.done(); }
      else { draw(marks); say(fb, 'bad', t('mcq.notQuite'), t('arrange.partial', { k: marks.filter(Boolean).length, n })); }
    }
    draw();
    return {
      el: frame(step, h('p', { class: 'q', html: md(step.prompt) }), h('div', { class: 'arrange' }, h('h4', { text: t('arrange.yourOrder') }), h('ol', { class: 'slots' }, slots), h('h4', { text: t('arrange.toPlace') }), h('div', { class: 'pool' }, pool), h('div', { class: 'row' }, check, reset), fb)),
      max: 0, hold: true, set() {},
      showAnswer: () => { solved = true; placed.length = 0; step.items.forEach((_, i) => placed.push(i)); draw(placed.map(() => true)); say(fb, 'good', t('arrange.answer'), step.why); },
    };
  };

  STEP.find = (step, ctx) => {
    const wrong = [].concat(step.wrong); const found = new Set(); let misses = 0; const fb = feedbackBox(); const codey = step.code !== false && !!step.lang;
    const rows = step.lines.map((t, i) => h('button', { type: 'button', onclick: () => pick(i) }, h('span', { class: 'num', text: i + 1 }), h('span', { html: codey ? highlight(t, step.lang) : md(t) })));
    function pick(i) {
      if (rows[i].disabled) return;
      if (wrong.includes(i)) {
        found.add(i); rows[i].classList.add('right'); rows[i].disabled = true;
        if (found.size === wrong.length) { say(fb, 'good', t('find.found'), [step.explain, step.fix && `${t('find.fix')} ${step.fix}`].filter(Boolean).join(' ')); result(step, misses === 0, { pts: 10 }); ctx.done(); }
        else say(fb, 'good', t('find.one'), t('find.another'));
      } else { misses++; rows[i].classList.add('wrong'); rows[i].disabled = true; say(fb, 'bad', t('find.fine'), t('find.lookAgain')); }
    }
    return {
      el: frame(step, h('p', { class: 'q', html: md(step.prompt) }), h('div', { class: 'lines' + (codey ? ' codey' : '') }, rows), fb), max: 0, hold: true, set() {},
      showAnswer: () => { misses = 99; wrong.forEach((i) => { if (!found.has(i)) { found.add(i); rows[i].classList.add('right'); } }); rows.forEach((r) => { r.disabled = true; }); say(fb, 'good', t('find.here'), [step.explain, step.fix && `${t('find.fix')} ${step.fix}`].filter(Boolean).join(' ')); },
    };
  };

  function meterEl() {
    const el = h('div', { class: 'meter', 'aria-live': 'polite' }, h('div', { class: 'muted' }), h('div', { class: 'bar' }, h('i')));
    el.update = () => { const m = masteredCount(), tot = concepts.length || 1; el.firstChild.innerHTML = `<b>${esc(t('meter.understanding', { m, total: concepts.length }))}</b>`; el.querySelector('i').style.width = (m / tot * 100) + '%'; };
    el.update(); return el;
  }
  STEP.checkpoint = (step, ctx) => {
    const meter = meterEl(); let rated = 0;
    const cards = step.questions.map((q, k) => {
      const ans = q.a && h('div', { class: 'answer is-hidden' }, h('div', { class: 'pre', html: md(q.a) }));
      const row = h('div', { class: 'row' + (q.a ? ' is-hidden' : '') },
        h('button', { class: 'btn good', type: 'button', onclick: () => rate(true) }, t('cp.can')), h('button', { class: 'btn bad', type: 'button', onclick: () => rate(false) }, t('cp.review')));
      const show = q.a && h('button', { class: 'btn', type: 'button', onclick: () => { ans.classList.remove('is-hidden'); row.classList.remove('is-hidden'); show.disabled = true; } }, t('cp.show'));
      const card = h('div', { class: 'card' }, h('p', { html: md(`${k + 1}. ${q.q}`) }), show, ans, row);
      function rate(ok) {
        if (row.dataset.done) return; row.dataset.done = '1'; rated++;
        result({ id: `${step.id}-${k}`, concept: q.concept }, ok, { pts: 3, streak: false });
        card.classList.add(ok ? 'done-ok' : 'done-no'); row.querySelectorAll('button').forEach((b) => { b.disabled = true; }); meter.update();
        if (rated === step.questions.length) ctx.done();
      }
      return card;
    });
    return { el: frame(step, h('p', { class: 'text lead' }, step.intro || t('cp.intro', { n: step.questions.length })), h('div', { class: 'cp' }, cards), meter), max: 0, hold: true, set() {}, showAnswer: () => document.querySelectorAll('.cp .btn:not(.good):not(.bad)').forEach((b) => b.click()) };
  };

  STEP.conceptmap = (step) => {
    const rootEl = h('div', { class: 'root rv', html: md(step.root) });
    const stem = h('div', { class: 'stem rv' });
    const brs = step.branches.map((b) => h('div', { class: 'br rv' }, h('button', { class: 'b', type: 'button', title: b.section ? t('cmap.jump') : '', onclick: () => b.section && show(firstStepOf(sectionIndex(b.section))) }, md2(b.label)), b.example && h('div', { class: 'ex', html: md(b.example) })));
    function md2(s) { return h('span', { html: md(s) }); }
    return {
      el: frame(step, h('div', { class: 'cmap' }, rootEl, stem, h('div', { class: 'branches', style: `--n:${brs.length}` }, brs), h('p', { class: 'hint-line', text: t('cmap.hint') }))),
      max: 1 + brs.length, set: (r) => { rootEl.classList.toggle('on', r > 0); stem.classList.toggle('on', r > 0); brs.forEach((b, i) => b.classList.toggle('on', r > i + 1)); },
    };
  };

  STEP.review = (step) => {
    const cards = [];
    const list = (title, items) => h('div', { class: 'card rv' }, h('h3', { text: title }), h('ul', {}, items.map((t) => h('li', { html: md(t) }))));
    if (step.remember) cards.push(list(t('review.remember'), step.remember));
    if (step.understand) cards.push(list(t('review.understand'), step.understand));
    if (step.apply) cards.push(list(t('review.apply'), step.apply));
    if (step.mistakes) cards.push(h('div', { class: 'card rv', style: 'grid-column:1/-1' }, h('h3', { text: t('review.mistakes') }), step.mistakes.map((m) => h('div', { class: 'mistake' }, h('span', { class: 'x', html: '✗ ' + md(m.wrong) }), h('span', { class: 'v', html: '✓ ' + md(m.right) })))));
    if (step.summary) cards.push(h('div', { class: 'card rv', style: 'grid-column:1/-1' }, h('h3', { text: t('review.summary') }), h('p', { class: 'summary-text', html: md(step.summary) })));
    return { el: frame(step, h('div', { class: 'review' }, cards)), max: cards.length, set: (r) => cards.forEach((c, i) => c.classList.toggle('on', i < r)) };
  };

  STEP.quiz = (step, ctx) => {
    const qs = step.questions.map((q, k) => ({ ...q, id: `${step.id}-q${k + 1}` }));
    let k = 0, score = 0, res = []; const wrap = h('div', { class: 'quiz' });
    const norm = (q) => (q.type === 'tf' ? { ...q, question: q.statement, options: [t('tf.true'), t('tf.false')], answer: q.answer ? 0 : 1 } : q);
    let settled = false;
    function ask() {
      const q = norm(qs[k]); settled = false;
      const next = h('button', { class: 'btn primary is-hidden', type: 'button', onclick: () => api.advance() }, k < qs.length - 1 ? t('quiz.next') : t('quiz.results'));
      const ui = mcqUI(q, { retry: false, onSettle: (ok) => { settled = true; if (ok) score++; res.push({ concept: qs[k].concept, ok, level: qs[k].level }); result({ id: qs[k].id, concept: qs[k].concept, quiz: true }, ok, { pts: QUIZ_PTS[qs[k].level] || 10, challenge: ok && qs[k].level === 'challenge' }); next.classList.remove('is-hidden'); } });
      api.ui = ui;
      fill(wrap, h('div', { class: 'quiz-head' }, h('span', { class: 'chip', text: t('quiz.question', { k: k + 1, n: qs.length }) }), h('span', { class: 'chip ' + qs[k].level, text: lookup('quizlevel.' + qs[k].level, qs[k].level) }), h('span', { class: 'muted', text: t('quiz.score', { n: score }) })),
        h('p', { class: 'q', html: md(q.question) }), q.code && h('div', { class: 'blk' }, codeEl(q.code)), ui.el, h('div', { class: 'row' }, next));
    }
    const api = {
      el: frame(step, hasQR() ? h('div', { class: 'quiz-layout' }, wrap, qrCard(quizUrl(), t('quiz.scan'))) : wrap), max: 0, hold: true, set() {}, interactive: true,
      advance() { if (!settled) return false; if (api.finished) return false; if (k < qs.length - 1) { k++; ask(); } else finish(); return true; },
      showAnswer: () => { if (api.ui && !settled) api.ui.reveal(); if (!settled) { settled = true; res.push({ concept: qs[k].concept, ok: false, level: qs[k].level }); result({ id: qs[k].id, concept: qs[k].concept, quiz: true }, false); wrap.querySelector('.btn.primary').classList.remove('is-hidden'); } },
    };
    function finish() {
      api.finished = true;
      const by = {}; res.forEach((x) => { (by[x.concept] = by[x.concept] || []).push(x.ok); });
      const good = Object.keys(by).filter((c) => by[c].every(Boolean)), weak = Object.keys(by).filter((c) => !by[c].every(Boolean));
      S.quizResult = { score, total: qs.length, good, weak }; persist();
      const pct = Math.round(score / qs.length * 100);
      const label = (c) => (conceptById[c] ? conceptById[c].label : c);
      const sectionOf = (c) => (conceptById[c] && conceptById[c].section) || null;
      const verdict = t(pct >= 85 ? 'quiz.verdict.high' : pct >= 60 ? 'quiz.verdict.mid' : 'quiz.verdict.low');
      fill(wrap, h('p', { class: 'muted', text: t('quiz.complete') }), h('div', { class: 'big-score', text: t('quiz.yourScore', { score, total: qs.length }) }), h('p', { class: 'text lead', text: `${window.SL.n(pct, 0)}%. ${verdict}` }),
        h('div', { class: 'result-cols' },
          h('div', { class: 'card' }, h('h3', { text: t('quiz.understood') }), h('ul', {}, good.length ? good.map((c) => h('li', { class: 'tag ok', text: label(c) })) : [h('li', { class: 'muted', text: t('quiz.nothingYet') })])),
          h('div', { class: 'card' }, h('h3', { text: t('quiz.shouldReview') }), h('ul', {}, weak.length ? weak.map((c) => h('li', {}, h('span', { class: 'tag no', text: label(c) }), sectionOf(c) ? h('button', { class: 'btn', style: 'margin-left:.6rem;padding:.2rem .7rem', type: 'button', onclick: () => show(firstStepOf(sectionIndex(sectionOf(c)))) }, t('quiz.reviewBtn')) : null)) : [h('li', { class: 'tag ok', text: t('quiz.nothing') })]))),
        h('div', { class: 'row' }, h('button', { class: 'btn', type: 'button', onclick: () => { S.events = S.events.filter((e) => !e.quiz); k = 0; score = 0; res = []; api.finished = false; ask(); updateHud(); } }, t('quiz.retake'))));
      ctx.done();
    }
    ask();
    return api;
  };

  STEP.recall = (step, ctx) => {
    let k = 0, ok = 0, shown = false, rated = false; const items = step.items; const wrap = h('div'); let done = false;
    function ask() {
      shown = false; rated = false;
      const ans = h('div', { class: 'answer is-hidden' }, h('div', { class: 'pre', html: md(items[k].a) }));
      const rate = h('div', { class: 'row is-hidden' }, h('button', { class: 'btn good', type: 'button', onclick: () => r(true) }, t('recall.ok')), h('button', { class: 'btn bad', type: 'button', onclick: () => r(false) }, t('recall.missed')));
      const showBtn = h('button', { class: 'btn primary', type: 'button', onclick: () => api.advance() }, t('recall.reveal'));
      function r(good) { if (rated) return; rated = true; if (good) ok++; result({ id: `${step.id}-${k}`, concept: items[k].concept }, good, { pts: 5, streak: false }); rate.querySelectorAll('button').forEach((b) => { b.disabled = true; }); }
      api.reveal = () => { shown = true; ans.classList.remove('is-hidden'); rate.classList.remove('is-hidden'); showBtn.classList.add('is-hidden'); };
      fill(wrap, h('div', { class: 'quiz-head' }, h('span', { class: 'chip', text: t('recall.of', { k: k + 1, n: items.length }) })), h('p', { class: 'q', html: md(items[k].q) }), h('p', { class: 'muted', text: t('recall.hint') }), h('div', { class: 'row' }, showBtn), ans, rate);
    }
    const api = {
      el: frame(step, wrap), max: 0, hold: true, set() {},
      advance() { if (done) return false; if (!shown) { api.reveal(); return true; } if (k < items.length - 1) { k++; ask(); } else { done = true; fill(wrap, h('div', { class: 'big-score', text: `${window.SL.n(ok, 0)} / ${window.SL.n(items.length, 0)}` }), h('p', { class: 'text lead', text: ok === items.length ? t('recall.all') : t('recall.some') })); S.recallResult = { ok, total: items.length }; persist(); ctx.done(); } return true; },
      showAnswer: () => { if (!shown && !done) api.reveal(); },
    };
    ask();
    return api;
  };

  STEP.report = (step) => {
    const status = conceptStatus(), q = S.quizResult;
    const strong = concepts.filter((c) => status[c.id] === true), weak = concepts.filter((c) => status[c.id] === false), todo = concepts.filter((c) => status[c.id] === null);
    const stat = (v, l) => h('div', { class: 'stat' }, h('b', { text: v }), h('span', { text: l }));
    const rec = (c) => h('li', {}, h('span', { class: 'tag no', text: c.label }), c.section ? h('button', { class: 'btn', style: 'margin-left:.6rem;padding:.2rem .7rem', type: 'button', onclick: () => show(firstStepOf(sectionIndex(c.section))) }, t('report.reviewSection', { n: sectionIndex(c.section) + 1, label: L.sections[sectionIndex(c.section)].label })) : null);
    return {
      el: frame(step, h('div', { class: 'stats' }, stat(`${strong.length} / ${concepts.length}`, t('report.learned')), stat(q ? window.SL.n(Math.round(q.score / q.total * 100), 0) + '%' : '—', t('report.quizScore')), stat(`${practiceDone()} / ${practiceTotal}`, t('report.practice')), stat(window.SL.n(S.points, 0), t('report.points')), stat(window.SL.n(S.best, 0), t('report.streak'))),
        h('div', { class: 'result-cols' },
          h('div', { class: 'card' }, h('h3', { text: t('report.strong') }), h('ul', {}, strong.length ? strong.map((c) => h('li', { class: 'tag ok', text: c.label })) : [h('li', { class: 'muted', text: t('report.strongEmpty') })])),
          h('div', { class: 'card' }, h('h3', { text: t('report.needs') }), h('ul', {}, weak.length ? weak.map(rec) : [h('li', { class: 'tag ok', text: t('report.needsEmpty') })]), todo.length ? h('p', { class: 'muted', text: t('report.todo', { list: todo.map((c) => c.label).join(', ') }) }) : null)),
        S.badges.length ? h('div', {}, h('h3', { text: t('report.badges') }), h('div', { class: 'badges' }, S.badges.map((b) => h('span', { class: 'chip', text: badgeName(b) })))) : null,
        refsEl(t('report.readMore')),
        h('div', { class: 'row' }, h('button', { class: 'btn', type: 'button', onclick: () => window.print() }, t('report.print')), h('button', { class: 'btn', type: 'button', onclick: () => { if (confirm(t('report.restartConfirm'))) { store.set(KEY, null); location.reload(); } } }, t('report.restart')))),
      max: 0, set() {},
    };
  };

  /* ---------- chrome ---------- */
  const app = document.getElementById('app');
  const el = {
    nav: h('ol', { class: 'secs' }), hud: h('div', { class: 'hud' }), stage: h('main', { class: 'stage', id: 'stage', tabindex: '-1' }), notes: h('aside', { class: 'notes is-hidden', 'aria-label': t('notes.title'), 'data-i18n-attr': 'aria-label:notes.title' }),
    bar: h('i'), pos: h('b'), status: h('span'), elapsed: h('span'),
  };
  // Chrome text carries data-i18n(-attr) keys so SL.apply(app) re-translates it in place when the language changes.
  const tbtn = (id, ic, key, fn, extra = {}) => h('button', { class: 'tb ' + (extra.cls || ''), id: 'tb-' + id, type: 'button', title: t('tb.' + key), 'aria-label': t('tb.' + key), 'data-i18n-attr': `title:tb.${key},aria-label:tb.${key}`, onclick: fn, 'aria-pressed': extra.toggle ? 'false' : null, html: icon(ic) + (extra.text ? `<span class="lbl" data-i18n="tb.${extra.text}">${esc(t('tb.' + extra.text))}</span>` : '') });
  const B = {
    prev: tbtn('prev', 'prev', 'prev', () => prev()), play: tbtn('play', 'pause', 'play', () => togglePause()), next: tbtn('next', 'next', 'next', () => next(), { cls: 'primary' }),
    auto: tbtn('auto', 'auto', 'auto', () => toggleAuto(), { toggle: true, text: 'autoLabel' }), restart: tbtn('restart', 'restart', 'restart', () => restartStep()),
    quiz: tbtn('quiz', 'quiz', 'question', () => nextQuestion(), { text: 'questionLabel' }), notes: tbtn('notes', 'notes', 'notes', () => toggleNotes(), { toggle: true }),
    speak: tbtn('speak', 'speaker', 'speak', () => { cfg.narrate = !cfg.narrate; store.set('sl-settings', cfg); applyCfg(); if (cfg.narrate) narrate(); else stopSpeech(); }, { toggle: true }),
    full: tbtn('full', 'full', 'full', () => toggleFullscreen(), { toggle: true }), set: tbtn('set', 'sliders', 'settings', () => toggleSettings(), { toggle: true }),
    timer: tbtn('timer', 'timer', 'timer', () => toggleTimerMenu(), { toggle: true }), board: tbtn('board', 'pen', 'board', () => toggleBoard(), { toggle: true }), qr: tbtn('qr', 'qr', 'qr', () => openLinks()),
    help: tbtn('help', 'help', 'help', () => showHelp()),
  };
  const themeBtn = h('button', { class: 'tb theme', type: 'button', title: t('tb.theme'), 'aria-label': t('tb.theme'), 'data-i18n-attr': 'title:tb.theme,aria-label:tb.theme', html: THEME_ICON, onclick: () => window.slToggleTheme && window.slToggleTheme() });
  const toolbar = h('footer', { class: 'toolbar', role: 'toolbar', 'aria-label': t('tb.controls'), 'data-i18n-attr': 'aria-label:tb.controls' },
    h('div', { class: 'tb-left' }, B.prev, B.play, B.next, h('div', { class: 'statusline', 'aria-live': 'off' }, el.pos, el.status)),
    h('div', { class: 'tools' }, el.elapsed, B.auto, B.restart, B.quiz, B.timer, B.board, B.qr, B.notes, B.speak, B.full, B.set, B.help));
  const topnav = h('header', { class: 'topnav' }, h('a', { class: 'back', href: '../../index.html', ...L10n('nav.courses') }), window.SLNAV ? h('button', { class: 'back menu-btn', type: 'button', 'aria-haspopup': 'true', 'aria-expanded': 'false', ...L10n('menu.open'), onclick: (e) => { e.stopPropagation(); window.SLNAV.toggle(e.currentTarget); } }) : null, h('nav', { 'aria-label': t('nav.sections'), 'data-i18n-attr': 'aria-label:nav.sections', style: 'flex:1;min-width:0;display:flex' }, el.nav), el.hud, h('span', { 'data-lang-switch': '' }), themeBtn, window.SLNAV ? h('button', { class: 'more-btn', type: 'button', 'data-mode': 'more', 'aria-haspopup': 'true', 'aria-expanded': 'false', title: t('menu.more'), 'aria-label': t('menu.more'), 'data-i18n-attr': 'title:menu.more,aria-label:menu.more', html: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>', onclick: (e) => { e.stopPropagation(); window.SLNAV.toggle(e.currentTarget); } }) : null);
  app.className = 'lesson';
  app.replaceChildren(topnav, h('div', { class: 'pbar', role: 'progressbar', 'aria-label': t('nav.progress'), 'data-i18n-attr': 'aria-label:nav.progress' }, el.bar), el.stage, toolbar, el.notes);
  window.SL.apply(app);

  function buildSectionNav() {
    el.nav.replaceChildren(...L.sections.map((s, i) => h('li', {}, h('button', { class: 'sec', type: 'button', title: t('nav.sectionTitle', { label: s.label, min: s.minutes }), onclick: () => show(firstStepOf(i)) }, h('b', { text: pad(i + 1) }), h('span', { text: s.label })))));
  }
  buildSectionNav();

  function updateNav() {
    const sec = steps[S.i].sec;
    [...el.nav.querySelectorAll('.sec')].forEach((b, i) => { b.classList.toggle('cur', i === sec); b.classList.toggle('done', i < sec); b.setAttribute('aria-current', i === sec ? 'step' : 'false'); });
    const c = el.nav.querySelector('.cur'); if (c && c.scrollIntoView) c.scrollIntoView({ block: 'nearest', inline: 'center' });
  }
  function updateHud() {
    const pct = steps.length > 1 ? Math.round(S.i / (steps.length - 1) * 100) : 100;
    el.bar.style.width = pct + '%';
    fill(el.hud, h('button', { class: 'pill dash-btn', type: 'button', title: t('dash.title'), 'aria-label': t('dash.open'), onclick: () => toggleDash(), html: tm('hud.progress', { v: pct + '%' }) }), concepts.length ? h('span', { class: 'pill', html: tm('hud.concepts', { m: masteredCount(), total: concepts.length }) }) : null,
      h('span', { class: 'pill opt-pill', html: tm('hud.points', { n: S.points }) }), S.streak >= 2 ? h('span', { class: 'pill opt-pill', html: tm('hud.streak', { n: S.streak }) }) : null);
    el.pos.textContent = t('hud.position', { s: steps[S.i].sec + 1, sn: L.sections.length, k: S.i + 1, kn: steps.length });
    const pb = el.bar.parentNode; pb.setAttribute('aria-valuenow', pct);
  }
  function updateStatus() {
    let msg = '';
    if (!S.started) msg = '';
    else if (S.paused) msg = t('status.paused');
    else if (S.auto) {
      if (S.wait === Infinity) msg = cur && cur.pause ? t('status.autoQuestion') : '';
      else msg = t(S.r < (cur ? cur.max : 0) ? 'status.nextReveal' : 'status.nextSection', { n: Math.max(1, Math.ceil(S.wait)) });
    } else msg = t('status.manual');
    el.status.textContent = msg;
    el.elapsed.textContent = S.started ? `⏱ ${mmss(S.elapsed)} / ${L.duration}:00` : '';
    el.elapsed.className = 'pill opt-pill';
    B.play.innerHTML = icon(S.paused ? 'play' : 'pause');
  }

  /* ---------- navigation ---------- */
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  function show(i, atEnd = false) {
    clearTimers(); stopSpeech();
    S.i = clamp(i, 0, steps.length - 1); const step = steps[S.i];
    const ctx = { step, later: (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; }, advance: () => next(), restart: () => show(S.i), jump: (r) => { S.r = r; cur.set(r); resetWait(); updateHud(); }, done: () => { if (cur) { cur.answered = true; resetWait(); } } };
    try { cur = STEP[step.type](step, ctx); } catch (err) { console.error(err); cur = { el: h('article', { class: 'step' }, h('h2', { class: 'title', text: t('err.screen') }), h('p', { class: 'muted', text: String(err) })), max: 0, set() {} }; }
    cur.max = cur.max || 0; if (cur.pause == null) cur.pause = PAUSING.has(step.type); S.ansShown = false;
    el.stage.replaceChildren(h('div', { class: 'step-wrap enter' }, cur.el)); el.stage.scrollTop = 0;
    S.r = atEnd ? cur.max : 0; cur.set(S.r);
    renderNotes(step); updateNav(); updateHud(); resetWait(); persist(); document.title = `${step.title || L.title} — ${L.title}`; narrate();
  }
  function next() {
    if (!cur) return;
    if (cur.advance && cur.advance()) { resetWait(); return; }
    if (S.r < cur.max) { S.r++; cur.set(S.r); resetWait(); updateHud(); }
    else if (S.i < steps.length - 1) show(S.i + 1);
    else toast(t('toast.end'));
  }
  function prev() { if (!cur) return; if (S.r > 0) { S.r--; cur.set(S.r); resetWait(); } else if (S.i > 0) show(S.i - 1, true); }
  const PAUSING = new Set(['mcq', 'tf', 'predict', 'tps', 'practice', 'match', 'arrange', 'find', 'checkpoint', 'quiz', 'recall', 'discussion']);
  const restartStep = () => show(S.i);
  const skip = () => { if (cur && cur.max) { S.r = cur.max; cur.set(S.r); resetWait(); } };
  function nextQuestion() {
    const j = steps.findIndex((s, k) => k > S.i && PAUSING.has(s.type));
    if (j < 0) toast(t('toast.noQuestions')); else show(j);
  }
  function resetWait() { // questions and practice always pause auto-play; the teacher continues manually
    if (!cur) return;
    if (cur.pause) { S.wait = Infinity; return; }
    const gap = cur.gap ? cur.gap(S.r) : null, base = S.r < cur.max ? (gap ?? 8) : (gap ?? 15); // about 8 s per reveal, 15 s to read
    S.wait = base === Infinity ? Infinity : base * cfg.pace;
  }
  function togglePause() {
    S.paused = !S.paused;
    if ('speechSynthesis' in window && speechSynthesis.speaking) S.paused ? speechSynthesis.pause() : speechSynthesis.resume();
    updateStatus();
  }
  function toggleAuto() { S.auto = !S.auto; if (S.auto) S.paused = false; B.auto.setAttribute('aria-pressed', S.auto); resetWait(); updateStatus(); toast(t(S.auto ? 'toast.autoOn' : 'toast.autoOff')); }
  setInterval(() => {
    if (!S.started || S.paused) return;
    S.elapsed += .25; if (cur && cur.tick) cur.tick(.25); tickClassTimer(.25);
    if (S.auto && cur && S.wait !== Infinity) { S.wait -= .25; if (S.wait <= 0) next(); }
    updateStatus();
  }, 250);

  /* ---------- notes / settings / help / narration ---------- */
  function renderNotes(step) {
    const n = step.notes || {}, sec = L.sections[step.sec];
    const sect = (title, body) => (body ? [h('h4', { text: title }), body] : []);
    const list = (a) => (a && a.length ? h('ul', {}, a.map((x) => h('li', { html: md(x) }))) : null);
    fill(el.notes, h('h3', { text: t('notes.title') }), h('p', { class: 'muted', text: t('notes.meta', { n: step.sec + 1, label: sec.label, min: n.minutes || sec.minutes }) + (n.difficulty ? ' · ' + t('notes.difficulty', { d: n.difficulty }) : '') }),
      ...sect(t('notes.explain'), n.explain && h('p', { html: md(n.explain) })), ...sect(t('notes.terms'), list(n.terms)), ...sect(t('notes.misconceptions'), list(n.misconceptions)),
      ...sect(t('notes.ask'), n.ask && h('p', { html: md(n.ask) })), ...sect(t('notes.discuss'), n.discuss && h('p', { html: md(n.discuss) })),
      !step.notes ? h('p', { class: 'muted', text: t('notes.none') }) : null);
  }
  function toggleNotes() { cfg.notes = !cfg.notes; store.set('sl-settings', cfg); applyCfg(); }
  let settingsEl = null;
  function toggleSettings(force) {
    if (settingsEl && force !== true) { settingsEl.remove(); settingsEl = null; B.set.setAttribute('aria-pressed', 'false'); return; }
    const chk = (label, key, fn) => h('label', {}, h('span', { 'data-i18n': label, text: t(label) }), h('input', { type: 'checkbox', checked: cfg[key] ? '' : null, onchange: (e) => { cfg[key] = e.target.checked; store.set('sl-settings', cfg); applyCfg(); fn && fn(); } }));
    settingsEl = h('div', { class: 'settings', role: 'dialog', 'aria-label': t('set.title'), 'data-i18n-attr': 'aria-label:set.title' }, h('h3', L10n('set.title')),
      chk('set.reduce', 'reduce'), chk('set.notes', 'notes'), chk('set.narrate', 'narrate', () => { cfg.narrate ? narrate() : stopSpeech(); }),
      h('label', {}, h('span', L10n('set.size')), h('span', { class: 'seg' }, h('button', { class: 'tb', type: 'button', 'aria-label': t('set.smaller'), 'data-i18n-attr': 'aria-label:set.smaller', onclick: () => { cfg.size = clamp(cfg.size - 1, -2, 5); store.set('sl-settings', cfg); applyCfg(); } }, 'A−'), h('button', { class: 'tb', type: 'button', 'aria-label': t('set.larger'), 'data-i18n-attr': 'aria-label:set.larger', onclick: () => { cfg.size = clamp(cfg.size + 1, -2, 5); store.set('sl-settings', cfg); applyCfg(); } }, 'A+'))),
      h('label', {}, h('span', L10n('set.pace')), h('select', { onchange: (e) => { cfg.pace = +e.target.value; store.set('sl-settings', cfg); resetWait(); } }, [['set.relaxed', 1.6], ['set.normal', 1], ['set.quick', .7]].map(([key, v]) => h('option', { value: v, selected: cfg.pace === v ? '' : null, ...L10n(key) })))),
      h('button', { class: 'btn', type: 'button', onclick: () => { if (confirm(t('set.resetConfirm'))) { store.set(KEY, null); location.reload(); } }, ...L10n('set.reset') }));
    app.append(settingsEl); B.set.setAttribute('aria-pressed', 'true');
  }
  function showHelp() {
    const keys = [['→ / ←', 'next'], ['Space', 'pause'], ['R', 'restart'], ['A', 'auto'], ['F', 'full'], ['Q', 'question'], ['S', 'solution'], ['T', 'timer'], ['W', 'board'], ['L', 'qr'], ['N', 'notes'], ['G', 'lang'], ['K', 'skip'], ['H', 'hide'], ['1–9', 'option'], ['Esc', 'close']];
    const o = h('div', { class: 'help', onclick: (e) => { if (e.target === o) o.remove(); } }, h('div', { role: 'dialog', 'aria-label': t('help.title'), 'data-i18n-attr': 'aria-label:help.title' }, h('h3', L10n('help.title')), h('dl', {}, keys.flatMap(([k, d]) => [h('dt', {}, h('kbd', { text: k })), h('dd', L10n('help.' + d))])), h('div', { class: 'row' }, h('button', { class: 'btn primary', type: 'button', onclick: () => o.remove(), ...L10n('help.closeBtn') }))));
    app.append(o); o.querySelector('button').focus();
  }
  function applyCfg() {
    app.dataset.motion = cfg.reduce ? 'off' : 'on';
    document.documentElement.style.setProperty('--fs-scale', 1 + cfg.size * 0.1);
    app.style.setProperty('--t-found', JSON.stringify(t('find.foundTag'))); app.style.setProperty('--t-fine', JSON.stringify(t('find.fineTag'))); // pseudo-element labels
    el.notes.classList.toggle('is-hidden', !cfg.notes); B.notes.setAttribute('aria-pressed', cfg.notes); B.speak.setAttribute('aria-pressed', cfg.narrate);
  }
  const stopSpeech = () => { if ('speechSynthesis' in window) speechSynthesis.cancel(); };
  function narrate() {
    if (!cfg.narrate || !S.started || !('speechSynthesis' in window)) return;
    stopSpeech(); const step = steps[S.i];
    const u = new SpeechSynthesisUtterance(step.narration || el.stage.innerText.replace(/\s+/g, ' ').slice(0, 900)); u.rate = .95; speechSynthesis.speak(u);
  }
  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen(); else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
  }
  document.addEventListener('fullscreenchange', () => B.full.setAttribute('aria-pressed', !!document.fullscreenElement));

  /* ---------- teacher tools: answer toggle, classroom timer, whiteboard, dashboard ---------- */
  function toggleAnswer() {
    if (!cur || !cur.showAnswer) return;
    if (S.ansShown) { restartStep(); return; }
    cur.showAnswer(); S.ansShown = true;
  }
  let tmenu = null, ct = null;
  function toggleTimerMenu() {
    if (tmenu) { tmenu.remove(); tmenu = null; B.timer.setAttribute('aria-pressed', 'false'); return; }
    const go = (secs) => { if (secs > 0) { startClassTimer(secs); toggleTimerMenu(); } };
    const custom = h('input', { type: 'number', min: '5', max: '7200', value: '90', 'aria-label': t('timer.customLabel'), style: 'width:5rem;font:inherit;padding:.3rem;border-radius:.4rem;border:1px solid var(--line);background:var(--chip);color:var(--text)' });
    tmenu = h('div', { class: 'settings tmenu', role: 'dialog', 'aria-label': t('timer.title'), 'data-i18n-attr': 'aria-label:timer.title' }, h('h3', L10n('timer.title')),
      h('div', { class: 'row', style: 'margin:0' }, [['30', 30], ['60', 60], ['120', 120], ['300', 300]].map(([, v]) => h('button', { class: 'btn', type: 'button', onclick: () => go(v) }, v >= 60 ? t('timer.min', { n: v / 60 }) : t('timer.sec', { n: v })))),
      h('label', {}, h('span', L10n('timer.custom')), h('span', { class: 'seg' }, custom, h('button', { class: 'btn primary', type: 'button', onclick: () => go(+custom.value), ...L10n('timer.start') }))));
    app.append(tmenu); B.timer.setAttribute('aria-pressed', 'true');
  }
  function startClassTimer(secs) {
    if (ct) ct.el.remove();
    const time = h('div', { class: 'ct-time' }), label = h('div', { class: 'ct-label', text: t('ct.think') });
    const pauseBtn = h('button', { class: 'tb', type: 'button', onclick: () => { ct.paused = !ct.paused; pauseBtn.textContent = t(ct.paused ? 'ct.resume' : 'ct.pause'); } }, t('ct.pause'));
    const el2 = h('div', { class: 'ctimer', role: 'timer', 'aria-live': 'off' }, label, time, h('div', { class: 'seg' }, pauseBtn,
      h('button', { class: 'tb', type: 'button', onclick: () => { ct.remain += 30; paintClassTimer(); } }, t('ct.plus30')), h('button', { class: 'tb', type: 'button', 'aria-label': t('ct.closeLabel'), onclick: () => { ct.el.remove(); ct = null; } }, t('ct.close'))));
    ct = { remain: secs, total: secs, paused: false, el: el2, time, label }; app.append(el2); paintClassTimer();
  }
  function paintClassTimer() { if (!ct) return; ct.time.textContent = mmss(Math.max(0, Math.ceil(ct.remain))); ct.el.classList.toggle('done', ct.remain <= 0); ct.label.textContent = t(ct.remain <= 0 ? 'ct.up' : ct.remain <= 10 ? 'ct.almost' : 'ct.think'); }
  function tickClassTimer(dt) {
    if (!ct || ct.paused || ct.remain <= 0) return;
    ct.remain -= dt; paintClassTimer();
    if (ct.remain <= 0) { try { const a = new (window.AudioContext || window.webkitAudioContext)(), o = a.createOscillator(), g = a.createGain(); o.connect(g); g.connect(a.destination); g.gain.value = .08; o.frequency.value = 660; o.start(); o.stop(a.currentTime + .35); } catch (e) { /* sound is optional */ } }
  }
  let wb = null;
  function toggleBoard() {
    if (wb) { wb.el.remove(); wb = null; B.board.setAttribute('aria-pressed', 'false'); return; }
    const canvas = h('canvas', { class: 'wb-canvas', 'aria-label': t('wb.area') }), g = canvas.getContext('2d');
    const st = { tool: 'pen', color: '#ef4444', blank: true, drawing: false, x: 0, y: 0, snap: null };
    const size = () => { const dpr = window.devicePixelRatio || 1, img = canvas.width ? g.getImageData(0, 0, canvas.width, canvas.height) : null; canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); if (img) g.putImageData(img, 0, 0); };
    size(); const onResize = () => size(); addEventListener('resize', onResize);
    const pos = (e) => ({ x: e.clientX, y: e.clientY });
    const tools = [['pen', t('wb.pen')], ['highlight', t('wb.highlight')], ['circle', t('wb.circle')], ['text', t('wb.text')], ['erase', t('wb.erase')]];
    const toolBtns = tools.map(([k, label]) => h('button', { class: 'tb', type: 'button', 'aria-pressed': String(k === st.tool), onclick: () => { st.tool = k; toolBtns.forEach((b2, i) => b2.setAttribute('aria-pressed', String(tools[i][0] === k))); } }, label));
    const colors = ['#ef4444', '#2563eb', '#16a34a', '#f59e0b', '#111827'].map((c) => h('button', { class: 'wb-color', type: 'button', style: `background:${c}`, 'aria-label': t('wb.color', { c }), onclick: () => { st.color = c; } }));
    const modeBtn = h('button', { class: 'tb', type: 'button', onclick: () => { st.blank = !st.blank; el2.classList.toggle('over', !st.blank); modeBtn.textContent = t(st.blank ? 'wb.showSlide' : 'wb.blank'); } }, t('wb.showSlide'));
    const bar = h('div', { class: 'wb-bar', role: 'toolbar', 'aria-label': t('wb.tools') }, toolBtns, h('span', { class: 'wb-sep' }), colors, h('span', { class: 'wb-sep' }), modeBtn,
      h('button', { class: 'tb', type: 'button', onclick: () => g.clearRect(0, 0, innerWidth, innerHeight) }, t('wb.clear')), h('button', { class: 'tb', type: 'button', onclick: () => toggleBoard() }, t('wb.close')));
    const el2 = h('div', { class: 'wb' }, canvas, bar);
    const stroke = (p0, p1) => {
      g.lineCap = 'round'; g.lineJoin = 'round';
      if (st.tool === 'erase') { g.globalCompositeOperation = 'destination-out'; g.lineWidth = 36; g.strokeStyle = '#000'; }
      else if (st.tool === 'highlight') { g.globalCompositeOperation = 'source-over'; g.lineWidth = 26; g.strokeStyle = 'rgba(250,204,21,.38)'; }
      else { g.globalCompositeOperation = 'source-over'; g.lineWidth = 4; g.strokeStyle = st.color; }
      g.beginPath(); g.moveTo(p0.x, p0.y); g.lineTo(p1.x, p1.y); g.stroke(); g.globalCompositeOperation = 'source-over';
    };
    canvas.addEventListener('pointerdown', (e) => {
      const p = pos(e);
      if (st.tool === 'text') {
        const inp = h('input', { class: 'wb-text', style: `left:${p.x}px;top:${p.y - 16}px;color:${st.color}`, 'aria-label': t('wb.textLabel') });
        const commit = () => { if (inp.value) { g.fillStyle = st.color; g.font = '600 28px system-ui, sans-serif'; g.fillText(inp.value, p.x, p.y + 6); } inp.remove(); };
        inp.addEventListener('keydown', (ev) => { ev.stopPropagation(); if (ev.key === 'Enter') commit(); if (ev.key === 'Escape') inp.remove(); }); inp.addEventListener('blur', commit);
        el2.append(inp); setTimeout(() => inp.focus(), 0); return;
      }
      canvas.setPointerCapture(e.pointerId); st.drawing = true; st.x = p.x; st.y = p.y;
      if (st.tool === 'circle') st.snap = g.getImageData(0, 0, canvas.width, canvas.height);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!st.drawing) return; const p = pos(e);
      if (st.tool === 'circle') { g.putImageData(st.snap, 0, 0); g.strokeStyle = st.color; g.lineWidth = 4; g.beginPath(); g.ellipse((st.x + p.x) / 2, (st.y + p.y) / 2, Math.abs(p.x - st.x) / 2 || 1, Math.abs(p.y - st.y) / 2 || 1, 0, 0, Math.PI * 2); g.stroke(); }
      else { stroke({ x: st.x, y: st.y }, p); st.x = p.x; st.y = p.y; }
    });
    const end = () => { st.drawing = false; st.snap = null; }; canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
    app.append(el2); wb = { el: el2, off: () => removeEventListener('resize', onResize) }; B.board.setAttribute('aria-pressed', 'true');
    const origRemove = el2.remove.bind(el2); el2.remove = () => { wb && wb.off(); origRemove(); };
  }
  let dash = null;
  function toggleDash() {
    if (dash) { dash.remove(); dash = null; return; }
    const status = conceptStatus(), weak = concepts.filter((c) => status[c.id] === false), q = S.quizResult;
    const pct = steps.length > 1 ? Math.round(S.i / (steps.length - 1) * 100) : 100;
    const row = (k, v) => [h('dt', { text: k }), h('dd', { html: v })];
    dash = h('div', { class: 'settings dash', role: 'dialog', 'aria-label': t('dash.title') }, h('h3', { text: t('dash.title') }),
      h('dl', { class: 'dl' }, ...row(t('dash.progress'), `<b>${window.SL.n(pct, 0)}%</b>`), ...row(t('dash.concepts'), `<b>${window.SL.n(masteredCount(), 0)} / ${window.SL.n(concepts.length, 0)}</b>`), ...row(t('dash.practice'), `<b>${window.SL.n(practiceDone(), 0)} / ${window.SL.n(practiceTotal, 0)}</b>`),
        ...row(t('dash.quiz'), q ? `<b>${window.SL.n(Math.round(q.score / q.total * 100), 0)}%</b>` : esc(t('dash.notTaken'))), ...row(t('dash.weak'), weak.length ? `<b>${esc(weak[0].label)}</b>` : esc(t('dash.none')))),
      weak.length && weak[0].section ? h('button', { class: 'btn', type: 'button', onclick: () => { toggleDash(); show(firstStepOf(sectionIndex(weak[0].section))); } }, t('dash.review', { label: weak[0].label })) : null);
    app.append(dash);
  }

  /* ---------- auto-hide controls + keyboard ---------- */
  function pokeUI() {
    if (uiMode === 'hidden') return;
    app.classList.remove('ui-off'); clearTimeout(hideTimer);
    if (S.mode === 'presentation' && S.started && !settingsEl) hideTimer = setTimeout(() => app.classList.add('ui-off'), 3200);
  }
  ['mousemove', 'keydown', 'touchstart', 'pointerdown'].forEach((ev) => addEventListener(ev, pokeUI, { passive: true }));
  document.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('button'); if (b && e.detail > 0 && !b.closest('.settings')) b.blur(); });
  // Presentation on a touch screen: tap the right half of the slide for next, the left half for previous.
  // Taps on anything interactive (buttons, links, inputs, demos, anything with a pointer cursor) keep their own behaviour.
  let tapType = '';
  el.stage.addEventListener('pointerdown', (e) => { tapType = e.pointerType; }, { passive: true });
  el.stage.addEventListener('click', (e) => {
    if (tapType !== 'touch' || S.mode !== 'presentation' || !S.started || wb || e.defaultPrevented) return;
    if (window.getSelection && String(window.getSelection())) return;
    for (let n = e.target; n && n !== el.stage; n = n.parentElement) {
      if (n.matches && n.matches('button, a, input, select, textarea, summary, label, canvas, video, audio, [role="button"], [tabindex], [contenteditable], [draggable="true"]')) return;
      if (getComputedStyle(n).cursor === 'pointer') return;
    }
    const r = el.stage.getBoundingClientRect(), rtl = getComputedStyle(document.documentElement).direction === 'rtl';
    const right = e.clientX >= r.left + r.width / 2;
    if (right !== rtl) next(); else prev();
  });
  addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target; if (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || !S.started) return;
    const onCtl = t.closest && t.closest('button, summary, a');
    const k = e.key; let used = true;
    if (k === 'ArrowRight' || k === 'PageDown') next();
    else if (k === 'ArrowLeft' || k === 'PageUp') prev();
    else if (k === ' ') { if (onCtl) return; togglePause(); }
    else if (k === 'r' || k === 'R') restartStep();
    else if (k === 's' || k === 'S' || k === 'v' || k === 'V') toggleAnswer();
    else if (k === 'k' || k === 'K') skip();
    else if (k === 'n' || k === 'N') toggleNotes();
    else if (k === 'g' || k === 'G') { const cs = window.SL.langs.map((x) => x.code); window.SL.setLang(cs[(cs.indexOf(window.SL.lang) + 1) % cs.length]); }
    else if (k === 'w' || k === 'W') toggleBoard();
    else if (k === 'l' || k === 'L') openLinks();
    else if (k === 'a' || k === 'A') toggleAuto();
    else if (k === 'f' || k === 'F') toggleFullscreen();
    else if (k === 'q' || k === 'Q') nextQuestion();
    else if (k === 't' || k === 'T') toggleTimerMenu();
    else if (k === 'h' || k === 'H') { uiMode = uiMode === 'auto' ? 'hidden' : 'auto'; app.classList.toggle('ui-off', uiMode === 'hidden'); if (uiMode === 'auto') pokeUI(); }
    else if (k === '?') showHelp();
    else if (k === 'Escape') { if (window.SLQR) window.SLQR.close(); if (settingsEl) toggleSettings(); if (tmenu) toggleTimerMenu(); if (dash) toggleDash(); if (wb) toggleBoard(); document.querySelectorAll('.help').forEach((x) => x.remove()); }
    else if (/^[1-9]$/.test(k) && cur && cur.opts && cur.opts[+k - 1]) cur.opts[+k - 1].click();
    else used = false;
    if (used) e.preventDefault();
  });

  /* ---------- cover ---------- */
  // A language without its own lesson file shows the default language's lesson; say so instead of failing silently.
  const lessonLang = () => (LESSONS[window.SL.lang] ? window.SL.lang : window.SL.defaultLang);
  const fallbackNote = () => (lessonLang() !== window.SL.lang ? h('span', { class: 'chip', text: t('lesson.fallback', { lang: (window.SL.langs.find((x) => x.code === lessonLang()) || {}).name }) }) : null);
  function showCover() {
    const dl = deepLinkSection();
    if (dl >= 0) { S.mode = 'study'; S.started = true; show(firstStepOf(dl)); pokeUI(); return; } // a scanned quiz link goes straight to the quiz
    const total = L.sections.reduce((n, s) => n + s.minutes, 0);
    const resume = saved && saved.i > 0 ? saved.i : 0;
    const begin = (mode) => {
      cover.remove(); S.mode = mode; S.started = true; B.play.focus && B.play.blur();
      if (mode === 'presentation' && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
      show(startAt); pokeUI(); el.stage.focus();
    };
    let startAt = 0;
    const cover = h('div', { class: 'cover' }, h('div', { class: 'cover-card' },
      h('div', { class: 'cover-lang' }, h('span', { 'data-lang-switch': '' })),
      h('div', { class: 'meta' }, h('span', { class: 'chip', text: L.course }), h('span', { class: 'chip', text: lookup('lesson.level.' + String(L.level).toLowerCase(), L.level) }), h('span', { class: 'chip', text: t('cover.minutes', { n: L.duration }) }), h('span', { class: 'chip', text: t('cover.screens', { n: steps.length }) }), fallbackNote()),
      h('h1', { html: `<span>${esc(L.title)}</span>` }), h('p', { class: 'text lead muted', text: L.subtitle || t('cover.subtitle') }),
      h('div', { class: 'timeline-bar', 'aria-hidden': 'true' }, L.sections.map((s, i) => h('i', { style: `flex:${s.minutes};--h:${(235 + i * 37) % 360}`, title: t('nav.sectionTitle', { label: s.label, min: s.minutes }) }))),
      h('div', { class: 'legend' }, L.sections.map((s, i) => h('span', {}, `${pad(i + 1)} ${t('nav.sectionTitle', { label: s.label, min: s.minutes })}`))),
      h('div', { class: 'cover-actions' },
        h('button', { class: 'btn primary', type: 'button', onclick: () => begin('presentation') }, t('cover.present')), h('button', { class: 'btn', type: 'button', onclick: () => begin('study') }, t('cover.study')),
        resume ? h('button', { class: 'btn', type: 'button', onclick: () => { startAt = resume; begin('study'); } }, t('cover.resume', { n: resume + 1 })) : null,
        h('button', { class: 'btn', type: 'button', onclick: showHelp }, t('cover.keys'))),
      hasQR() ? h('div', { class: 'cover-qr' }, window.SLQR.el(lectureUrl(), t('cover.qrLabel')), h('div', {}, h('strong', { text: t('cover.qrTitle') }), h('p', { class: 'muted', text: t('cover.qrText') }), h('button', { class: 'btn', type: 'button', onclick: openLinks }, t('cover.qrBig')))) : null, refsEl(t('cover.reading'), true)));
    if (total !== L.duration) console.warn('Section minutes (' + total + ') differ from lesson duration (' + L.duration + ').');
    app.append(cover); window.SL.apply(cover); cover.querySelector('.btn').focus();
  }

  /* ---------- language switch: swap the lesson text, keep the position and progress ---------- */
  function onLanguage() {
    const wasCover = !!document.querySelector('.cover');
    const r = S.r;
    useLesson(LESSONS[window.SL.lang] || LESSONS[window.SL.defaultLang]);
    window.SL.apply(app); buildSectionNav(); applyCfg();
    [dash, tmenu, document.querySelector('.help')].forEach((x) => x && x.remove()); dash = null; if (tmenu) { tmenu = null; B.timer.setAttribute('aria-pressed', 'false'); }
    if (settingsEl) { settingsEl.remove(); settingsEl = null; toggleSettings(); }
    if (wasCover) { document.querySelector('.cover').remove(); showCover(); return; }
    if (!S.started) return;
    show(S.i); if (r > 0 && cur) { S.r = clamp(r, 0, cur.max); cur.set(S.r); resetWait(); }
    updateStatus(); if (lessonLang() !== window.SL.lang) toast(t('lesson.fallback', { lang: (window.SL.langs.find((x) => x.code === lessonLang()) || {}).name }));
  }
  window.SL.onChange(onLanguage);

  if (saved) { ['points', 'streak', 'best', 'events', 'awarded', 'badges', 'practice', 'quizResult', 'recallResult', 'elapsed'].forEach((k) => { if (saved[k] != null) S[k] = saved[k]; }); }
  applyCfg(); buildInitial();
  function buildInitial() {
    cur = null; el.stage.replaceChildren(); updateNav(); updateHud(); showCover();
    window.__lesson = { S, steps, show, next, prev, get cur() { return cur; }, begin: () => { document.querySelector('.cover') && document.querySelector('.cover').remove(); S.started = true; show(0); } };
  }
})();
