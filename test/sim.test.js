const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../assets/sim.js');

test('register names', () => {
  assert.equal(S.regNum('$s0'), 16); assert.equal(S.regNum('$t0'), 8); assert.equal(S.regNum('$ra'), 31); assert.equal(S.regNum('$sp'), 29); assert.equal(S.regNum('$17'), 17); assert.equal(S.regNum('$nope'), -1);
});
const enc = (t) => { const p = S.assemble(t); assert.deepEqual(p.errors, []); return S.encode(p.instrs[0]) >>> 0; };
test('encoding of known instructions', () => {
  assert.equal(enc('add $s0, $s1, $s2'), 0x02328020);
  assert.equal(enc('lw $t0, 32($s3)'), 0x8E680020);
  assert.equal(enc('sw $t0, 32($s3)'), 0xAE680020);
  assert.equal(enc('addi $s0, $s1, -1'), 0x2230FFFF);
  assert.equal(enc('sll $t0, $t1, 4'), 0x00094100);
  assert.equal(enc('sub $t0, $t1, $t2'), 0x012A4022);
  const p = S.assemble('beq $t0, $t1, L\nadd $s0,$s0,$s0\nL: add $s1,$s1,$s1'); assert.equal(S.encode(p.instrs[0]) >>> 0, 0x11090001);
  const j = S.assemble('j 0x00400000'); assert.equal(S.encode(j.instrs[0]) >>> 0, 0x08100000);
});
test('decoding round trip', () => {
  assert.equal(S.decode(0x02328020).asm, 'add $s0, $s1, $s2'); assert.equal(S.decode(0x8E680020).asm, 'lw $t0, 32($s3)');
  assert.equal(S.decode(0x2230FFFF).asm, 'addi $s0, $s1, -1'); assert.equal(S.decode(0x00094100).asm, 'sll $t0, $t1, 4');
  assert.equal(S.decode(0x02328020).format, 'R'); assert.equal(S.decode(0x8E680020).format, 'I'); assert.equal(S.decode(0x08100000).format, 'J');
});
test('interpreter: arithmetic, loop, memory, procedure call', () => {
  let p = S.assemble('li $s1, 5\nli $s2, 7\nadd $s0, $s1, $s2'); let st = S.run(S.newState(p)); assert.equal(st.regs[16], 12);
  p = S.assemble('li $t0,0\nli $t1,1\nloop: add $t0,$t0,$t1\naddi $t1,$t1,1\nslti $t2,$t1,11\nbne $t2,$zero,loop'); st = S.run(S.newState(p)); assert.equal(st.regs[8], 55);
  p = S.assemble('li $t0, 99\nsw $t0, 8($s1)\nlw $t1, 8($s1)'); st = S.run(S.newState(p, { registers: { $s1: 0x10010000 } })); assert.equal(st.regs[9], 99); assert.equal(S.loadWord(st, 0x10010008), 99);
  p = S.assemble('li $a0, 3\njal double\nj end\ndouble: add $v0, $a0, $a0\njr $ra\nend: nop'); st = S.run(S.newState(p)); assert.equal(st.regs[2], 6);
  p = S.assemble('lw $t0, 2($zero)'); st = S.run(S.newState(p)); assert.match(st.error, /unaligned/);
  p = S.assemble('lui $t0, 0x7fff\nori $t0,$t0,0xffff\naddi $t1,$t0,1'); st = S.run(S.newState(p)); assert.match(st.error, /overflow/);
});
test('endianness of stored words', () => {
  const p = S.assemble('nop'); let st = S.newState(p, { endian: 'big' }); S.storeWord(st, 0x100, 0x01020304); assert.equal(S.loadByte(st, 0x100), 1);
  st = S.newState(p, { endian: 'little' }); S.storeWord(st, 0x100, 0x01020304); assert.equal(S.loadByte(st, 0x100), 4);
});
test('assembler errors are readable', () => {
  const p = S.assemble('add $t0, $t1\nbogus $t0'); assert.equal(p.errors.length, 2); assert.match(p.errors[0].message, /needs 3 operands/); assert.match(p.errors[1].message, /Unknown instruction/);
});

const cyc = (items, o) => S.pipeline(items, o).cycles;
test('pipeline: ideal and load-use timing', () => {
  assert.equal(cyc(['add $s0,$s1,$s2', 'add $s3,$s4,$s5', 'add $s6,$s7,$t0', 'add $t1,$t2,$t3', 'add $t4,$t5,$t6']), 9);
  assert.equal(cyc(['lw $t0, 0($s0)', 'add $t1,$t0,$t2']), 7);
  assert.equal(cyc(['lw $t0, 0($s0)', 'add $t1,$t0,$t2'], { forwarding: false }), 8);
  assert.equal(cyc(['add $t0,$s1,$s2', 'sub $t1,$t0,$s3']), 6);
  assert.equal(cyc(['add $t0,$s1,$s2', 'sub $t1,$t0,$s3'], { forwarding: false }), 8);
  assert.equal(cyc(['lw $t0, 0($s0)', 'sw $t0, 4($s1)']), 6);
});
test('pipeline: control hazards', () => {
  const r = S.pipeline([{ t: 'beq $t1,$t2,L', taken: true }, 'add $s0,$s1,$s2']); assert.equal(r.cycles, 7); assert.equal(r.flushes, 1);
  assert.equal(cyc([{ t: 'beq $t1,$t2,L', taken: false }, 'add $s0,$s1,$s2']), 6);
  assert.equal(cyc(['add $t1,$s1,$s2', { t: 'beq $t1,$t2,L', taken: false }]), 7);
  assert.equal(cyc(['lw $t1,0($s1)', { t: 'beq $t1,$t2,L', taken: false }]), 8);
  assert.equal(S.pipeline([{ t: 'beq $t1,$t2,L', taken: true }, 'add $s0,$s1,$s2'], { branchStage: 'MEM' }).cycles, 9);
  assert.equal(cyc([{ t: 'beq $t1,$t2,L', taken: false }, 'add $s0,$s1,$s2'], { predict: 'stall' }), 7);
});
test('pipeline: structural hazard with one memory', () => {
  const prog = ['lw $t0,0($s0)', 'add $s1,$s2,$s3', 'add $s4,$s5,$s6', 'add $s7,$s2,$s3'];
  assert.equal(cyc(prog), 8); assert.equal(cyc(prog, { unifiedMemory: true }), 9);
});
test('scheduling: out of order beats in order', () => {
  const prog = [{ t: 'DIV F0,F2,F4', dest: 'F0', srcs: ['F2', 'F4'], lat: 10 }, { t: 'ADD F10,F0,F8', dest: 'F10', srcs: ['F0', 'F8'], lat: 2 }, { t: 'MUL F6,F8,F14', dest: 'F6', srcs: ['F8', 'F14'], lat: 4 }];
  assert.equal(S.schedule(prog, { mode: 'ooo' }).cycles, 15); assert.equal(S.schedule(prog, { mode: 'inorder' }).cycles, 18);
  assert.equal(S.schedule(prog, { mode: 'inorder', width: 2 }).cycles, 17);
  const waw = [{ t: 'DIV F0,F2,F4', dest: 'F0', srcs: ['F2', 'F4'], lat: 10 }, { t: 'ADD F6,F0,F8', dest: 'F6', srcs: ['F0', 'F8'], lat: 2 }, { t: 'SUB F8,F10,F14', dest: 'F8', srcs: ['F10', 'F14'], lat: 2 }];
  assert.ok(S.schedule(waw, { mode: 'ooo', rename: false }).cycles >= S.schedule(waw, { mode: 'ooo', rename: true }).cycles);
});
test('branch predictors', () => {
  const seq = [1, 1, 1, 0, 1, 1, 1, 0].map(Boolean);
  assert.equal(S.predictor(seq, { bits: 1, init: 0 }).correct, 4); assert.equal(S.predictor(seq, { bits: 2, init: 0 }).correct, 4); assert.equal(S.predictor(seq, { bits: 2, init: 3 }).correct, 6);
});
test('cache simulation and the three Cs', () => {
  let r = S.cacheSim({ blockBytes: 4, lines: 4, assoc: 1 }, [0, 4, 8, 12, 0]); assert.equal(r.counts.compulsory, 4); assert.equal(r.counts.hits, 1);
  r = S.cacheSim({ blockBytes: 4, lines: 4, assoc: 1 }, [0, 16, 0, 16]); assert.deepEqual([r.counts.compulsory, r.counts.conflict], [2, 2]);
  r = S.cacheSim({ blockBytes: 4, lines: 2, assoc: 'full' }, [0, 4, 8, 0]); assert.equal(r.counts.capacity, 1);
  assert.equal(r.tagBits, 16 - 0 - 2); r = S.cacheSim({ blockBytes: 16, lines: 8, assoc: 2, addrBits: 16 }, [0]); assert.deepEqual([r.offBits, r.idxBits, r.tagBits], [4, 2, 10]);
  r = S.cacheSim({ blockBytes: 4, lines: 4, assoc: 1, write: 'back' }, [{ addr: 0, op: 'W' }, { addr: 16, op: 'R' }]); assert.equal(r.memWrites, 1);
  r = S.cacheSim({ blockBytes: 4, lines: 4, assoc: 1, write: 'through' }, [{ addr: 0, op: 'W' }, { addr: 0, op: 'W' }]); assert.equal(r.memWrites, 2);
});
test('memory hierarchy found-at', () => {
  const r = S.hierarchySim([{ name: 'L1', blocks: 2 }, { name: 'L2', blocks: 8 }], 4, [0, 1, 2, 3, 4, 0]);
  assert.deepEqual(r.events.map((e) => e.found), ['Main memory', 'L1', 'L1', 'L1', 'Main memory', 'L1']);
});
test('virtual memory translation', () => {
  const st = S.vmNew({ pageBytes: 4096, tlbEntries: 2, frames: 2 });
  let r = S.vmTranslate(st, 5000); assert.ok(r.fault); assert.equal(r.pa, 904); r = S.vmTranslate(st, 5000); assert.ok(r.tlbHit);
  r = S.vmTranslate(st, 9000); assert.ok(r.fault); assert.equal(r.ppn, 1); r = S.vmTranslate(st, 13000); assert.ok(r.fault); assert.equal(r.evictedPage, 1);
});
test('RAID', () => {
  const g = S.raidLayout('5', 4, 4); assert.equal(g[3][0], 'P'); assert.equal(g[2][1], 'P');
  assert.ok(S.raidSurvives('5', 4, [0])); assert.ok(!S.raidSurvives('5', 4, [0, 1])); assert.ok(!S.raidSurvives('10', 4, [0, 1])); assert.ok(S.raidSurvives('10', 4, [0, 2]));
  assert.ok(S.raidSurvives('6', 5, [0, 1])); assert.ok(!S.raidSurvives('6', 5, [0, 1, 2])); assert.ok(!S.raidSurvives('0', 4, [2]));
  assert.equal(S.raidInfo('5', 4).capacityDisks, 3); assert.equal(S.raidInfo('10', 4).capacityDisks, 2);
});
test('MSI coherence', () => {
  const st = S.msiNew(2, 0); S.msiOp(st, 0, 'R'); assert.equal(st.cores[0].state, 'S'); S.msiOp(st, 1, 'W', 5); assert.equal(st.cores[0].state, 'I'); assert.equal(st.cores[1].state, 'M');
  S.msiOp(st, 0, 'R'); assert.deepEqual([st.cores[0].state, st.cores[1].state, st.cores[0].value, st.mem], ['S', 'S', 5, 5]);
});
test('races and locks', () => {
  const p = ['load', 'add', 'store'];
  assert.equal(S.raceRun([p, p], [0, 1, 0, 0, 1, 1]).shared, 1); assert.equal(S.raceRun([p, p], [0, 0, 0, 1, 1, 1]).shared, 2);
  const q = ['lock', 'load', 'add', 'store', 'unlock']; const r = S.raceRun([q, q], [0, 1, 0, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1]); assert.equal(r.shared, 2);
});
test('number representation', () => {
  assert.equal(S.toTwos(-1, 8), 255); assert.equal(S.fromTwos(255, 8), -1); assert.equal(S.toTwos(-128, 8), 128);
  let a = S.addBits(100, 100, 8); assert.ok(a.overflow); assert.equal(a.signed, -56); a = S.addBits(S.toTwos(-3, 8), 5, 8); assert.ok(!a.overflow); assert.equal(a.signed, 2);
  assert.equal(S.ieee32(0.15625).word, 0x3E200000); assert.equal(S.ieee32(-0.75).word, 0xBF400000); assert.equal(S.ieee32(1).exp, 127); assert.equal(S.ieeeFromBits(0x7F800000).cls, 'infinity');
  assert.equal(S.mulShiftAdd(6, 5, 4).product, 30); const d = S.divRestoring(13, 3, 4); assert.deepEqual([d.quotient, d.remainder], [4, 1]);
  assert.deepEqual(S.endianBytes(0x01020304).big, [1, 2, 3, 4]); assert.deepEqual(S.endianBytes(0x01020304).little, [4, 3, 2, 1]);
});
