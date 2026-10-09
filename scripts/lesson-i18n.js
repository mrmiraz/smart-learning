#!/usr/bin/env node
// Translate a lesson without touching its structure.
//   node scripts/lesson-i18n.js extract <lesson.json> [out.json]       every translatable string as { "<json pointer>": "text" }
//   node scripts/lesson-i18n.js apply   <lesson.json> <lang> <strings.json>   writes <lesson>.<lang>.json (same structure, translated wording)
//   node scripts/lesson-i18n.js status                                  which lessons have which languages
// Typical flow for a new language: add locales/<lang>.json, then per lesson: extract -> translate the values -> apply -> npm run check.
// Only wording is extracted: ids, types, code, formulas, MIPS programs, numbers and diagram data are never offered for translation,
// so a translated lesson cannot drift from the original. Anything missing from strings.json stays in the original language.
const fs = require('fs');
const path = require('path');
const { loadLocales, overlayFile } = require('../locales-lib');
const { lessonParity, lessonFiles } = require('../lesson-validate');

const ROOT = path.join(__dirname, '..');
// Keys whose string values are wording. [] keys hold arrays of strings (rows is an array of arrays of strings).
const TEXT = new Set(['title', 'subtitle', 'label', 'question', 'why', 'text', 'q', 'a', 'b', 'note', 'misconception', 'answer', 'solution', 'wrong', 'right', 'real', 'tech',
  'mistake', 'explain', 'hint', 'prompt', 'result', 'name', 'statement', 'equation', 'fix', 'topics', 'summary', 'root', 'ask', 'difficulty', 'discuss', 'deeper', 'sub', 'example',
  'context', 'intro', 'narration', 'beginner', 'technical', 'analogy', 'realTitle', 'techTitle', 'process', 'speed', 'capacity', 'cost', 'purpose', 'trace', 'when', 'description', 'caption', 'message', 'unit']);
const TEXT_ARRAYS = new Set(['options', 'items', 'head', 'rows', 'feedback', 'remember', 'understand', 'apply', 'objectives', 'lines', 'terms', 'ideas', 'clues', 'misconceptions', 'children']);
const ASM_BLOCKS = new Set(['pipeline', 'scheduler']); // inside these, "t" is an assembly instruction, not wording

function* strings(node, ptr, ctx) {
  if (Array.isArray(node)) { for (let i = 0; i < node.length; i++) yield* strings(node[i], `${ptr}/${i}`, ctx); return; }
  if (node && typeof node === 'object') {
    const c = { ...ctx, block: ASM_BLOCKS.has(node.type) ? node.type : ctx.block, codeLines: ctx.codeLines || (node.lang && node.code !== false && Array.isArray(node.lines)) };
    for (const [k, v] of Object.entries(node)) {
      if (typeof v === 'string') { if (TEXT.has(k) || (k === 't' && !c.block && ctx.inFormula) || ctx.key === 'values') yield [`${ptr}/${k}`, v]; continue; } // "values": text shown inside diagram steps
      yield* strings(v, `${ptr}/${k}`, { ...c, key: k, inFormula: node.type === 'formula' || ctx.inFormula, arr: TEXT_ARRAYS.has(k) && !(k === 'lines' && c.codeLines) });
    }
    return;
  }
  if (typeof node === 'string' && ctx.arr) yield [ptr, node];
}
// formula "terms" entries are plain strings or { t, note }; the strings in terms[] are wording, "t" inside a formula is too
function extract(lesson) { const out = {}; for (const [p, s] of strings(lesson, '', {})) if (s.trim() && !/^[\d\s.,+\-*/=()%×÷^<>:;|]+$/.test(s)) out[p] = s; return out; }

const get = (o, ptr) => ptr.split('/').slice(1).reduce((x, k) => (x == null ? x : x[k]), o);
const set = (o, ptr, v) => { const ks = ptr.split('/').slice(1); const last = ks.pop(); ks.reduce((x, k) => x[k], o)[last] = v; };
const tokens = (s) => [...(String(s).match(/\{\w+\}|`[^`]*`/g) || [])].sort().join('\u0000');

function apply(file, lang, mapFile) {
  const LOCALES = loadLocales(ROOT);
  if (!LOCALES[lang]) throw new Error(`no locales/${lang}.json: add the language file first`);
  const base = JSON.parse(fs.readFileSync(file, 'utf8'));
  const tr = JSON.parse(JSON.stringify(base));
  const map = JSON.parse(fs.readFileSync(mapFile, 'utf8')), offered = extract(base), errs = [];
  let n = 0;
  for (const [p, v] of Object.entries(map)) {
    if (!(p in offered)) { errs.push(`${p}: not a translatable string of this lesson`); continue; }
    if (typeof v !== 'string' || !v.trim()) { errs.push(`${p}: empty translation`); continue; }
    if (tokens(v) !== tokens(offered[p])) errs.push(`${p}: {placeholders} and \`code\` spans must stay exactly as in the original ("${offered[p].slice(0, 50)}")`);
    set(tr, p, v); n++;
  }
  const missing = Object.keys(offered).filter((p) => !(p in map)).length;
  if (errs.length) { errs.slice(0, 30).forEach((e) => console.error('ERROR   ' + e)); console.error(`${errs.length} problem(s); nothing written.`); process.exit(1); }
  const pe = lessonParity(base, tr, lang); if (pe.length) { pe.forEach((e) => console.error('ERROR   ' + e)); process.exit(1); }
  const out = overlayFile(file, lang);
  fs.writeFileSync(out, JSON.stringify(tr, null, 2) + '\n');
  console.log(`wrote ${path.relative(ROOT, out)}: ${n} string(s) translated, ${missing} left in the original language`);
}

function status() {
  const LOCALES = loadLocales(ROOT), codes = Object.keys(LOCALES), DEF = codes.find((c) => LOCALES[c]._meta.default);
  console.log(`languages: ${codes.map((c) => c + (c === DEF ? ' (default)' : '')).join(', ')}`);
  for (const { course, topic, file } of lessonFiles(ROOT)) {
    const have = codes.filter((c) => c !== DEF && fs.existsSync(overlayFile(file, c)));
    console.log(`${(course.id + '/' + topic.id).padEnd(72)} ${codes.map((c) => (c === DEF || have.includes(c) ? c : '-')).join(' ')}`);
  }
}

const [cmd, a, b, c] = process.argv.slice(2);
if (cmd === 'extract' && a) { const m = extract(JSON.parse(fs.readFileSync(a, 'utf8'))); const js = JSON.stringify(m, null, 1); if (b) { fs.writeFileSync(b, js + '\n'); console.log(`${Object.keys(m).length} strings -> ${b}`); } else console.log(js); }
else if (cmd === 'apply' && a && b && c) apply(a, b, c);
else if (cmd === 'status') status();
else { console.error('usage: lesson-i18n.js extract <lesson.json> [out.json] | apply <lesson.json> <lang> <strings.json> | status'); process.exit(2); }
