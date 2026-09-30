const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const W = 1440, H = 900, PORT = 9421;
const outDir = path.join(__dirname, 'dog');
fs.mkdirSync(outDir, { recursive: true });

(async () => {
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    `--remote-debugging-port=${PORT}`, '--headless=new', `--window-size=${W},${H}`, '--hide-scrollbars',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    `--user-data-dir=${path.join(__dirname, 'chrome_dog')}`
  ]);
  await new Promise(r => setTimeout(r, 6000));
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
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') logs.push(m.params.args.map(a => a.value || a.description).join(' '));
  });
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const F = `document.getElementById('siteFrame').contentWindow`;
  const evalv = async (expr) => (await send('Runtime.evaluate', { returnByValue: true, expression: expr })).result.value;
  const st = async () => JSON.parse(await evalv(`JSON.stringify(${F}.__pixelDogState ? ${F}.__pixelDogState() : null)`));
  const shot = async (name, zoom) => {
    let params = { format: 'png' };
    if (zoom) {
      const s = await st();
      params.clip = { x: Math.max(0, s.x - 40), y: Math.max(0, s.y - 150), width: 420, height: 250, scale: 2 };
    }
    const r = await send('Page.captureScreenshot', params);
    fs.writeFileSync(path.join(outDir, name + '.png'), Buffer.from(r.data, 'base64'));
  };
  const mouse = (type, x, y) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : (type === 'mousePressed' ? 1 : 0), clickCount: 1 });

  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://localhost:3010/guide/pixel-dog.html' });
  await wait(12000);
  await shot('01_welcome');
  await shot('01_welcome_zoom', true);
  console.log('after mount:', JSON.stringify(await st()));

  for (let i = 0; i <= 12; i++) { await mouse('mouseMoved', 200 + i * 45, 820); await wait(60); }
  await wait(300);
  await shot('02_walk_zoom', true);
  await wait(2500);
  let s = await st();
  console.log('after follow:', JSON.stringify(s));

  const dx = s.x + 48, dy = s.y + 60;
  await mouse('mouseMoved', dx, dy);
  await wait(200);
  await mouse('mousePressed', dx, dy);
  await mouse('mouseReleased', dx, dy);
  await wait(900);
  await shot('03_pet_zoom', true);
  console.log('after pet:', JSON.stringify(await st()));

  s = await st();
  const gx = s.x + 48, gy = s.y + 60;
  await mouse('mouseMoved', gx, gy);
  await mouse('mousePressed', gx, gy);
  for (let i = 1; i <= 8; i++) { await mouse('mouseMoved', gx + i * 30, gy - i * 45); await wait(40); }
  await wait(200);
  await shot('04_held_zoom', true);
  console.log('held:', JSON.stringify(await st()));
  await mouse('mouseReleased', gx + 240, gy - 360);
  await wait(1200);
  console.log('dropped:', JSON.stringify(await st()));

  await mouse('mouseMoved', 1400, 40);
  await wait(21000);
  await shot('05_sleep_zoom', true);
  console.log('idle:', JSON.stringify(await st()));

  await send('Runtime.evaluate', { expression: `${F}.document.querySelector('.js-scroller').scrollTop = Math.ceil(${F}.innerHeight * 1.25 * 0.74)` });
  await wait(3500);
  await shot('06_screen');
  console.log('slide2:', JSON.stringify(await st()));

  console.log('errors:', logs.length ? logs.join('\n') : 'none');
  ws.close();
  chrome.kill();
  process.exit(0);
})();
