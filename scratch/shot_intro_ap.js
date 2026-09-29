const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const W = 1440, H = 900, PORT = 9331;
const times = [0.2, 0.9, 1.5, 2.2, 2.9, 3.1, 3.3, 3.5, 3.75, 4.0];

(async () => {
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    `--remote-debugging-port=${PORT}`, '--headless=new', `--window-size=${W},${H}`, '--hide-scrollbars',
    `--user-data-dir=${path.join(__dirname, 'chrome_intro_ap')}`
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
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://localhost:3010/' });
  await new Promise(r => setTimeout(r, 1200));
  const err = await send('Runtime.evaluate', { returnByValue: true, expression: `typeof window.__setIntroManual + '|' + typeof window.__renderIntroAt` });
  console.log('hooks', err.result.value);
  await send('Runtime.evaluate', { expression: `window.__setIntroManual && window.__setIntroManual()` });
  await new Promise(r => setTimeout(r, 3000));
  for (const t of times) {
    await send('Runtime.evaluate', { expression: `window.__renderIntroAt(${t})` });
    await new Promise(r => setTimeout(r, 250));
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(__dirname, `intro_ap_${String(t).replace('.', '_')}.png`), Buffer.from(shot.data, 'base64'));
  }
  ws.close();
  chrome.kill();
  process.exit(0);
})();
