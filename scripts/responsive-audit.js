#!/usr/bin/env node
// Small-screen audit of the BUILT site (dist/): opens every page and every lesson screen in headless Chrome with a phone-sized
// viewport and reports horizontal overflow (content wider than the screen, outside a deliberate scroll area).
//   npm run build && node --env-file=.env scripts/responsive-audit.js [--width 360] [--lang en|bn] [--only 01,05] [--pages-only]
// Needs ACCESS_PASSWORD (from .env) to unlock the encrypted pages. Exit code 1 if anything overflows. Then LOOK at the worst screens:
// the audit finds overflow, not ugliness (cramped bars, tiny tap targets), so also check screenshots at 360-375px for new UI.
const fs = require('fs'), os = require('os'), path = require('path'), http = require('http'), cp = require('child_process');
const ROOT = path.join(__dirname, '..'), DIST = path.join(ROOT, 'dist');
const args = process.argv.slice(2); const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const W = +opt('--width', 360), LANG = opt('--lang', 'en'), ONLY = opt('--only', '') ? opt('--only', '').split(',') : null, PW = process.env.ACCESS_PASSWORD;
if (!PW) { console.error('ACCESS_PASSWORD is not set (run with: node --env-file=.env scripts/responsive-audit.js)'); process.exit(2); }
if (!fs.existsSync(DIST)) { console.error('dist/ not found: run npm run build first'); process.exit(2); }
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };

const MEASURE = () => `(function(){
  const vw=${W}, // the emulated screen width: innerWidth would grow to fit overflowing content and hide the problem
  bad=[], stage=document.querySelector('.stage');
  const sel=e=>e.tagName.toLowerCase()+(e.className&&typeof e.className==='string'?'.'+e.className.trim().split(/\\s+/).slice(0,2).join('.'):'');
  const inScroller=e=>{for(let p=e.parentElement;p&&p!==(stage||document.documentElement);p=p.parentElement){if(/(auto|scroll|hidden|clip)/.test(getComputedStyle(p).overflowX))return true}return false};
  document.body.querySelectorAll('*').forEach(e=>{const r=e.getBoundingClientRect(),cs=getComputedStyle(e);if(!r.width||cs.position==='fixed'||cs.visibility==='hidden'||cs.display==='none')return;
    if(e.closest('.is-hidden,.sl-loader,svg *'))return;if(r.right>vw+1&&!inScroller(e))bad.push(sel(e)+' right='+Math.round(r.right))});
  const out={};if(document.documentElement.scrollWidth>vw+1)out.page=document.documentElement.scrollWidth;
  if(bad.length)out.wide=[...new Set(bad)].slice(0,5);if(stage&&stage.scrollWidth>stage.clientWidth+1)out.stage=stage.scrollWidth+'>'+stage.clientWidth;
  return JSON.stringify(out)})()`;

(async () => {
  const server = http.createServer((q, r) => { let p = path.join(DIST, decodeURIComponent(q.url.split('?')[0])); if (p.endsWith('/')) p += 'index.html'; fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); r.end(d); } }); });
  await new Promise((r) => server.listen(0, r)); const BASE = `http://127.0.0.1:${server.address().port}/`;
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-')), port = 9300 + Math.floor(Math.random() * 500);
  const chrome = cp.spawn(CHROME, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
  const done = (code) => { try { chrome.kill(); } catch (e) { /* already gone */ } server.close(); setTimeout(() => { try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5 }); } catch (e) { /* temp dir, harmless */ } process.exit(code); }, 500); };
  let targets; for (let i = 0; i < 40; i++) { try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (targets.length) break; } catch (e) { /* not up yet */ } await sleep(250); }
  if (!targets) { console.error('could not start Chrome (set CHROME=/path/to/chrome)'); return done(2); }
  const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
  let id = 0; const pend = new Map(); ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); return r.result.result ? r.result.result.value : undefined; };
  const nav = async (u) => { await send('Page.navigate', { url: BASE + u + (u.includes('?') ? '&' : '?') + 'lang=' + LANG }); await sleep(1500); };
  await send('Page.enable'); await send('Emulation.setDeviceMetricsOverride', { width: W, height: 740, deviceScaleFactor: 1, mobile: true });

  const report = []; let checked = 0;
  const check = async (name) => { checked++; const r = JSON.parse((await ev(MEASURE())) || '{}'); if (Object.keys(r).length) report.push(`${name} ${JSON.stringify(r)}`); };
  await nav('index.html'); await ev(`document.getElementById('staticrypt-password').value=${JSON.stringify(PW)};document.getElementById('staticrypt-form').dispatchEvent(new Event('submit',{cancelable:true}))`); await sleep(2500);
  if (!(await ev("!!document.getElementById('grid')"))) { console.error('could not unlock the site: wrong ACCESS_PASSWORD for this build?'); return done(2); }

  const courses = JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'courses.json'), 'utf8'));
  await nav('index.html'); await check('home'); await ev("document.querySelector('.sn-more').click()"); await sleep(250); await check('home, ⋮ menu');
  for (const c of courses) {
    await nav(`courses/${c.id}.html`); await check(`course ${c.id}`); await ev("document.querySelector('.qrbtn').click()"); await sleep(300); await check(`course ${c.id}, QR dialog`);
  }
  for (const c of courses) for (const t of c.topics.filter((x) => x.type !== 'lesson')) { await nav(`slides/${c.id}/${t.id}.html`); await check(`slides ${c.id}/${t.id}`); await ev("document.querySelector('.sn-more').click()"); await sleep(250); await check(`slides ${c.id}/${t.id}, ⋮ menu`); }
  if (!args.includes('--pages-only')) for (const c of courses) for (const t of c.topics.filter((x) => x.type === 'lesson' && (!ONLY || ONLY.some((o) => x.id.startsWith(o))))) {
    const name = `${c.id}/${t.id.slice(0, 2)}`;
    await nav(`slides/${c.id}/${t.id}.html`); await check(name + ' cover');
    await ev("document.querySelectorAll('.cover-actions .btn')[1].click()"); await sleep(300);
    const n = await ev('__lesson.steps.length'), seen = new Set();
    for (let i = 0; i < n; i++) {
      await ev(`__lesson.show(${i});(function(){let k=0;while(__lesson.cur.max>__lesson.S.r&&k<80){__lesson.next();k++}})()`); await sleep(60);
      const r = (await ev(MEASURE())) || '{}'; checked++;
      if (r !== '{}') { const type = await ev(`__lesson.steps[${i}].type`); const k = type + r; if (!seen.has(k)) { seen.add(k); report.push(`${name} screen ${i + 1} (${type}) ${r}`); } }
    }
    for (const [nm, sel] of [['settings', '#tb-set'], ['shortcuts', '#tb-help'], ['timer', '#tb-timer'], ['QR', '#tb-qr'], ['⋮ menu', '.more-btn']]) {
      await ev(`document.querySelector('${sel}').click()`); await sleep(250); await check(`${name} ${nm}`);
      await ev("window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}))"); await sleep(100);
    }
  }
  console.log(report.length ? report.join('\n') : 'no horizontal overflow found');
  console.log(`\n${checked} screens/pages checked at ${W}px wide, language ${LANG}: ${report.length} problem(s)`);
  done(report.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
