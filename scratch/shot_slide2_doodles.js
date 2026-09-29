const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const sizes = [[1440, 900], [1920, 1080], [1280, 720]];

async function run(w, h, idx) {
  const PORT = 9320 + idx;
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    `--window-size=${w},${h}`,
    '--hide-scrollbars',
    `--user-data-dir=${path.join(__dirname, 'chrome_slide2_' + idx)}`
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
    const handler = (e) => {
      const m = JSON.parse(e.data);
      if (m.id === curId) { ws.removeEventListener('message', handler); res(m.result); }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id: curId, method, params }));
  });
  await new Promise(r => ws.onopen = r);
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://localhost:3010/' });
  await new Promise(r => setTimeout(r, 7000));
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const sc = document.querySelector('.js-scroller');
        const y = Math.round(innerHeight * 1.25);
        if (window.lenis && window.lenis.scrollTo) window.lenis.scrollTo(y, { immediate: true });
        if (sc) sc.scrollTop = y;
        window.scrollTo(0, y);
      })()
    `
  });
  await new Promise(r => setTimeout(r, 2500));
  const info = await send('Runtime.evaluate', {
    returnByValue: true,
    expression: `
      (() => {
        const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)]; };
        const out = { card: r(document.getElementById('heroShrinkCard')), l1: r(document.querySelector('.track-line-1')), l2: r(document.querySelector('.track-line-2')), active: document.getElementById('slide2HandwrittenDoodles').className };
        document.querySelectorAll('[data-doodle]').forEach(el => out[el.dataset.doodle] = r(el));
        return out;
      })()
    `
  });
  console.log(`${w}x${h}`, JSON.stringify(info.result.value));
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(__dirname, `slide2_doodles_${w}x${h}.png`), Buffer.from(shot.data, 'base64'));
  ws.close();
  chrome.kill();
}

(async () => {
  for (let i = 0; i < sizes.length; i++) {
    try { await run(sizes[i][0], sizes[i][1], i); } catch (e) { console.error(sizes[i], e); }
  }
  process.exit(0);
})();
