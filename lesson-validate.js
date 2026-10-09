// Validates *.lesson.json files. Errors fail the build; warnings flag lessons that drift from docs/lesson-spec.md.
// CLI: `npm run check` (no password needed). Also used by build.js.
const fs = require('fs');
const SIM = require('./assets/sim.js');
const path = require('path');

const BLOCK_TYPES = ['text', 'bullets', 'flow', 'compare', 'transform', 'table', 'code', 'analogy', 'timeline', 'callout', 'example', 'formula', 'calculator', 'mistake', 'walkthrough', 'bits', 'encoder', 'mips', 'diagram', 'pipeline', 'scheduler', 'predictor', 'cache', 'hierarchy', 'vm', 'raid', 'coherence', 'race', 'simd'];
const REQUIRED_STEPS = ['hook', 'objectives', 'concept', 'mcq', 'predict', 'tps', 'practice', 'discussion', 'checkpoint', 'conceptmap', 'review', 'quiz', 'recall', 'report'];
const RESERVED = new Set('break case catch class const continue debugger default delete do else enum export extends false finally for function if implements import in instanceof interface let new null package private protected public return static super switch this throw true try typeof var void while with yield await'.split(' '));
const QUIZ_MIX = { easy: 3, medium: 3, hard: 2, challenge: 1 };

const pow2 = (n) => Number.isInteger(n) && n > 0 && (n & (n - 1)) === 0;
// Extra checks for the interactive demo blocks. Uses the real simulators, so authoring mistakes show up here.
function demoCheck(b, w, err, warn) {
  const t = b.type;
  if (t === 'walkthrough') {
    const modes = b.modes || [b]; if (!modes.length) return err(w, 'needs "modes" or "stages"');
    modes.forEach((m, i) => { if (!Array.isArray(m.stages) || !m.stages.length) err(w, `mode ${i + 1} needs "stages"`); else m.stages.forEach((s, k) => { if (!s.label || !s.text) err(w, `mode ${i + 1} stage ${k + 1} needs label and text`); }); (m.inputs || []).forEach((x) => { if (!x.id || typeof x.value !== 'number') err(w, `mode ${i + 1} inputs need id and a numeric value`); }); });
  } else if (t === 'bits') {
    (b.modes || []).forEach((m) => { if (!['twos', 'add', 'ieee', 'endian', 'mul', 'div'].includes(m)) err(w, `unknown bits mode "${m}"`); });
  } else if (t === 'mips') {
    if (typeof b.program !== 'string' || !b.program.trim()) return err(w, 'needs a "program" string');
    const p = SIM.assemble(b.program); if (p.errors.length) return err(w, `program line ${p.errors[0].line}: ${p.errors[0].message}`);
    const st = SIM.run(SIM.newState(p, { registers: b.registers, memory: b.memory, endian: b.endian }), 20000); if (st.error && !b.expectError) warn(w, `the program stops with an error when run: ${st.error} (set "expectError": true if that is the point of the demo)`);
    (b.watch || []).forEach((r) => { if (SIM.regNum(r) < 0) err(w, `unknown register "${r}" in watch`); });
  } else if (t === 'encoder') {
    (b.presets || []).forEach((x) => { const p = SIM.assemble(x); if (p.errors.length) err(w, `preset "${x}": ${p.errors[0].message}`); });
  } else if (t === 'diagram') {
    const ids = new Set(); (b.nodes || []).forEach((n) => { if (!n.id || ![n.x, n.y, n.w, n.h].every((q) => typeof q === 'number')) err(w, `node "${n.id}" needs id, x, y, w, h`); ids.add(n.id); });
    (b.edges || []).forEach((e) => { if (!e.id) err(w, 'every edge needs an id'); ids.add(e.id); if (!e.points && !(e.from && e.to)) err(w, `edge "${e.id}" needs points or from/to`); if (!e.points) [e.from, e.to].forEach((q) => { if (!(b.nodes || []).some((n) => n.id === q)) err(w, `edge "${e.id}" refers to unknown node "${q}"`); }); });
    (b.steps || []).forEach((s, i) => (s.show || []).forEach((q) => { if (!ids.has(q)) err(w, `build step ${i + 1} shows unknown id "${q}"`); }));
    (b.scenarios || []).forEach((sc) => (sc.steps || []).forEach((s, i) => (s.highlight || []).concat(Object.keys(s.values || {})).forEach((q) => { if (!ids.has(q)) err(w, `scenario "${sc.name}" step ${i + 1} refers to unknown id "${q}"`); })));
    if (!(b.nodes || []).length) err(w, 'needs "nodes"');
  } else if (t === 'pipeline') {
    const scs = b.scenarios || (b.instructions ? [{ name: 'x', instructions: b.instructions }] : []); if (!scs.length) return err(w, 'needs "scenarios" (each with "instructions") or "instructions"');
    scs.forEach((sc) => (sc.instructions || []).forEach((it) => { try { SIM.depsOf(typeof it === 'string' ? it : it.t); } catch (e) { err(w, `instruction "${typeof it === 'string' ? it : it.t}": ${e.message}`); } }));
  } else if (t === 'scheduler') {
    if (!Array.isArray(b.instructions) || !b.instructions.length) return err(w, 'needs "instructions"'); b.instructions.forEach((x, i) => { if (typeof x !== 'object' || !x.t || typeof x.lat !== 'number') err(w, `instruction ${i + 1} needs t (text), lat, and dest/srcs`); });
  } else if (t === 'predictor') {
    (b.presets || []).forEach((p) => { if (!p.name || !/^[\sTtNn,A-Za-z0-9:]+$/.test(p.seq || '')) err(w, `preset "${p.name}" needs a name and a seq like "T T N T"`); });
  } else if (t === 'cache') {
    const c = Object.assign({ blockBytes: 4, lines: 8, assoc: 1 }, b.config); if (!pow2(c.blockBytes) || !pow2(c.lines)) err(w, 'blockBytes and lines must be powers of two');
    if (c.assoc !== 'full' && (!pow2(c.assoc) || c.assoc > c.lines)) err(w, 'assoc must be a power of two no larger than lines, or "full"');
    const seqs = b.sequences || (b.accesses ? [{ accesses: b.accesses }] : []); if (!seqs.length) err(w, 'needs "sequences" (each with "accesses") or "accesses"');
  } else if (t === 'hierarchy') {
    if (!Array.isArray(b.levels) || b.levels.length < 2) err(w, 'needs "levels" (at least two)');
    if (b.locality && (!Array.isArray(b.locality.patterns) || !Array.isArray(b.locality.levels))) err(w, 'locality needs "levels" and "patterns"');
  } else if (t === 'vm') {
    const c = b.config || {}; if (!pow2(c.pageBytes || 4096)) err(w, 'pageBytes must be a power of two');
  } else if (t === 'raid') {
    (b.levels || []).forEach((l) => { if (!['0', '1', '5', '6', '10'].includes(String(l))) err(w, `unknown RAID level "${l}"`); });
  }
}
function validateLesson(L, name = 'lesson', opts = {}) {
  const errors = [], warnings = [];
  const err = (where, msg) => errors.push(`${name} ${where}: ${msg}`);
  const warn = (where, msg) => warnings.push(`${name} ${where}: ${msg}`);
  const isStr = (v) => typeof v === 'string' && v.trim() !== '';
  const need = (where, obj, ...keys) => keys.forEach((k) => { if (obj[k] == null || obj[k] === '') err(where, `missing "${k}"`); });

  need('(lesson)', L, 'id', 'title', 'level', 'duration', 'objectives', 'sections');
  if (!Array.isArray(L.sections) || !L.sections.length) return { errors, warnings };
  if (Array.isArray(L.objectives) && (L.objectives.length < 3 || L.objectives.length > 5)) warn('(lesson)', 'use 3-5 learning objectives');
  if (L.references != null) {
    if (!Array.isArray(L.references)) err('(references)', 'must be an array');
    else L.references.forEach((r, i) => { if (!['CAQA', 'COD'].includes(r.book) || !isStr(String(r.chapter || '')) ) err('(references)', `entry ${i + 1} needs book (CAQA or COD) and chapter`); });
  } else if (opts.course === 'Computer Architecture') warn('(lesson)', 'no "references": cite the textbook chapters this lesson follows (docs/computer-architecture-references.md)');
  const concepts = L.concepts || [];
  const conceptIds = new Set(concepts.map((c) => c.id));
  const sectionIds = new Set(L.sections.map((s) => s.id));
  if (!concepts.length) warn('(lesson)', 'no "concepts" list: mastery tracking and the learning report will be empty');
  concepts.forEach((c) => { if (!isStr(c.id) || !isStr(c.label)) err('(concepts)', 'each concept needs id and label'); if (c.section && !sectionIds.has(c.section)) err(`(concept ${c.id})`, `unknown section "${c.section}"`); });

  const seenSections = new Set(), seenSteps = new Set(), types = new Set(), tested = new Set();
  const checkBlocks = (where, blocks) => {
    if (!Array.isArray(blocks)) return err(where, '"blocks" must be an array');
    blocks.forEach((b, i) => {
      const w = `${where} block ${i + 1} (${b.type})`;
      if (!BLOCK_TYPES.includes(b.type)) return err(w, `unknown block type; use one of ${BLOCK_TYPES.join(', ')}`);
      const req = { text: ['text'], bullets: ['items'], flow: ['nodes'], compare: ['left', 'right'], transform: ['before', 'process', 'after'], table: ['head', 'rows'], code: ['code'], analogy: ['pairs'], timeline: ['items'], callout: ['text'], example: [], formula: ['terms'], calculator: ['inputs', 'results'], mistake: ['wrong', 'right'], walkthrough: [], bits: [], encoder: [], mips: [], diagram: [], pipeline: [], scheduler: [], predictor: [], cache: [], hierarchy: [], vm: [], raid: [], coherence: [], race: [], simd: [] }[b.type];
      need(w, b, ...req);
      if (b.type === 'text' && isStr(b.text) && b.text.length > 280) warn(w, 'long paragraph; prefer visuals and short lines');
      if (b.type === 'bullets' && Array.isArray(b.items) && b.items.length > 6) warn(w, 'more than 6 bullets on one screen');
      if (b.type === 'flow' && Array.isArray(b.nodes)) { if (b.nodes.length < 2 && b.layout !== 'grid') warn(w, 'a flow needs 2+ nodes'); b.nodes.forEach((n, k) => { if (!isStr(n.label)) err(w, `node ${k + 1} needs a label`); }); }
      if (b.type === 'code' && Array.isArray(b.steps)) { const n = String(b.code).split('\n').length; b.steps.forEach((s, k) => { if (!Array.isArray(s.lines) || s.lines.some((x) => x < 1 || x > n)) err(w, `step ${k + 1} has line numbers outside 1-${n}`); }); }
      if (b.type === 'calculator') {
        const ids = (b.inputs || []).map((i) => i.id);
        (b.inputs || []).forEach((i, k) => { if (RESERVED.has(i.id)) err(w, `input id "${i.id}" is a reserved word in JavaScript; rename it`); if (/^r\d+$/.test(i.id)) err(w, `input id "${i.id}" clashes with the {rN} result placeholders; rename it`); if (!isStr(i.id) || !isStr(i.label) || [i.value, i.min, i.max].some((v) => typeof v !== 'number')) err(w, `input ${k + 1} needs id, label, value, min and max`); else if (i.value < i.min || i.value > i.max) err(w, `input "${i.id}" value is outside min..max`); });
        (b.results || []).forEach((r, k) => {
          if (!isStr(r.label) || !isStr(r.formula)) return err(w, `result ${k + 1} needs label and formula`);
          const words = r.formula.replace(/(?<![\w.])\d+\.?\d*(?:e[+-]?\d+)?/gi, '').match(/[A-Za-z_]\w*/g) || [];
          words.filter((x) => !ids.includes(x) && !['min', 'max', 'sqrt', 'log2', 'pow'].includes(x)).forEach((x) => err(w, `result "${r.label}" uses unknown name "${x}"`));
        });
      }
      demoCheck(b, w, err, warn);
      if (b.type === 'formula' && Array.isArray(b.terms) && !b.terms.some((t) => t && t.note)) warn(w, 'give at least one term a "note" so it can be explained step by step');
      if (b.type === 'analogy' && Array.isArray(b.pairs)) b.pairs.forEach((p, k) => { if (!isStr(p.real) || !isStr(p.tech)) err(w, `pair ${k + 1} needs real and tech`); });
    });
  };
  const checkMcq = (w, q) => {
    need(w, q, 'question', 'options', 'answer', 'why');
    if (Array.isArray(q.options)) { if (q.options.length < 2 || q.options.length > 6) err(w, 'use 2-6 options'); if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length) err(w, '"answer" must be the index of a correct option'); if (q.feedback && q.feedback.length !== q.options.length) warn(w, '"feedback" should have one entry per option'); }
    if (!q.misconception && !q.feedback) warn(w, 'add "misconception" or "feedback" so wrong answers are explained');
  };

  L.sections.forEach((sec, si) => {
    const sw = `section ${si + 1}`;
    need(sw, sec, 'id', 'label', 'minutes', 'steps');
    if (seenSections.has(sec.id)) err(sw, `duplicate section id "${sec.id}"`); seenSections.add(sec.id);
    if (!Array.isArray(sec.steps) || !sec.steps.length) return err(sw, 'needs at least one step');
    sec.steps.forEach((st, k) => {
      const id = st.id || `${sec.id}-${k + 1}`; const w = `${sw} step ${k + 1} (${st.type})`;
      if (seenSteps.has(id)) err(w, `duplicate step id "${id}"`); seenSteps.add(id); types.add(st.type);
      if (st.concept) { if (!conceptIds.has(st.concept)) err(w, `unknown concept "${st.concept}"`); else if (st.type !== 'concept') tested.add(st.concept); }
      switch (st.type) {
        case 'hook': need(w, st, 'question'); break;
        case 'objectives': break;
        case 'concept': need(w, st, 'title', 'blocks'); checkBlocks(w, st.blocks); if (!st.why) warn(w, 'add "why" (Why does this matter?)'); if (st.mistake) [].concat(st.mistake).forEach((m, i) => { if (!isStr(m.wrong) || !isStr(m.right)) err(w, `mistake ${i + 1} needs wrong and right`); }); break;
        case 'discussion': need(w, st, 'question'); if (!Array.isArray(st.ideas) || !st.ideas.length) warn(w, 'add "ideas" (key ideas to reveal after the discussion)'); break;
        case 'mcq': checkMcq(w, st); break;
        case 'tf': need(w, st, 'statement', 'why'); if (typeof st.answer !== 'boolean') err(w, '"answer" must be true or false'); break;
        case 'predict': need(w, st, 'question', 'options', 'reveal'); if (Array.isArray(st.options) && st.answer != null && !(st.answer >= 0 && st.answer < st.options.length)) err(w, '"answer" out of range'); if (st.reveal) checkBlocks(w + ' reveal', st.reveal); break;
        case 'tps': need(w, st, 'prompt', 'answer'); break;
        case 'practice': need(w, st, 'level', 'question', 'answer'); const maxLv = L.practiceLevels === 4 ? 4 : 3; if (!(Number.isInteger(st.level) && st.level >= 1 && st.level <= maxLv)) err(w, `"level" must be 1 to ${maxLv}`); if (!st.solution) warn(w, 'add "solution" for the Explain the Solution step'); break;
        case 'match': need(w, st, 'prompt', 'pairs'); if (Array.isArray(st.pairs)) { if (st.pairs.length < 2) err(w, 'needs 2+ pairs'); st.pairs.forEach((p, i) => { if (!isStr(p.a) || !isStr(p.b)) err(w, `pair ${i + 1} needs a and b`); }); } break;
        case 'arrange': need(w, st, 'prompt', 'items', 'why'); if (Array.isArray(st.items) && st.items.length < 3) err(w, 'needs 3+ items'); break;
        case 'find': need(w, st, 'prompt', 'lines', 'wrong', 'explain'); if (Array.isArray(st.lines)) [].concat(st.wrong).forEach((i) => { if (!(i >= 0 && i < st.lines.length)) err(w, `"wrong" index ${i} is outside the lines`); }); break;
        case 'checkpoint': need(w, st, 'questions'); (st.questions || []).forEach((q, i) => { if (!isStr(q.q)) err(w, `question ${i + 1} needs "q"`); if (q.concept && !conceptIds.has(q.concept)) err(w, `unknown concept "${q.concept}"`); else if (q.concept) tested.add(q.concept); }); break;
        case 'conceptmap': need(w, st, 'root', 'branches'); (st.branches || []).forEach((b, i) => { if (!isStr(b.label)) err(w, `branch ${i + 1} needs a label`); if (b.section && !sectionIds.has(b.section)) err(w, `unknown section "${b.section}"`); }); break;
        case 'review': if (!['remember', 'understand', 'apply', 'mistakes', 'summary'].some((x) => st[x])) err(w, 'needs remember, understand, apply, mistakes or summary'); break;
        case 'quiz': {
          need(w, st, 'questions'); const mix = {};
          (st.questions || []).forEach((q, i) => {
            const qw = `${w} question ${i + 1}`; mix[q.level] = (mix[q.level] || 0) + 1;
            if (!QUIZ_MIX[q.level]) err(qw, 'level must be easy, medium, hard or challenge');
            if (q.type === 'tf') { need(qw, q, 'statement', 'why'); if (typeof q.answer !== 'boolean') err(qw, '"answer" must be true or false'); } else checkMcq(qw, q);
            if (q.concept && !conceptIds.has(q.concept)) err(qw, `unknown concept "${q.concept}"`); else if (q.concept) tested.add(q.concept);
          });
          Object.entries(QUIZ_MIX).forEach(([lv, n]) => { if ((mix[lv] || 0) !== n) warn(w, `spec asks for ${n} ${lv} question(s); found ${mix[lv] || 0}`); });
          break;
        }
        case 'recall': need(w, st, 'items'); (st.items || []).forEach((q, i) => { if (!isStr(q.q) || !isStr(q.a)) err(w, `item ${i + 1} needs q and a`); }); break;
        case 'report': break;
        default: err(w, `unknown step type "${st.type}"`);
      }
    });
  });

  const anyStep = (fn) => L.sections.some((sec) => (sec.steps || []).some(fn));
  if (!anyStep((x) => x.type === 'concept' && x.mistake)) warn('(lesson)', 'no "mistake" callouts: add common-mistake comparisons to concept steps');
  if (!anyStep((x) => x.type === 'concept' && x.real)) warn('(lesson)', 'no "real" callouts: add "Where you see this in real life" to concept steps');
  if (!anyStep((x) => x.type === 'practice' && x.exam)) warn('(lesson)', 'no exam practice: add practice steps with "exam": true');
  if (!anyStep((x) => x.type === 'review' && /remember/i.test(x.title || ''))) warn('(lesson)', 'no review step titled "What you should remember" (5-7 key points)');
  REQUIRED_STEPS.forEach((t) => { if (!types.has(t)) warn('(lesson)', `no "${t}" step (spec expects the full teaching loop)`); });
  if (!types.has('find') && !types.has('match') && !types.has('arrange')) warn('(lesson)', 'add at least one mini challenge (match, arrange or find)');
  concepts.forEach((c) => { if (!tested.has(c.id)) warn('(concepts)', `concept "${c.id}" is never tested by a question`); });
  const total = L.sections.reduce((n, s) => n + (+s.minutes || 0), 0);
  if (total !== L.duration) warn('(lesson)', `section minutes add up to ${total} but duration is ${L.duration}`);
  return { errors, warnings };
}

// A translated lesson (x.lesson.<lang>.json) must have exactly the same structure as the original, so progress, answers and the
// interactive demos behave identically in every language. Only the wording may differ: strings are free except for the
// structural keys below (ids, types, section/concept references, code and formulas), which must stay identical.
const SAME_STRING_KEYS = new Set(['type', 'id', 'concept', 'section', 'lang', 'level', 'format', 'formula', 'program', 'seq', 'layout', 'style', 'tone', 'book', 'chapter', 'sections', 'from', 'to', 'show', 'highlight', 'better', 'icon', 'skill', 'mode', 'modes']);
function lessonParity(base, tr, name = 'lesson', limit = 15) {
  const out = [];
  const walk = (a, b, where, key) => {
    if (out.length >= limit) return;
    const ta = Array.isArray(a) ? 'array' : a === null ? 'null' : typeof a, tb = Array.isArray(b) ? 'array' : b === null ? 'null' : typeof b;
    if (ta !== tb) return out.push(`${name} ${where}: should be ${ta} like the original, found ${tb}`);
    if (ta === 'array') {
      if (a.length !== b.length) return out.push(`${name} ${where}: has ${b.length} item(s), the original has ${a.length}`);
      a.forEach((x, i) => walk(x, b[i], `${where}[${i}]`, key));
    } else if (ta === 'object') {
      const ka = Object.keys(a), kb = Object.keys(b);
      ka.filter((k) => !(k in b)).forEach((k) => out.push(`${name} ${where}: missing "${k}" (present in the original)`));
      kb.filter((k) => !(k in a)).forEach((k) => out.push(`${name} ${where}: unexpected "${k}" (not in the original)`));
      ka.filter((k) => k in b).forEach((k) => walk(a[k], b[k], `${where}.${k}`, k));
    } else if (ta === 'string') {
      if (key === 'code' && a.split('\n').length !== b.split('\n').length) out.push(`${name} ${where}: code must keep the same number of lines as the original (comments may be translated)`);
      if (SAME_STRING_KEYS.has(key) && a !== b) out.push(`${name} ${where}: must be identical to the original ("${a.slice(0, 40)}")`);
    } else if (a !== b) out.push(`${name} ${where}: must equal the original (${JSON.stringify(a)}), found ${JSON.stringify(b)}`);
  };
  walk(base, tr, '', '');
  return out;
}

function lessonFiles(root) {
  const courses = JSON.parse(fs.readFileSync(path.join(root, 'content', 'courses.json'), 'utf8'));
  const out = [];
  for (const c of courses) for (const t of c.topics) if (t.type === 'lesson') out.push({ course: c, topic: t, file: path.join(root, 'content', c.id, `${t.id}.lesson.json`) });
  return out;
}

module.exports = { validateLesson, lessonParity, lessonFiles };

if (require.main === module) {
  let bad = 0;
  const { loadLocales, overlayFile } = require('./locales-lib');
  const LOCALES = loadLocales(__dirname), DEF = Object.keys(LOCALES).find((c) => LOCALES[c]._meta.default);
  for (const { course, topic, file } of lessonFiles(__dirname)) {
    const name = `${course.id}/${topic.id}`;
    let data;
    try { data = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { console.error(`${name}: cannot read ${path.relative(__dirname, file)} (${e.message})`); bad++; continue; }
    const { errors, warnings } = validateLesson(data, name, { course: course.title });
    warnings.forEach((w) => console.warn('warning ' + w)); errors.forEach((e) => console.error('ERROR   ' + e));
    console.log(`${name}: ${errors.length} error(s), ${warnings.length} warning(s)`); bad += errors.length;
    // translations: same validation, plus an exact structure match with the original
    for (const code of Object.keys(LOCALES)) {
      const tf = overlayFile(file, code);
      if (code === DEF || !fs.existsSync(tf)) continue;
      const label = `${name} [${code}]`; let tr;
      try { tr = JSON.parse(fs.readFileSync(tf, 'utf8')); } catch (e) { console.error(`${label}: cannot read ${path.relative(__dirname, tf)} (${e.message})`); bad++; continue; }
      const v = validateLesson(tr, label, { course: course.title }); const pe = lessonParity(data, tr, label);
      v.errors.concat(pe).forEach((e) => console.error('ERROR   ' + e)); console.log(`${label}: ${v.errors.length + pe.length} error(s)`); bad += v.errors.length + pe.length;
    }
  }
  const exDir = path.join(__dirname, 'docs', 'examples');
  if (fs.existsSync(exDir)) for (const fn of fs.readdirSync(exDir).filter((x) => x.endsWith('.lesson.json'))) {
    const { errors, warnings } = validateLesson(JSON.parse(fs.readFileSync(path.join(exDir, fn), 'utf8')), 'docs/examples/' + fn);
    errors.forEach((e) => console.error('ERROR   ' + e)); console.log(`docs/examples/${fn}: ${errors.length} error(s), ${warnings.length} warning(s) (example, warnings ignored)`); bad += errors.length;
  }
  process.exit(bad ? 1 : 0);
}
