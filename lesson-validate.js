// Validates *.lesson.json files. Errors fail the build; warnings flag lessons that drift from docs/lesson-spec.md.
// CLI: `npm run check` (no password needed). Also used by build.js.
const fs = require('fs');
const path = require('path');

const BLOCK_TYPES = ['text', 'bullets', 'flow', 'compare', 'transform', 'table', 'code', 'analogy', 'timeline', 'callout', 'example', 'formula', 'calculator', 'mistake'];
const REQUIRED_STEPS = ['hook', 'objectives', 'concept', 'mcq', 'predict', 'tps', 'practice', 'discussion', 'checkpoint', 'conceptmap', 'review', 'quiz', 'recall', 'report'];
const RESERVED = new Set('break case catch class const continue debugger default delete do else enum export extends false finally for function if implements import in instanceof interface let new null package private protected public return static super switch this throw true try typeof var void while with yield await'.split(' '));
const QUIZ_MIX = { easy: 3, medium: 3, hard: 2, challenge: 1 };

function validateLesson(L, name = 'lesson') {
  const errors = [], warnings = [];
  const err = (where, msg) => errors.push(`${name} ${where}: ${msg}`);
  const warn = (where, msg) => warnings.push(`${name} ${where}: ${msg}`);
  const isStr = (v) => typeof v === 'string' && v.trim() !== '';
  const need = (where, obj, ...keys) => keys.forEach((k) => { if (obj[k] == null || obj[k] === '') err(where, `missing "${k}"`); });

  need('(lesson)', L, 'id', 'title', 'level', 'duration', 'objectives', 'sections');
  if (!Array.isArray(L.sections) || !L.sections.length) return { errors, warnings };
  if (Array.isArray(L.objectives) && (L.objectives.length < 3 || L.objectives.length > 5)) warn('(lesson)', 'use 3-5 learning objectives');
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
      const req = { text: ['text'], bullets: ['items'], flow: ['nodes'], compare: ['left', 'right'], transform: ['before', 'process', 'after'], table: ['head', 'rows'], code: ['code'], analogy: ['pairs'], timeline: ['items'], callout: ['text'], example: [], formula: ['terms'], calculator: ['inputs', 'results'], mistake: ['wrong', 'right'] }[b.type];
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

function lessonFiles(root) {
  const courses = JSON.parse(fs.readFileSync(path.join(root, 'content', 'courses.json'), 'utf8'));
  const out = [];
  for (const c of courses) for (const t of c.topics) if (t.type === 'lesson') out.push({ course: c, topic: t, file: path.join(root, 'content', c.id, `${t.id}.lesson.json`) });
  return out;
}

module.exports = { validateLesson, lessonFiles };

if (require.main === module) {
  let bad = 0;
  for (const { course, topic, file } of lessonFiles(__dirname)) {
    const name = `${course.id}/${topic.id}`;
    let data;
    try { data = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { console.error(`${name}: cannot read ${path.relative(__dirname, file)} (${e.message})`); bad++; continue; }
    const { errors, warnings } = validateLesson(data, name);
    warnings.forEach((w) => console.warn('warning ' + w)); errors.forEach((e) => console.error('ERROR   ' + e));
    console.log(`${name}: ${errors.length} error(s), ${warnings.length} warning(s)`); bad += errors.length;
  }
  const exDir = path.join(__dirname, 'docs', 'examples');
  if (fs.existsSync(exDir)) for (const fn of fs.readdirSync(exDir).filter((x) => x.endsWith('.lesson.json'))) {
    const { errors, warnings } = validateLesson(JSON.parse(fs.readFileSync(path.join(exDir, fn), 'utf8')), 'docs/examples/' + fn);
    errors.forEach((e) => console.error('ERROR   ' + e)); console.log(`docs/examples/${fn}: ${errors.length} error(s), ${warnings.length} warning(s) (example, warnings ignored)`); bad += errors.length;
  }
  process.exit(bad ? 1 : 0);
}
