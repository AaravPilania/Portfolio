const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const PORT = 9305;
const p = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  `--remote-debugging-port=${PORT}`,
  '--headless=new',
  '--window-size=1440,900',
  `--user-data-dir=${path.join(__dirname, 'chrome_rect_inspect')}`
]);

setTimeout(async () => {
  try {
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
    await send('Page.navigate', { url: 'http://localhost:3010/direction-1-lens.html' });
    await new Promise(r => setTimeout(r, 2500));

    const rects = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `
        (() => {
          const list = [
            '#introLoader',
            '.js-upper-canvas',
            '.js-canvas',
            '#page',
            '.js-scroller',
            '.js-scroll-content',
            '#heroTrack',
            '.sticky-hero-viewport',
            '#heroShrinkCard',
            '#slide2CenterFeature',
            '#section-projects',
            '.ll-section--services'
          ];
          return list.map(sel => {
            const el = document.querySelector(sel);
            if (!el) return { sel, exists: false };
            const r = el.getBoundingClientRect();
            const cs = getComputedStyle(el);
            return {
              sel,
              exists: true,
              x: Math.round(r.x),
              y: Math.round(r.y),
              w: Math.round(r.width),
              h: Math.round(r.height),
              zIndex: cs.zIndex,
              display: cs.display,
              visibility: cs.visibility,
              opacity: cs.opacity
            };
          });
        })()
      `
    });
    console.log('RECTS AT 0 SCROLL:', JSON.stringify(rects.result.value, null, 2));

    ws.close();
    p.kill();
    process.exit(0);
  } catch(e) {
    console.error(e);
    p.kill();
    process.exit(1);
  }
}, 1500);
