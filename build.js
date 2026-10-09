// Builds the static site into dist/. Every HTML page is encrypted with
// ACCESS_PASSWORD (StatiCrypt), so what gets published reveals nothing
// without the password. Reveal.js assets are public library code.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { validateLesson, lessonParity } = require('./lesson-validate');
const { loadLocales, overlayFile } = require('./locales-lib');

const password = process.env.ACCESS_PASSWORD;
if (!password) {
  console.error('ACCESS_PASSWORD is not set (see .env.example).');
  process.exit(1);
}

const ROOT = __dirname;
const STAGE = path.join(ROOT, '.build'); // plaintext, never published
const DIST = path.join(ROOT, 'dist');
const REVEAL = path.join(ROOT, 'node_modules', 'reveal.js', 'dist');
const QRLIB = path.join(ROOT, 'node_modules', 'qrcode-generator', 'dist', 'qrcode.js');

// Optional site address baked into the QR codes (for example https://name.github.io/repo/). Without it the
// codes use whatever address the page is opened at, and the teacher can override it in the QR dialog.
let PUBLIC_URL = (process.env.PUBLIC_URL || '').trim();
if (PUBLIC_URL && !/^https?:\/\//i.test(PUBLIC_URL)) { console.warn('PUBLIC_URL ignored: it must start with http:// or https://'); PUBLIC_URL = ''; }
if (PUBLIC_URL && !PUBLIC_URL.endsWith('/')) PUBLIC_URL += '/';
// Languages: every locales/<code>.json is a language. UI strings come from there; lessons, catalog titles and Markdown slides
// may have a translated file next to the original (see docs/languages.md). Anything untranslated falls back to the default language.
const LOCALES = loadLocales(ROOT);
const LANGS = Object.keys(LOCALES);
const DEF = LANGS.find((c) => LOCALES[c]._meta.default) || LANGS[0];
const localeSubset = (prefixes) => Object.fromEntries(LANGS.map((c) => [c, Object.fromEntries(Object.entries(LOCALES[c]).filter(([k]) => k === '_meta' || prefixes.some((p) => k.startsWith(p))))]));
const jsStr = (v) => JSON.stringify(v).replace(/</g, '\\u003c');
const pageGlobals = (pagePath) => `<script>${PUBLIC_URL ? `window.__PUBLIC_URL__=${jsStr(PUBLIC_URL)};` : ''}${pagePath ? `window.__PAGE_PATH__=${jsStr(pagePath)};` : ''}</script>`;
const I18N_HEAD = (up) => `<script src="${up}assets/locales.js"></script><script src="${up}assets/i18n.js"></script>`;
const QR_ASSETS = (up) => `<link rel="stylesheet" href="${up}assets/i18n.css"><link rel="stylesheet" href="${up}assets/nav.css"><link rel="stylesheet" href="${up}assets/qr.css">`;
const QR_SCRIPTS = (up) => `<script src="${up}vendor/qrcode.js"></script><script src="${up}assets/qr.js"></script>`;

// Theme: stored choice, else system preference. Shared by every page (same origin).
const THEME_SNIPPET = `(function(){var t;try{t=localStorage.getItem('sl-theme')}catch(e){}if(!t)t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.setAttribute('data-theme',t);window.slToggleTheme=function(){var n=document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark';document.documentElement.setAttribute('data-theme',n);try{localStorage.setItem('sl-theme',n)}catch(e){}}})();`;
const THEME_BUTTON = `<button class="theme-toggle" type="button" onclick="slToggleTheme()" aria-label="Switch between dark and light mode" title="Switch between dark and light mode" data-i18n-attr="aria-label:theme.switch,title:theme.switch"><svg class="sun" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg><svg class="moon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg></button>`;

// Branded loader, inlined in each page so it shows even if the external CSS never arrives.
// Top navigation bar (home page and slide pages): brand, Home, a Courses dropdown (filled by assets/nav.js), language, theme.
const SITENAV = (up, { wide = false, qr = false } = {}) => `<header class="sitenav${wide ? ' wide' : ''}"><div class="sitenav-in">
<a class="sn-brand" href="${up}index.html"><span class="brand-mark"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/></svg></span><span>Smart Learning</span></a>
<nav class="sn-links" aria-label="Main menu" data-i18n-attr="aria-label:menu.label"><a class="sn-link sn-home" href="${up}index.html" data-i18n="menu.home">Home</a>
<button class="sn-link sn-courses" type="button" aria-haspopup="true" aria-expanded="false"><span data-i18n="menu.courses">Courses</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button></nav>
<span class="sn-spacer"></span>${qr ? `<button class="sn-qr" type="button" aria-label="Show QR code for this lecture" title="QR code" data-i18n-attr="aria-label:slides.qrAria,title:slides.qrTitle" onclick="SLQR&&SLQR.open(SL.t('slides.qrOpen'),[{label:SL.t('qr.lecture'),note:SL.t('qr.lectureNote'),url:function(){return SLQR.pageUrl()}}])" data-i18n="home.qrShort">QR</button>` : ''}<span data-lang-switch></span>${THEME_BUTTON}<button class="sn-more" type="button" data-mode="more" aria-haspopup="true" aria-expanded="false" aria-label="More" title="More" data-i18n-attr="aria-label:menu.more,title:menu.more"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg></button></div></header>`;
const NAV_SCRIPTS = (up, current, course) => `<script>window.__NAV__=${jsStr({ up, current, course, courses: navCourses })};</script><script src="${up}assets/nav.js"></script>`;
const readTemplate = (name) => fs.readFileSync(path.join(ROOT, 'templates', name), 'utf8');
const LOADER_CSS = readTemplate('loader.css');
const LOADER_HEAD = `<style>${LOADER_CSS}</style><noscript><style>.sl-loader{display:none}html.sl-loading,html.sl-loading body{overflow:auto}</style></noscript><script>${readTemplate('loader.js')}</script>`;
const LOADER_INNER = `<div class="sl-loader-box"><div class="sl-mark"><div class="sl-cap"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/></svg></div></div><div class="sl-name">Smart Learning</div><div class="sl-sub" data-i18n="loader.sub">Getting your lessons ready&hellip;</div><div class="sl-slides" aria-hidden="true"><i></i><i></i><i></i></div><div class="sl-fail"><p data-i18n="loader.fail">This is taking longer than expected. Check your connection and try again.</p><button type="button" onclick="slReload()" data-i18n="loader.reload">Reload page</button></div></div>`;
const LOADER_HTML = `<div id="sl-loader" class="sl-loader" role="status" aria-live="polite" aria-label="Loading" data-i18n-attr="aria-label:loader.label">${LOADER_INNER}</div>`;

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const write = (file, text) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
};

fs.rmSync(STAGE, { recursive: true, force: true });
fs.rmSync(DIST, { recursive: true, force: true });

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const courses = readJson(path.join(ROOT, 'content', 'courses.json'));

// Catalog titles per language: content/courses.<lang>.json = { "<courseId>": { title, description, topics: { "<topicId>": "title" } } }.
const catalogOverlay = {};
for (const code of LANGS) {
  const f = overlayFile(path.join(ROOT, 'content', 'courses.json'), code);
  if (code !== DEF && fs.existsSync(f)) catalogOverlay[code] = readJson(f);
}
const courseText = (c, code) => { const o = (catalogOverlay[code] || {})[c.id] || {}; return { title: o.title || c.title, description: o.description || c.description }; };
const topicTitle = (c, t, code) => ((((catalogOverlay[code] || {})[c.id] || {}).topics || {})[t.id]) || t.title;

// Interactive lessons (*.lesson.json): validate first so mistakes fail the build with a clear message.
// lessons: "course/topic" -> { <lang>: lesson }. The default language is the original file; others are translations that
// must match its structure (lessonParity), and a missing translation simply falls back to the default.
const lessons = new Map();
let lessonErrors = 0;
for (const c of courses) {
  for (const t of c.topics.filter((x) => x.type === 'lesson')) {
    const name = `${c.id}/${t.id}`;
    const file = path.join(ROOT, 'content', c.id, `${t.id}.lesson.json`);
    const byLang = {};
    for (const code of LANGS) {
      const f = code === DEF ? file : overlayFile(file, code);
      if (!fs.existsSync(f)) continue;
      const label = code === DEF ? name : `${name} [${code}]`;
      const data = readJson(f);
      const { errors, warnings } = validateLesson(data, label, { course: courseText(c, code).title });
      (code === DEF ? warnings : []).forEach((w) => console.warn('warning ' + w));
      errors.forEach((e) => console.error('ERROR   ' + e));
      lessonErrors += errors.length;
      if (code !== DEF && byLang[DEF]) { const pe = lessonParity(byLang[DEF], data, label); pe.forEach((e) => console.error('ERROR   ' + e)); lessonErrors += pe.length; }
      byLang[code] = { ...data, course: courseText(c, code).title };
    }
    lessons.set(name, byLang);
  }
}
if (lessonErrors) { console.error(`\n${lessonErrors} lesson error(s). Fix them and rebuild.`); process.exit(1); }

// Home page data for every language; assets/home.js draws it, so the language can change without a reload.
// Links are relative so it works under github.io/<repo>/.
const homeData = { courses: Object.fromEntries(LANGS.map((code) => [code, courses.map((c) => ({
  id: c.id, path: `courses/${c.id}.html`, ...courseText(c, code),
  topics: c.topics.map((t) => {
    const lesson = t.type === 'lesson' ? lessons.get(`${c.id}/${t.id}`)[DEF] : null;
    const quiz = lesson && lesson.sections.find((sec) => sec.steps.some((x) => x.type === 'quiz'));
    return { path: `slides/${c.id}/${t.id}.html`, title: topicTitle(c, t, code), duration: lesson ? lesson.duration : null, quiz: quiz ? quiz.id : null };
  }),
}))])) };
const navCourses = Object.fromEntries(LANGS.map((code) => [code, homeData.courses[code].map((c) => ({ id: c.id, path: c.path, title: c.title }))]));
write(
  path.join(STAGE, 'index.html'),
  `<!doctype html><html lang="${esc(LOCALES[DEF]._meta.htmlLang || DEF)}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Smart Learning</title>
<script>${THEME_SNIPPET}</script>${pageGlobals()}${I18N_HEAD('')}${LOADER_HEAD}
<link rel="stylesheet" href="assets/site.css">${QR_ASSETS('')}</head>
<body>${LOADER_HTML}${SITENAV('')}<div class="wrap">
<header class="hero"><h1 id="hero"></h1><p data-i18n="home.intro"></p></header>
<main class="grid" id="grid"></main>
<footer data-i18n="home.footer"></footer></div>${QR_SCRIPTS('')}${NAV_SCRIPTS('', 'index.html', '')}
<script>window.__HOME__=${jsStr(homeData)};</script><script src="assets/home.js"></script></body></html>`
);

// One page per course: its topics (drawn by assets/course.js from the same data as the home page), so a new course gets a proper view by itself.
for (const [i, c] of courses.entries()) {
  write(
    path.join(STAGE, 'courses', `${c.id}.html`),
    `<!doctype html><html lang="${esc(LOCALES[DEF]._meta.htmlLang || DEF)}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(c.title)} - Smart Learning</title>
<script>${THEME_SNIPPET}</script>${pageGlobals(`courses/${c.id}.html`)}${I18N_HEAD('../')}${LOADER_HEAD}
<link rel="stylesheet" href="../assets/site.css">${QR_ASSETS('../')}</head>
<body>${LOADER_HTML}${SITENAV('../')}<div class="wrap">
<div class="crumbs"><a href="../index.html" data-i18n="course.all">&larr; All courses</a></div>
<main id="course" data-id="${esc(c.id)}" data-index="${i}"></main>
<footer data-i18n="home.footer"></footer></div>${QR_SCRIPTS('../')}${NAV_SCRIPTS('../', `courses/${c.id}.html`, c.id)}
<script>window.__HOME__=${jsStr(homeData)};</script><script src="../assets/course.js"></script></body></html>`
  );
}

// One page per topic: interactive lessons (JSON for every language inlined) or Reveal.js slides (Markdown inlined), so all content gets encrypted.
const SCRIPT_ORDER = (up) => `${QR_SCRIPTS(up)}<script src="${up}assets/sim.js"></script><script src="${up}assets/demos-core.js"></script><script src="${up}assets/demos-arch.js"></script><script src="${up}assets/demos-mem.js"></script><script src="${up}assets/lesson.js"></script>`;
for (const c of courses) {
  for (const t of c.topics) {
    if (t.type === 'lesson') {
      const byLang = lessons.get(`${c.id}/${t.id}`);
      const json = jsStr(byLang).replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
      write(
        path.join(STAGE, 'slides', c.id, `${t.id}.html`),
        `<!doctype html><html lang="${esc(LOCALES[DEF]._meta.htmlLang || DEF)}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(t.title)} - ${esc(c.title)}</title>
<script>${THEME_SNIPPET}</script>${pageGlobals(`slides/${c.id}/${t.id}.html`)}${I18N_HEAD('../../')}${LOADER_HEAD}
<link rel="stylesheet" href="../../assets/lesson.css">${QR_ASSETS('../../')}</head><body>
${LOADER_HTML}<div id="app"></div>
<script>window.__LESSONS__=${json};</script>${NAV_SCRIPTS('../../', `slides/${c.id}/${t.id}.html`, c.id)}${SCRIPT_ORDER('../../')}
</body></html>`
      );
      continue;
    }
    const mdFile = path.join(ROOT, 'content', c.id, `${t.id}.md`);
    const slides = LANGS.map((code) => [code, code === DEF ? mdFile : overlayFile(mdFile, code)]).filter(([, f]) => fs.existsSync(f))
      .map(([code, f]) => `<section data-markdown data-lang="${esc(code)}" data-separator="^\\n---\\n" data-separator-notes="^Note:"><textarea data-template>${fs.readFileSync(f, 'utf8').replace(/<\/textarea/gi, '&lt;/textarea')}</textarea></section>`).join('\n');
    const titles = Object.fromEntries(LANGS.map((code) => [code, `${topicTitle(c, t, code)} - ${courseText(c, code).title}`]));
    const v = '../../vendor/reveal';
    write(
      path.join(STAGE, 'slides', c.id, `${t.id}.html`),
      `<!doctype html><html lang="${esc(LOCALES[DEF]._meta.htmlLang || DEF)}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(t.title)} - ${esc(c.title)}</title>
<script>${THEME_SNIPPET}</script>${pageGlobals(`slides/${c.id}/${t.id}.html`)}${I18N_HEAD('../../')}${LOADER_HEAD}
<link rel="stylesheet" href="${v}/reveal.css"><link rel="stylesheet" href="${v}/theme/black.css">
<link rel="stylesheet" href="${v}/plugin/highlight/monokai.css">
<link rel="stylesheet" href="../../assets/slides.css">${QR_ASSETS('../../')}</head><body>
${LOADER_HTML}${SITENAV('../../', { wide: true, qr: true })}${QR_SCRIPTS('../../')}${NAV_SCRIPTS('../../', `slides/${c.id}/${t.id}.html`, c.id)}
<div class="reveal"><div class="slides">
${slides}
</div></div>
<script src="${v}/reveal.js"></script><script src="${v}/plugin/markdown.js"></script>
<script src="${v}/plugin/highlight.js"></script><script src="${v}/plugin/notes.js"></script>
<script>(function(){var titles=${jsStr(titles)},secs=[].slice.call(document.querySelectorAll('section[data-lang]')),have=secs.map(function(s){return s.getAttribute('data-lang')});
var want=SL.lang,use=have.indexOf(want)>=0?want:SL.defaultLang;secs.forEach(function(s){if(s.getAttribute('data-lang')!==use)s.parentNode.removeChild(s)});
function name(c){return(SL.langs.filter(function(l){return l.code===c})[0]||{}).name||c}
document.title=titles[use]||document.title;
if(use!==want){var n=document.createElement('div');n.className='lang-note';n.textContent=SL.t('slides.notAvailable',{lang:name(want),fallback:name(use)});document.body.appendChild(n);setTimeout(function(){n.remove()},6000)}
SL.onChange(function(){location.reload()});
Reveal.initialize({ hash: true, slideNumber: 'c/t', plugins: [RevealMarkdown, RevealHighlight, RevealNotes] });})();</script>
</body></html>`
    );
  }
}

// Fill the theme and loader placeholders in the login template.
const TEMPLATE = path.join(STAGE, '..', '.template.html');
fs.writeFileSync(TEMPLATE, fs.readFileSync(path.join(ROOT, 'templates', 'password.html'), 'utf8')
  .replace('/*THEME_SNIPPET*/', () => THEME_SNIPPET).replace('/*THEME_BUTTON*/', () => THEME_BUTTON)
  .replace('/*LOADER_CSS*/', () => LOADER_CSS).replace('/*LOADER_INNER*/', () => LOADER_INNER)
  .replace('/*I18N_CSS*/', () => fs.readFileSync(path.join(ROOT, 'assets', 'i18n.css'), 'utf8'))
  // the login page cannot load other files before the password is entered, so it carries its own small language bundle
  .replace('/*I18N_SCRIPTS*/', () => `window.__LOCALES__=${jsStr(localeSubset(['login.', 'loader.', 'lang.', 'theme.']))};${fs.readFileSync(path.join(ROOT, 'assets', 'i18n.js'), 'utf8')}`));

// Encrypt all staged pages into dist/ (password passed via env, not argv).
execFileSync(
  path.join(ROOT, 'node_modules', '.bin', 'staticrypt'),
  ['.', '-r', '-t', '../.template.html', '-c', '../.staticrypt.json', '-d', '../dist', '--short', '--template-title', 'Smart Learning',
   '--template-instructions', 'Enter the access password to open your courses.',
   '--template-button', 'Continue', '--template-error', 'Incorrect password. Please try again.', '--remember', '365'],
  { cwd: STAGE, stdio: 'inherit', env: { ...process.env, STATICRYPT_PASSWORD: password } }
);

// StatiCrypt nests output under the input dir name; flatten it into dist/.
const nested = path.join(DIST, path.basename(STAGE));
if (fs.existsSync(nested)) {
  fs.cpSync(nested, DIST, { recursive: true });
  fs.rmSync(nested, { recursive: true, force: true });
}

// Public static files: site CSS and reveal.js library.
fs.cpSync(path.join(ROOT, 'assets'), path.join(DIST, 'assets'), { recursive: true });
fs.cpSync(REVEAL, path.join(DIST, 'vendor', 'reveal'), { recursive: true });
fs.copyFileSync(QRLIB, path.join(DIST, 'vendor', 'qrcode.js'));
// All UI strings for every language (public: no lesson content), loaded by every page as assets/locales.js.
fs.writeFileSync(path.join(DIST, 'assets', 'locales.js'), `window.__LOCALES__=${jsStr(LOCALES)};`);
fs.writeFileSync(path.join(DIST, '.nojekyll'), '');
fs.rmSync(TEMPLATE, { force: true });
console.log('Built dist/');
