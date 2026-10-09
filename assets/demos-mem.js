/* Interactive demo blocks, part 3: cache, hierarchy, vm (virtual memory), raid, coherence, race and simd. */
(window.SLDEMO_PARTS = window.SLDEMO_PARTS || []).push((kit) => {
  const { h, md, esc, sim: S, fill } = kit;
  const btn = (label, fn, cls) => h('button', { class: 'btn' + (cls ? ' ' + cls : ''), type: 'button', onclick: fn }, label);
  const panel = (title, ...kids) => h('div', { class: 'blk demo card' }, title && h('h3', { text: title }), ...kids);
  const hexs = (n, d) => '0x' + (n >>> 0).toString(16).toUpperCase().padStart(d || 1, '0');
  const bins = (n, d) => (d > 0 ? (n >>> 0).toString(2).padStart(d, '0').slice(-d) : '');
  const sel = (label, vals, cur, fn) => h('label', { class: 'dfield' }, h('span', { text: label }), h('select', { 'aria-label': label, onchange: (e) => fn(e.target.value) }, vals.map(([v, t]) => h('option', { value: String(v), selected: String(v) === String(cur) ? '' : null }, t))));
  const addrNum = (t) => { t = String(t).trim(); return /^0x/i.test(t) ? parseInt(t, 16) : parseInt(t, 10); };

  /* ---------- cache ---------- */
  function cacheDemo(b) {
    const cfg = Object.assign({ blockBytes: 4, lines: 8, assoc: 1, addrBits: 8 }, b.config || {}); const controls = b.controls || [];
    const seqs = b.sequences || [{ name: 'Sequence', accesses: b.accesses || [] }]; let si = 0, pos = 0; let res = null;
    const out = h('div'); const tabs = h('div', { class: 'seg dtabs' });
    const toks = (a) => (typeof a === 'object' ? a : { addr: a, op: 'R' });
    function compute() { res = S.cacheSim(cfg, seqs[si].accesses.map((a) => { const t = toks(a); return { addr: typeof t.addr === 'string' ? addrNum(t.addr) : t.addr, op: t.op || 'R' }; })); if (pos > res.events.length) pos = res.events.length; draw(); }
    function draw() {
      const ev = pos > 0 ? res.events[pos - 1] : null; const nSets = res.sets; const ways = res.config.assoc;
      const seg = (txt, cls, label) => h('span', { class: 'aseg ' + cls }, h('small', { text: label }), h('code', { text: txt }));
      const addr = ev ? h('div', { class: 'abits' }, seg(bins(ev.tag, res.tagBits), 'tag', `tag (${res.tagBits})`), res.idxBits ? seg(bins(ev.index, res.idxBits), 'idx', `index (${res.idxBits})`) : null, seg(bins(ev.offset, res.offBits), 'off', `offset (${res.offBits})`)) : h('p', { class: 'muted', text: 'Press Step to send the first address to the cache.' });
      const rowsEl = []; for (let s = 0; s < nSets; s++) {
        const lines = ev ? ev.state[s] : []; const cells = []; for (let w = 0; w < ways; w++) { const l = lines[w]; const touched = ev && ev.index === s && l && l.tag === ev.tag; cells.push(h('td', { class: 'cline' + (touched ? (ev.hit ? ' hit' : ' miss') : '') }, l ? [h('small', { text: 'V=1' }), h('b', { text: 'tag ' + l.tag + (l.dirty ? ' *' : '') })] : h('span', { class: 'muted', text: 'empty' }))); }
        rowsEl.push(h('tr', {}, h('th', { text: nSets > 1 ? 'set ' + s : 'all lines' }), ...cells));
      }
      const c = res.counts; const done = res.events.slice(0, pos);
      const amat = b.amat ? (b.amat.hitTime + (res.events.slice(0, pos).length ? done.filter((e) => !e.hit).length / done.length : 0) * b.amat.missPenalty) : null;
      fill(out, addr, ev ? h('div', { class: 'dline' }, h('span', { class: 'chip ' + (ev.hit ? 'easy' : 'hard'), text: ev.hit ? 'HIT' : 'MISS' + (ev.kind ? ' (' + ev.kind + ')' : '') }), ` address ${ev.addr} → block ${ev.block}, set ${ev.index}` + (ev.evicted ? `, evicted tag ${ev.evicted.tag}` : '')) : null,
        h('div', { class: 'ptwrap' }, h('table', { class: 'dtable cachetbl' }, h('thead', {}, h('tr', {}, h('th', { text: '' }), Array.from({ length: ways }, (_, w) => h('th', { text: ways > 1 ? 'way ' + w : 'line' })))), h('tbody', {}, rowsEl))),
        h('div', { class: 'seqchips', 'aria-label': 'Access history' }, res.events.map((e, i) => h('span', { class: 'sq ' + (i < pos ? (e.hit ? 'hit' : 'miss') : 'todo') + (i === pos - 1 ? ' now' : ''), title: i < pos ? (e.hit ? 'hit' : 'miss ' + (e.kind || '')) : 'not yet' }, String(e.addr) + (e.op === 'W' ? 'w' : '')))),
        h('div', { class: 'pstats' }, h('span', { class: 'pill', html: `Hits <b>${done.filter((e) => e.hit).length}</b>` }), h('span', { class: 'pill', html: `Misses <b>${done.filter((e) => !e.hit).length}</b>` }), h('span', { class: 'pill', html: `Hit rate <b>${done.length ? Math.round(done.filter((e) => e.hit).length / done.length * 100) : 0}%</b>` }),
          h('span', { class: 'pill', html: `Compulsory <b>${done.filter((e) => e.kind === 'compulsory').length}</b>` }), h('span', { class: 'pill', html: `Capacity <b>${done.filter((e) => e.kind === 'capacity').length}</b>` }), h('span', { class: 'pill', html: `Conflict <b>${done.filter((e) => e.kind === 'conflict').length}</b>` }),
          done.some((e) => e.op === 'W') ? h('span', { class: 'pill', html: `Memory writes <b>${done.length ? done[done.length - 1].memWrites : 0}</b>` }) : null, amat != null ? h('span', { class: 'pill', html: `AMAT <b>${amat.toFixed(2)}</b> cycles` }) : null),
        h('p', { class: 'muted', text: `${res.config.blockBytes}-byte blocks, ${res.config.lines} lines, ${nSets === 1 ? 'fully associative' : ways === 1 ? 'direct mapped' : ways + '-way set associative'} (${nSets} set${nSets === 1 ? '' : 's'}). Address = ${res.tagBits} tag + ${res.idxBits} index + ${res.offBits} offset bits.` + (res.config.write ? '' : '') }));
    }
    const ctl = h('div', { class: 'row' }, btn('Step', () => { if (pos < res.events.length) { pos++; draw(); } }, 'primary'), btn('Run all', () => { pos = res.events.length; draw(); }), btn('Reset', () => { pos = 0; draw(); }));
    const opts = h('div', { class: 'row popts' });
    if (controls.includes('assoc')) opts.append(sel('Mapping', [[1, 'Direct mapped'], [2, '2-way'], [4, '4-way'], ['full', 'Fully associative']], cfg.assoc, (v) => { cfg.assoc = v === 'full' ? 'full' : +v; pos = 0; compute(); }));
    if (controls.includes('lines')) opts.append(sel('Cache lines', [[4, '4'], [8, '8'], [16, '16']], cfg.lines, (v) => { cfg.lines = +v; pos = 0; compute(); }));
    if (controls.includes('block')) opts.append(sel('Block size (bytes)', [[4, '4'], [8, '8'], [16, '16']], cfg.blockBytes, (v) => { cfg.blockBytes = +v; pos = 0; compute(); }));
    if (controls.includes('write')) opts.append(sel('Write policy', [['back', 'Write-back'], ['through', 'Write-through']], cfg.write || 'back', (v) => { cfg.write = v; pos = 0; compute(); }));
    if (seqs.length > 1) seqs.forEach((s, i) => tabs.append(h('button', { class: 'tb', type: 'button', 'aria-pressed': String(i === 0), onclick: () => { si = i; pos = 0; [...tabs.children].forEach((t, k) => t.setAttribute('aria-pressed', String(k === i))); compute(); } }, s.name)));
    compute();
    return { el: panel(b.title || 'Cache simulator', b.hint && h('p', { class: 'muted', html: md(b.hint) }), seqs.length > 1 ? tabs : null, opts.children.length ? opts : null, ctl, out), n: 0 };
  }

  /* ---------- memory hierarchy ---------- */
  function hierarchyDemo(b) {
    const levels = b.levels || [{ name: 'Registers', speed: 'under 1 ns', capacity: 'hundreds of bytes', cost: 'highest per bit', purpose: 'Hold the values the CPU is using right now', example: 'The 32 MIPS registers' }];
    const info = h('div', { class: 'card hinfo' }); const pyr = h('div', { class: 'hpyr', role: 'list' }); let sel = 0;
    function showInfo(i) { sel = i; const l = levels[i]; [...pyr.children].forEach((c, k) => c.classList.toggle('cur', k === i)); fill(info, h('h4', { text: l.name }), h('dl', { class: 'hdl' }, ['speed', 'capacity', 'cost', 'purpose', 'example'].filter((k) => l[k]).flatMap((k) => [h('dt', { text: k[0].toUpperCase() + k.slice(1) }), h('dd', { html: md(l[k]) })]))); }
    levels.forEach((l, i) => pyr.append(h('button', { class: 'hlvl', type: 'button', role: 'listitem', style: `--w:${50 + i * (50 / Math.max(1, levels.length - 1))}%`, onclick: () => { showInfo(i); move(i); } }, l.name)));
    function move(i) { // animate a value travelling up to the CPU
      const kids = [...pyr.children]; kids.forEach((k) => k.classList.remove('flow')); for (let k = i; k >= 0; k--) kit.later(() => { kids.forEach((x) => x.classList.remove('flow')); kids[k].classList.add('flow'); }, (kit.cfg.reduce ? 100 : 450) * (i - k + 1)); kit.later(() => kids.forEach((x) => x.classList.remove('flow')), (kit.cfg.reduce ? 100 : 450) * (i + 2));
    }
    showInfo(0);
    const parts = [h('div', { class: 'hwrap' }, h('div', { class: 'hside' }, h('div', { class: 'hcpu', text: 'CPU' }), pyr, h('div', { class: 'harrow muted', html: '↑ faster, more costly per bit &nbsp;&nbsp; ↓ larger, higher latency' })), info)];
    const L = b.locality;
    if (L) {
      let pi = 0, pos = 0; const out = h('div'); const tabs = h('div', { class: 'seg dtabs' });
      let res = null; const compute = () => { res = S.hierarchySim(L.levels, L.blockWords || 4, L.patterns[pi].seq); if (pos > res.events.length) pos = res.events.length; draw(); };
      function draw() {
        const done = res.events.slice(0, pos); const ev = done[done.length - 1]; const l1 = done.filter((e) => e.foundIndex === 0).length;
        fill(out, h('div', { class: 'seqchips', 'aria-label': 'Accesses' }, res.events.map((e, i) => h('span', { class: 'sq ' + (i < pos ? (e.foundIndex === 0 ? 'hit' : 'miss') : 'todo') + (i === pos - 1 ? ' now' : ''), title: i < pos ? 'found in ' + e.found : '' }, 'A' + e.addr))),
          ev ? h('div', { class: 'dline', html: `Access A${ev.addr} (block ${ev.block}): <b>found at ${esc(ev.found)}</b>` }) : h('p', { class: 'muted', text: 'Press Step to send the first request from the CPU.' }),
          ev ? h('div', { class: 'hstate' }, L.levels.map((lv, i) => h('div', { class: 'hbox' }, h('small', { text: lv.name }), h('b', { text: ev.state[i].length ? 'blocks ' + ev.state[i].join(', ') : 'empty' })))) : null,
          h('div', { class: 'pstats' }, h('span', { class: 'pill', html: `Served by ${esc(L.levels[0].name)} <b>${l1} / ${done.length}</b>` }), h('span', { class: 'pill', html: `Went further down <b>${done.length - l1}</b>` })));
      }
      L.patterns.forEach((p, i) => tabs.append(h('button', { class: 'tb', type: 'button', 'aria-pressed': String(i === 0), onclick: () => { pi = i; pos = 0; [...tabs.children].forEach((t, k) => t.setAttribute('aria-pressed', String(k === i))); compute(); } }, p.name)));
      compute();
      parts.push(h('h4', { text: L.title || 'Locality demo' }), L.hint && h('p', { class: 'muted', html: md(L.hint) }), tabs, h('div', { class: 'row' }, btn('Step', () => { if (pos < res.events.length) { pos++; draw(); } }, 'primary'), btn('Run all', () => { pos = res.events.length; draw(); }), btn('Reset', () => { pos = 0; draw(); })), out);
    }
    return { el: panel(b.title || 'The memory hierarchy', ...parts), n: 0 };
  }

  /* ---------- virtual memory ---------- */
  function vmDemo(b) {
    const cfg = b.config || {}; let st = S.vmNew(cfg); const seq = b.sequence || []; let pos = 0; const hist = [];
    const out = h('div'); const inp = h('input', { type: 'text', value: seq[0] != null ? String(seq[0]) : '5000', 'aria-label': 'Virtual address', style: 'width:9rem', onkeydown: (e) => { if (e.key === 'Enter') go(addrNum(inp.value)); } });
    let last = null;
    function tables() {
      return h('div', { class: 'two' },
        h('div', {}, h('h4', { text: 'TLB' }), h('table', { class: 'dtable' }, h('thead', {}, h('tr', {}, ['Virtual page', 'Frame'].map((t) => h('th', { text: t })))), h('tbody', {}, st.tlb.length ? st.tlb.map((e) => h('tr', {}, h('td', { text: e.vpn }), h('td', { text: e.ppn }))) : h('tr', {}, h('td', { colspan: 2, class: 'muted', text: 'empty' }))))),
        h('div', {}, h('h4', { text: 'Page table' }), h('table', { class: 'dtable' }, h('thead', {}, h('tr', {}, ['Virtual page', 'Valid', 'Frame'].map((t) => h('th', { text: t })))), h('tbody', {}, Object.keys(st.pt).sort((x, y) => x - y).map((k) => h('tr', {}, h('td', { text: k }), h('td', { text: st.pt[k].valid ? '1' : '0' }), h('td', { text: st.pt[k].valid ? st.pt[k].ppn : 'on disk' })))))));
    }
    function draw() {
      const r = last; const path = ['Virtual address', 'TLB', 'Page table', 'Physical address', 'Memory'];
      const hit = r && r.tlbHit; const used = r ? (hit ? [0, 1, 3, 4] : [0, 1, 2, 3, 4]) : [];
      const flow = h('div', { class: 'vmpath' }, path.map((p, i) => h('div', { class: 'vmstep' + (used.includes(i) ? ' on' : ' off') + (r && r.fault && i === 2 ? ' fault' : '') }, h('b', { text: p }), r && i === 0 ? h('small', { text: String(r.va) }) : null, r && i === 1 ? h('small', { text: hit ? 'hit' : 'miss' }) : null, r && i === 2 ? h('small', { text: hit ? 'not needed' : r.fault ? 'PAGE FAULT' : 'valid' }) : null, r && i === 3 ? h('small', { text: hexs(r.pa, 1) + ' (' + r.pa + ')' }) : null)));
      const offBits = st.offBits; const split = r ? h('div', { class: 'abits' }, h('span', { class: 'aseg tag' }, h('small', { text: `virtual page number = ${r.vpn}` }), h('code', { text: bins(r.vpn, Math.max(1, (cfg.vaBits || 16) - offBits)) })), h('span', { class: 'aseg off' }, h('small', { text: `page offset (${offBits} bits) = ${r.offset}` }), h('code', { text: bins(r.offset, offBits) }))) : h('p', { class: 'muted', text: 'Enter a virtual address and press Translate.' });
      fill(out, split, flow, r ? h('ul', { class: 'hlist' }, r.steps.map((s) => h('li', { text: s }))) : null, r ? h('div', { class: 'dline', html: `Physical address = frame ${r.ppn} × ${cfg.pageBytes || 4096} + offset ${r.offset} = <b>${r.pa}</b>` }) : null, tables());
    }
    function go(a) { if (Number.isNaN(a) || a < 0) return; last = S.vmTranslate(st, a); hist.push(last); draw(); }
    const ctl = h('div', { class: 'row' }, h('label', { class: 'dfield' }, h('span', { text: 'Virtual address (decimal or 0x hex)' }), inp), btn('Translate', () => go(addrNum(inp.value)), 'primary'),
      seq.length ? btn('Next from the example list', () => { go(addrNum(String(seq[pos % seq.length]))); pos++; inp.value = String(seq[pos % seq.length]); }) : null, btn('Reset', () => { st = S.vmNew(cfg); last = null; pos = 0; inp.value = seq[0] != null ? String(seq[0]) : '5000'; draw(); }));
    draw();
    return { el: panel(b.title || 'Virtual to physical address', b.hint && h('p', { class: 'muted', html: md(b.hint) }), ctl, out), n: 0 };
  }

  /* ---------- RAID ---------- */
  function raidDemo(b) {
    const levelsAll = b.levels || ['0', '1', '5', '6', '10']; let level = levelsAll[0]; let disks = b.disks || 4; const rows = b.rows || 4; let failed = new Set(); const out = h('div'); const tabs = h('div', { class: 'seg dtabs' });
    const NOTE = { 0: 'Striping only: fastest and all the capacity, but any one failure loses everything.', 1: 'Mirroring: every block is on every disk, so it survives until the last disk fails; capacity of one disk.', 5: 'Striping with rotating parity: survives any one failure, loses one disk of capacity, small writes are slower.', 6: 'Two parity blocks: survives any two failures, loses two disks of capacity.', 10: 'Mirrored pairs that are striped: survives a failure in each pair, loses half the capacity.' };
    function draw() {
      const need = { 0: 2, 1: 2, 5: 3, 6: 4, 10: 4 }[level]; if (disks < need) disks = need; if (level === '10' && disks % 2) disks++;
      const g = S.raidLayout(level, disks, rows); const info = S.raidInfo(level, disks); const ok = S.raidSurvives(level, disks, [...failed]);
      const cols = g.map((col, d) => h('div', { class: 'rdisk' + (failed.has(d) ? ' fail' : '') }, h('button', { class: 'tb', type: 'button', 'aria-pressed': String(failed.has(d)), onclick: () => { if (failed.has(d)) failed.delete(d); else failed.add(d); draw(); } }, failed.has(d) ? `Disk ${d} FAILED` : `Disk ${d}`), col.map((x) => h('div', { class: 'rblk ' + (x === 'P' || x === 'Q' ? 'par' : '') }, failed.has(d) ? '✕' : x))));
      fill(out, h('div', { class: 'rgrid' }, cols), h('div', { class: 'dline' + (ok ? '' : ' bad'), html: failed.size ? (ok ? `<b>✓ Data is still available</b> with ${failed.size} failed disk${failed.size === 1 ? '' : 's'} (some blocks must be rebuilt from the others).` : `<b>✗ Data is LOST</b> with these ${failed.size} failed disk${failed.size === 1 ? '' : 's'}.`) : 'Click a disk to fail it and see whether the data survives.' }),
        h('div', { class: 'pstats' }, h('span', { class: 'pill', html: `Usable capacity <b>${info.capacityDisks} of ${disks} disks (${Math.round(info.efficiency * 100)}%)</b>` }), h('span', { class: 'pill', html: `Always survives <b>${info.guaranteedTolerance} failure${info.guaranteedTolerance === 1 ? '' : 's'}</b>` })), h('p', { class: 'muted', text: NOTE[level] }));
    }
    levelsAll.forEach((l, i) => tabs.append(h('button', { class: 'tb', type: 'button', 'aria-pressed': String(i === 0), onclick: () => { level = l; failed = new Set(); [...tabs.children].forEach((t, k) => t.setAttribute('aria-pressed', String(k === i))); draw(); } }, 'RAID ' + l)));
    const dsel = sel('Disks', [[4, '4'], [5, '5'], [6, '6']], disks, (v) => { disks = +v; failed = new Set(); draw(); });
    draw();
    return { el: panel(b.title || 'RAID levels', b.hint && h('p', { class: 'muted', html: md(b.hint) }), tabs, h('div', { class: 'row' }, dsel, btn('Repair all disks', () => { failed = new Set(); draw(); })), out), n: 0 };
  }

  /* ---------- cache coherence ---------- */
  function coherenceDemo(b) {
    const nCores = b.cores || 2; let coherent = true; let st = S.msiNew(nCores, b.memory == null ? 0 : b.memory); let stale = []; const out = h('div'); let valCtr = 1;
    function reset() { st = S.msiNew(nCores, b.memory == null ? 0 : b.memory); stale = Array.from({ length: nCores }, () => ({ valid: false, value: null })); valCtr = (b.memory == null ? 0 : b.memory) + 1; log = []; draw(); }
    let log = [];
    function op(core, kind) {
      if (coherent) { const r = S.msiOp(st, core, kind, valCtr); log.unshift(`${kind === 'R' ? 'Read' : 'Write'} by core ${core}: ${r.note}`, ...r.msgs.map((m) => '  ' + m)); if (kind === 'W') valCtr++; }
      else { const c = stale[core]; if (kind === 'R') { if (c.valid) log.unshift(`Core ${core} reads ${c.value} from its own cache${c.value !== st.mem ? ' (STALE: memory now holds ' + st.mem + ')' : ''}`); else { c.valid = true; c.value = st.mem; log.unshift(`Core ${core} reads ${st.mem} from memory into its cache`); } } else { c.valid = true; c.value = valCtr; st.mem = valCtr; log.unshift(`Core ${core} writes ${valCtr}; memory updated; other cores' copies are NOT told`); valCtr++; } }
      draw();
    }
    function draw() {
      const cores = Array.from({ length: nCores }, (_, i) => { const c = st.cores[i]; const s = stale[i]; const stateTxt = coherent ? c.state : s.valid ? 'V' : '—'; const val = coherent ? (c.value == null ? '—' : c.value) : (s.valid ? s.value : '—'); const isStale = !coherent && s.valid && s.value !== st.mem;
        return h('div', { class: 'ccore' + (isStale ? ' stale' : '') }, h('b', { text: 'Core ' + i }), h('div', { class: 'cstate', html: coherent ? `state <b>${stateTxt}</b>` : `copy <b>${stateTxt}</b>` }), h('div', { class: 'cval', html: `x = <b>${val}</b>` + (isStale ? ' <span class="chip hard">stale</span>' : '') }), h('div', { class: 'row' }, btn('Read x', () => op(i, 'R')), btn('Write x = ' + valCtr, () => op(i, 'W')))); });
      fill(out, h('div', { class: 'cgrid' }, cores, h('div', { class: 'ccore mem' }, h('b', { text: 'Main memory' }), h('div', { class: 'cval', html: `x = <b>${st.mem}</b>` }))), h('ul', { class: 'hlist clog', 'aria-live': 'polite' }, log.slice(0, 8).map((l) => h('li', { text: l }))));
    }
    const mode = h('button', { class: 'tb', type: 'button', 'aria-pressed': 'true', onclick: (e) => { coherent = !coherent; e.currentTarget.setAttribute('aria-pressed', String(coherent)); e.currentTarget.textContent = coherent ? 'Coherence protocol: ON (MSI)' : 'Coherence protocol: OFF'; reset(); } }, 'Coherence protocol: ON (MSI)');
    reset();
    return { el: panel(b.title || 'Cache coherence', b.hint && h('p', { class: 'muted', html: md(b.hint) }), h('div', { class: 'row' }, mode, btn('Reset', reset)), out, h('p', { class: 'muted', text: 'States: M = modified (only copy, memory is stale), S = shared (clean, others may have it), I = invalid. A write invalidates other copies.' })), n: 0 };
  }

  /* ---------- race conditions ---------- */
  function raceDemo(b) {
    let locked = !!b.locked; const base = ['load', 'add', 'store']; const withLock = ['lock', 'load', 'add', 'store', 'unlock']; let sched = []; const out = h('div');
    const progs = () => [locked ? withLock : base, locked ? withLock : base];
    function draw() {
      const p = progs(); const r = S.raceRun(p, sched); const pcs = [0, 0]; r.log.forEach((l) => { if (l.ran !== false && l.op !== '(done)') pcs[l.t]++; });
      const th = [0, 1].map((t) => h('div', { class: 'rthread' }, h('b', { text: 'Thread ' + t }), h('ol', {}, p[t].map((o, i) => h('li', { class: i < pcs[t] ? 'done' : i === pcs[t] ? 'next' : '' }, o + (o === 'load' ? ' counter → register' : o === 'add' ? ' register + 1' : o === 'store' ? ' register → counter' : o)))), btn('Run one step of thread ' + t, () => { sched.push(t); draw(); })));
      const total = 2; const bad = r.done && r.shared !== total;
      fill(out, h('div', { class: 'two' }, th), h('div', { class: 'dline' }, `Shared counter = `, h('b', { text: String(r.shared) }), ` (two increments should give ${total})`), r.done ? h('div', { class: 'feedback ' + (bad ? 'bad' : 'good') }, h('strong', { text: bad ? 'Lost update! ' : 'Correct. ' }), bad ? 'Both threads read the old value, so one increment was overwritten.' : 'Each thread finished its update without being interrupted.') : null,
        h('ul', { class: 'hlist' }, r.log.slice(-6).map((l) => h('li', { text: `Thread ${l.t}: ${l.op} — ${l.note}` }))));
    }
    const tog = h('button', { class: 'tb', type: 'button', 'aria-pressed': String(locked), onclick: (e) => { locked = !locked; sched = []; e.currentTarget.setAttribute('aria-pressed', String(locked)); e.currentTarget.textContent = locked ? 'Using a lock' : 'No lock'; draw(); } }, locked ? 'Using a lock' : 'No lock');
    draw();
    return { el: panel(b.title || 'Race condition', b.hint && h('p', { class: 'muted', html: md(b.hint) }), h('div', { class: 'row' }, tog, btn('Reset', () => { sched = []; draw(); }), btn('Try the bad interleaving', () => { sched = locked ? [0, 1, 0, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1] : [0, 1, 0, 0, 1, 1]; draw(); })), out), n: 0 };
  }

  /* ---------- SIMD / vector ---------- */
  function simdDemo(b) {
    const A = b.a || [1, 2, 3, 4, 5, 6, 7, 8], B = b.b || [10, 20, 30, 40, 50, 60, 70, 80]; let lanes = b.lanes || 4; let pos = 0; const out = h('div');
    function draw() {
      const n = A.length; const total = Math.ceil(n / lanes); const done = Math.min(pos, total);
      const cells = A.map((x, i) => { const cyc = Math.floor(i / lanes); return h('div', { class: 'sd ' + (cyc < done ? 'done' : cyc === done ? 'next' : '') }, h('small', { text: `lane ${i % lanes}, cycle ${cyc + 1}` }), h('b', { text: `${x} + ${B[i]} = ${cyc < done ? x + B[i] : '?'}` })); });
      fill(out, h('div', { class: 'sgrid', style: `--cols:${Math.min(lanes, 4)}` }, cells), h('div', { class: 'pstats' }, h('span', { class: 'pill', html: `Scalar (1 lane): <b>${n}</b> add cycles` }), h('span', { class: 'pill', html: `${lanes} lane${lanes === 1 ? '' : 's'}: <b>${total}</b> add cycles` }), h('span', { class: 'pill', html: `Speedup <b>${(n / total).toFixed(1)}×</b>` })),
        h('p', { class: 'muted', text: `A vector or SIMD instruction applies the same operation to ${lanes} element${lanes === 1 ? '' : 's'} at once, so the loop needs ${total} step${total === 1 ? '' : 's'} instead of ${n}.` }));
    }
    const ls = sel('Lanes (elements per instruction)', [[1, '1 (scalar)'], [2, '2'], [4, '4'], [8, '8']], lanes, (v) => { lanes = +v; pos = 0; draw(); });
    draw();
    return { el: panel(b.title || 'Vector addition: C[i] = A[i] + B[i]', b.hint && h('p', { class: 'muted', html: md(b.hint) }), h('div', { class: 'row' }, ls, btn('Step', () => { pos++; draw(); }, 'primary'), btn('Reset', () => { pos = 0; draw(); })), out), n: 0 };
  }

  return { cache: cacheDemo, hierarchy: hierarchyDemo, vm: vmDemo, raid: raidDemo, coherence: coherenceDemo, race: raceDemo, simd: simdDemo };
});
