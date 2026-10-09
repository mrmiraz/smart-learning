/* Pure simulation logic for the interactive demos (no DOM). Works in the browser (window.SLSIM) and in Node (tests).
   MIPS assembler/interpreter/encoder, pipeline timing, instruction scheduling, branch predictors, caches, virtual memory,
   RAID, cache coherence, race conditions and number representation. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(); else root.SLSIM = factory();
})(this, function () {
  'use strict';
  const hex = (n, d) => '0x' + (n >>> 0).toString(16).toUpperCase().padStart(d || 1, '0');
  const bin = (n, d) => (n >>> 0).toString(2).padStart(d || 1, '0').slice(-(d || 32));
  const isPow2 = (n) => n > 0 && (n & (n - 1)) === 0;
  const log2 = (n) => Math.round(Math.log2(n));

  /* ======================= MIPS ======================= */
  const REGS = ['$zero', '$at', '$v0', '$v1', '$a0', '$a1', '$a2', '$a3', '$t0', '$t1', '$t2', '$t3', '$t4', '$t5', '$t6', '$t7',
    '$s0', '$s1', '$s2', '$s3', '$s4', '$s5', '$s6', '$s7', '$t8', '$t9', '$k0', '$k1', '$gp', '$sp', '$fp', '$ra'];
  function regNum(s) {
    s = String(s).trim().toLowerCase();
    if (s === '$s8') return 30;
    const i = REGS.indexOf(s); if (i >= 0) return i;
    const m = /^\$(\d+)$/.exec(s); if (m && +m[1] < 32) return +m[1];
    return -1;
  }
  const R3 = { add: 32, addu: 33, sub: 34, subu: 35, and: 36, or: 37, xor: 38, nor: 39, slt: 42, sltu: 43 };
  const SHIFT = { sll: 0, srl: 2, sra: 3 };
  const IARITH = { addi: 8, addiu: 9, slti: 10, sltiu: 11, andi: 12, ori: 13, xori: 14 };
  const MEMOP = { lw: 35, sw: 43, lb: 32, lbu: 36, sb: 40, lh: 33, lhu: 37, sh: 41 };
  const BR = { beq: 4, bne: 5 };
  const JMP = { j: 2, jal: 3 };
  const BASE = 0x00400000;

  function stripComment(line) { const i = line.search(/[#;]/); return (i >= 0 ? line.slice(0, i) : line).trim(); }
  function splitOps(s) { return s.split(',').map((x) => x.trim()).filter((x) => x.length); }
  function parseImm(s) {
    s = String(s).trim(); let m;
    if ((m = /^(-)?0x([0-9a-f]+)$/i.exec(s))) return (m[1] ? -1 : 1) * parseInt(m[2], 16);
    if (/^-?\d+$/.test(s)) return parseInt(s, 10);
    return NaN;
  }
  // Parses one instruction (no labels resolved). Returns {op, rd, rs, rt, imm, shamt, label} or throws Error with a readable message.
  function parseInstr(text) {
    const t = stripComment(text).replace(/^[A-Za-z_][\w]*:\s*/, '');
    const sp = t.search(/\s/);
    const op = (sp < 0 ? t : t.slice(0, sp)).toLowerCase(); const rest = sp < 0 ? '' : t.slice(sp + 1);
    const o = splitOps(rest);
    const reg = (x) => { const n = regNum(x); if (n < 0) throw new Error(`Unknown register "${x}"`); return n; };
    const need = (k) => { if (o.length !== k) throw new Error(`${op} needs ${k} operand${k === 1 ? '' : 's'}`); };
    const ins = { op, rd: 0, rs: 0, rt: 0, imm: 0, shamt: 0, label: null, text: t };
    if (op in R3) { need(3); ins.rd = reg(o[0]); ins.rs = reg(o[1]); ins.rt = reg(o[2]); ins.fmt = 'R'; }
    else if (op in SHIFT) { need(3); ins.rd = reg(o[0]); ins.rt = reg(o[1]); ins.shamt = parseImm(o[2]); if (!(ins.shamt >= 0 && ins.shamt < 32)) throw new Error('shift amount must be 0 to 31'); ins.fmt = 'R'; }
    else if (op === 'jr') { need(1); ins.rs = reg(o[0]); ins.fmt = 'R'; }
    else if (op in IARITH) { need(3); ins.rt = reg(o[0]); ins.rs = reg(o[1]); ins.imm = parseImm(o[2]); if (isNaN(ins.imm)) throw new Error(`Bad immediate "${o[2]}"`); ins.fmt = 'I'; }
    else if (op === 'lui') { need(2); ins.rt = reg(o[0]); ins.imm = parseImm(o[1]); if (isNaN(ins.imm)) throw new Error(`Bad immediate "${o[1]}"`); ins.fmt = 'I'; }
    else if (op in MEMOP) {
      need(2); ins.rt = reg(o[0]); const m = /^(-?(?:0x[0-9a-f]+|\d+))?\s*\(\s*(\$\w+)\s*\)$/i.exec(o[1]);
      if (!m) throw new Error(`${op} needs an address like 8($s1)`); ins.imm = m[1] ? parseImm(m[1]) : 0; ins.rs = reg(m[2]); ins.fmt = 'I';
    }
    else if (op in BR) { need(3); ins.rs = reg(o[0]); ins.rt = reg(o[1]); const v = parseImm(o[2]); if (isNaN(v)) ins.label = o[2]; else ins.imm = v; ins.fmt = 'I'; }
    else if (op in JMP) { need(1); const v = parseImm(o[0]); if (isNaN(v)) ins.label = o[0]; else ins.target = v; ins.fmt = 'J'; }
    else if (op === 'li') { need(2); ins.rt = reg(o[0]); ins.imm = parseImm(o[1]); if (isNaN(ins.imm)) throw new Error(`Bad immediate "${o[1]}"`); ins.pseudo = true; }
    else if (op === 'move') { need(2); ins.rd = reg(o[0]); ins.rs = reg(o[1]); ins.pseudo = true; }
    else if (op === 'nop') { ins.pseudo = true; }
    else if (op === '') { return null; }
    else throw new Error(`Unknown instruction "${op}"`);
    return ins;
  }
  function expandPseudo(ins) {
    if (!ins.pseudo) return [ins];
    const mk = (o) => Object.assign({ rd: 0, rs: 0, rt: 0, imm: 0, shamt: 0, label: null, fmt: 'I', text: ins.text }, o);
    if (ins.op === 'li') {
      const v = ins.imm;
      if (v >= -32768 && v <= 32767) return [mk({ op: 'addi', rt: ins.rt, rs: 0, imm: v })];
      if (v >= 0 && v <= 65535) return [mk({ op: 'ori', rt: ins.rt, rs: 0, imm: v })];
      return [mk({ op: 'lui', rt: 1, imm: (v >>> 16) & 0xffff }), mk({ op: 'ori', rt: ins.rt, rs: 1, imm: v & 0xffff, text: '(part of li)' })];
    }
    if (ins.op === 'move') return [mk({ op: 'addu', rd: ins.rd, rs: 0, rt: ins.rs, fmt: 'R' })];
    return [mk({ op: 'sll', rd: 0, rt: 0, shamt: 0, fmt: 'R' })]; // nop
  }
  // Assemble a multi-line program. Returns { instrs, labels, errors:[{line,message}] }.
  function assemble(text, base) {
    base = base == null ? BASE : base;
    const lines = String(text).split('\n'); const instrs = []; const labels = {}; const errors = [];
    lines.forEach((raw, li) => {
      let t = stripComment(raw); if (!t) return;
      let m; while ((m = /^([A-Za-z_][\w]*):\s*/.exec(t))) { labels[m[1]] = base + instrs.length * 4; t = t.slice(m[0].length); }
      if (!t) return;
      try { const p = parseInstr(t); if (!p) return; expandPseudo(p).forEach((x) => { x.line = li + 1; x.src = t; instrs.push(x); }); }
      catch (e) { errors.push({ line: li + 1, message: e.message }); }
    });
    instrs.forEach((x, i) => { x.addr = base + i * 4; });
    instrs.forEach((x) => {
      if (x.label != null) {
        if (!(x.label in labels)) { errors.push({ line: x.line, message: `Unknown label "${x.label}"` }); return; }
        if (x.fmt === 'J') x.target = labels[x.label]; else x.imm = (labels[x.label] - (x.addr + 4)) / 4;
      }
    });
    return { instrs, labels, errors, base };
  }

  // ----- encoding / decoding -----
  function encode(ins) {
    const op = ins.op; const u = (n, w) => n & ((1 << w) - 1);
    if (op in R3) return ((0 << 26) | (ins.rs << 21) | (ins.rt << 16) | (ins.rd << 11) | (0 << 6) | R3[op]) >>> 0;
    if (op in SHIFT) return ((ins.rt << 16) | (ins.rd << 11) | (ins.shamt << 6) | SHIFT[op]) >>> 0;
    if (op === 'jr') return ((ins.rs << 21) | 8) >>> 0;
    let opc = IARITH[op] != null ? IARITH[op] : MEMOP[op] != null ? MEMOP[op] : BR[op] != null ? BR[op] : op === 'lui' ? 15 : null;
    if (opc != null) return ((opc << 26) | (ins.rs << 21) | (ins.rt << 16) | u(ins.imm, 16)) >>> 0;
    if (op in JMP) return ((JMP[op] << 26) | ((ins.target >>> 2) & 0x3ffffff)) >>> 0;
    throw new Error(`Cannot encode ${op}`);
  }
  const OPNAME = {}; Object.keys(IARITH).forEach((k) => { OPNAME[IARITH[k]] = k; }); Object.keys(MEMOP).forEach((k) => { OPNAME[MEMOP[k]] = k; });
  Object.keys(BR).forEach((k) => { OPNAME[BR[k]] = k; }); OPNAME[15] = 'lui'; OPNAME[2] = 'j'; OPNAME[3] = 'jal';
  const FNAME = {}; Object.keys(R3).forEach((k) => { FNAME[R3[k]] = k; }); Object.keys(SHIFT).forEach((k) => { FNAME[SHIFT[k]] = k; }); FNAME[8] = 'jr';
  function decode(word) {
    word = word >>> 0; const op = word >>> 26, rs = (word >>> 21) & 31, rt = (word >>> 16) & 31, rd = (word >>> 11) & 31, shamt = (word >>> 6) & 31, funct = word & 63;
    const imm16 = word & 0xffff, simm = (imm16 << 16) >> 16, target = word & 0x3ffffff;
    const f = { op, rs, rt, rd, shamt, funct, imm: imm16, target };
    if (op === 0) {
      const name = FNAME[funct]; if (!name) return { format: 'R', name: '?', fields: f, asm: 'unknown (R-type, funct ' + funct + ')', word };
      let asm; if (name in SHIFT) asm = `${name} ${REGS[rd]}, ${REGS[rt]}, ${shamt}`; else if (name === 'jr') asm = `jr ${REGS[rs]}`; else asm = `${name} ${REGS[rd]}, ${REGS[rs]}, ${REGS[rt]}`;
      return { format: 'R', name, fields: f, asm, word };
    }
    if (op === 2 || op === 3) return { format: 'J', name: OPNAME[op], fields: f, asm: `${OPNAME[op]} ${hex(target << 2, 8)}`, word };
    const name = OPNAME[op]; if (!name) return { format: 'I', name: '?', fields: f, asm: 'unknown (opcode ' + op + ')', word };
    let asm; if (name in MEMOP) asm = `${name} ${REGS[rt]}, ${simm}(${REGS[rs]})`; else if (name in BR) asm = `${name} ${REGS[rs]}, ${REGS[rt]}, ${simm}`; else if (name === 'lui') asm = `lui ${REGS[rt]}, ${imm16}`;
    else asm = `${name} ${REGS[rt]}, ${REGS[rs]}, ${['andi', 'ori', 'xori'].includes(name) ? imm16 : simm}`;
    return { format: 'I', name, fields: f, asm, word };
  }

  // ----- interpreter -----
  function newState(prog, opt) {
    opt = opt || {};
    const st = { regs: new Int32Array(32), pc: prog.base, mem: new Map(), endian: opt.endian || 'big', prog, steps: 0, halted: false, error: null, last: null };
    st.regs[29] = opt.sp != null ? opt.sp | 0 : 0x7fff0000 | 0;
    Object.keys(opt.registers || {}).forEach((k) => { const n = regNum(k); if (n > 0) st.regs[n] = opt.registers[k] | 0; });
    Object.keys(opt.memory || {}).forEach((k) => { storeWord(st, parseImm(k) >>> 0, opt.memory[k] | 0); });
    return st;
  }
  function loadByte(st, a) { return st.mem.get(a >>> 0) || 0; }
  function storeByte(st, a, v) { st.mem.set(a >>> 0, v & 255); }
  function loadWord(st, a) {
    const b = [0, 1, 2, 3].map((i) => loadByte(st, a + i));
    return (st.endian === 'big' ? (b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3] : (b[3] << 24) | (b[2] << 16) | (b[1] << 8) | b[0]) | 0;
  }
  function storeWord(st, a, v) {
    const b = [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255]; const o = st.endian === 'big' ? b : b.reverse();
    o.forEach((x, i) => storeByte(st, a + i, x));
  }
  function step(st) {
    if (st.halted) return null;
    const idx = (st.pc - st.prog.base) / 4;
    if (!Number.isInteger(idx) || idx < 0 || idx >= st.prog.instrs.length) { st.halted = true; return { desc: 'Program finished', changed: {} }; }
    const ins = st.prog.instrs[idx]; const r = st.regs; const changed = {}; let desc = ''; let next = st.pc + 4;
    const setR = (n, v) => { if (n === 0) return; if ((r[n] | 0) !== (v | 0)) changed['r' + n] = [r[n], v | 0]; r[n] = v | 0; };
    const fail = (m) => { st.error = m; st.halted = true; desc = 'Error: ' + m; };
    const op = ins.op, A = r[ins.rs], B = r[ins.rt], sx = ins.imm << 16 >> 16;
    const show = (n) => REGS[n];
    switch (op) {
      case 'add': case 'sub': {
        const v = op === 'add' ? A + B : A - B;
        if (v > 2147483647 || v < -2147483648) { fail('arithmetic overflow'); break; }
        setR(ins.rd, v); desc = `${show(ins.rd)} = ${A} ${op === 'add' ? '+' : '-'} ${B} = ${v}`; break;
      }
      case 'addu': setR(ins.rd, A + B); desc = `${show(ins.rd)} = ${A} + ${B} = ${r[ins.rd]}`; break;
      case 'subu': setR(ins.rd, A - B); desc = `${show(ins.rd)} = ${A} - ${B} = ${r[ins.rd]}`; break;
      case 'and': setR(ins.rd, A & B); desc = `${show(ins.rd)} = ${A} AND ${B} = ${A & B}`; break;
      case 'or': setR(ins.rd, A | B); desc = `${show(ins.rd)} = ${A} OR ${B} = ${A | B}`; break;
      case 'xor': setR(ins.rd, A ^ B); desc = `${show(ins.rd)} = ${A} XOR ${B} = ${A ^ B}`; break;
      case 'nor': setR(ins.rd, ~(A | B)); desc = `${show(ins.rd)} = NOT(${A} OR ${B}) = ${~(A | B)}`; break;
      case 'slt': setR(ins.rd, A < B ? 1 : 0); desc = `${show(ins.rd)} = (${A} < ${B}) ? 1 : 0 = ${A < B ? 1 : 0}`; break;
      case 'sltu': setR(ins.rd, (A >>> 0) < (B >>> 0) ? 1 : 0); desc = `${show(ins.rd)} = (${A >>> 0} < ${B >>> 0} unsigned) ? 1 : 0`; break;
      case 'sll': setR(ins.rd, B << ins.shamt); desc = `${show(ins.rd)} = ${B} << ${ins.shamt} = ${B << ins.shamt}`; break;
      case 'srl': setR(ins.rd, B >>> ins.shamt); desc = `${show(ins.rd)} = ${B} >>> ${ins.shamt} = ${B >>> ins.shamt | 0}`; break;
      case 'sra': setR(ins.rd, B >> ins.shamt); desc = `${show(ins.rd)} = ${B} >> ${ins.shamt} = ${B >> ins.shamt}`; break;
      case 'addi': { const v = A + sx; if (v > 2147483647 || v < -2147483648) { fail('arithmetic overflow'); break; } setR(ins.rt, v); desc = `${show(ins.rt)} = ${A} + ${sx} = ${v}`; break; }
      case 'addiu': setR(ins.rt, A + sx); desc = `${show(ins.rt)} = ${A} + ${sx} = ${r[ins.rt]}`; break;
      case 'slti': setR(ins.rt, A < sx ? 1 : 0); desc = `${show(ins.rt)} = (${A} < ${sx}) ? 1 : 0`; break;
      case 'sltiu': setR(ins.rt, (A >>> 0) < (sx >>> 0) ? 1 : 0); desc = `${show(ins.rt)} = (${A >>> 0} < ${sx >>> 0} unsigned) ? 1 : 0`; break;
      case 'andi': setR(ins.rt, A & (ins.imm & 0xffff)); desc = `${show(ins.rt)} = ${A} AND ${ins.imm & 0xffff}`; break;
      case 'ori': setR(ins.rt, A | (ins.imm & 0xffff)); desc = `${show(ins.rt)} = ${A} OR ${ins.imm & 0xffff}`; break;
      case 'xori': setR(ins.rt, A ^ (ins.imm & 0xffff)); desc = `${show(ins.rt)} = ${A} XOR ${ins.imm & 0xffff}`; break;
      case 'lui': setR(ins.rt, (ins.imm & 0xffff) << 16); desc = `${show(ins.rt)} = ${ins.imm & 0xffff} << 16`; break;
      case 'lw': case 'sw': case 'lb': case 'lbu': case 'sb': case 'lh': case 'lhu': case 'sh': {
        const a = (A + sx) >>> 0; const size = (op === 'lw' || op === 'sw') ? 4 : (op === 'lh' || op === 'lhu' || op === 'sh') ? 2 : 1;
        if (a % size !== 0) { fail(`unaligned ${op} at address ${hex(a, 8)}`); break; }
        changed.addr = a;
        if (op === 'lw') { setR(ins.rt, loadWord(st, a)); desc = `${show(ins.rt)} = Memory[${hex(a, 8)}] = ${r[ins.rt]}`; }
        else if (op === 'sw') { storeWord(st, a, B); changed.mem = [a, B | 0]; desc = `Memory[${hex(a, 8)}] = ${B}`; }
        else if (op === 'lb') { setR(ins.rt, (loadByte(st, a) << 24) >> 24); desc = `${show(ins.rt)} = byte at ${hex(a, 8)}`; }
        else if (op === 'lbu') { setR(ins.rt, loadByte(st, a)); desc = `${show(ins.rt)} = byte at ${hex(a, 8)}`; }
        else if (op === 'sb') { storeByte(st, a, B); changed.mem = [a, B & 255]; desc = `Memory[${hex(a, 8)}] = ${B & 255} (one byte)`; }
        else { const h2 = st.endian === 'big' ? (loadByte(st, a) << 8) | loadByte(st, a + 1) : (loadByte(st, a + 1) << 8) | loadByte(st, a);
          if (op === 'lh') { setR(ins.rt, (h2 << 16) >> 16); desc = `${show(ins.rt)} = halfword at ${hex(a, 8)}`; } else if (op === 'lhu') { setR(ins.rt, h2); desc = `${show(ins.rt)} = halfword at ${hex(a, 8)}`; }
          else { const v = B & 0xffff; if (st.endian === 'big') { storeByte(st, a, v >>> 8); storeByte(st, a + 1, v); } else { storeByte(st, a, v); storeByte(st, a + 1, v >>> 8); } changed.mem = [a, v]; desc = `Memory[${hex(a, 8)}] = ${v} (halfword)`; } }
        break;
      }
      case 'beq': case 'bne': {
        const taken = op === 'beq' ? A === B : A !== B; desc = `${A} ${op === 'beq' ? '==' : '!='} ${B}? ${taken ? 'yes, branch taken' : 'no, fall through'}`;
        if (taken) { next = st.pc + 4 + ins.imm * 4; changed.taken = true; } break;
      }
      case 'j': next = ins.target; desc = `jump to ${hex(next, 8)}`; break;
      case 'jal': setR(31, st.pc + 4); next = ins.target; desc = `$ra = ${hex(st.pc + 4, 8)}; jump to ${hex(next, 8)}`; break;
      case 'jr': next = A >>> 0; desc = `jump to ${hex(next, 8)}`; break;
      default: fail('cannot execute ' + op);
    }
    st.steps++; st.last = { pcBefore: st.pc, index: idx, desc, changed, ins };
    if (!st.error) st.pc = next >>> 0;
    return st.last;
  }
  function run(st, limit) { limit = limit || 10000; let n = 0; while (!st.halted && n < limit) { step(st); n++; } if (!st.halted) { st.error = 'stopped after ' + limit + ' steps (possible infinite loop)'; st.halted = true; } return st; }

  /* ======================= pipeline ======================= */
  function depsOf(text) {
    const p = parseInstr(text); const op = p.op; const d = { op, dest: null, srcs: [], load: false, store: false, branch: false, jump: false, jr: false };
    const w = (n) => (n > 0 ? n : null);
    if (op in R3) { d.dest = w(p.rd); d.srcs = [{ reg: p.rs, need: 'EX' }, { reg: p.rt, need: 'EX' }]; }
    else if (op in SHIFT) { d.dest = w(p.rd); d.srcs = [{ reg: p.rt, need: 'EX' }]; }
    else if (op in IARITH) { d.dest = w(p.rt); d.srcs = [{ reg: p.rs, need: 'EX' }]; }
    else if (op === 'lui') { d.dest = w(p.rt); }
    else if (op === 'lw' || op === 'lb' || op === 'lbu' || op === 'lh' || op === 'lhu') { d.dest = w(p.rt); d.srcs = [{ reg: p.rs, need: 'EX' }]; d.load = true; }
    else if (op in MEMOP) { d.srcs = [{ reg: p.rs, need: 'EX' }, { reg: p.rt, need: 'MEM' }]; d.store = true; }
    else if (op in BR) { d.branch = true; d.srcs = [{ reg: p.rs, need: 'BR' }, { reg: p.rt, need: 'BR' }]; }
    else if (op === 'j') { d.jump = true; }
    else if (op === 'jal') { d.jump = true; d.dest = 31; }
    else if (op === 'jr') { d.jump = true; d.jr = true; d.srcs = [{ reg: p.rs, need: 'BR' }]; }
    d.srcs = d.srcs.filter((s) => s.reg > 0);
    return d;
  }
  function pipeline(items, o) {
    o = Object.assign({ forwarding: true, branchStage: 'ID', predict: 'not-taken', unifiedMemory: false }, o || {});
    const ins = items.map((it) => { const x = typeof it === 'string' ? { t: it } : Object.assign({}, it); x.d = depsOf(x.t); return x; });
    const n = ins.length; const IF = [], ID = [], EX = [], MEM = [], WB = []; const notes = ins.map(() => ({ data: 0, struct: 0, control: 0, fwd: false })); const hazards = [];
    let ctrlMin = 0;
    for (let i = 0; i < n; i++) {
      const d = ins[i].d; const bs = d.jump ? 'ID' : o.branchStage;
      IF[i] = Math.max(i === 0 ? 1 : ID[i - 1], ctrlMin);
      if (ctrlMin > (i === 0 ? 1 : ID[i - 1])) notes[i].control = ctrlMin - (i === 0 ? 1 : ID[i - 1]);
      ID[i] = Math.max(IF[i] + 1, i === 0 ? 0 : EX[i - 1]);
      if (o.unifiedMemory) { let moved = true; while (moved) { moved = false; for (let k = 0; k < i; k++) if ((ins[k].d.load || ins[k].d.store) && MEM[k] === ID[i] - 1) { ID[i]++; notes[i].struct++; moved = true; } } }
      let ready = ID[i] + 1, readyMem = 0;
      const producers = [];
      d.srcs.forEach((s) => {
        let p = -1; for (let k = i - 1; k >= 0; k--) if (ins[k].d.dest === s.reg) { p = k; break; }
        if (p < 0) return;
        producers.push({ p, reg: s.reg, need: s.need });
        const pLoad = ins[p].d.load;
        if (!o.forwarding) { ready = Math.max(ready, WB[p] + 1); return; }
        const avail = pLoad ? MEM[p] + 1 : EX[p] + 1;
        const need = s.need === 'BR' ? bs : s.need;
        if (need === 'ID') ready = Math.max(ready, avail + 1);
        else if (need === 'EX') ready = Math.max(ready, avail);
        else readyMem = Math.max(readyMem, avail);
      });
      EX[i] = Math.max(ID[i] + 1, i === 0 ? 0 : MEM[i - 1], ready);
      notes[i].data = EX[i] - (ID[i] + 1) - Math.max(0, (i === 0 ? 0 : MEM[i - 1]) - (ID[i] + 1));
      if (notes[i].data < 0) notes[i].data = 0;
      MEM[i] = Math.max(EX[i] + 1, i === 0 ? 0 : WB[i - 1], readyMem);
      if (MEM[i] > EX[i] + 1 && readyMem > EX[i] + 1) notes[i].data += MEM[i] - (EX[i] + 1);
      WB[i] = MEM[i] + 1;
      producers.forEach((pr) => {
        const stage = pr.need === 'BR' ? bs : pr.need; const used = stage === 'MEM' ? MEM[i] : stage === 'EX' ? EX[i] : EX[i] - 1;
        const viaRegfile = used >= WB[pr.p];
        if (i - pr.p <= 3) hazards.push({ from: pr.p, to: i, reg: pr.reg, kind: 'RAW', how: viaRegfile && !(o.forwarding && used < WB[pr.p]) ? (i - pr.p === 3 || used >= WB[pr.p] && EX[i] - (ID[i] + 1) === 0 ? 'no stall needed' : 'stalled') : 'forwarded' });
        if (o.forwarding && used < WB[pr.p]) notes[i].fwd = true;
      });
      // control hazard handling for the next instruction
      if (d.branch || d.jump) {
        const R = bs === 'ID' ? EX[i] - 1 : bs === 'EX' ? EX[i] : MEM[i];
        if (o.predict === 'stall' || d.jump || ins[i].taken) { ctrlMin = R + 1; notes[i].branchResolve = R; notes[i].penaltyKind = (o.predict === 'stall' && !d.jump && !ins[i].taken) ? 'bubble' : 'flush'; }
        else ctrlMin = 0;
      } else ctrlMin = 0;
    }
    // rows and ghosts
    const stages = ['IF', 'ID', 'EX', 'MEM', 'WB']; const rows = []; let flushes = 0;
    const cellsFor = (i) => {
      const enter = [IF[i], ID[i], EX[i], MEM[i], WB[i]]; const c = {};
      for (let s = 0; s < 5; s++) { const end = s < 4 ? enter[s + 1] - 1 : enter[s]; for (let cy = enter[s]; cy <= end; cy++) c[cy] = { s: stages[s], stall: cy > enter[s], fwd: s === 2 && cy === EX[i] && notes[i].fwd }; }
      return c;
    };
    for (let i = 0; i < n; i++) {
      rows.push({ text: ins[i].t, index: i, cells: cellsFor(i), ghost: false, note: notes[i], taken: !!ins[i].taken });
      const nt = notes[i]; if (nt.penaltyKind === 'flush') {
        const G = { ID: 1, EX: 2, MEM: 3 }[ins[i].d.jump ? 'ID' : o.branchStage]; const R = nt.branchResolve;
        for (let g = 1; g <= G; g++) {
          const start = ID[i] + g - 1; const cells = {}; let k = 0;
          for (let cy = start; cy <= R; cy++, k++) cells[cy] = { s: stages[Math.min(k, 4)], stall: false };
          cells[R + 1] = { s: 'X', stall: false }; rows.push({ text: '(wrong-path instruction, flushed)', index: -1, cells, ghost: true }); flushes++;
        }
      }
    }
    const cycles = n ? WB[n - 1] : 0; const maxCycle = Math.max(cycles, ...rows.map((r) => Math.max(...Object.keys(r.cells).map(Number))));
    return { rows, cycles, maxCycle, instructions: n, cpi: n ? cycles / n : 0, idealCycles: n + 4, extraCycles: cycles - (n + 4), flushes, nonPipelinedCycles: 5 * n, speedup: cycles ? 5 * n / cycles : 0, hazards, IF, ID, EX, MEM, WB, options: o };
  }

  /* ======================= instruction scheduling (in-order vs out-of-order) ======================= */
  function schedule(items, o) {
    o = Object.assign({ mode: 'ooo', width: 1, rename: true }, o || {});
    const ins = items.map((it) => { const x = Object.assign({ lat: 1, dest: null, srcs: [] }, typeof it === 'string' ? {} : it); if (typeof it === 'string') x.t = it; return x; });
    const n = ins.length; const issue = [], start = [], end = [], write = []; const perCycleIssue = {}; const perCycleStart = {};
    for (let i = 0; i < n; i++) {
      let c = i === 0 ? 1 : issue[i - 1]; while ((perCycleIssue[c] || 0) >= o.width) c++; issue[i] = c; perCycleIssue[c] = (perCycleIssue[c] || 0) + 1;
      let ready = issue[i] + 1;
      ins[i].srcs.forEach((r) => { for (let k = i - 1; k >= 0; k--) if (ins[k].dest === r) { ready = Math.max(ready, write[k] + 1); break; } });
      if (!o.rename) {
        for (let k = 0; k < i; k++) {
          if (ins[i].dest && ins[k].srcs.includes(ins[i].dest)) ready = Math.max(ready, start[k] + 1 - (ins[i].lat - 0) + 0); // WAR: do not write before k reads
          if (ins[i].dest && ins[k].dest === ins[i].dest) ready = Math.max(ready, write[k] + 1 - ins[i].lat); // WAW: finish after k
        }
      }
      if (o.mode === 'inorder' && i > 0) ready = Math.max(ready, start[i - 1]);
      let s = ready; if (o.mode === 'inorder') { while ((perCycleStart[s] || 0) >= o.width) s++; } else { while ((perCycleStart[s] || 0) >= 99) s++; }
      start[i] = s; perCycleStart[s] = (perCycleStart[s] || 0) + 1; end[i] = s + ins[i].lat - 1; write[i] = end[i] + 1;
    }
    const cycles = n ? Math.max(...write) : 0;
    return { rows: ins.map((x, i) => ({ text: x.t, issue: issue[i], start: start[i], end: end[i], write: write[i], lat: x.lat })), cycles, ipc: cycles ? n / cycles : 0, options: o };
  }

  /* ======================= branch prediction ======================= */
  function predictor(seq, o) {
    o = Object.assign({ bits: 2, init: 0, tableSize: 1 }, o || {});
    const table = new Array(o.tableSize).fill(o.init); const steps = []; let right = 0; const max = o.bits === 1 ? 1 : 3;
    seq.forEach((x, i) => {
      const actual = typeof x === 'object' ? x.taken : x; const id = typeof x === 'object' && x.id != null ? x.id : 0; const idx = id % o.tableSize;
      const before = table[idx]; const predicted = o.bits === 1 ? before === 1 : before >= 2; const correct = predicted === actual;
      let after = before; if (o.bits === 1) after = actual ? 1 : 0; else after = actual ? Math.min(3, before + 1) : Math.max(0, before - 1);
      table[idx] = after; if (correct) right++;
      steps.push({ i, actual, id, idx, before, after, predicted, correct });
    });
    return { steps, accuracy: seq.length ? right / seq.length : 0, correct: right, total: seq.length, max };
  }

  /* ======================= caches ======================= */
  function cacheSim(cfg, accesses) {
    const c = Object.assign({ blockBytes: 4, lines: 8, assoc: 1, addrBits: 16, write: 'back', allocate: true }, cfg || {});
    if (c.assoc === 'full') c.assoc = c.lines;
    const sets = c.lines / c.assoc; const offBits = log2(c.blockBytes), idxBits = log2(sets), tagBits = c.addrBits - idxBits - offBits;
    const S = []; for (let s = 0; s < sets; s++) S.push([]); // each set: array of {tag, used, dirty}
    const fa = []; const seen = new Set(); let clock = 0; const events = []; let memWrites = 0, memReads = 0;
    const counts = { hits: 0, misses: 0, compulsory: 0, capacity: 0, conflict: 0 };
    const snap = () => S.map((set) => set.map((l) => ({ tag: l.tag, dirty: l.dirty })));
    accesses.forEach((a) => {
      const addr = typeof a === 'object' ? a.addr : a; const op = typeof a === 'object' && a.op ? a.op : 'R'; clock++;
      const block = Math.floor(addr / c.blockBytes); const idx = block % sets; const tag = Math.floor(block / sets); const off = addr % c.blockBytes;
      const set = S[idx]; let line = set.find((l) => l.tag === tag); const hit = !!line;
      // fully associative shadow (same total lines) to classify misses
      let fl = fa.find((l) => l.block === block); const faHit = !!fl;
      if (fl) fl.used = clock; else { if (fa.length >= c.lines) { fa.sort((x, y) => x.used - y.used); fa.shift(); } fa.push({ block, used: clock }); }
      let kind = null, evicted = null;
      if (hit) { counts.hits++; line.used = clock; }
      else {
        counts.misses++; kind = !seen.has(block) ? 'compulsory' : faHit ? 'conflict' : 'capacity'; counts[kind]++;
        if (op === 'W' && !c.allocate) { memWrites++; }
        else {
          memReads++;
          if (set.length >= c.assoc) { set.sort((x, y) => x.used - y.used); const v = set.shift(); evicted = { tag: v.tag, dirty: v.dirty }; if (v.dirty && c.write === 'back') memWrites++; }
          line = { tag, used: clock, dirty: false }; set.push(line);
        }
      }
      seen.add(block);
      if (op === 'W') { if (c.write === 'through') memWrites++; else if (line) line.dirty = true; }
      events.push({ addr, op, block, index: idx, tag, offset: off, hit, kind, evicted, state: snap(), memWrites, memReads });
    });
    const total = accesses.length;
    return { config: c, sets, offBits, idxBits, tagBits, events, counts, hitRate: total ? counts.hits / total : 0, missRate: total ? counts.misses / total : 0, memWrites, memReads };
  }
  // multi-level fully-associative LRU hierarchy for the locality demo: levels [{name, blocks}] and block size in words
  function hierarchySim(levels, blockWords, accesses) {
    const L = levels.map((l) => ({ name: l.name, cap: l.blocks, blocks: [] })); let clock = 0; const events = [];
    accesses.forEach((a) => {
      clock++; const block = Math.floor(a / blockWords); let found = -1;
      for (let i = 0; i < L.length; i++) { const e = L[i].blocks.find((b) => b.id === block); if (e) { found = i; e.used = clock; break; } }
      const upto = found < 0 ? L.length : found;
      for (let i = 0; i < upto; i++) { const lv = L[i]; if (lv.blocks.length >= lv.cap) { lv.blocks.sort((x, y) => x.used - y.used); lv.blocks.shift(); } lv.blocks.push({ id: block, used: clock }); }
      events.push({ addr: a, block, found: found < 0 ? 'Main memory' : L[found].name, foundIndex: found < 0 ? L.length : found, state: L.map((l) => l.blocks.map((b) => b.id)) });
    });
    return { events, levels: L.map((l) => l.name) };
  }

  /* ======================= virtual memory ======================= */
  function vmNew(cfg) {
    const c = Object.assign({ pageBytes: 4096, tlbEntries: 2, frames: 4, vaBits: 16 }, cfg || {});
    const st = { cfg: c, tlb: [], pt: {}, frames: [], clock: 0, offBits: log2(c.pageBytes) };
    (cfg.pageTable ? Object.keys(cfg.pageTable) : []).forEach((k) => { const e = cfg.pageTable[k]; st.pt[+k] = { valid: !!e.valid, ppn: e.ppn }; if (e.valid) st.frames.push({ ppn: e.ppn, vpn: +k, used: 0 }); });
    (cfg.tlb || []).forEach((e) => st.tlb.push({ vpn: e.vpn, ppn: e.ppn, used: 0 }));
    return st;
  }
  function vmTranslate(st, va) {
    const c = st.cfg; st.clock++; const vpn = Math.floor(va / c.pageBytes), off = va % c.pageBytes; const r = { va, vpn, offset: off, tlbHit: false, ptValid: false, fault: false, ppn: null, pa: null, evictedPage: null, steps: [] };
    let t = st.tlb.find((e) => e.vpn === vpn);
    if (t) { r.tlbHit = true; t.used = st.clock; r.ppn = t.ppn; r.steps.push('TLB hit'); }
    else {
      r.steps.push('TLB miss: look in the page table'); const e = st.pt[vpn];
      if (e && e.valid) { r.ptValid = true; r.ppn = e.ppn; r.steps.push('Page table: valid, the page is in memory'); const f = st.frames.find((x) => x.vpn === vpn); if (f) f.used = st.clock; }
      else {
        r.fault = true; r.steps.push('Page table: invalid. PAGE FAULT: the page is not in memory');
        let ppn; const used = new Set(st.frames.map((f) => f.ppn)); for (let p = 0; p < c.frames; p++) if (!used.has(p)) { ppn = p; break; }
        if (ppn == null) { st.frames.sort((a, b) => a.used - b.used); const v = st.frames.shift(); ppn = v.ppn; r.evictedPage = v.vpn; st.pt[v.vpn] = { valid: false, ppn: null }; st.tlb = st.tlb.filter((x) => x.vpn !== v.vpn); r.steps.push(`Memory full: evict virtual page ${v.vpn} (least recently used)`); }
        st.frames.push({ ppn, vpn, used: st.clock }); st.pt[vpn] = { valid: true, ppn }; r.ppn = ppn; r.steps.push(`OS loads the page from disk into frame ${ppn}`);
      }
      if (st.tlb.length >= c.tlbEntries) { st.tlb.sort((a, b) => a.used - b.used); st.tlb.shift(); }
      st.tlb.push({ vpn, ppn: r.ppn, used: st.clock }); r.steps.push('TLB updated');
    }
    r.pa = r.ppn * c.pageBytes + off; return r;
  }

  /* ======================= RAID ======================= */
  function raidLayout(level, disks, rows) {
    level = String(level); const g = []; for (let d = 0; d < disks; d++) g.push([]); let blk = 0;
    for (let r = 0; r < rows; r++) {
      if (level === '0') { for (let d = 0; d < disks; d++) g[d].push('D' + blk++); }
      else if (level === '1') { const v = 'D' + blk++; for (let d = 0; d < disks; d++) g[d].push(v); }
      else if (level === '10') { for (let p = 0; p < disks / 2; p++) { const v = 'D' + blk++; g[2 * p].push(v); g[2 * p + 1].push(v); } }
      else if (level === '5') { const pd = disks - 1 - (r % disks); for (let d = 0; d < disks; d++) g[d].push(d === pd ? 'P' : 'D' + blk++); }
      else if (level === '6') { const pd = disks - 1 - (r % disks), qd = (pd + disks - 1) % disks; for (let d = 0; d < disks; d++) g[d].push(d === pd ? 'P' : d === qd ? 'Q' : 'D' + blk++); }
    }
    return g;
  }
  function raidInfo(level, disks) {
    level = String(level); const n = disks;
    const cap = { 0: n, 1: 1, 5: n - 1, 6: n - 2, 10: n / 2 }[level]; const tol = { 0: 0, 1: n - 1, 5: 1, 6: 2, 10: 1 }[level];
    return { capacityDisks: cap, efficiency: cap / n, guaranteedTolerance: tol };
  }
  function raidSurvives(level, disks, failed) {
    level = String(level); const f = [...new Set(failed)];
    if (level === '0') return f.length === 0; if (level === '1') return f.length < disks;
    if (level === '5') return f.length <= 1; if (level === '6') return f.length <= 2;
    if (level === '10') { for (let p = 0; p < disks / 2; p++) if (f.includes(2 * p) && f.includes(2 * p + 1)) return false; return true; }
    return false;
  }

  /* ======================= cache coherence (MSI) and races ======================= */
  function msiNew(cores, mem) { const c = []; for (let i = 0; i < cores; i++) c.push({ state: 'I', value: null }); return { cores: c, mem: mem == null ? 0 : mem, log: [] }; }
  function msiOp(st, core, op, value) {
    const me = st.cores[core]; const msgs = []; let note = '';
    if (op === 'R') {
      if (me.state !== 'I') note = `Core ${core}: read hit (state ${me.state})`;
      else {
        const m = st.cores.findIndex((x, i) => i !== core && x.state === 'M');
        if (m >= 0) { st.mem = st.cores[m].value; st.cores[m].state = 'S'; msgs.push(`Bus read: core ${m} writes back its modified value (${st.mem}) and becomes S`); }
        st.cores.forEach((x, i) => { if (i !== core && x.state === 'E') x.state = 'S'; });
        me.value = st.mem; me.state = 'S'; msgs.push(`Core ${core} gets the value ${me.value} and enters state S`); note = `Core ${core}: read miss`;
      }
    } else {
      if (me.state === 'M') note = `Core ${core}: write hit in state M (no bus traffic)`;
      else {
        const m = st.cores.findIndex((x, i) => i !== core && x.state === 'M'); if (m >= 0) { st.mem = st.cores[m].value; msgs.push(`Core ${m} writes back ${st.mem}`); }
        st.cores.forEach((x, i) => { if (i !== core && x.state !== 'I') { x.state = 'I'; x.value = null; msgs.push(`Core ${i} invalidates its copy`); } });
        note = me.state === 'S' ? `Core ${core}: write to a Shared line: upgrade, others invalidated` : `Core ${core}: write miss: bus read-exclusive`;
      }
      me.state = 'M'; me.value = value; msgs.push(`Core ${core} now holds ${value} in state M`);
    }
    st.log.push({ core, op, note, msgs }); return { note, msgs };
  }
  // Two threads sharing one counter. ops: 'load','add','store','lock','unlock'. schedule: array of thread ids to advance.
  function raceRun(programs, schedule) {
    const th = programs.map(() => ({ pc: 0, reg: 0 })); let shared = 0, lock = null; const log = [];
    schedule.forEach((t) => {
      const p = programs[t]; const T = th[t]; if (T.pc >= p.length) { log.push({ t, op: '(done)', shared, note: 'thread finished' }); return; }
      const op = p[T.pc]; let note = '', ran = true;
      if (op === 'lock') { if (lock !== null && lock !== t) { note = `blocked: lock held by thread ${lock}`; ran = false; } else { lock = t; note = 'acquired the lock'; } }
      else if (op === 'unlock') { lock = null; note = 'released the lock'; }
      else if (op === 'load') { T.reg = shared; note = `register = ${shared}`; }
      else if (op === 'add') { T.reg += 1; note = `register = ${T.reg}`; }
      else if (op === 'store') { shared = T.reg; note = `counter = ${shared}`; }
      if (ran) T.pc++; log.push({ t, op, shared, note, ran });
    });
    return { shared, log, done: th.every((T, i) => T.pc >= programs[i].length) };
  }

  /* ======================= number representation ======================= */
  function toTwos(value, n) { const m = 2 ** n; return (((value % m) + m) % m); }
  function fromTwos(u, n) { return u >= 2 ** (n - 1) ? u - 2 ** n : u; }
  function addBits(a, b, n) { // a, b unsigned patterns
    let carry = 0; const bits = []; const carries = [];
    for (let i = 0; i < n; i++) { const x = (a >> i) & 1, y = (b >> i) & 1, s = x + y + carry; bits.push(s & 1); carry = s >> 1; carries.push(carry); }
    const sum = bits.reduce((acc, v, i) => acc + v * 2 ** i, 0); const sa = fromTwos(a, n), sb = fromTwos(b, n), ss = fromTwos(sum, n);
    return { sum, carryOut: carry, overflow: (sa >= 0) === (sb >= 0) && (ss >= 0) !== (sa >= 0), signed: ss, trueSigned: sa + sb, carries };
  }
  function ieee32(x) {
    const dv = new DataView(new ArrayBuffer(4)); dv.setFloat32(0, x); const w = dv.getUint32(0);
    return ieeeFromBits(w);
  }
  function ieeeFromBits(w) {
    w = w >>> 0; const sign = w >>> 31, exp = (w >>> 23) & 255, frac = w & 0x7fffff; const dv = new DataView(new ArrayBuffer(4)); dv.setUint32(0, w);
    const value = dv.getFloat32(0); let cls = 'normal'; if (exp === 0) cls = frac === 0 ? 'zero' : 'denormal'; else if (exp === 255) cls = frac === 0 ? 'infinity' : 'NaN';
    return { word: w, sign, exp, frac, value, cls, bias: 127, unbiased: exp - 127, bits: bin(w, 32) };
  }
  function mulShiftAdd(a, b, n) { // unsigned n-bit multiplicand a, multiplier b
    let prod = 0; const steps = []; for (let i = 0; i < n; i++) { const bit = (b >> i) & 1; if (bit) prod += a * 2 ** i; steps.push({ i, bit, add: bit ? a * 2 ** i : 0, product: prod }); }
    return { product: prod, steps };
  }
  function divRestoring(dividend, divisor, n) {
    let rem = 0, quo = 0; const steps = [];
    for (let i = n - 1; i >= 0; i--) { rem = rem * 2 + ((dividend >> i) & 1); let q = 0; if (rem >= divisor) { rem -= divisor; q = 1; } quo = quo * 2 + q; steps.push({ i, remainder: rem, quotientBit: q }); }
    return { quotient: quo, remainder: rem, steps };
  }
  function endianBytes(word) { const b = [(word >>> 24) & 255, (word >>> 16) & 255, (word >>> 8) & 255, word & 255]; return { big: b, little: b.slice().reverse() }; }

  return { REGS, regNum, parseInstr, assemble, encode, decode, newState, step, run, loadWord, storeWord, loadByte, depsOf, pipeline, schedule, predictor, cacheSim, hierarchySim,
    vmNew, vmTranslate, raidLayout, raidInfo, raidSurvives, msiNew, msiOp, raceRun, toTwos, fromTwos, addBits, ieee32, ieeeFromBits, mulShiftAdd, divRestoring, endianBytes, hex, bin, BASE };
});
