#!/usr/bin/env node
// Smoke test for a lesson: validates it, opens it in headless Chrome, visits every screen, exercises every demo control,
// and reports errors. Optionally saves screenshots. No password or build needed.
//   node scripts/smoke.js <lesson.json | lesson-id> [--shots 3,10,20] [--out dir] [--dark] [--width 1280] [--height 800] [--lang bn]
//   --lang opens the page in that language (its translated lesson file if there is one, else the default language's lesson).
const fs = require('fs'), os = require('os'), path = require('path'), http = require('http'), cp = require('child_process');
const { validateLesson, lessonParity } = require('../lesson-validate');
const { loadLocales, overlayFile } = require('../locales-lib');
const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2); const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const target = args.find((a) => !a.startsWith('--') && a !== flag('--shots') && a !== flag('--out') && a !== flag('--width') && a !== flag('--height') && a !== flag('--lang'));
if (!target) { console.error('usage: node scripts/smoke.js <lesson.json | lesson-id> [--shots 3,10] [--out dir] [--dark]'); process.exit(2); }
function resolveLesson(t) {
  if (fs.existsSync(t)) return path.resolve(t);
  const cdir = path.join(ROOT, 'content');
  for (const c of fs.readdirSync(cdir)) { const f = path.join(cdir, c, t.replace(/\.lesson\.json$/, '') + '.lesson.json'); if (fs.existsSync(f)) return f; }
  for (const c of fs.readdirSync(cdir)) { const d = path.join(cdir, c); if (!fs.statSync(d).isDirectory()) continue; const m = fs.readdirSync(d).find((x) => x.includes(t) && x.endsWith('.lesson.json')); if (m) return path.join(d, m); }
  throw new Error('lesson not found: ' + t);
}
const file = resolveLesson(target); const lesson = JSON.parse(fs.readFileSync(file, 'utf8')); lesson.course = lesson.course || 'Smoke test';
const course = path.basename(path.dirname(file)) === 'computer-architecture' ? 'Computer Architecture' : undefined;
const v = validateLesson(lesson, path.basename(file), { course }); v.warnings.forEach((w) => console.log('warning ' + w)); v.errors.forEach((e) => console.log('ERROR   ' + e));
if (v.errors.length) { console.log(`\nvalidation failed (${v.errors.length} error(s))`); process.exit(1); }
const LOCALES = loadLocales(ROOT); const LANG = flag('--lang') || Object.keys(LOCALES).find((c) => LOCALES[c]._meta.default);
if (!LOCALES[LANG]) { console.log('unknown --lang ' + LANG + '; available: ' + Object.keys(LOCALES).join(', ')); process.exit(2); }
const lessons = { [Object.keys(LOCALES).find((c) => LOCALES[c]._meta.default)]: lesson };
for (const code of Object.keys(LOCALES)) { const f = overlayFile(file, code); if (!lessons[code] && fs.existsSync(f)) { const tr = JSON.parse(fs.readFileSync(f, 'utf8')); tr.course = lesson.course; const pe = lessonParity(lesson, tr, code); pe.forEach((e) => console.log('ERROR   ' + e)); if (pe.length) process.exit(1); lessons[code] = tr; } }

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'smoke-'));
fs.cpSync(path.join(ROOT, 'assets'), path.join(tmp, 'assets'), { recursive: true });
fs.mkdirSync(path.join(tmp, 'vendor')); fs.copyFileSync(path.join(ROOT, 'node_modules', 'qrcode-generator', 'dist', 'qrcode.js'), path.join(tmp, 'vendor', 'qrcode.js'));
fs.writeFileSync(path.join(tmp, 'assets', 'locales.js'), `window.__LOCALES__=${JSON.stringify(LOCALES).replace(/</g, '\\u003c')};`);
const json = JSON.stringify(lessons).replace(/</g, '\\u003c');
const harness = `
window.__errs=[];addEventListener('error',e=>__errs.push(e.message+' @'+(e.filename||'').split('/').pop()+':'+e.lineno));
addEventListener('unhandledrejection',e=>__errs.push('promise: '+e.reason));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
addEventListener('load',async()=>{await wait(500);const L=window.__lesson,out={screens:L.steps.length,problems:[],demos:0};const shot=/shot=(\\d+)/.exec(location.hash);
 try{L.begin();
  const strs=[];(function walk(x){if(typeof x==='string')strs.push(x);else if(x&&typeof x==='object')for(const k in x)walk(x[k])})(L.steps);const authored=(w)=>strs.some(q=>new RegExp('\\\\b'+w+'\\\\b').test(q));
  const reveal=()=>{let n=0;while(L.cur.max>L.S.r&&n<120){L.next();n++}};
  if(shot){document.getElementById('app').dataset.motion='off';L.show(+shot[1]);reveal();if(!/noclick/.test(location.hash))for(const bt of document.querySelectorAll('.demo button')){if(/^(Show all|Run all|Run to the end)$/.test(bt.textContent))bt.click()}await wait(800);document.title='shot-ready';return}
  for(let i=0;i<L.steps.length;i++){try{L.show(i);reveal();const st=document.querySelector('.stage');const t=st.textContent+document.querySelector('.hud').textContent;
    if(t.includes(SL.t('err.screen')))out.problems.push(i+' ERROR '+L.steps[i].type+' '+t.slice(0,160));
    {const keys=Object.keys(__LOCALES__[SL.defaultLang]).filter(k=>k.includes('.')&&k!=='_meta');const bad=keys.find(k=>t.includes(k));if(bad)out.problems.push(i+' MISSING TRANSLATION KEY '+bad)}
    {const mm=/.{0,40}(?:^|[^A-Za-z])(null|undefined|NaN|\\[object)(?![a-z]).{0,40}/.exec(t);if(mm&&!authored(mm[1]))out.problems.push(i+' LEAK '+L.steps[i].type+' '+(L.steps[i].title||'')+' ... '+mm[0]);}
    const demos=[...st.querySelectorAll('.demo')];out.demos+=demos.length;
    for(const d of demos){for(const s of d.querySelectorAll('select')){for(const o of [...s.options]){s.value=o.value;s.dispatchEvent(new Event('change',{bubbles:true}))}}
      for(const r of d.querySelectorAll('input[type=range]')){r.value=r.max;r.dispatchEvent(new Event('input',{bubbles:true}));r.value=r.min;r.dispatchEvent(new Event('input',{bubbles:true}))}
      for(const bt of [...d.querySelectorAll('button')]){if(bt.isConnected&&!bt.disabled)bt.click()}
      await wait(30)}
    if(st.textContent.includes(SL.t('err.screen')))out.problems.push(i+' ERROR after interaction '+L.steps[i].type)}
   catch(e){out.problems.push(i+' THREW '+e.message)}}
 for(const lg of SL.langs.map(x=>x.code).filter(c=>c!==SL.lang)){try{const here=SL.lang;L.show(Math.min(7,L.steps.length-1));const i0=L.S.i;SL.setLang(lg);await wait(50);const t=document.querySelector('.stage').textContent+document.querySelector('.toolbar').title;if(L.S.i!==i0)out.problems.push('LANG SWITCH moved the screen '+i0+' -> '+L.S.i);if(!document.querySelector('.stage').children.length)out.problems.push('LANG SWITCH left an empty stage');if(document.documentElement.lang!==(SL.langs.find(x=>x.code===lg).code))out.problems.push('html lang not updated');SL.setLang(here)}catch(e){out.problems.push('LANG SWITCH THREW '+e.message)}}
 }catch(e){out.problems.push('FATAL '+e.stack)}
 out.errors=window.__errs;const pre=document.createElement('pre');pre.id='smoke';pre.textContent=JSON.stringify(out);document.body.append(pre)});`;
const page = `<!doctype html><html lang="${LANG}" data-theme="${args.includes('--dark') ? 'dark' : 'light'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>smoke</title>
<link rel="stylesheet" href="assets/lesson.css"><link rel="stylesheet" href="assets/i18n.css"><link rel="stylesheet" href="assets/qr.css">
<script>try{localStorage.setItem('sl-lang','${LANG}')}catch(e){}</script><script src="assets/locales.js"></script><script src="assets/i18n.js"></script></head><body><div id="app"></div>
<script>window.slToggleTheme=function(){};window.__PAGE_PATH__='lesson.html';window.__LESSONS__=${json};</script>
<script src="vendor/qrcode.js"></script><script src="assets/qr.js"></script><script src="assets/sim.js"></script><script src="assets/demos-core.js"></script><script src="assets/demos-arch.js"></script><script src="assets/demos-mem.js"></script><script src="assets/lesson.js"></script>
<script>${harness}</script></body></html>`;
fs.writeFileSync(path.join(tmp, 'lesson.html'), page);
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = http.createServer((q, r) => { const p = path.join(tmp, decodeURIComponent(q.url.split('?')[0].split('#')[0]).replace(/^\//, '') || 'lesson.html'); fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': mime[path.extname(p)] || 'application/octet-stream' }); r.end(d); } }); });
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const runChrome = (extra, u, ms) => new Promise((resolve) => {
  const W = flag('--width') || 1280, H = flag('--height') || 800;
  const c = cp.spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--window-size=${W},${H}`, '--virtual-time-budget=' + (flag('--budget') || 60000), ...extra, u], { stdio: ['ignore', 'pipe', 'ignore'] });
  let out = ''; c.stdout.on('data', (d) => { out += d; }); const t = setTimeout(() => c.kill('SIGKILL'), ms || 120000);
  c.on('close', () => { clearTimeout(t); resolve(out); });
});
server.listen(0, async () => {
  const port = server.address().port; const url = `http://127.0.0.1:${port}/lesson.html`; let code = 0;
  const dom = await runChrome(['--dump-dom'], url); const m = dom.match(/<pre id="smoke">([\s\S]*?)<\/pre>/);
  if (!m) { console.log('smoke harness produced no result (is Chrome installed? set CHROME=/path/to/chrome)'); code = 1; }
  else {
    const o = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'));
    console.log(`screens: ${o.screens}   interactive demo blocks exercised: ${o.demos}`); o.problems.forEach((p) => console.log('PROBLEM ' + p)); o.errors.forEach((e) => console.log('JS ERROR ' + e));
    if (o.problems.length || o.errors.length) code = 1; else console.log('OK: no problems found');
  }
  const shots = flag('--shots');
  if (shots) { const out = flag('--out') || path.join(os.tmpdir(), 'smoke-shots'); fs.mkdirSync(out, { recursive: true });
    for (const n of shots.split(',')) { const f = path.join(out, `screen-${String(n).padStart(2, '0')}.png`); await runChrome([`--screenshot=${f}`], url + `#shot=${n}`); console.log('screenshot ' + f); } }
  server.close(); if (args.includes('--keep')) console.log('kept: ' + tmp); else fs.rmSync(tmp, { recursive: true, force: true }); process.exit(code);
});
