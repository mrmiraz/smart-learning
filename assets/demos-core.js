/* Interactive demo blocks, part 1: walkthrough (formula-driven animated stages), bits (number representation),
   encoder (MIPS instruction builder / decoder) and mips (a small MIPS simulator). See .claude/skills/new-lesson/reference.md. */
(window.SLDEMO_PARTS = window.SLDEMO_PARTS || []).push((kit) => {
  const { h, md, esc, sim: S, fill } = kit;
  const T = (k, v) => kit.t(k, v);
  const tr = (code, args, fallback) => { const k = 'sim.' + code; const out = kit.t(k, args); return out === k ? fallback : out; }; // simulator text by code, English fallback
  const trErr = (e) => (e && e.code ? tr('err.' + e.code, e.args, e.message) : e.message);
  const NB = '\u00A0\u00A0';
  const num = (x, d) => (Number.isFinite(x) ? x.toLocaleString('en-US', { maximumFractionDigits: d == null ? 4 : d }) : '—');
  const hexs = (n, d) => '0x' + (n >>> 0).toString(16).toUpperCase().padStart(d || 1, '0');
  const bins = (n, d) => (n >>> 0).toString(2).padStart(d, '0').slice(-d);
  const btn = (label, fn, cls) => h('button', { class: 'btn' + (cls ? ' ' + cls : ''), type: 'button', onclick: fn }, label);
  const field = (label, input) => h('label', { class: 'dfield' }, h('span', { text: label }), input);
  const panel = (title, ...kids) => h('div', { class: 'blk demo card' }, title && h('h3', { text: title }), ...kids);

  /* ---------- walkthrough ---------- */
  function fmtVal(v, f) {
    if (f == null || f === '') return num(v);
    let m;
    if (f === 'hex') return hexs(Math.round(v));
    if ((m = /^hex(\d+)$/.exec(f))) return hexs(Math.round(v), +m[1]);
    if ((m = /^bin(\d+)$/.exec(f))) return bins(Math.round(v), +m[1]);
    if ((m = /^fixed(\d+)$/.exec(f))) return Number(v).toFixed(+m[1]);
    if (f === 'dec') return String(Math.round(v));
    return num(v);
  }
  function template(text, ids, vals) {
    return String(text).replace(/\{([^{}]+)\}/g, (all, body) => {
      let expr = body, f = '';
      const bar = body.lastIndexOf('|'); if (bar > 0) { expr = body.slice(0, bar); f = body.slice(bar + 1).trim(); }
      try { return fmtVal(kit.expr(expr, ids)(vals), f); } catch (e) { return all; }
    });
  }
  function walkthrough(b) {
    const modes = b.modes || [{ name: b.title || T('demo.walkthrough.name'), inputs: b.inputs, stages: b.stages, result: b.result, note: b.note }];
    let mi = 0, cur = -1; const vals = {};
    const tabs = h('div', { class: 'seg dtabs', role: 'tablist' });
    const inputsEl = h('div', { class: 'dinputs' }); const stagesEl = h('div', { class: 'wstages' }); const noteEl = h('div', { class: 'caption empty' }); const resultEl = h('div', { class: 'wresult is-hidden' });
    const ctl = h('div', { class: 'row' });
    let stageEls = [];
    function build() {
      const m = modes[mi]; fill(inputsEl, ); (m.inputs || []).forEach((i) => {
        vals[i.id] = i.value; const out = h('output', { class: 'cval' });
        const upd = () => { out.textContent = i.fmt ? fmtVal(vals[i.id], i.fmt) : num(vals[i.id]) + (i.unit ? ' ' + i.unit : ''); };
        const el = (i.max != null && i.min != null && i.slider !== false)
          ? h('input', { type: 'range', min: i.min, max: i.max, step: i.step || 1, value: i.value, 'aria-label': i.label, oninput: (e) => { vals[i.id] = +e.target.value; upd(); render(); } })
          : h('input', { type: 'number', value: i.value, 'aria-label': i.label, style: 'width:8rem', oninput: (e) => { vals[i.id] = +e.target.value; upd(); render(); } });
        upd(); inputsEl.append(h('label', { class: 'crow' }, h('span', { class: 'clabel', text: i.label }), el, out));
      });
      const ids = (m.inputs || []).map((i) => i.id); m._ids = ids;
      fill(stagesEl, ); stageEls = (m.stages || []).map((s, k) => { const el = h('div', { class: 'wstage' }, h('div', { class: 'wl', text: s.label }), h('div', { class: 'wt' })); if (k) stagesEl.append(h('span', { class: 'warrow', 'aria-hidden': 'true', text: '→' })); stagesEl.append(el); return el; });
      cur = -1; render();
      noteEl.className = 'caption' + (m.note ? '' : ' empty'); noteEl.innerHTML = m.note ? md(m.note) : '';
    }
    function render() {
      const m = modes[mi], ids = m._ids || [];
      (m.stages || []).forEach((s, k) => { stageEls[k].querySelector('.wt').innerHTML = md(template(s.text, ids, vals)); stageEls[k].classList.toggle('on', k <= cur); stageEls[k].classList.toggle('cur', k === cur); });
      if (m.result) { resultEl.classList.toggle('is-hidden', cur < (m.stages || []).length - 1); resultEl.innerHTML = md(template(m.result, ids, vals)); } else resultEl.classList.add('is-hidden');
    }
    const next = () => { const m = modes[mi]; if (cur < (m.stages || []).length - 1) { cur++; render(); } };
    function play() { cur = -1; render(); const m = modes[mi]; (m.stages || []).forEach((s, k) => kit.later(() => { cur = k; render(); }, (kit.cfg.reduce ? 300 : 1000) * (k + 1))); }
    if (modes.length > 1) modes.forEach((m, i) => tabs.append(h('button', { class: 'tb', type: 'button', role: 'tab', 'aria-pressed': String(i === 0), onclick: (e) => { mi = i; [...tabs.children].forEach((t, k) => t.setAttribute('aria-pressed', String(k === i))); build(); } }, m.name)));
    ctl.append(btn(T('demo.common.play'), play, 'primary'), btn(T('demo.common.step'), next), btn(T('demo.common.reset'), () => { cur = -1; render(); }));
    build();
    return { el: panel(b.title, modes.length > 1 ? tabs : null, inputsEl, stagesEl, noteEl, resultEl, ctl), n: 0 };
  }

  /* ---------- bits ---------- */
  function bitsDemo(b) {
    const modes = b.modes || ['twos', 'add', 'ieee', 'endian', 'mul', 'div'];
    const NAMES = Object.fromEntries(['twos', 'add', 'ieee', 'endian', 'mul', 'div'].map((k) => [k, T('demo.bits.mode.' + k)]));
    const body = h('div'); const tabs = h('div', { class: 'seg dtabs' }); let mode = modes[0];
    const bitCells = (value, n, onflip, cls) => h('div', { class: 'bitrow' }, Array.from({ length: n }, (_, k) => { const i = n - 1 - k; const v = (value >> i) & 1; // value may exceed 31 bits only when n<=32
      return h('button', { class: 'bit ' + (cls ? cls(i) : '') + (v ? ' one' : ''), type: 'button', 'aria-label': T('demo.bits.bitAria', { i: String(i), v: String(v) }), disabled: onflip ? null : true, onclick: onflip ? () => onflip(i) : null }, h('small', { text: i }), h('b', { text: v })); }));
    function twos() {
      let n = b.bits || 8, u = S.toTwos(b.value == null ? 5 : b.value, n); const out = h('div'); const nSel = h('select', { 'aria-label': T('demo.bits.bits'), onchange: (e) => { n = +e.target.value; u = S.toTwos(S.fromTwos(u, 32) % 2 ** n, n); draw(); } }, [4, 8, 16].map((k) => h('option', { value: k, selected: k === n ? '' : null }, T('demo.bits.nBits', { n: String(k) }))));
      const dec = h('input', { type: 'number', value: S.fromTwos(u, n), 'aria-label': T('demo.bits.decimalValue'), style: 'width:7rem', onchange: (e) => { u = S.toTwos(+e.target.value, n); draw(); } });
      function draw() {
        dec.value = S.fromTwos(u, n);
        fill(out, bitCells(u, n, (i) => { u ^= 2 ** i; draw(); }, (i) => (i === n - 1 ? 'sign' : '')),
          h('div', { class: 'dline', html: md(T('demo.bits.twos.line', { u: String(u), s: String(S.fromTwos(u, n)), lo: String(-(2 ** (n - 1))), hi: String(2 ** (n - 1) - 1) })) }),
          h('div', { class: 'dline muted', html: `${esc(T('demo.bits.valueLabel'))} ${Array.from({ length: n }, (_, k) => { const i = n - 1 - k; const v = (u >> i) & 1; return v ? (i === n - 1 ? `−${2 ** i}` : `${2 ** i}`) : null; }).filter((x) => x).join(' + ').replace('+ −', '− ').replace(/\+ −/g, '− ') || '0'}` }));
      }
      draw();
      return [h('div', { class: 'row' }, field(T('demo.bits.bits'), nSel), field(T('demo.bits.decimal'), dec), btn(T('demo.bits.flipAll'), () => { u = (~u) & (2 ** n - 1); draw(); }), btn(T('demo.bits.addOne'), () => { u = (u + 1) & (2 ** n - 1); draw(); }), btn(T('demo.bits.negate'), () => { u = ((~u) + 1) & (2 ** n - 1); draw(); })), out, h('p', { class: 'muted', text: T('demo.bits.twos.hint') })];
    }
    function add() {
      let n = b.bits || 8, A = b.a == null ? 100 : b.a, B = b.b == null ? 50 : b.b; const out = h('div');
      const ia = h('input', { type: 'number', value: A, 'aria-label': T('demo.bits.add.first'), style: 'width:6rem', oninput: (e) => { A = +e.target.value; draw(); } });
      const ib = h('input', { type: 'number', value: B, 'aria-label': T('demo.bits.add.second'), style: 'width:6rem', oninput: (e) => { B = +e.target.value; draw(); } });
      function draw() {
        const lo = -(2 ** (n - 1)), hi = 2 ** (n - 1) - 1; const ok = (x) => Number.isInteger(x) && x >= lo && x <= hi;
        if (!ok(A) || !ok(B)) { fill(out, h('p', { class: 'muted', text: T('demo.bits.add.range', { lo: String(lo), hi: String(hi) }) })); return; }
        const a = S.toTwos(A, n), bb = S.toTwos(B, n), r = S.addBits(a, bb, n);
        const row = (label, v) => h('div', { class: 'brow' }, h('span', { class: 'bl', text: label }), bitCells(v, n));
        const carries = h('div', { class: 'brow' }, h('span', { class: 'bl', text: T('demo.bits.add.carry') }), h('div', { class: 'bitrow' }, Array.from({ length: n }, (_, k) => { const i = n - 1 - k; return h('span', { class: 'bit carry' + (r.carries[i] ? ' one' : '') }, h('small', { text: i }), h('b', { text: r.carries[i] })); })));
        fill(out, row(String(A), a), row(String(B), bb), carries, row(T('demo.bits.add.sum'), r.sum),
          h('div', { class: 'dline' + (r.overflow ? ' bad' : ''), html: md(T('demo.bits.add.result', { n: String(n), signed: String(r.signed), sum: String(r.trueSigned) }) + ' ' + NB + ' ' + T(r.overflow ? 'demo.bits.add.overflow' : 'demo.bits.add.noOverflow')) }));
      }
      draw();
      return [h('div', { class: 'row' }, field(T('demo.bits.add.firstLabel'), ia), field(T('demo.bits.add.secondLabel'), ib), btn(T('demo.bits.add.try1'), () => { n = 8; A = 100; B = 50; ia.value = A; ib.value = B; draw(); }), btn(T('demo.bits.add.try2'), () => { n = 8; A = 5; B = -3; ia.value = A; ib.value = B; draw(); })), out];
    }
    function ieee() {
      let w = S.ieee32(b.value == null ? 0.15625 : b.value).word; const out = h('div');
      const dec = h('input', { type: 'text', value: String(S.ieeeFromBits(w).value), 'aria-label': T('demo.bits.decimalValue'), style: 'width:9rem', onchange: (e) => { const v = parseFloat(e.target.value); if (!Number.isNaN(v)) { w = S.ieee32(v).word; draw(true); } } });
      function draw(keep) {
        const f = S.ieeeFromBits(w); if (!keep) dec.value = String(f.value);
        const region = (i) => (i === 31 ? 'sign' : i >= 23 ? 'exp' : 'frac');
        const word = h('div', { class: 'ieee' }, h('div', { class: 'ieee-lab' }, h('span', { class: 'sign', text: T('demo.bits.ieee.sign') }), h('span', { class: 'exp', text: T('demo.bits.ieee.exp') }), h('span', { class: 'frac', text: T('demo.bits.ieee.frac') })),
          h('div', { class: 'bitrow tight' }, Array.from({ length: 32 }, (_, k) => { const i = 31 - k; const v = (w >>> i) & 1; return h('button', { class: 'bit sm ' + region(i) + (v ? ' one' : ''), type: 'button', 'aria-label': T('demo.bits.bitAria', { i: String(i), v: String(v) }), onclick: () => { w = (w ^ (1 << i)) >>> 0; draw(); } }, h('b', { text: v })); })));
        const mant = f.cls === 'normal' ? 1 + f.frac / 2 ** 23 : f.frac / 2 ** 23;
        const formula = f.cls === 'normal' ? `(−1)<sup>${f.sign}</sup> × ${num(mant, 8)} × 2<sup>${f.exp} − 127 = ${f.unbiased}</sup>` : f.cls === 'denormal' ? `(−1)<sup>${f.sign}</sup> × ${num(mant, 8)} × 2<sup>−126</sup> (${esc(T('demo.bits.cls.denormal'))})` : esc(T('demo.bits.cls.' + f.cls));
        fill(out, word, h('div', { class: 'dline', html: md(T('demo.bits.ieee.fields', { hex: hexs(w, 8), sign: String(f.sign), exp: String(f.exp), unb: String(f.unbiased), frac: hexs(f.frac, 6) })) }), h('div', { class: 'dline', html: `${esc(T('demo.bits.valueLabel'))} ${formula} = <b>${esc(String(f.value))}</b>` }),
          h('div', { class: 'dline muted', text: f.cls === 'normal' ? T('demo.bits.ieee.implied') : T('demo.bits.ieee.special', { kind: T('demo.bits.cls.' + f.cls) }) }));
      }
      draw();
      const ex = (v) => btn(String(v), () => { w = S.ieee32(v).word; draw(); });
      return [h('div', { class: 'row' }, field(T('demo.bits.decimal'), dec), btn(T('demo.bits.ieee.convert'), () => { const v = parseFloat(dec.value); if (!Number.isNaN(v)) { w = S.ieee32(v).word; draw(true); } }), T('demo.bits.ieee.try'), ex(1), ex(-0.75), ex(0.15625), ex(0.1), ex(100)), out];
    }
    function endian() {
      let v = b.value == null ? 0x01020304 : b.value; const out = h('div'); const inp = h('input', { type: 'text', value: hexs(v, 8), 'aria-label': T('demo.bits.endian.hexWord'), style: 'width:9rem', onchange: (e) => { const x = parseInt(e.target.value.replace(/^0x/i, ''), 16); if (!Number.isNaN(x)) { v = x >>> 0; draw(); } } });
      function draw() {
        const e = S.endianBytes(v); const cell = (arr) => h('div', { class: 'bytes' }, arr.map((x, i) => h('div', { class: 'byte' }, h('small', { text: T('demo.bits.endian.addr', { i: String(i) }) }), h('b', { text: hexs(x, 2) }))));
        fill(out, h('div', { class: 'two' }, h('div', {}, h('h4', { text: T('demo.bits.endian.big') }), cell(e.big)), h('div', {}, h('h4', { text: T('demo.bits.endian.little') }), cell(e.little))),
          h('p', { class: 'muted', text: T('demo.bits.endian.note', { hex: hexs(v, 8) }) }));
      }
      draw(); return [h('div', { class: 'row' }, field(T('demo.bits.endian.field'), inp), btn(T('demo.common.show'), () => inp.dispatchEvent(new Event('change')))), out];
    }
    function mul() {
      let n = 4, A = b.a == null ? 6 : b.a, B = b.b == null ? 5 : b.b; const out = h('div');
      const ia = h('input', { type: 'number', min: 0, max: 15, value: A, 'aria-label': T('demo.bits.mul.multiplicand'), style: 'width:5rem', oninput: (e) => { A = clampN(+e.target.value); draw(); } });
      const ib = h('input', { type: 'number', min: 0, max: 15, value: B, 'aria-label': T('demo.bits.mul.multiplier'), style: 'width:5rem', oninput: (e) => { B = clampN(+e.target.value); draw(); } });
      const clampN = (x) => Math.max(0, Math.min(15, Math.floor(x || 0)));
      function draw() {
        const r = S.mulShiftAdd(A, B, n);
        fill(out, h('table', { class: 'dtable' }, h('thead', {}, h('tr', {}, [T('demo.common.step'), T('demo.bits.mul.bit'), T('demo.bits.mul.add'), T('demo.bits.mul.running')].map((t) => h('th', { text: t })))),
          h('tbody', {}, r.steps.map((s) => h('tr', {}, h('td', { text: s.i }), h('td', { text: s.bit }), h('td', { html: s.bit ? `${A} × 2<sup>${s.i}</sup> = <b>${s.add}</b>` : `<span class="muted">${esc(T('demo.bits.mul.zero'))}</span>` }), h('td', { html: `<b>${s.product}</b>` }))))),
          h('div', { class: 'dline', html: `${A} × ${B} = <b>${r.product}</b> &nbsp; (${bins(A, 4)} × ${bins(B, 4)} = ${bins(r.product, 8)})` }));
      }
      draw(); return [h('div', { class: 'row' }, field(T('demo.bits.mul.field1'), ia), field(T('demo.bits.mul.field2'), ib)), out];
    }
    function div() {
      let A = b.a == null ? 13 : b.a, B = b.b == null ? 3 : b.b; const out = h('div');
      const ia = h('input', { type: 'number', min: 0, max: 15, value: A, 'aria-label': T('demo.bits.div.dividend'), style: 'width:5rem', oninput: (e) => { A = Math.max(0, Math.min(15, Math.floor(+e.target.value || 0))); draw(); } });
      const ib = h('input', { type: 'number', min: 1, max: 15, value: B, 'aria-label': T('demo.bits.div.divisor'), style: 'width:5rem', oninput: (e) => { B = Math.max(1, Math.min(15, Math.floor(+e.target.value || 1))); draw(); } });
      function draw() {
        const r = S.divRestoring(A, B, 4);
        fill(out, h('table', { class: 'dtable' }, h('thead', {}, h('tr', {}, [T('demo.bits.div.bit'), T('demo.bits.div.remainder'), T('demo.bits.div.quotientBit')].map((t) => h('th', { text: t })))), h('tbody', {}, r.steps.map((s) => h('tr', {}, h('td', { text: s.i }), h('td', { text: s.remainder }), h('td', { text: s.quotientBit }))))),
          h('div', { class: 'dline', html: md(T('demo.bits.div.line', { a: String(A), b: String(B), q: String(r.quotient), r: String(r.remainder), abin: bins(A, 4), bbin: bins(B, 4) })) }));
      }
      draw(); return [h('div', { class: 'row' }, field(T('demo.bits.div.field1'), ia), field(T('demo.bits.div.field2'), ib)), out];
    }
    const make = { twos, add, ieee, endian, mul, div };
    function show(m) { mode = m; [...tabs.children].forEach((t, i) => t.setAttribute('aria-pressed', String(modes[i] === m))); fill(body, ...make[m]()); }
    if (modes.length > 1) modes.forEach((m) => tabs.append(h('button', { class: 'tb', type: 'button', 'aria-pressed': String(m === modes[0]), onclick: () => show(m) }, NAMES[m])));
    show(modes[0]);
    return { el: panel(b.title, modes.length > 1 ? tabs : null, body), n: 0 };
  }

  /* ---------- encoder ---------- */
  function encoderDemo(b) {
    const presets = b.presets || ['add $s0, $s1, $s2', 'lw $t0, 32($s3)', 'sw $t0, 32($s3)', 'addi $t0, $s1, -5', 'sll $t0, $t1, 4', 'beq $t0, $t1, 3', 'j 0x00400020'];
    const out = h('div'); const inp = h('input', { type: 'text', value: b.initial || presets[0], 'aria-label': T('demo.encoder.asmAria'), style: 'width:min(22rem,100%)', onkeydown: (e) => { if (e.key === 'Enter') doEnc(); } });
    const hexIn = h('input', { type: 'text', value: '0x02328020', 'aria-label': T('demo.encoder.hexAria'), style: 'width:11rem', onkeydown: (e) => { if (e.key === 'Enter') doDec(); } });
    const sel = h('select', { 'aria-label': T('demo.encoder.examples'), onchange: (e) => { if (e.target.value) { inp.value = e.target.value; doEnc(); } } }, h('option', { value: '', text: T('demo.encoder.examplesOption') }), presets.map((p) => h('option', { value: p, text: p })));
    const LAYOUT = { R: [['op', 6], ['rs', 5], ['rt', 5], ['rd', 5], ['shamt', 5], ['funct', 6]], I: [['op', 6], ['rs', 5], ['rt', 5], ['immediate', 16]], J: [['op', 6], ['target', 26]] };
    function showFields(fmt, f, word, asm, extra) {
      const vals = { op: f.op, rs: f.rs, rt: f.rt, rd: f.rd, shamt: f.shamt, funct: f.funct, immediate: f.imm, target: f.target };
      const cells = LAYOUT[fmt].map(([name, w]) => h('div', { class: 'efield ' + name, style: `flex:${w} 1 0` }, h('small', { text: `${name} (${w})` }), h('b', { text: String(vals[name]) }), h('code', { text: bins(vals[name], w) })));
      fill(out, h('div', { class: 'dline', html: `<b>${esc(asm)}</b> &nbsp; → &nbsp; <span class="chip">${esc(T('demo.encoder.typeChip', { fmt }))}</span>` }), h('div', { class: 'efields' }, cells),
        h('div', { class: 'dline' }, T('demo.encoder.binary') + ' ', h('code', { text: LAYOUT[fmt].map(([n2, w]) => bins(vals[n2], w)).join(' ') })), h('div', { class: 'dline' }, T('demo.encoder.hex') + ' ', h('b', { text: hexs(word, 8) })), extra ? h('p', { class: 'muted', html: md(extra) }) : null);
    }
    function doEnc() {
      const p = S.assemble(inp.value); if (p.errors.length) { fill(out, h('div', { class: 'feedback bad' }, h('strong', { text: T('demo.encoder.cannotEncode') + ' ' }), trErr(p.errors[0]))); return; }
      if (p.instrs.length !== 1) { fill(out, h('div', { class: 'feedback bad', text: T('demo.encoder.oneInstruction') })); return; }
      const ins = p.instrs[0]; try { const w = S.encode(ins) >>> 0; const d = S.decode(w); const note = d.name in { beq: 1, bne: 1 } ? T('demo.encoder.noteBranch', { off: String(d.fields.imm << 16 >> 16) }) : d.format === 'J' ? T('demo.encoder.noteJump') : d.format === 'I' && /^(lw|sw)/.test(d.name) ? T('demo.encoder.noteMem') : d.format === 'R' ? T('demo.encoder.noteR') : '';
        showFields(d.format, d.fields, w, inp.value.trim(), note); hexIn.value = hexs(w, 8); } catch (e) { fill(out, h('div', { class: 'feedback bad', text: trErr(e) })); }
    }
    function doDec() {
      let t = hexIn.value.trim().replace(/[\s_]/g, ''); let w = NaN;
      if (/^0x[0-9a-f]+$/i.test(t)) w = parseInt(t.slice(2), 16); else if (/^[01]{32}$/.test(t)) w = parseInt(t, 2); else if (/^[0-9a-f]{8}$/i.test(t)) w = parseInt(t, 16);
      if (Number.isNaN(w)) { fill(out, h('div', { class: 'feedback bad', text: T('demo.encoder.badHex') })); return; }
      const d = S.decode(w >>> 0); if (d.name === '?') { fill(out, h('div', { class: 'feedback bad', text: tr('decode.' + d.code, d.args, d.asm) })); return; }
      showFields(d.format, d.fields, w >>> 0, d.asm, T('demo.encoder.noteDecoded')); inp.value = d.asm;
    }
    const mode = b.mode || 'both';
    const encRow = h('div', { class: 'row' }, field(T('demo.encoder.assembly'), inp), sel, btn(T('demo.encoder.encode'), doEnc, 'primary'));
    const decRow = h('div', { class: 'row' }, field(T('demo.encoder.machine'), hexIn), btn(T('demo.encoder.decode'), doDec, 'primary'));
    doEnc();
    return { el: panel(b.title || T('demo.encoder.title'), b.hint && h('p', { class: 'muted', html: md(b.hint) }), mode !== 'decode' ? encRow : null, mode !== 'encode' ? decRow : null, out), n: 0 };
  }

  /* ---------- mips simulator ---------- */
  function mipsDemo(b) {
    let prog, st; const editable = !!b.editable; const initialText = b.program;
    const code = h('div', { class: 'mcode', role: 'list' }); const regs = h('div', { class: 'mregs' }); const memEl = h('div', { class: 'mmem' }); const status = h('div', { class: 'dline', 'aria-live': 'polite' }); const errEl = h('div', { class: 'feedback bad is-hidden' });
    const ta = editable ? h('textarea', { class: 'answer-box mono', rows: Math.max(4, initialText.split('\n').length + 1), spellcheck: 'false', 'aria-label': T('demo.mips.programAria') }) : null; if (ta) ta.value = initialText;
    let watch = b.watch ? b.watch.map(S.regNum) : null; let lastChanged = {}; let lastAddr = null;
    function load() {
      prog = S.assemble(ta ? ta.value : initialText); if (prog.errors.length) { errEl.classList.remove('is-hidden'); fill(errEl, h('strong', { text: T('demo.mips.line', { line: String(prog.errors[0].line) }) }), trErr(prog.errors[0])); } else errEl.classList.add('is-hidden');
      st = S.newState(prog.errors.length ? S.assemble('nop') : prog, { registers: b.registers, memory: b.memory, endian: b.endian, sp: b.sp }); lastChanged = {}; lastAddr = null;
      if (prog.errors.length) st.halted = true; status.textContent = prog.errors.length ? T('demo.mips.fix') : T('demo.mips.ready'); draw();
    }
    function draw() {
      const instrs = prog.errors.length ? [] : prog.instrs; const cur = st.halted ? -1 : (st.pc - prog.base) / 4;
      fill(code, ...instrs.map((x, i) => h('div', { class: 'mline' + (i === cur ? ' cur' : '') + (st.last && st.last.index === i ? ' done' : ''), role: 'listitem' }, h('span', { class: 'ma', text: hexs(x.addr, 8) }), h('code', { text: x.src === '(part of li)' ? '(part of li)' : x.src }))));
      const show = watch || (() => { const set = new Set(); instrs.forEach((x) => { [x.rd, x.rs, x.rt].forEach((r) => { if (r > 0) set.add(r); }); if (x.op === 'jal' || x.op === 'jr') set.add(31); }); if (b.registers) Object.keys(b.registers).forEach((k) => set.add(S.regNum(k))); return [...set].sort((p, q) => p - q); })();
      fill(regs, ...show.map((r) => h('div', { class: 'mreg' + (lastChanged['r' + r] ? ' chg' : '') }, h('span', { class: 'rn', text: S.REGS[r] }), h('b', { text: String(st.regs[r]) }), h('small', { text: hexs(st.regs[r], 8) }))));
      const addrs = [...new Set([...st.mem.keys()].map((a) => a - (a % 4)))].sort((p, q) => p - q);
      fill(memEl, addrs.length ? h('div', { class: 'mmhead muted', text: T('demo.mips.memory') }) : null, ...addrs.map((a) => h('div', { class: 'mmw' + (lastAddr != null && a === lastAddr - (lastAddr % 4) ? ' chg' : '') }, h('span', { class: 'ma', text: hexs(a, 8) }), h('b', { text: String(S.loadWord(st, a)) }))));
      if (st.halted && st.error) status.innerHTML = '<b>' + esc(T('demo.mips.error')) + '</b> ' + esc(tr('err.' + st.errorCode, st.errorArgs, st.error)); else if (st.halted && st.steps) status.textContent = T('demo.mips.finished', { n: st.steps, count: String(st.steps) });
    }
    function doStep() { if (st.halted) return; const r = S.step(st); lastChanged = (r && r.changed) || {}; lastAddr = r && r.changed ? r.changed.addr : null; if (r && r.desc && !st.error) status.innerHTML = `<b>${esc(r.ins ? '' : '')}${esc(st.prog.instrs[r.index] ? st.prog.instrs[r.index].src : '')}</b> &nbsp;→&nbsp; ${esc(r.descCode ? tr('desc.' + r.descCode, r.descArgs, r.desc) : r.desc)}`; draw(); }
    function doRun() { while (!st.halted && st.steps < 5000) { const r = S.step(st); lastChanged = (r && r.changed) || {}; lastAddr = r && r.changed ? r.changed.addr : null; } draw(); }
    const ctl = h('div', { class: 'row' }, btn(T('demo.common.step'), doStep, 'primary'), btn(T('demo.mips.runEnd'), doRun), btn(T('demo.common.reset'), load), editable ? btn(T('demo.mips.apply'), load) : null);
    load();
    return { el: panel(b.title || T('demo.mips.title'), b.hint && h('p', { class: 'muted', html: md(b.hint) }), ta, errEl, ctl, h('div', { class: 'mgrid' }, h('div', {}, h('div', { class: 'mmhead muted', text: T('demo.mips.programHead') }), code), h('div', {}, h('div', { class: 'mmhead muted', text: T('demo.mips.registersHead') }), regs, memEl)), status), n: 0 };
  }

  return { walkthrough, bits: bitsDemo, encoder: encoderDemo, mips: mipsDemo };
});
