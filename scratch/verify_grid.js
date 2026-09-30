const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const W = 1440, H = 900, PORT = 9411;
const outDir = path.join(__dirname, 'verify');
fs.mkdirSync(outDir, { recursive: true });

(async () => {
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    `--remote-debugging-port=${PORT}`, '--headless=new', `--window-size=${W},${H}`, '--hide-scrollbars',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    `--user-data-dir=${path.join(__dirname, 'chrome_verify_grid')}`
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
  const logs = [];
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.method === 'Runtime.exceptionThrown') logs.push(m.params.exceptionDetails.text + ' ' + (m.params.exceptionDetails.exception || {}).description);
  });
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const clip = { x: 0, y: 0, width: 240, height: 160, scale: 3 };
  const shot = async (name, full) => {
    const s = await send('Page.captureScreenshot', full ? { format: 'png' } : { format: 'png', clip });
    fs.writeFileSync(path.join(outDir, name + '.png'), Buffer.from(s.data, 'base64'));
  };

  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://localhost:3010/index.html' });
  await wait(9000);
  await send('Runtime.evaluate', { expression: `window.__apIntroRenderAt(1.2)` });
  await wait(800);
  await shot('grid_intro');
  await shot('grid_intro_full', true);
  await send('Runtime.evaluate', { expression: `window.__apIntroRenderAt(60)` });
  await wait(1500);
  await shot('grid_hero');
  await shot('grid_hero_full', true);
  console.log('errors:', logs.length ? logs.join('\n') : 'none');
  ws.close();
  chrome.kill();
  process.exit(0);
})();
