const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { lessonParity } = require('../lesson-validate');
const { loadLocales, overlayFile } = require('../locales-lib');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'assets', 'i18n.js'), 'utf8');
const LOCALES = {
  en: { _meta: { name: 'English', short: 'EN', default: true, numberLocale: 'en-US' }, 'a.hello': 'Hello {name}', 'a.only': 'English only', 'a.count_one': '{n} item', 'a.count_other': '{n} items', 'a.n': 'Total {n}' },
  bn: { _meta: { name: 'বাংলা', short: 'বাংলা', htmlLang: 'bn', numberLocale: 'en-US', numerals: 'beng' }, 'a.hello': 'হ্যালো {name}', 'a.count_other': '{n}টি আইটেম' },
};
function load({ stored, search = '', langs = ['en-US'] } = {}) {
  const store = stored ? { 'sl-lang': stored } : {};
  const attrs = {};
  const win = {
    __LOCALES__: LOCALES, addEventListener() {}, removeEventListener() {},
    localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = v; } },
    navigator: { languages: langs }, location: { search },
    document: { readyState: 'complete', documentElement: { setAttribute: (k, v) => { attrs[k] = v; } }, querySelectorAll: () => [], createElement: () => ({ setAttribute() {}, appendChild() {}, addEventListener() {} }) },
  };
  win.window = win;
  vm.runInNewContext(SRC, { ...win, Intl, console });
  return { SL: win.SL, store, attrs };
}

test('language comes from storage, then ?lang, then the browser, then the default', () => {
  assert.equal(load().SL.lang, 'en');
  assert.equal(load({ stored: 'bn' }).SL.lang, 'bn');
  assert.equal(load({ langs: ['bn-BD', 'en'] }).SL.lang, 'bn');
  assert.equal(load({ search: '?lang=bn' }).SL.lang, 'bn');
  assert.equal(load({ stored: 'xx', langs: ['fr'] }).SL.lang, 'en'); // unknown languages are ignored
});

test('t() fills placeholders, falls back to the default language, and returns the key when unknown', () => {
  const { SL } = load({ stored: 'bn' });
  assert.equal(SL.t('a.hello', { name: 'রিয়া' }), 'হ্যালো রিয়া');
  assert.equal(SL.t('a.only'), 'English only'); // not translated: default language
  assert.equal(SL.t('a.missing'), 'a.missing');
});

test('plural forms are picked per language, and numbers use the language numbering system', () => {
  const en = load().SL; assert.equal(en.t('a.count', { n: 1 }), '1 item'); assert.equal(en.t('a.count', { n: 3 }), '3 items'); assert.equal(en.t('a.n', { n: 1234 }), 'Total 1,234');
  const bn = load({ stored: 'bn' }).SL; assert.equal(bn.t('a.count', { n: 1 }), '১টি আইটেম'); // beng numerals when the locale asks for them
});

test('setLang stores the choice, updates <html lang> and notifies listeners', () => {
  const { SL, store, attrs } = load(); const seen = [];
  SL.onChange((c) => seen.push(c)); SL.setLang('bn'); SL.setLang('bn'); SL.setLang('zz');
  assert.deepEqual(seen, ['bn']); assert.equal(store['sl-lang'], 'bn'); assert.equal(attrs.lang, 'bn'); assert.equal(SL.t('a.hello', { name: 'x' }), 'হ্যালো x');
});

test('the shipped locale files are consistent (placeholders, keys)', () => {
  const L = loadLocales(path.join(__dirname, '..')); const def = Object.keys(L).find((c) => L[c]._meta.default);
  const vars = (s) => [...new Set(s.match(/\{\w+\}/g) || [])].sort().join();
  for (const code of Object.keys(L).filter((c) => c !== def)) for (const k of Object.keys(L[code]).filter((x) => x !== '_meta')) {
    const base = k.replace(/_(zero|one|two|few|many|other)$/, '');
    const en = Object.keys(L[def]).filter((x) => x === k || x.replace(/_(zero|one|two|few|many|other)$/, '') === base);
    assert.ok(en.length, `${code}: ${k} is not an English key`);
    const enVars = new Set(en.flatMap((x) => vars(L[def][x]).split(',').filter(Boolean))); const tr = vars(L[code][k]).split(',').filter(Boolean);
    tr.forEach((v) => assert.ok(enVars.has(v), `${code}: ${k} uses ${v} which English does not`));
  }
});

test('lessonParity: wording may differ, structure may not', () => {
  const base = { id: 'x', duration: 60, sections: [{ id: 's', label: 'One', steps: [{ type: 'mcq', concept: 'c', question: 'Q?', options: ['a', 'b'], answer: 1 }] }] };
  const ok = JSON.parse(JSON.stringify(base)); ok.sections[0].label = 'এক'; ok.sections[0].steps[0].question = 'প্রশ্ন?'; ok.sections[0].steps[0].options = ['ক', 'খ'];
  assert.deepEqual(lessonParity(base, ok), []);
  const bad = JSON.parse(JSON.stringify(ok)); bad.sections[0].steps[0].answer = 0; bad.sections[0].steps[0].options.pop(); bad.sections[0].steps[0].concept = 'd'; bad.sections[0].id = 'z';
  const errs = lessonParity(base, bad).join('\n');
  assert.match(errs, /answer: must equal the original/); assert.match(errs, /options: has 1 item/); assert.match(errs, /concept: must be identical/); assert.match(errs, /\.id: must be identical/);
});

test('overlayFile names translated files next to the original', () => {
  assert.equal(overlayFile('content/a/01-x.lesson.json', 'bn'), 'content/a/01-x.lesson.bn.json');
  assert.equal(overlayFile('content/a/01-x.md', 'bn'), 'content/a/01-x.bn.md');
  assert.equal(overlayFile('content/courses.json', 'hi'), 'content/courses.hi.json');
});
