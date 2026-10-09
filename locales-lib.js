// Shared by build.js, lesson-validate.js and scripts/i18n-check.js: finds the languages and their per-language files.
//   locales/<code>.json            UI strings for that language (its "_meta" block describes the language)
//   content/x.lesson.json          the lesson in the default language; x.lesson.<code>.json is its translation
//   content/x.md                   same idea for Markdown slides: x.<code>.md
//   content/courses.json           course and topic titles; courses.<code>.json overrides them per language
const fs = require('fs');
const path = require('path');

function loadLocales(root) {
  const dir = path.join(root, 'locales');
  const out = {};
  for (const f of fs.readdirSync(dir).filter((x) => /^[a-z]{2,3}(-[A-Za-z0-9]+)?\.json$/.test(x)).sort()) {
    const code = f.replace(/\.json$/, '');
    let data;
    try { data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (e) { throw new Error(`locales/${f}: ${e.message}`); }
    if (!data._meta || !data._meta.name) throw new Error(`locales/${f}: needs a "_meta" block with at least "name"`);
    out[code] = data;
  }
  const codes = Object.keys(out);
  if (!codes.length) throw new Error('locales/: no language files found');
  const defaults = codes.filter((c) => out[c]._meta.default);
  if (defaults.length !== 1) throw new Error(`locales/: exactly one language must have "_meta": { "default": true } (found ${defaults.length})`);
  return out;
}

// x.lesson.json + "bn" -> x.lesson.bn.json ; x.md + "bn" -> x.bn.md
const overlayFile = (file, lang) => file.replace(/(\.[^./\\]+)$/, `.${lang}$1`);

module.exports = { loadLocales, overlayFile };
