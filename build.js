// Builds the static site into dist/. Every HTML page is encrypted with
// ACCESS_PASSWORD (StatiCrypt), so what gets published reveals nothing
// without the password. Reveal.js assets are public library code.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { validateLesson } = require('./lesson-validate');

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
const jsStr = (v) => JSON.stringify(v).replace(/</g, '\\u003c');
const pageGlobals = (pagePath) => `<script>${PUBLIC_URL ? `window.__PUBLIC_URL__=${jsStr(PUBLIC_URL)};` : ''}${pagePath ? `window.__PAGE_PATH__=${jsStr(pagePath)};` : ''}</script>`;
const QR_ASSETS = (up) => `<link rel="stylesheet" href="${up}assets/qr.css">`;
const QR_SCRIPTS = (up) => `<script src="${up}vendor/qrcode.js"></script><script src="${up}assets/qr.js"></script>`;

// Theme: stored choice, else system preference. Shared by every page (same origin).
const THEME_SNIPPET = `(function(){var t;try{t=localStorage.getItem('sl-theme')}catch(e){}if(!t)t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.setAttribute('data-theme',t);window.slToggleTheme=function(){var n=document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark';document.documentElement.setAttribute('data-theme',n);try{localStorage.setItem('sl-theme',n)}catch(e){}}})();`;
const THEME_BUTTON = `<button class="theme-toggle" type="button" onclick="slToggleTheme()" aria-label="Switch between dark and light mode" title="Switch theme"><svg class="sun" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg><svg class="moon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg></button>`;

// Branded loader, inlined in each page so it shows even if the external CSS never arrives.
const readTemplate = (name) => fs.readFileSync(path.join(ROOT, 'templates', name), 'utf8');
const LOADER_CSS = readTemplate('loader.css');
const LOADER_HEAD = `<style>${LOADER_CSS}</style><noscript><style>.sl-loader{display:none}html.sl-loading,html.sl-loading body{overflow:auto}</style></noscript><script>${readTemplate('loader.js')}</script>`;
const LOADER_INNER = `<div class="sl-loader-box"><div class="sl-mark"><div class="sl-cap"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/></svg></div></div><div class="sl-name">Smart Learning</div><div class="sl-sub">Getting your lessons ready&hellip;</div><div class="sl-slides" aria-hidden="true"><i></i><i></i><i></i></div><div class="sl-fail"><p>This is taking longer than expected. Check your connection and try again.</p><button type="button" onclick="slReload()">Reload page</button></div></div>`;
const LOADER_HTML = `<div id="sl-loader" class="sl-loader" role="status" aria-live="polite" aria-label="Loading">${LOADER_INNER}</div>`;

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const write = (file, text) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
};

fs.rmSync(STAGE, { recursive: true, force: true });
fs.rmSync(DIST, { recursive: true, force: true });

const courses = JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'courses.json'), 'utf8'));

// Interactive lessons (*.lesson.json): validate first so mistakes fail the build with a clear message.
const lessons = new Map(); // "course/topic" -> parsed lesson
let lessonErrors = 0;
for (const c of courses) {
  for (const t of c.topics.filter((x) => x.type === 'lesson')) {
    const name = `${c.id}/${t.id}`;
    const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'content', c.id, `${t.id}.lesson.json`), 'utf8'));
    const { errors, warnings } = validateLesson(data, name, { course: c.title });
    warnings.forEach((w) => console.warn('warning ' + w));
    errors.forEach((e) => console.error('ERROR   ' + e));
    lessonErrors += errors.length;
    lessons.set(name, { ...data, course: c.title });
  }
}
if (lessonErrors) { console.error(`\n${lessonErrors} lesson error(s). Fix them and rebuild.`); process.exit(1); }

// Home page. Links are relative so it works under github.io/<repo>/.
const cards = courses
  .map(
    (c, i) => `<section class="course" style="--h:${(235 + i * 70) % 360}">
<div class="course-head"><div class="badge">${esc(c.title[0])}</div>
<div><h2>${esc(c.title)}</h2><div class="count">${c.topics.length} topic${c.topics.length === 1 ? '' : 's'}</div></div></div>
<p>${esc(c.description)}</p>
<ol class="topics">${c.topics.map((t) => {
  const lesson = t.type === 'lesson' ? lessons.get(`${c.id}/${t.id}`) : null;
  const quiz = lesson && lesson.sections.find((sec) => sec.steps.some((x) => x.type === 'quiz'));
  return `<li><a href="slides/${esc(c.id)}/${esc(t.id)}.html">${esc(t.title)}${lesson ? `<span class="tag">Interactive \u00B7 ${lesson.duration} min</span>` : ''}</a><button class="qrbtn" type="button" data-path="slides/${esc(c.id)}/${esc(t.id)}.html" data-title="${esc(t.title)}"${quiz ? ` data-quiz="${esc(quiz.id)}"` : ''} aria-label="Show QR code for ${esc(t.title)}" title="QR code">QR</button></li>`;
}).join('')}</ol></section>`
  )
  .join('\n');
write(
  path.join(STAGE, 'index.html'),
  `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Smart Learning</title>
<script>${THEME_SNIPPET}</script>${pageGlobals()}${LOADER_HEAD}
<link rel="stylesheet" href="assets/site.css">${QR_ASSETS('')}</head>
<body>${LOADER_HTML}<div class="wrap">
<nav class="nav"><div class="brand-mark"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/></svg></div>Smart Learning<span class="spacer"></span>${THEME_BUTTON}</nav>
<header class="hero"><h1>Learn by <span>slides</span>,<br>one topic at a time.</h1>
<p>Pick a course and open any topic as a slide show. Use the arrow keys to move and press F for fullscreen.</p></header>
<main class="grid">${cards}</main>
<footer>Smart Learning</footer></div>${QR_SCRIPTS('')}
<script>document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('.qrbtn');if(!b||!window.SLQR)return;var p=b.dataset.path,items=[{label:'Lecture',note:'Opens from the beginning',url:function(){return SLQR.resolve(p)}}];if(b.dataset.quiz)items.push({label:'Quiz',note:'Opens the quiz section directly',url:function(){return SLQR.resolve(p)+'#s='+b.dataset.quiz}});SLQR.open(b.dataset.title,items)})</script></body></html>`
);

// One page per topic: interactive lessons (JSON inlined) or Reveal.js slides (Markdown inlined), so all content gets encrypted.
for (const c of courses) {
  for (const t of c.topics) {
    if (t.type === 'lesson') {
      const json = JSON.stringify(lessons.get(`${c.id}/${t.id}`)).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
      write(
        path.join(STAGE, 'slides', c.id, `${t.id}.html`),
        `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(t.title)} - ${esc(c.title)}</title>
<script>${THEME_SNIPPET}</script>${pageGlobals(`slides/${c.id}/${t.id}.html`)}${LOADER_HEAD}
<link rel="stylesheet" href="../../assets/lesson.css">${QR_ASSETS('../../')}</head><body>
${LOADER_HTML}<div id="app"></div>
<script>window.__LESSON__=${json};</script>${QR_SCRIPTS('../../')}<script src="../../assets/sim.js"></script><script src="../../assets/demos-core.js"></script><script src="../../assets/demos-arch.js"></script><script src="../../assets/demos-mem.js"></script><script src="../../assets/lesson.js"></script>
</body></html>`
      );
      continue;
    }
    const md = fs.readFileSync(path.join(ROOT, 'content', c.id, `${t.id}.md`), 'utf8').replace(/<\/textarea/gi, '&lt;/textarea');
    const v = '../../vendor/reveal';
    write(
      path.join(STAGE, 'slides', c.id, `${t.id}.html`),
      `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(t.title)} - ${esc(c.title)}</title>
<script>${THEME_SNIPPET}</script>${pageGlobals(`slides/${c.id}/${t.id}.html`)}${LOADER_HEAD}
<link rel="stylesheet" href="${v}/reveal.css"><link rel="stylesheet" href="${v}/theme/black.css">
<link rel="stylesheet" href="${v}/plugin/highlight/monokai.css">
<link rel="stylesheet" href="../../assets/slides.css">${QR_ASSETS('../../')}</head><body>
${LOADER_HTML}<a class="back-link" href="../../index.html">&larr; Courses</a>${THEME_BUTTON}<button class="qr-fab" type="button" aria-label="Show QR code for this lecture" title="QR code" onclick="SLQR&&SLQR.open('Open this lecture on a phone',[{label:'Lecture',note:'Opens from the beginning',url:function(){return SLQR.pageUrl()}}])">QR</button>${QR_SCRIPTS('../../')}
<div class="reveal"><div class="slides">
<section data-markdown data-separator="^\\n---\\n" data-separator-notes="^Note:"><textarea data-template>${md}</textarea></section>
</div></div>
<script src="${v}/reveal.js"></script><script src="${v}/plugin/markdown.js"></script>
<script src="${v}/plugin/highlight.js"></script><script src="${v}/plugin/notes.js"></script>
<script>Reveal.initialize({ hash: true, slideNumber: 'c/t', plugins: [RevealMarkdown, RevealHighlight, RevealNotes] });</script>
</body></html>`
    );
  }
}

// Fill the theme and loader placeholders in the login template.
const TEMPLATE = path.join(STAGE, '..', '.template.html');
fs.writeFileSync(TEMPLATE, fs.readFileSync(path.join(ROOT, 'templates', 'password.html'), 'utf8')
  .replace('/*THEME_SNIPPET*/', () => THEME_SNIPPET).replace('/*THEME_BUTTON*/', () => THEME_BUTTON)
  .replace('/*LOADER_CSS*/', () => LOADER_CSS).replace('/*LOADER_INNER*/', () => LOADER_INNER));

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
fs.writeFileSync(path.join(DIST, '.nojekyll'), '');
fs.rmSync(TEMPLATE, { force: true });
console.log('Built dist/');
