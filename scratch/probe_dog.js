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
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://localhost:3010/guide/pixel-dog.html' });
  const F = `document.getElementById('siteFrame').contentWindow`;
  for (let k = 0; k < 45; k++) {
    await new Promise(r => setTimeout(r, 700));
    const v = (await send('Runtime.evaluate', { returnByValue: true, expression: `JSON.stringify(${F}.__pixelDogState ? ${F}.__pixelDogState() : null)` })).result.value;
    if (v && v !== 'null') {
      const s = JSON.parse(v);
      console.log(k, s.state, Math.round(s.x), Math.round(s.y), 'goal', s.goal && Math.round(s.goal.x) + ',' + Math.round(s.goal.y) + ' ' + s.goal.kind, 'hd', s.heading.toFixed(2), 'sp', Math.round(s.speed), 'vp', s.vw, s.vh);
    }
  }
  ws.close();
  chrome.kill();
  process.exit(0);
})();
