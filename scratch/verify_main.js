const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const W = 1440, H = 900, PORT = 9401;
const SITE = process.argv[2] || 'http://localhost:3010/index.html';
const outDir = path.join(__dirname, 'verify');
fs.mkdirSync(outDir, { recursive: true });

(async () => {
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    `--remote-debugging-port=${PORT}`, '--headless=new', `--window-size=${W},${H}`, '--hide-scrollbars',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    `--user-data-dir=${path.join(__dirname, 'chrome_verify')}`
  ]);
  await new Promise(r => setTimeout(r, 2500));
  const data = await new Promise(r => http.get(`http://127.0.0.1:${PORT}/json/list`, res => {
    let s = ''; res.on('data', d => s += d); res.on('end', () => r(s));
  }));
  const page = JSON.parse(data).find(p => p.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 1;
  const send = (method, params = {}) => new Promise(res => {
    const curId = id++;
    const handler = (e) => { const m = JSON.parse(e.data); if (m.id === curId) { ws.removeEventListener('message', handler); res(m.result); } };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id: curId, method, params }));
  });
  await new Promise(r => ws.onopen = r);
  await send('Runtime.enable');
  await send('Page.enable');
  const logs = [];
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') logs.push(m.params.args.map(a => a.value || a.description).join(' '));
    if (m.method === 'Runtime.exceptionThrown') logs.push(m.params.exceptionDetails.text + ' ' + (m.params.exceptionDetails.exception || {}).description);
  });
  const shot = async (name) => {
    const s = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(outDir, name + '.png'), Buffer.from(s.data, 'base64'));
  };
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const evalv = async (expr) => (await send('Runtime.evaluate', { returnByValue: true, expression: expr })).result.value;

  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.__frames = []; let __l = 0;
    (function f(t) { if (__l) window.__frames.push(t - __l); __l = t; if (window.__frames.length < 2000) requestAnimationFrame(f); })(0);
    addEventListener('intro-complete', () => { window.__introDoneAt = performance.now(); });
  ` });
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: SITE });
  await wait(1800);
  await shot('intro_plotter');
  await wait(14000);

  const intro = await evalv(`JSON.stringify({ done: window.__introDoneAt | 0, loaded: document.body.classList.contains('is-loaded'), doodles: document.querySelectorAll('[class*="doodle"], [id*="Doodle"]').length, frames: window.__frames.length, worst: Math.max(...window.__frames.slice(3)) | 0 })`);

  await send('Runtime.evaluate', { expression: `window.__apIntroRenderAt && window.__apIntroRenderAt(60)` });
  await wait(500);
  await send('Runtime.evaluate', { expression: `(document.querySelector('.js-scroller') || document.scrollingElement).scrollTop = Math.ceil(innerHeight * 1.25 * 0.74); window.dispatchEvent(new Event('scroll'))` });
  await wait(1500);

  const drift = [];
  for (let k = 0; k < 6; k++) {
    drift.push(await evalv(`(() => {
      const b = [...document.querySelectorAll('#heroMarquee .marquee-group')];
      const c = [...document.querySelectorAll('#heroMarqueeOutlineClip .marquee-group')];
      let max = 0; b.forEach((g, i) => { max = Math.max(max, Math.abs(g.getBoundingClientRect().left - c[i].getBoundingClientRect().left)); });
      return Math.round(max * 100) / 100;
    })()`));
    await wait(700);
  }
  const refl = await evalv(`(() => { const r = document.getElementById('heroShrinkReflection'); const c = document.getElementById('heroShrinkCard').getBoundingClientRect(); const q = r.getBoundingClientRect(); return JSON.stringify({ op: r.style.opacity, vis: r.style.visibility, cardBottom: Math.round(c.bottom), reflTop: Math.round(q.top), reflW: Math.round(q.width), cardW: Math.round(c.width) }); })()`);
  await shot('slide2');

  console.log('intro:', intro);
  console.log('marquee max px drift base vs outline:', drift.join(', '));
  console.log('reflection:', refl);
  console.log('errors:', logs.length ? logs.join('\n') : 'none');
  ws.close();
  chrome.kill();
  process.exit(0);
})();
