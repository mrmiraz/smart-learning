/* Interactive demo blocks, part 3: cache, hierarchy, vm (virtual memory), raid, coherence, race and simd. */
(window.SLDEMO_PARTS = window.SLDEMO_PARTS || []).push((kit) => {
  const { h, md, esc, sim: S, fill } = kit;
  const T = (k, v) => kit.t(k, v);
  const tr = (code, args, fallback) => { const k = 'sim.' + code; const out = kit.t(k, args); return out === k ? fallback : out; }; // simulator text by code, English fallback
  const pill = (key, vars) => h('span', { class: 'pill', html: md(T(key, vars)) });
  const btn = (label, fn, cls) => h('button', { class: 'btn' + (cls ? ' ' + cls : ''), type: 'button', onclick: fn }, label);
  const panel = (title, ...kids) => h('div', { class: 'blk demo card' }, title && h('h3', { text: title }), ...kids);
  const hexs = (n, d) => '0x' + (n >>> 0).toString(16).toUpperCase().padStart(d || 1, '0');
  const bins = (n, d) => (d > 0 ? (n >>> 0).toString(2).padStart(d, '0').slice(-d) : '');
  const sel = (label, vals, cur, fn) => h('label', { class: 'dfield' }, h('span', { text: label }), h('select', { 'aria-label': label, onchange: (e) => fn(e.target.value) }, vals.map(([v, t]) => h('option', { value: String(v), selected: String(v) === String(cur) ? '' : null }, t))));
  const addrNum = (t) => { t = String(t).trim(); return /^0x/i.test(t) ? parseInt(t, 16) : parseInt(t, 10); };

  /* ---------- cache ---------- */
  function cacheDemo(b) {
    const cfg = Object.assign({ blockBytes: 4, lines: 8, assoc: 1, addrBits: 8 }, b.config || {}); const controls = b.controls || [];
    const seqs = b.sequences || [{ name: T('demo.cache.sequence'), accesses: b.accesses || [] }]; let si = 0, pos = 0; let res = null;
    const out = h('div'); const tabs = h('div', { class: 'seg dtabs' });
    const toks = (a) => (typeof a === 'object' ? a : { addr: a, op: 'R' });
    function compute() { res = S.cacheSim(cfg, seqs[si].accesses.map((a) => { const t = toks(a); return { addr: typeof t.addr === 'string' ? addrNum(t.addr) : t.addr, op: t.op || 'R' }; })); if (pos > res.events.length) pos = res.events.length; draw(); }
    function draw() {
      const ev = pos > 0 ? res.events[pos - 1] : null; const nSets = res.sets; const ways = res.config.assoc;
      const seg = (txt, cls, label) => h('span', { class: 'aseg ' + cls }, h('small', { text: label }), h('code', { text: txt }));
      const addr = ev ? h('div', { class: 'abits' }, seg(bins(ev.tag, res.tagBits), 'tag', T('demo.cache.tagBits', { n: String(res.tagBits) })), res.idxBits ? seg(bins(ev.index, res.idxBits), 'idx', T('demo.cache.indexBits', { n: String(res.idxBits) })) : null, seg(bins(ev.offset, res.offBits), 'off', T('demo.cache.offsetBits', { n: String(res.offBits) }))) : h('p', { class: 'muted', text: T('demo.cache.pressStep') });
      const rowsEl = []; for (let s = 0; s < nSets; s++) {
        const lines = ev ? ev.state[s] : []; const cells = []; for (let w = 0; w < ways; w++) { const l = lines[w]; const touched = ev && ev.index === s && l && l.tag === ev.tag; cells.push(h('td', { class: 'cline' + (touched ? (ev.hit ? ' hit' : ' miss') : '') }, l ? [h('small', { text: 'V=1' }), h('b', { text: T('demo.cache.tag', { tag: String(l.tag) }) + (l.dirty ? ' *' : '') })] : h('span', { class: 'muted', text: T('demo.common.empty') }))); }
        rowsEl.push(h('tr', {}, h('th', { text: nSets > 1 ? T('demo.cache.set', { s: String(s) }) : T('demo.cache.allLines') }), ...cells));
      }
      const c = res.counts; const done = res.events.slice(0, pos);
      const amat = b.amat ? (b.amat.hitTime + (res.events.slice(0, pos).length ? done.filter((e) => !e.hit).length / done.length : 0) * b.amat.missPenalty) : null;
      fill(out, addr, ev ? h('div', { class: 'dline' }, h('span', { class: 'chip ' + (ev.hit ? 'easy' : 'hard'), text: ev.hit ? T('demo.cache.hit') : ev.kind ? T('demo.cache.missKind', { kind: T('demo.cache.kind.' + ev.kind) }) : T('demo.cache.miss') }), ' ' + (ev.evicted ? T('demo.cache.accessEvict', { addr: String(ev.addr), block: String(ev.block), set: String(ev.index), tag: String(ev.evicted.tag) }) : T('demo.cache.access', { addr: String(ev.addr), block: String(ev.block), set: String(ev.index) }))) : null,
        h('div', { class: 'ptwrap' }, h('table', { class: 'dtable cachetbl' }, h('thead', {}, h('tr', {}, h('th', { text: '' }), Array.from({ length: ways }, (_, w) => h('th', { text: ways > 1 ? T('demo.cache.way', { w: String(w) }) : T('demo.cache.line') })))), h('tbody', {}, rowsEl))),
        h('div', { class: 'seqchips', 'aria-label': T('demo.cache.historyAria') }, res.events.map((e, i) => h('span', { class: 'sq ' + (i < pos ? (e.hit ? 'hit' : 'miss') : 'todo') + (i === pos - 1 ? ' now' : ''), title: i < pos ? (e.hit ? T('demo.cache.titleHit') : T('demo.cache.titleMiss', { kind: e.kind ? T('demo.cache.kind.' + e.kind) : '' })) : T('demo.cache.titleTodo') }, String(e.addr) + (e.op === 'W' ? 'w' : '')))),
        h('div', { class: 'pstats' }, pill('demo.cache.pillHits', { v: String(done.filter((e) => e.hit).length) }), pill('demo.cache.pillMisses', { v: String(done.filter((e) => !e.hit).length) }), pill('demo.cache.pillRate', { v: String(done.length ? Math.round(done.filter((e) => e.hit).length / done.length * 100) : 0) }),
          pill('demo.cache.pillCompulsory', { v: String(done.filter((e) => e.kind === 'compulsory').length) }), pill('demo.cache.pillCapacity', { v: String(done.filter((e) => e.kind === 'capacity').length) }), pill('demo.cache.pillConflict', { v: String(done.filter((e) => e.kind === 'conflict').length) }),
          done.some((e) => e.op === 'W') ? pill('demo.cache.pillWrites', { v: String(done.length ? done[done.length - 1].memWrites : 0) }) : null, amat != null ? pill('demo.cache.pillAmat', { v: amat.toFixed(2) }) : null),
        h('p', { class: 'muted', text: T('demo.cache.summary', { block: String(res.config.blockBytes), lines: String(res.config.lines), mapping: nSets === 1 ? T('demo.cache.map.full') : ways === 1 ? T('demo.cache.map.direct') : T('demo.cache.map.way', { n: String(ways) }), sets: T('demo.cache.sets', { n: nSets, count: String(nSets) }), tag: String(res.tagBits), idx: String(res.idxBits), off: String(res.offBits) }) }));
    }
    const ctl = h('div', { class: 'row' }, btn(T('demo.common.step'), () => { if (pos < res.events.length) { pos++; draw(); } }, 'primary'), btn(T('demo.common.runAll'), () => { pos = res.events.length; draw(); }), btn(T('demo.common.reset'), () => { pos = 0; draw(); }));
    const opts = h('div', { class: 'row popts' });
    if (controls.includes('assoc')) opts.append(sel(T('demo.cache.mapping'), [[1, T('demo.cache.map.direct0')], [2, T('demo.cache.map.way2')], [4, T('demo.cache.map.way4')], ['full', T('demo.cache.map.full0')]], cfg.assoc, (v) => { cfg.assoc = v === 'full' ? 'full' : +v; pos = 0; compute(); }));
    if (controls.includes('lines')) opts.append(sel(T('demo.cache.linesLabel'), [[4, '4'], [8, '8'], [16, '16']], cfg.lines, (v) => { cfg.lines = +v; pos = 0; compute(); }));
    if (controls.includes('block')) opts.append(sel(T('demo.cache.blockLabel'), [[4, '4'], [8, '8'], [16, '16']], cfg.blockBytes, (v) => { cfg.blockBytes = +v; pos = 0; compute(); }));
    if (controls.includes('write')) opts.append(sel(T('demo.cache.writeLabel'), [['back', T('demo.cache.writeBack')], ['through', T('demo.cache.writeThrough')]], cfg.write || 'back', (v) => { cfg.write = v; pos = 0; compute(); }));
    if (seqs.length > 1) seqs.forEach((s, i) => tabs.append(h('button', { class: 'tb', type: 'button', 'aria-pressed': String(i === 0), onclick: () => { si = i; pos = 0; [...tabs.children].forEach((t, k) => t.setAttribute('aria-pressed', String(k === i))); compute(); } }, s.name)));
    compute();
    return { el: panel(b.title || T('demo.cache.title'), b.hint && h('p', { class: 'muted', html: md(b.hint) }), seqs.length > 1 ? tabs : null, opts.children.length ? opts : null, ctl, out), n: 0 };
  }

  /* ---------- memory hierarchy ---------- */
  function hierarchyDemo(b) {
    const levels = b.levels || [{ name: T('demo.hierarchy.defName'), speed: T('demo.hierarchy.defSpeed'), capacity: T('demo.hierarchy.defCapacity'), cost: T('demo.hierarchy.defCost'), purpose: T('demo.hierarchy.defPurpose'), example: T('demo.hierarchy.defExample') }];
    const info = h('div', { class: 'card hinfo' }); const pyr = h('div', { class: 'hpyr', role: 'list' }); let sel = 0;
    function showInfo(i) { sel = i; const l = levels[i]; [...pyr.children].forEach((c, k) => c.classList.toggle('cur', k === i)); fill(info, h('h4', { text: l.name }), h('dl', { class: 'hdl' }, ['speed', 'capacity', 'cost', 'purpose', 'example'].filter((k) => l[k]).flatMap((k) => [h('dt', { text: T('demo.hierarchy.field.' + k) }), h('dd', { html: md(l[k]) })]))); }
    levels.forEach((l, i) => pyr.append(h('button', { class: 'hlvl', type: 'button', role: 'listitem', style: `--w:${50 + i * (50 / Math.max(1, levels.length - 1))}%`, onclick: () => { showInfo(i); move(i); } }, l.name)));
    function move(i) { // animate a value travelling up to the CPU
      const kids = [...pyr.children]; kids.forEach((k) => k.classList.remove('flow')); for (let k = i; k >= 0; k--) kit.later(() => { kids.forEach((x) => x.classList.remove('flow')); kids[k].classList.add('flow'); }, (kit.cfg.reduce ? 100 : 450) * (i - k + 1)); kit.later(() => kids.forEach((x) => x.classList.remove('flow')), (kit.cfg.reduce ? 100 : 450) * (i + 2));
    }
    showInfo(0);
    const parts = [h('div', { class: 'hwrap' }, h('div', { class: 'hside' }, h('div', { class: 'hcpu', text: 'CPU' }), pyr, h('div', { class: 'harrow muted', text: T('demo.hierarchy.arrow') })), info)];
    const L = b.locality;
    if (L) {
      let pi = 0, pos = 0; const out = h('div'); const tabs = h('div', { class: 'seg dtabs' });
      const foundName = (e) => (e.foundIndex >= L.levels.length ? T('demo.hierarchy.mainMemory') : e.found);
      let res = null; const compute = () => { res = S.hierarchySim(L.levels, L.blockWords || 4, L.patterns[pi].seq); if (pos > res.events.length) pos = res.events.length; draw(); };
      function draw() {
        const done = res.events.slice(0, pos); const ev = done[done.length - 1]; const l1 = done.filter((e) => e.foundIndex === 0).length;
        fill(out, h('div', { class: 'seqchips', 'aria-label': T('demo.hierarchy.accessesAria') }, res.events.map((e, i) => h('span', { class: 'sq ' + (i < pos ? (e.foundIndex === 0 ? 'hit' : 'miss') : 'todo') + (i === pos - 1 ? ' now' : ''), title: i < pos ? T('demo.hierarchy.foundIn', { name: foundName(e) }) : '' }, 'A' + e.addr))),
          ev ? h('div', { class: 'dline', html: md(T('demo.hierarchy.accessLine', { addr: String(ev.addr), block: String(ev.block), found: foundName(ev) })) }) : h('p', { class: 'muted', text: T('demo.hierarchy.pressStep') }),
          ev ? h('div', { class: 'hstate' }, L.levels.map((lv, i) => h('div', { class: 'hbox' }, h('small', { text: lv.name }), h('b', { text: ev.state[i].length ? T('demo.hierarchy.blocks', { list: ev.state[i].join(', ') }) : T('demo.common.empty') })))) : null,
          h('div', { class: 'pstats' }, pill('demo.hierarchy.pillServed', { name: L.levels[0].name, a: String(l1), b: String(done.length) }), pill('demo.hierarchy.pillDeeper', { v: String(done.length - l1) })));
      }
      L.patterns.forEach((p, i) => tabs.append(h('button', { class: 'tb', type: 'button', 'aria-pressed': String(i === 0), onclick: () => { pi = i; pos = 0; [...tabs.children].forEach((t, k) => t.setAttribute('aria-pressed', String(k === i))); compute(); } }, p.name)));
      compute();
      parts.push(h('h4', { text: L.title || T('demo.hierarchy.localityTitle') }), L.hint && h('p', { class: 'muted', html: md(L.hint) }), tabs, h('div', { class: 'row' }, btn(T('demo.common.step'), () => { if (pos < res.events.length) { pos++; draw(); } }, 'primary'), btn(T('demo.common.runAll'), () => { pos = res.events.length; draw(); }), btn(T('demo.common.reset'), () => { pos = 0; draw(); })), out);
    }
    return { el: panel(b.title || T('demo.hierarchy.title'), ...parts), n: 0 };
  }

  /* ---------- virtual memory ---------- */
  function vmDemo(b) {
    const cfg = b.config || {}; let st = S.vmNew(cfg); const seq = b.sequence || []; let pos = 0; const hist = [];
    const out = h('div'); const inp = h('input', { type: 'text', value: seq[0] != null ? String(seq[0]) : '5000', 'aria-label': T('demo.vm.vaAria'), style: 'width:9rem', onkeydown: (e) => { if (e.key === 'Enter') go(addrNum(inp.value)); } });
    let last = null;
    function tables() {
      return h('div', { class: 'two' },
        h('div', {}, h('h4', { text: 'TLB' }), h('table', { class: 'dtable' }, h('thead', {}, h('tr', {}, [T('demo.vm.colPage'), T('demo.vm.colFrame')].map((t) => h('th', { text: t })))), h('tbody', {}, st.tlb.length ? st.tlb.map((e) => h('tr', {}, h('td', { text: e.vpn }), h('td', { text: e.ppn }))) : h('tr', {}, h('td', { colspan: 2, class: 'muted', text: T('demo.common.empty') }))))),
        h('div', {}, h('h4', { text: T('demo.vm.pageTable') }), h('table', { class: 'dtable' }, h('thead', {}, h('tr', {}, [T('demo.vm.colPage'), T('demo.vm.colValid'), T('demo.vm.colFrame')].map((t) => h('th', { text: t })))), h('tbody', {}, Object.keys(st.pt).sort((x, y) => x - y).map((k) => h('tr', {}, h('td', { text: k }), h('td', { text: st.pt[k].valid ? '1' : '0' }), h('td', { text: st.pt[k].valid ? st.pt[k].ppn : T('demo.vm.onDisk') })))))));
    }
    function draw() {
      const r = last; const path = [T('demo.vm.stepVa'), 'TLB', T('demo.vm.pageTable'), T('demo.vm.stepPa'), T('demo.vm.stepMem')];
      const hit = r && r.tlbHit; const used = r ? (hit ? [0, 1, 3, 4] : [0, 1, 2, 3, 4]) : [];
      const flow = h('div', { class: 'vmpath' }, path.map((p, i) => h('div', { class: 'vmstep' + (used.includes(i) ? ' on' : ' off') + (r && r.fault && i === 2 ? ' fault' : '') }, h('b', { text: p }), r && i === 0 ? h('small', { text: String(r.va) }) : null, r && i === 1 ? h('small', { text: hit ? T('demo.vm.hit') : T('demo.vm.miss') }) : null, r && i === 2 ? h('small', { text: hit ? T('demo.vm.notNeeded') : r.fault ? T('demo.vm.pageFault') : T('demo.vm.valid') }) : null, r && i === 3 ? h('small', { text: hexs(r.pa, 1) + ' (' + r.pa + ')' }) : null)));
      const offBits = st.offBits; const split = r ? h('div', { class: 'abits' }, h('span', { class: 'aseg tag' }, h('small', { text: T('demo.vm.vpn', { v: String(r.vpn) }) }), h('code', { text: bins(r.vpn, Math.max(1, (cfg.vaBits || 16) - offBits)) })), h('span', { class: 'aseg off' }, h('small', { text: T('demo.vm.offset', { bits: String(offBits), v: String(r.offset) }) }), h('code', { text: bins(r.offset, offBits) }))) : h('p', { class: 'muted', text: T('demo.vm.enter') });
      fill(out, split, flow, r ? h('ul', { class: 'hlist' }, r.steps.map((s, i) => h('li', { text: r.stepInfo && r.stepInfo[i] ? tr('vm.' + r.stepInfo[i].code, r.stepInfo[i].args, s) : s }))) : null, r ? h('div', { class: 'dline', html: md(T('demo.vm.paLine', { ppn: String(r.ppn), page: String(cfg.pageBytes || 4096), off: String(r.offset), pa: String(r.pa) })) }) : null, tables());
    }
    function go(a) { if (Number.isNaN(a) || a < 0) return; last = S.vmTranslate(st, a); hist.push(last); draw(); }
    const ctl = h('div', { class: 'row' }, h('label', { class: 'dfield' }, h('span', { text: T('demo.vm.field') }), inp), btn(T('demo.vm.translate'), () => go(addrNum(inp.value)), 'primary'),
      seq.length ? btn(T('demo.vm.next'), () => { go(addrNum(String(seq[pos % seq.length]))); pos++; inp.value = String(seq[pos % seq.length]); }) : null, btn(T('demo.common.reset'), () => { st = S.vmNew(cfg); last = null; pos = 0; inp.value = seq[0] != null ? String(seq[0]) : '5000'; draw(); }));
    draw();
    return { el: panel(b.title || T('demo.vm.title'), b.hint && h('p', { class: 'muted', html: md(b.hint) }), ctl, out), n: 0 };
  }

  /* ---------- RAID ---------- */
  function raidDemo(b) {
    const levelsAll = b.levels || ['0', '1', '5', '6', '10']; let level = levelsAll[0]; let disks = b.disks || 4; const rows = b.rows || 4; let failed = new Set(); const out = h('div'); const tabs = h('div', { class: 'seg dtabs' });
    const NOTE = Object.fromEntries(['0', '1', '5', '6', '10'].map((k) => [k, T('demo.raid.note' + k)]));
    function draw() {
      const need = { 0: 2, 1: 2, 5: 3, 6: 4, 10: 4 }[level]; if (disks < need) disks = need; if (level === '10' && disks % 2) disks++;
      const g = S.raidLayout(level, disks, rows); const info = S.raidInfo(level, disks); const ok = S.raidSurvives(level, disks, [...failed]);
      const cols = g.map((col, d) => h('div', { class: 'rdisk' + (failed.has(d) ? ' fail' : '') }, h('button', { class: 'tb', type: 'button', 'aria-pressed': String(failed.has(d)), onclick: () => { if (failed.has(d)) failed.delete(d); else failed.add(d); draw(); } }, failed.has(d) ? T('demo.raid.diskFailed', { d: String(d) }) : T('demo.raid.disk', { d: String(d) })), col.map((x) => h('div', { class: 'rblk ' + (x === 'P' || x === 'Q' ? 'par' : '') }, failed.has(d) ? '✕' : x))));
      fill(out, h('div', { class: 'rgrid' }, cols), h('div', { class: 'dline' + (ok ? '' : ' bad'), html: md(failed.size ? T(ok ? 'demo.raid.survives' : 'demo.raid.lost', { n: failed.size, count: String(failed.size) }) : T('demo.raid.click')) }),
        h('div', { class: 'pstats' }, pill('demo.raid.pillCapacity', { cap: String(info.capacityDisks), disks: String(disks), pct: String(Math.round(info.efficiency * 100)) }), pill('demo.raid.pillTolerance', { n: info.guaranteedTolerance, count: String(info.guaranteedTolerance) })), h('p', { class: 'muted', text: NOTE[level] }));
    }
    levelsAll.forEach((l, i) => tabs.append(h('button', { class: 'tb', type: 'button', 'aria-pressed': String(i === 0), onclick: () => { level = l; failed = new Set(); [...tabs.children].forEach((t, k) => t.setAttribute('aria-pressed', String(k === i))); draw(); } }, 'RAID ' + l)));
    const dsel = sel(T('demo.raid.disks'), [[4, '4'], [5, '5'], [6, '6']], disks, (v) => { disks = +v; failed = new Set(); draw(); });
    draw();
    return { el: panel(b.title || T('demo.raid.title'), b.hint && h('p', { class: 'muted', html: md(b.hint) }), tabs, h('div', { class: 'row' }, dsel, btn(T('demo.raid.repair'), () => { failed = new Set(); draw(); })), out), n: 0 };
  }

  /* ---------- cache coherence ---------- */
  function coherenceDemo(b) {
    const nCores = b.cores || 2; let coherent = true; let st = S.msiNew(nCores, b.memory == null ? 0 : b.memory); let stale = []; const out = h('div'); let valCtr = 1;
    function reset() { st = S.msiNew(nCores, b.memory == null ? 0 : b.memory); stale = Array.from({ length: nCores }, () => ({ valid: false, value: null })); valCtr = (b.memory == null ? 0 : b.memory) + 1; log = []; draw(); }
    let log = [];
    function op(core, kind) {
      if (coherent) { const r = S.msiOp(st, core, kind, valCtr); const tn = r.noteInfo ? tr('msi.' + r.noteInfo.code, r.noteInfo.args, r.note) : r.note; log.unshift(T(kind === 'R' ? 'demo.coherence.logRead' : 'demo.coherence.logWrite', { core: String(core), note: tn }), ...r.msgs.map((m, i) => '  ' + (r.msgsInfo && r.msgsInfo[i] ? tr('msi.' + r.msgsInfo[i].code, r.msgsInfo[i].args, m) : m))); if (kind === 'W') valCtr++; }
      else { const c = stale[core]; if (kind === 'R') { if (c.valid) log.unshift(T(c.value !== st.mem ? 'demo.coherence.readStale' : 'demo.coherence.readOwn', { core: String(core), v: String(c.value), mem: String(st.mem) })); else { c.valid = true; c.value = st.mem; log.unshift(T('demo.coherence.readMem', { core: String(core), v: String(st.mem) })); } } else { c.valid = true; c.value = valCtr; st.mem = valCtr; log.unshift(T('demo.coherence.writeNoProto', { core: String(core), v: String(valCtr) })); valCtr++; } }
      draw();
    }
    function draw() {
      const cores = Array.from({ length: nCores }, (_, i) => { const c = st.cores[i]; const s = stale[i]; const stateTxt = coherent ? c.state : s.valid ? 'V' : '—'; const val = coherent ? (c.value == null ? '—' : c.value) : (s.valid ? s.value : '—'); const isStale = !coherent && s.valid && s.value !== st.mem;
        return h('div', { class: 'ccore' + (isStale ? ' stale' : '') }, h('b', { text: T('demo.coherence.core', { i: String(i) }) }), h('div', { class: 'cstate', html: md(T(coherent ? 'demo.coherence.state' : 'demo.coherence.copy', { v: String(stateTxt) })) }), h('div', { class: 'cval', html: `x = <b>${esc(String(val))}</b>` + (isStale ? ` <span class="chip hard">${esc(T('demo.coherence.stale'))}</span>` : '') }), h('div', { class: 'row' }, btn(T('demo.coherence.read'), () => op(i, 'R')), btn(T('demo.coherence.write', { v: String(valCtr) }), () => op(i, 'W')))); });
      fill(out, h('div', { class: 'cgrid' }, cores, h('div', { class: 'ccore mem' }, h('b', { text: T('demo.coherence.mainMemory') }), h('div', { class: 'cval', html: `x = <b>${st.mem}</b>` }))), h('ul', { class: 'hlist clog', 'aria-live': 'polite' }, log.slice(0, 8).map((l) => h('li', { text: l }))));
    }
    const mode = h('button', { class: 'tb', type: 'button', 'aria-pressed': 'true', onclick: (e) => { coherent = !coherent; e.currentTarget.setAttribute('aria-pressed', String(coherent)); e.currentTarget.textContent = T(coherent ? 'demo.coherence.protocolOn' : 'demo.coherence.protocolOff'); reset(); } }, T('demo.coherence.protocolOn'));
    reset();
    return { el: panel(b.title || T('demo.coherence.title'), b.hint && h('p', { class: 'muted', html: md(b.hint) }), h('div', { class: 'row' }, mode, btn(T('demo.common.reset'), reset)), out, h('p', { class: 'muted', text: T('demo.coherence.legend') })), n: 0 };
  }

  /* ---------- race conditions ---------- */
  function raceDemo(b) {
    let locked = !!b.locked; const base = ['load', 'add', 'store']; const withLock = ['lock', 'load', 'add', 'store', 'unlock']; let sched = []; const out = h('div');
    const progs = () => [locked ? withLock : base, locked ? withLock : base];
    function draw() {
      const p = progs(); const r = S.raceRun(p, sched); const pcs = [0, 0]; r.log.forEach((l) => { if (l.ran !== false && l.op !== '(done)') pcs[l.t]++; });
      const th = [0, 1].map((t) => h('div', { class: 'rthread' }, h('b', { text: T('demo.race.thread', { t: String(t) }) }), h('ol', {}, p[t].map((o, i) => h('li', { class: i < pcs[t] ? 'done' : i === pcs[t] ? 'next' : '' }, T('demo.race.op.' + o)))), btn(T('demo.race.runStep', { t: String(t) }), () => { sched.push(t); draw(); })));
      const total = 2; const bad = r.done && r.shared !== total;
      fill(out, h('div', { class: 'two' }, th), h('div', { class: 'dline' }, T('demo.race.shared') + ' ', h('b', { text: String(r.shared) }), ' ' + T('demo.race.expect', { total: String(total) })), r.done ? h('div', { class: 'feedback ' + (bad ? 'bad' : 'good') }, h('strong', { text: T(bad ? 'demo.race.lostTitle' : 'demo.race.okTitle') + ' ' }), T(bad ? 'demo.race.lost' : 'demo.race.ok')) : null,
        h('ul', { class: 'hlist' }, r.log.slice(-6).map((l) => h('li', { text: T('demo.race.logLine', { t: String(l.t), op: T('demo.race.opName.' + l.op), note: l.noteInfo ? tr('race.' + l.noteInfo.code, l.noteInfo.args, l.note) : l.note }) }))));
    }
    const tog = h('button', { class: 'tb', type: 'button', 'aria-pressed': String(locked), onclick: (e) => { locked = !locked; sched = []; e.currentTarget.setAttribute('aria-pressed', String(locked)); e.currentTarget.textContent = T(locked ? 'demo.race.locked' : 'demo.race.noLock'); draw(); } }, T(locked ? 'demo.race.locked' : 'demo.race.noLock'));
    draw();
    return { el: panel(b.title || T('demo.race.title'), b.hint && h('p', { class: 'muted', html: md(b.hint) }), h('div', { class: 'row' }, tog, btn(T('demo.common.reset'), () => { sched = []; draw(); }), btn(T('demo.race.bad'), () => { sched = locked ? [0, 1, 0, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1] : [0, 1, 0, 0, 1, 1]; draw(); })), out), n: 0 };
  }

  /* ---------- SIMD / vector ---------- */
  function simdDemo(b) {
    const A = b.a || [1, 2, 3, 4, 5, 6, 7, 8], B = b.b || [10, 20, 30, 40, 50, 60, 70, 80]; let lanes = b.lanes || 4; let pos = 0; const out = h('div');
    function draw() {
      const n = A.length; const total = Math.ceil(n / lanes); const done = Math.min(pos, total);
      const cells = A.map((x, i) => { const cyc = Math.floor(i / lanes); return h('div', { class: 'sd ' + (cyc < done ? 'done' : cyc === done ? 'next' : '') }, h('small', { text: T('demo.simd.cell', { lane: String(i % lanes), cycle: String(cyc + 1) }) }), h('b', { text: `${x} + ${B[i]} = ${cyc < done ? x + B[i] : '?'}` })); });
      fill(out, h('div', { class: 'sgrid', style: `--cols:${Math.min(lanes, 4)}` }, cells), h('div', { class: 'pstats' }, pill('demo.simd.pillScalar', { n: String(n) }), pill('demo.simd.pillLanes', { n: lanes, count: String(lanes), total: String(total) }), pill('demo.simd.pillSpeedup', { v: (n / total).toFixed(1) })),
        h('p', { class: 'muted', text: T('demo.simd.note', { elements: T('demo.simd.elements', { n: lanes, count: String(lanes) }), steps: T('demo.simd.steps', { n: total, count: String(total) }), scalar: String(n) }) }));
    }
    const ls = sel(T('demo.simd.lanes'), [[1, T('demo.simd.scalar')], [2, '2'], [4, '4'], [8, '8']], lanes, (v) => { lanes = +v; pos = 0; draw(); });
    draw();
    return { el: panel(b.title || T('demo.simd.title'), b.hint && h('p', { class: 'muted', html: md(b.hint) }), h('div', { class: 'row' }, ls, btn(T('demo.common.step'), () => { pos++; draw(); }, 'primary'), btn(T('demo.common.reset'), () => { pos = 0; draw(); })), out), n: 0 };
  }

  return { cache: cacheDemo, hierarchy: hierarchyDemo, vm: vmDemo, raid: raidDemo, coherence: coherenceDemo, race: raceDemo, simd: simdDemo };
});
