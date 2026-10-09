// Checks the language files (locales/*.json) against each other and against the code.
//   errors:   a key used in code but missing from the default language; a key in another language that the default lacks
//             (usually a typo); a {placeholder} that differs between languages.
//   warnings: keys a language has not translated yet (they fall back to the default); keys nothing seems to use.
// Run with `npm run check` (also part of the build's checks). Exit code 1 on errors.
const fs = require('fs');
const path = require('path');
const { loadLocales } = require('../locales-lib');

const ROOT = path.join(__dirname, '..');
const LOCALES = loadLocales(ROOT);
const codes = Object.keys(LOCALES);
const DEF = codes.find((c) => LOCALES[c]._meta.default);
const errors = [], warnings = [];

const base = (k) => k.replace(/_(zero|one|two|few|many|other)$/, '');
const keysOf = (c) => Object.keys(LOCALES[c]).filter((k) => k !== '_meta');
const vars = (s) => new Set((String(s).match(/\{(\w+)\}/g) || []));
const defBases = new Set(keysOf(DEF).map(base));

// 1. languages against the default
for (const c of codes.filter((x) => x !== DEF)) {
  const own = new Set(keysOf(c).map(base));
  keysOf(c).filter((k) => !defBases.has(base(k))).forEach((k) => errors.push(`locales/${c}.json: "${k}" does not exist in ${DEF}.json`));
  const missing = [...defBases].filter((k) => !own.has(k));
  if (missing.length) warnings.push(`locales/${c}.json: ${missing.length} key(s) not translated yet (shown in ${LOCALES[DEF]._meta.name}): ${missing.slice(0, 8).join(', ')}${missing.length > 8 ? ', …' : ''}`);
  const union = (loc, b) => { const out = new Set(); Object.keys(loc).filter((k) => k !== '_meta' && base(k) === b).forEach((k) => vars(loc[k]).forEach((v) => out.add(v))); return out; };
  for (const b of defBases) {
    if (!own.has(b)) continue;
    const a = union(LOCALES[DEF], b), t = union(LOCALES[c], b);
    const diff = [...a].filter((v) => !t.has(v)).concat([...t].filter((v) => !a.has(v)));
    if (diff.length) errors.push(`locales/${c}.json: "${b}" uses different placeholders than ${DEF}.json (${[...new Set(diff)].join(' ')})`);
  }
}

// 2. code against the default language
const files = [];
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
  if (e.name === 'node_modules' || e.name.startsWith('.') || ['dist', 'content', 'locales', 'docs', 'test'].includes(e.name)) return;
  const p = path.join(d, e.name);
  if (e.isDirectory()) walk(p); else if (/\.(js|html)$/.test(e.name) && e.name !== 'i18n-check.js') files.push(p);
});
walk(ROOT);
const used = new Set(), prefixes = new Set(), literal = new Set();
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ''); // block comments may show example keys
  for (const m of src.matchAll(/\b(?:t|T|tm|L10n|lookup)\(\s*['"`]([\w.]+)['"`]/g)) { if (m[1].endsWith('.')) prefixes.add(m[1]); else used.add(m[1]); }
  for (const m of src.matchAll(/['"`]([a-z][a-zA-Z0-9]*(?:\.[a-zA-Z0-9]+)+)['"`]/g)) literal.add(m[1]); // any string that is exactly a key (ternaries, tables)
  for (const m of src.matchAll(/data-i18n="([\w.]+)"/g)) used.add(m[1]);
  for (const m of src.matchAll(/data-i18n-attr(?:["']\s*:\s*|=)["'`]([^"'`]+)["'`]/g)) m[1].split(',').forEach((p) => { const k = p.split(':')[1]; if (k && /^[\w.]+$/.test(k)) used.add(k.trim()); });
  for (const m of src.matchAll(/['"`]([a-z][\w]*(?:\.[\w]+)*\.)(?:['"`]|\$\{)/g)) prefixes.add(m[1]); // dynamic keys such as 'badge.' + id
  for (const m of src.matchAll(/\bchk\(\s*'([\w.]+)'/g)) used.add(m[1]);
  for (const m of src.matchAll(/\[\s*'([a-z]+\.[\w.]+)'\s*,/g)) used.add(m[1]); // [key, value] tables such as the settings pace list
  for (const m of src.matchAll(/'tb\.'\s*\+|`tb\.\$\{/g)) prefixes.add('tb.');
  for (const m of src.matchAll(/'help\.'\s*\+\s*d/g)) prefixes.add('help.');
}
const defAll = new Set(keysOf(DEF));
for (const k of used) if (!defAll.has(k) && ![...defAll].some((d) => base(d) === k || d.startsWith(k))) errors.push(`code uses "${k}" but locales/${DEF}.json has no such key`);
const unused = [...defBases].filter((k) => !used.has(k) && !literal.has(k) && ![...used].some((u) => k.startsWith(u)) && ![...prefixes].some((p) => k.startsWith(p)));
if (unused.length) warnings.push(`locales/${DEF}.json: ${unused.length} key(s) no code seems to use: ${unused.slice(0, 12).join(', ')}${unused.length > 12 ? ', …' : ''}`);

// 3. content translations: catalog titles, and files for languages that do not exist
const { overlayFile } = require('../locales-lib');
const courses = JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'courses.json'), 'utf8'));
for (const c of codes.filter((x) => x !== DEF)) {
  const f = overlayFile(path.join(ROOT, 'content', 'courses.json'), c);
  const rel = path.relative(ROOT, f);
  if (!fs.existsSync(f)) { warnings.push(`${rel}: missing, so course and topic titles show in ${LOCALES[DEF]._meta.name}`); continue; }
  let o; try { o = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { errors.push(`${rel}: ${e.message}`); continue; }
  for (const id of Object.keys(o)) if (!courses.some((x) => x.id === id)) errors.push(`${rel}: unknown course "${id}"`);
  for (const course of courses) {
    const oc = o[course.id]; if (!oc) { warnings.push(`${rel}: course "${course.id}" not translated`); continue; }
    for (const id of Object.keys(oc.topics || {})) if (!course.topics.some((t) => t.id === id)) errors.push(`${rel}: unknown topic "${course.id}/${id}"`);
    const miss = course.topics.filter((t) => !(oc.topics || {})[t.id]).length; if (miss) warnings.push(`${rel}: ${miss} topic title(s) of "${course.id}" not translated`);
  }
}
const stray = [];
for (const c of courses) for (const f of fs.readdirSync(path.join(ROOT, 'content', c.id))) {
  const m = /\.([a-z]{2,3}(?:-[A-Za-z0-9]+)?)\.(lesson\.json|md)$|\.lesson\.([a-z]{2,3}(?:-[A-Za-z0-9]+)?)\.json$/.exec(f.replace(/\.lesson\.json$/, '.lesson.json'));
  const code = m && (m[3] || m[1]); if (code && !LOCALES[code]) stray.push(`${c.id}/${f}`);
}
if (stray.length) warnings.push(`translated content for a language with no locales/<code>.json (ignored): ${stray.join(', ')}`);

warnings.forEach((w) => console.warn('warning ' + w));
errors.forEach((e) => console.error('ERROR   ' + e));
console.log(`i18n: ${codes.length} language(s) (${codes.join(', ')}), ${defBases.size} keys, ${errors.length} error(s), ${warnings.length} warning(s)`);
process.exit(errors.length ? 1 : 0);
