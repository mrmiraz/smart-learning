/* Interactive demo blocks, part 2: diagram (progressive SVG diagrams with animated scenarios), pipeline (pipeline and
   hazard simulator), scheduler (in-order vs out-of-order) and predictor (branch prediction). */
(window.SLDEMO_PARTS = window.SLDEMO_PARTS || []).push((kit) => {
  const { h, md, esc, sim: S, fill } = kit;
  const NS = 'http://www.w3.org/2000/svg';
  const btn = (label, fn, cls) => h('button', { class: 'btn' + (cls ? ' ' + cls : ''), type: 'button', onclick: fn }, label);
  const panel = (title, ...kids) => h('div', { class: 'blk demo card' }, title && h('h3', { text: title }), ...kids);
  const sv = (tag, attrs, ...kids) => { const e = document.createElementNS(NS, tag); Object.keys(attrs || {}).forEach((k) => e.setAttribute(k, attrs[k])); kids.flat().forEach((k) => { if (k != null) e.append(k.nodeType ? k : document.createTextNode(k)); }); return e; };
  let uid = 0;

  /* ---------- diagram ---------- */
  function diagram(b) {
    const W = b.width || 1000, H = b.height || 520, id = 'dg' + ++uid;
    const svg = sv('svg', { viewBox: `0 0 ${W} ${H}`, class: 'diagram', role: 'img', 'aria-label': b.title || 'Diagram' });
    svg.append(sv('defs', {}, sv('marker', { id: id + 'a', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, sv('path', { d: 'M0,0 L10,5 L0,10 z', class: 'dgarrow' }))));
    const els = {}; const byId = {}; (b.nodes || []).forEach((n) => { byId[n.id] = n; });
    const edgeG = sv('g'); const nodeG = sv('g'); svg.append(edgeG, nodeG);
    (b.edges || []).forEach((e) => {
      let pts = e.points; if (!pts) { const f = byId[e.from], t = byId[e.to]; const x1 = f.x + f.w, y1 = f.y + f.h / 2, x2 = t.x, y2 = t.y + t.h / 2, mx = (x1 + x2) / 2; pts = [[x1, y1], [mx, y1], [mx, y2], [x2, y2]]; }
      const g = sv('g', { class: 'dgedge ' + (e.kind || 'data') });
      g.append(sv('path', { d: pts.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join(' '), class: 'dgpath', 'marker-end': e.arrow === false ? '' : `url(#${id}a)`, fill: 'none' }));
      if (e.label) { const a = e.labelAt || [(pts[0][0] + pts[pts.length - 1][0]) / 2, (pts[0][1] + pts[pts.length - 1][1]) / 2 - 6]; g.append(sv('text', { x: a[0], y: a[1], class: 'dglabel', 'text-anchor': 'middle' }, e.label)); }
      edgeG.append(g); els[e.id] = g;
    });
    (b.nodes || []).forEach((n) => {
      const g = sv('g', { class: 'dgnode ' + (n.kind || 'unit') }); const cx = n.x + n.w / 2, cy = n.y + n.h / 2; let shape;
      if (n.kind === 'alu') shape = sv('polygon', { points: [[n.x, n.y], [n.x + n.w, n.y + n.h * 0.3], [n.x + n.w, n.y + n.h * 0.7], [n.x, n.y + n.h], [n.x, n.y + n.h * 0.6], [n.x + n.w * 0.2, cy], [n.x, n.y + n.h * 0.4]].map((p) => p.join(',')).join(' ') });
      else if (n.kind === 'mux') shape = sv('rect', { x: n.x, y: n.y, width: n.w, height: n.h, rx: Math.min(n.w, n.h) / 2 });
      else if (n.kind === 'adder') shape = sv('ellipse', { cx, cy, rx: n.w / 2, ry: n.h / 2 });
      else shape = sv('rect', { x: n.x, y: n.y, width: n.w, height: n.h, rx: n.kind === 'state' ? n.h / 2 : 8 });
      g.append(shape);
      if (n.kind === 'mem') g.append(sv('line', { x1: n.x + 8, y1: n.y, x2: n.x + 8, y2: n.y + n.h, class: 'dgline' }));
      const lines = String(n.label || '').split('\n'); lines.forEach((ln, i) => g.append(sv('text', { x: cx, y: cy + (i - (lines.length - 1) / 2) * 15 + (n.sub ? -6 : 5), 'text-anchor': 'middle', class: 'dgtext' + (n.kind === 'mux' ? ' small' : '') }, ln)));
      if (n.sub) g.append(sv('text', { x: cx, y: cy + 14 + (lines.length - 1) * 8, 'text-anchor': 'middle', class: 'dgsub' }, n.sub));
      const val = sv('text', { x: cx, y: n.y + n.h + 14, 'text-anchor': 'middle', class: 'dgval' }); g.append(val); g.val = val;
      nodeG.append(g); els[n.id] = g;
    });
    (b.labels || []).forEach((l) => nodeG.append(sv('text', { x: l.x, y: l.y, class: 'dglabel' + (l.big ? ' big' : ''), 'text-anchor': l.anchor || 'middle' }, l.text)));
    const steps = b.steps || []; let built = steps.length ? 0 : Infinity;
    const cap = h('div', { class: 'caption empty', 'aria-live': 'polite' });
    // scenarios
    const scs = b.scenarios || []; let si = 0, ci = -1;
    const tabs = h('div', { class: 'seg dtabs' }); const sctl = h('div', { class: 'row' });
    function visibleSet() { const s = new Set(); if (built === Infinity) Object.keys(els).forEach((k) => s.add(k)); else steps.slice(0, built).forEach((st) => (st.show || []).forEach((k) => s.add(k))); return s; }
    function paint() {
      const vis = visibleSet(); const sc = scs[si]; const stp = sc && ci >= 0 ? sc.steps[ci] : null; const hl = new Set(stp ? stp.highlight || [] : []);
      Object.keys(els).forEach((k) => { els[k].classList.toggle('dhid', !vis.has(k)); els[k].classList.toggle('hl', hl.has(k)); els[k].classList.toggle('dim', !!stp && !hl.has(k) && vis.has(k)); if (els[k].val) els[k].val.textContent = stp && stp.values && stp.values[k] != null ? stp.values[k] : ''; });
      const text = stp ? stp.text : built !== Infinity && built > 0 ? steps[built - 1].text : '';
      cap.className = 'caption' + (text ? '' : ' empty'); cap.innerHTML = text ? md(text) : '';
    }
    if (scs.length) {
      const pick = (i) => { si = i; ci = -1; [...tabs.children].forEach((t, k) => t.setAttribute('aria-pressed', String(k === i))); paint(); };
      if (scs.length > 1) scs.forEach((s, i) => tabs.append(h('button', { class: 'tb', type: 'button', 'aria-pressed': String(i === 0), onclick: () => pick(i) }, s.name)));
      const nextS = () => { if (ci < scs[si].steps.length - 1) { ci++; paint(); } };
      const prevS = () => { if (ci >= 0) { ci--; paint(); } };
      const playS = () => { ci = -1; paint(); scs[si].steps.forEach((s, k) => kit.later(() => { ci = k; paint(); }, (kit.cfg.reduce ? 400 : 1700) * (k + 1))); };
      sctl.append(btn('▶ Play', playS, 'primary'), btn('‹ Back', prevS), btn('Step ›', nextS), btn('Reset', () => { ci = -1; paint(); }));
    }
    paint();
    return { el: panel(b.title, scs.length > 1 ? tabs : null, h('div', { class: 'dgwrap' }, svg), cap, scs.length ? sctl : null), n: steps.length, early: true, set: (l) => { if (steps.length) { built = l; paint(); } } };
  }

  /* ---------- pipeline ---------- */
  function pipelineDemo(b) {
    const scs = b.scenarios || [{ name: b.title || 'Pipeline', instructions: b.instructions || [] }]; let si = 0;
    const o = Object.assign({ forwarding: true, branchStage: 'ID', predict: 'not-taken', unifiedMemory: false }, b.options || {});
    const controls = b.controls || ['forwarding']; let shown = 0, timer = null, speed = 900, mode = 'pipelined'; let res = null;
    const tblWrap = h('div', { class: 'ptwrap' }); const stats = h('div', { class: 'pstats' }); const haz = h('div', { class: 'phaz' }); const tabs = h('div', { class: 'seg dtabs' });
    const opts = h('div', { class: 'row popts' });
    const tog = (label, key, onlabel, offlabel) => h('label', { class: 'dfield' }, h('span', { text: label }), h('button', { class: 'tb', type: 'button', 'aria-pressed': String(!!o[key]), onclick: (e) => { o[key] = !o[key]; e.currentTarget.setAttribute('aria-pressed', String(!!o[key])); e.currentTarget.textContent = o[key] ? onlabel : offlabel; recompute(true); } }, o[key] ? onlabel : offlabel));
    const sel = (label, key, vals) => h('label', { class: 'dfield' }, h('span', { text: label }), h('select', { 'aria-label': label, onchange: (e) => { o[key] = e.target.value; recompute(true); } }, vals.map(([v, t]) => h('option', { value: v, selected: o[key] === v ? '' : null }, t))));
    if (controls.includes('forwarding')) opts.append(tog('Forwarding', 'forwarding', 'ON', 'OFF'));
    if (controls.includes('memory')) opts.append(tog('One memory for instructions and data', 'unifiedMemory', 'YES', 'NO'));
    if (controls.includes('branch')) opts.append(sel('Branch resolved in', 'branchStage', [['ID', 'ID stage'], ['EX', 'EX stage'], ['MEM', 'MEM stage']]), sel('Fetch policy', 'predict', [['not-taken', 'Predict not taken'], ['stall', 'Stall until resolved']]));
    if (controls.includes('compare')) opts.append(h('label', { class: 'dfield' }, h('span', { text: 'View' }), h('button', { class: 'tb', type: 'button', 'aria-pressed': 'false', onclick: (e) => { mode = mode === 'pipelined' ? 'sequential' : 'pipelined'; e.currentTarget.setAttribute('aria-pressed', String(mode === 'sequential')); e.currentTarget.textContent = mode === 'sequential' ? 'Without pipelining' : 'With pipelining'; recompute(true); } }, 'With pipelining')));
    function recompute(keep) {
      const sc = scs[si]; res = S.pipeline(sc.instructions, o);
      if (mode === 'sequential') { const rows = res.rows.filter((r) => !r.ghost).map((r, i) => { const cells = {}; ['IF', 'ID', 'EX', 'MEM', 'WB'].forEach((s, k) => { cells[i * 5 + k + 1] = { s }; }); return { text: r.text, cells }; }); res = Object.assign({}, res, { rows, maxCycle: rows.length * 5, cycles: rows.length * 5, flushes: 0, hazards: [] }); }
      if (!keep) shown = 0; render();
    }
    function render() {
      const sc = scs[si]; const max = res.maxCycle; const last = shown >= max;
      const head = h('tr', {}, h('th', { class: 'pi', text: 'Instruction' }), Array.from({ length: max }, (_, k) => h('th', { class: 'pc' + (k + 1 === shown ? ' now' : ''), text: k + 1 })));
      const body = res.rows.map((r) => h('tr', { class: r.ghost ? 'ghost' : '' }, h('td', { class: 'pi' }, r.ghost ? h('em', { text: r.text }) : h('code', { text: r.text }), r.taken ? h('span', { class: 'chip', text: 'taken' }) : null),
        Array.from({ length: max }, (_, k) => { const c = r.cells[k + 1]; if (!c || k + 1 > shown) return h('td', { class: 'pc empty' }); const cls = c.s === 'X' ? 'flush' : c.stall ? 'stall' : 's-' + c.s; return h('td', { class: 'pc ' + cls + (k + 1 === shown ? ' now' : ''), title: c.stall ? `${c.s} stage, waiting` : c.s }, c.s === 'X' ? 'flush' : c.stall ? 'stall' : c.s, c.fwd ? h('sup', { text: 'fwd' }) : null); })));
      fill(tblWrap, h('table', { class: 'ptable', 'aria-label': 'Pipeline timing diagram' }, h('thead', {}, head), h('tbody', {}, body)));
      const real = res.rows.filter((r) => !r.ghost).length;
      fill(stats, h('span', { class: 'pill', html: `Clock cycle <b>${Math.min(shown, max)} / ${max}</b>` }), last ? h('span', { class: 'pill', html: `Instructions <b>${real}</b>` }) : null,
        last ? h('span', { class: 'pill', html: `Total cycles <b>${res.cycles}</b>` }) : null, last ? h('span', { class: 'pill', html: `CPI <b>${(res.cycles / (real || 1)).toFixed(2)}</b>` }) : null,
        last && mode === 'pipelined' ? h('span', { class: 'pill', html: `Extra cycles (stalls and flushes) <b>${res.extraCycles}</b>` }) : null,
        last && mode === 'pipelined' ? h('span', { class: 'pill', html: `Without pipelining <b>${res.nonPipelinedCycles}</b> cycles` }) : null,
        last && mode === 'pipelined' ? h('span', { class: 'pill', html: `Speedup <b>${res.speedup.toFixed(2)}×</b>` }) : null);
      fill(haz, ); if (controls.includes('hazards') !== false && mode === 'pipelined' && res.hazards.length && last) haz.append(h('div', { class: 'muted', text: 'Data dependences found:' }), h('ul', { class: 'hlist' }, res.hazards.map((x) => h('li', { html: `<code>${esc(res.rows.find((r) => r.index === x.to).text)}</code> needs <b>${S.REGS[x.reg]}</b> from <code>${esc(res.rows.find((r) => r.index === x.from).text)}</code> (RAW): <b>${x.how}</b>` }))));
      if (sc.note && last) haz.append(h('p', { class: 'muted', html: md(sc.note) }));
    }
    const stepC = () => { if (shown < res.maxCycle) { shown++; render(); } else pause(); };
    function pause() { if (timer) { clearInterval(timer); timer = null; playBtn.textContent = '▶ Play'; } }
    function play() { if (timer) { pause(); return; } if (shown >= res.maxCycle) shown = 0; playBtn.textContent = '⏸ Pause'; timer = kit.every(() => { if (shown >= res.maxCycle) { pause(); return; } shown++; render(); }, kit.cfg.reduce ? 150 : speed); }
    const playBtn = btn('▶ Play', play, 'primary');
    const spd = h('select', { 'aria-label': 'Speed', onchange: (e) => { speed = +e.target.value; if (timer) { pause(); play(); } } }, [[1500, 'Slow'], [900, 'Normal'], [350, 'Fast']].map(([v, t]) => h('option', { value: v, selected: v === 900 ? '' : null }, t)));
    const ctl = h('div', { class: 'row' }, playBtn, btn('Step one clock cycle', stepC), btn('Reset', () => { pause(); shown = 0; render(); }), btn('Show all', () => { pause(); shown = res.maxCycle; render(); }), h('label', { class: 'dfield' }, h('span', { text: 'Speed' }), spd));
    if (scs.length > 1) scs.forEach((s, i) => tabs.append(h('button', { class: 'tb', type: 'button', 'aria-pressed': String(i === 0), onclick: () => { pause(); si = i; [...tabs.children].forEach((t, k) => t.setAttribute('aria-pressed', String(k === i))); recompute(false); } }, s.name)));
    recompute(false); if (b.autoShow) shown = res.maxCycle, render();
    return { el: panel(b.title, b.hint && h('p', { class: 'muted', html: md(b.hint) }), scs.length > 1 ? tabs : null, opts.children.length ? opts : null, ctl, tblWrap, stats, haz), n: 0 };
  }

  /* ---------- scheduler (in-order vs out-of-order) ---------- */
  function schedulerDemo(b) {
    const o = { mode: 'ooo', width: 1, rename: true, ...(b.options || {}) }; const controls = b.controls || ['mode', 'width', 'rename'];
    const out = h('div'); const opts = h('div', { class: 'row popts' });
    const seg = (label, key, vals) => h('label', { class: 'dfield' }, h('span', { text: label }), h('select', { 'aria-label': label, onchange: (e) => { o[key] = typeof vals[0][0] === 'number' ? +e.target.value : e.target.value === 'true' ? true : e.target.value === 'false' ? false : e.target.value; draw(); } }, vals.map(([v, t]) => h('option', { value: String(v), selected: String(o[key]) === String(v) ? '' : null }, t))));
    if (controls.includes('mode')) opts.append(seg('Execution order', 'mode', [['inorder', 'In order'], ['ooo', 'Out of order']]));
    if (controls.includes('width')) opts.append(seg('Instructions issued per cycle', 'width', [[1, '1'], [2, '2'], [4, '4']]));
    if (controls.includes('rename')) opts.append(seg('Register renaming', 'rename', [[true, 'ON'], [false, 'OFF']]));
    function draw() {
      const r = S.schedule(b.instructions, o); const max = Math.max(...r.rows.map((x) => x.write));
      const head = h('tr', {}, h('th', { class: 'pi', text: 'Instruction' }), Array.from({ length: max }, (_, k) => h('th', { class: 'pc', text: k + 1 })));
      const rows = r.rows.map((x) => h('tr', {}, h('td', { class: 'pi' }, h('code', { text: x.text }), h('small', { class: 'muted', text: ` latency ${x.lat}` })), Array.from({ length: max }, (_, k) => { const c = k + 1; if (c === x.issue && x.start > c + 0) return h('td', { class: 'pc s-IF', title: 'issued, waiting' }, 'issue'); if (c === x.issue) return h('td', { class: 'pc s-IF', title: 'issue' }, 'issue');
        if (c >= x.start && c <= x.end) return h('td', { class: 'pc s-EX' }, c === x.start ? 'exec' : '…'); if (c === x.write) return h('td', { class: 'pc s-WB' }, 'write'); if (c > x.issue && c < x.start) return h('td', { class: 'pc stall', title: 'waiting for operands or order' }, 'wait'); return h('td', { class: 'pc empty' }); })));
      fill(out, h('div', { class: 'ptwrap' }, h('table', { class: 'ptable', 'aria-label': 'Instruction schedule' }, h('thead', {}, head), h('tbody', {}, rows))),
        h('div', { class: 'pstats' }, h('span', { class: 'pill', html: `Total cycles <b>${r.cycles}</b>` }), h('span', { class: 'pill', html: `Instructions per cycle <b>${r.ipc.toFixed(2)}</b>` })));
    }
    draw();
    return { el: panel(b.title, b.hint && h('p', { class: 'muted', html: md(b.hint) }), opts.children.length ? opts : null, out), n: 0 };
  }

  /* ---------- branch predictor ---------- */
  function predictorDemo(b) {
    const presets = b.presets || [{ name: 'Loop of 4 (T T T N)', seq: 'T T T N T T T N T T T N' }, { name: 'Alternating (T N)', seq: 'T N T N T N T N' }, { name: 'Mostly taken', seq: 'T T T T T N T T T T T N' }];
    let bits = b.bits || 2, init = b.init != null ? b.init : 0, seq = presets[0].seq; let shown = 0; const out = h('div'); const seqIn = h('input', { type: 'text', value: seq, 'aria-label': 'Branch outcomes', style: 'width:min(24rem,100%)' });
    const parse = (t) => t.split(/[\s,]+/).filter(Boolean).map((tok) => { const m = /^(?:([A-Za-z0-9]+):)?([TtNn])$/.exec(tok); return m ? { taken: m[2].toLowerCase() === 't', id: m[1] ? (m[1].charCodeAt(0)) : 0, label: m[1] || '' } : null; }).filter(Boolean);
    function draw() {
      const arr = parse(seqIn.value); const tableSize = b.tableSize || 1; const r = S.predictor(arr.map((x) => ({ taken: x.taken, id: x.id })), { bits, init, tableSize });
      const states = bits === 1 ? ['0 = predict not taken', '1 = predict taken'] : ['00 strongly not taken', '01 weakly not taken', '10 weakly taken', '11 strongly taken'];
      const cur = shown > 0 ? r.steps[shown - 1].after : init;
      const diag = h('div', { class: 'pstates', 'aria-label': 'Predictor states' }, states.map((s, i) => h('div', { class: 'pstate' + (i === cur ? ' cur' : '') + (i >= (bits === 1 ? 1 : 2) ? ' T' : ' N') }, s)));
      const rows = r.steps.slice(0, shown).map((s) => h('tr', {}, h('td', { text: s.i + 1 }), tableSize > 1 ? h('td', { text: arr[s.i].label || '-' }) : null, h('td', { text: S.predictor && (bits === 1 ? s.before : ['00', '01', '10', '11'][s.before]) }), h('td', { text: s.predicted ? 'Taken' : 'Not taken' }), h('td', { text: s.actual ? 'Taken' : 'Not taken' }), h('td', { class: s.correct ? 'ok' : 'bad', text: s.correct ? '✓ correct' : '✗ wrong' }), h('td', { text: bits === 1 ? s.after : ['00', '01', '10', '11'][s.after] })));
      const done = r.steps.slice(0, shown); const right = done.filter((s) => s.correct).length;
      fill(out, diag, h('table', { class: 'dtable' }, h('thead', {}, h('tr', {}, ['#', tableSize > 1 ? 'Branch' : null, 'State before', 'Prediction', 'Actual', 'Result', 'State after'].filter((x) => x).map((t) => h('th', { text: t })))), h('tbody', {}, rows)),
        h('div', { class: 'pstats' }, h('span', { class: 'pill', html: `Branches seen <b>${done.length} / ${arr.length}</b>` }), h('span', { class: 'pill', html: `Correct <b>${right}</b>` }), h('span', { class: 'pill', html: `Accuracy <b>${done.length ? Math.round(right / done.length * 100) : 0}%</b>` })));
    }
    const setSeq = (t) => { seqIn.value = t; shown = 0; draw(); };
    const bitsSel = h('select', { 'aria-label': 'Predictor type', onchange: (e) => { bits = +e.target.value; init = bits === 1 ? Math.min(init, 1) : init; shown = 0; draw(); } }, [[1, '1-bit predictor'], [2, '2-bit predictor']].map(([v, t]) => h('option', { value: v, selected: v === bits ? '' : null }, t)));
    const initSel = h('select', { 'aria-label': 'Starting state', onchange: (e) => { init = +e.target.value; shown = 0; draw(); } }, [[0, 'Start: not taken'], [1, bits === 1 ? 'Start: taken' : 'Start: weakly not taken'], [2, 'Start: weakly taken'], [3, 'Start: strongly taken']].filter(([v]) => bits === 2 || v <= 1).map(([v, t]) => h('option', { value: v, selected: v === init ? '' : null }, t)));
    const ctl = h('div', { class: 'row' }, h('label', { class: 'dfield' }, h('span', { text: 'Type' }), bitsSel), b.fixedStart ? null : h('label', { class: 'dfield' }, h('span', { text: 'Start' }), initSel), btn('Step', () => { if (shown < parse(seqIn.value).length) { shown++; draw(); } }, 'primary'), btn('Run all', () => { shown = parse(seqIn.value).length; draw(); }), btn('Reset', () => { shown = 0; draw(); }));
    const pre = h('div', { class: 'row' }, h('span', { class: 'muted', text: 'Outcomes:' }), seqIn, btn('Use', () => { shown = 0; draw(); }), presets.map((p) => btn(p.name, () => setSeq(p.seq))), btn('+ T', () => { seqIn.value += ' T'; draw(); }), btn('+ N', () => { seqIn.value += ' N'; draw(); }));
    draw();
    return { el: panel(b.title || 'Branch predictor', b.hint && h('p', { class: 'muted', html: md(b.hint) }), ctl, pre, out), n: 0 };
  }

  return { diagram, pipeline: pipelineDemo, scheduler: schedulerDemo, predictor: predictorDemo };
});
