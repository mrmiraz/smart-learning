// Builds the static site into dist/. Every HTML page is encrypted with
// ACCESS_PASSWORD (StatiCrypt), so what gets published reveals nothing
// without the password. Reveal.js assets are public library code.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const password = process.env.ACCESS_PASSWORD;
if (!password) {
  console.error('ACCESS_PASSWORD is not set (see .env.example).');
  process.exit(1);
}

const ROOT = __dirname;
const STAGE = path.join(ROOT, '.build'); // plaintext, never published
const DIST = path.join(ROOT, 'dist');
const REVEAL = path.join(ROOT, 'node_modules', 'reveal.js', 'dist');

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const write = (file, text) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
};

fs.rmSync(STAGE, { recursive: true, force: true });
fs.rmSync(DIST, { recursive: true, force: true });

const courses = JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'courses.json'), 'utf8'));

// Home page. Links are relative so it works under github.io/<repo>/.
const cards = courses
  .map(
    (c, i) => `<section class="course" style="--h:${(235 + i * 70) % 360}">
<div class="course-head"><div class="badge">${esc(c.title[0])}</div>
<div><h2>${esc(c.title)}</h2><div class="count">${c.topics.length} topic${c.topics.length === 1 ? '' : 's'}</div></div></div>
<p>${esc(c.description)}</p>
<ol class="topics">${c.topics.map((t) => `<li><a href="slides/${esc(c.id)}/${esc(t.id)}.html">${esc(t.title)}</a></li>`).join('')}</ol></section>`
  )
  .join('\n');
write(
  path.join(STAGE, 'index.html'),
  `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Smart Learning</title>
<link rel="stylesheet" href="assets/site.css"></head>
<body><div class="wrap">
<nav class="nav"><div class="brand-mark"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/></svg></div>Smart Learning</nav>
<header class="hero"><h1>Learn by <span>slides</span>,<br>one topic at a time.</h1>
<p>Pick a course and open any topic as a slide show. Use the arrow keys to move and press F for fullscreen.</p></header>
<main class="grid">${cards}</main>
<footer>Smart Learning</footer></div></body></html>`
);

// One slide page per topic, with the Markdown inlined so it gets encrypted too.
for (const c of courses) {
  for (const t of c.topics) {
    const md = fs.readFileSync(path.join(ROOT, 'content', c.id, `${t.id}.md`), 'utf8').replace(/<\/textarea/gi, '&lt;/textarea');
    const v = '../../vendor/reveal';
    write(
      path.join(STAGE, 'slides', c.id, `${t.id}.html`),
      `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(t.title)} - ${esc(c.title)}</title>
<link rel="stylesheet" href="${v}/reveal.css"><link rel="stylesheet" href="${v}/theme/black.css">
<link rel="stylesheet" href="${v}/plugin/highlight/monokai.css">
<link rel="stylesheet" href="../../assets/slides.css"></head><body>
<a class="back-link" href="../../index.html">&larr; Courses</a>
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

// Encrypt all staged pages into dist/ (password passed via env, not argv).
execFileSync(
  path.join(ROOT, 'node_modules', '.bin', 'staticrypt'),
  ['.', '-r', '-t', '../templates/password.html', '-c', '../.staticrypt.json', '-d', '../dist', '--short', '--template-title', 'Smart Learning',
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
fs.writeFileSync(path.join(DIST, '.nojekyll'), '');
console.log('Built dist/');
