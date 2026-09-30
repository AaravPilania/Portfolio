const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const PORT = 9431;
(async () => {
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    `--remote-debugging-port=${PORT}`, '--headless=new', '--window-size=1400,700', '--hide-scrollbars',
    `--user-data-dir=${path.join(__dirname, 'chrome_sheet')}`
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
  await send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 700, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://localhost:3010/guide/byte-sprites.html' });
  await new Promise(r => setTimeout(r, 3000));
  const s = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 1400, height: 520, scale: 1 } });
  fs.mkdirSync(path.join(__dirname, 'dog'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'dog', 'sheet.png'), Buffer.from(s.data, 'base64'));
  ws.close();
  chrome.kill();
  process.exit(0);
})();
