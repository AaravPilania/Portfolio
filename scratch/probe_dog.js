const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const PORT = 9441;
(async () => {
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    `--remote-debugging-port=${PORT}`, '--headless=new', '--window-size=1440,900', '--hide-scrollbars',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    `--user-data-dir=${path.join(__dirname, 'chrome_probe')}`
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
  const errs = [];
  ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails.text + ' ' + (m.params.exceptionDetails.exception || {}).description); });
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://localhost:3010/guide/pixel-dog.html' });
  const F = `document.getElementById('siteFrame').contentWindow`;
  const acts = [];
  let maxSpeed = 0, lastAct = '';
  const mouse = (x, y) => send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none' });
  for (let k = 0; k < 110; k++) {
    await new Promise(r => setTimeout(r, 350));
    // Keep the dog awake with small wiggles far away, plus big sweeps in the second half
    if (k % 8 === 0) await mouse(1380 - (k % 16), 60);
    if (k > 60 && k % 6 === 0) for (let i = 0; i < 6; i++) await mouse(300 + i * 120, 300 + (k % 12) * 30);
    const v = (await send('Runtime.evaluate', { returnByValue: true, expression: `JSON.stringify(${F}.__pixelDogState ? ${F}.__pixelDogState() : null)` })).result.value;
    if (v && v !== 'null') {
      const s = JSON.parse(v);
      maxSpeed = Math.max(maxSpeed, s.speed);
      const a = (s.act || '-') + '/' + s.state;
      if (a !== lastAct) { acts.push((k > 60 ? '*' : '') + a); lastAct = a; }
    }
  }
  console.log('activity sequence (* = cursor sweeping):', acts.join(' > '));
  console.log('max speed seen:', Math.round(maxSpeed));
  console.log('trail prints alive:', (await send('Runtime.evaluate', { returnByValue: true, expression: `${F}.document.querySelectorAll('.pd-paw').length` })).result.value);
  console.log('errors:', errs.length ? errs.join('\n') : 'none');
  ws.close();
  chrome.kill();
  process.exit(0);
})();
