const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const W = 1440, H = 900, PORT = 9533;
const PROFILE = path.join(__dirname, 'chrome_projhover');
setTimeout(() => { console.log('TIMEOUT'); process.exit(2); }, 330000);
(async () => {
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    `--remote-debugging-port=${PORT}`, '--headless=new', `--window-size=${W},${H}`, '--hide-scrollbars',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required',
    `--user-data-dir=${PROFILE}`
  ]);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  await wait(6000);
  const data = await new Promise(r => http.get(`http://127.0.0.1:${PORT}/json/list`, res => {
    let s = ''; res.on('data', d => s += d); res.on('end', () => r(s));
  }));
  const page = JSON.parse(data).find(p => p.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 1;
  const errors = [];
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map(a => a.value || a.description).join(' '));
  });
  const send = (method, params = {}) => new Promise(res => {
    const curId = id++;
    const t = setTimeout(() => res({ timeout: true }), 20000);
    const handler = (e) => { const m = JSON.parse(e.data); if (m.id === curId) { clearTimeout(t); ws.removeEventListener('message', handler); res(m.result || m.error); } };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id: curId, method, params }));
  });
  await new Promise(r => ws.onopen = r);
  await send('Runtime.enable');
  const evalv = async (expr) => { const r = await send('Runtime.evaluate', { returnByValue: true, awaitPromise: true, expression: expr });
    if (!r || r.timeout) return 'TIMEOUT'; return r.exceptionDetails ? 'ERR ' + (r.exceptionDetails.exception || {}).description : r.result.value; };
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://localhost:3010/index.html?probe=' + Date.now() });
  let ready = false;
  for (let i = 0; i < 40 && !ready; i++) { await wait(1000); ready = await evalv(`!!document.querySelector('.js-scroller') && !!window.__apIntroRenderAt && !!window.robertGL`) === true; }
  console.log('ready', ready);
  await evalv(`window.__apIntroRenderAt(60)`);
  await evalv(`document.body.classList.add('is-loaded')`);
  await wait(2500);

  const PX = Math.round(W * 0.5), PY = Math.round(H * 0.5);
  const geo = JSON.parse(await evalv(`(() => {
    const sc = document.querySelector('.js-scroller');
    const rows = [...document.querySelectorAll('.projects__entry')];
    const st = sc.scrollTop;
    return JSON.stringify({ lenis: !!(window.lenis && window.lenis.scrollTo), st,
      rows: rows.map(r => { const b = r.getBoundingClientRect(); return { key: r.dataset.projectKey, top: Math.round(b.top + st), h: Math.round(b.height) }; }) });
  })()`));
  console.log('lenis', geo.lenis, 'rows', JSON.stringify(geo.rows));

  const scrollTo = (y) => evalv(`(() => { const sc = document.querySelector('.js-scroller');
      if (window.lenis && window.lenis.scrollTo) window.lenis.scrollTo(${y}, { immediate: true, force: true });
      sc.scrollTop = ${y}; return Math.round(sc.scrollTop); })()`);
  const state = () => evalv(`(() => {
    const g = window.robertGL;
    const act = [...document.querySelectorAll('.projects__entry.h-mainOpacity--full')].map(r => r.dataset.projectKey);
    const hov = [...document.querySelectorAll('.projects__entry.is-hovered')].map(r => r.dataset.projectKey);
    const under = document.elementFromPoint(${PX}, ${PY});
    const ur = under && under.closest('.projects__entry');
    const q = g.lastEnterKey && g.queueMap.get(g.lastEnterKey);
    return JSON.stringify({ idx: g.activeProjectIdx, active: act.join(',') || '-', hovered: hov.join(',') || '-',
      under: ur ? ur.dataset.projectKey : '-', mainOpacity: getComputedStyle(document.documentElement).getPropertyValue('--mainOpacity').trim(),
      canvasOpacity: g.canvas.style.opacity, preview: q ? q.userData?.project?.key || (q.project && q.project.key) || 'group' : '-', queue: g.queueMap.size });
  })()`);

  const firstRow = geo.rows[0], lastRow = geo.rows[geo.rows.length - 1];
  const startY = Math.max(0, firstRow.top - PY - 200);
  const endY = lastRow.top + lastRow.h - PY + 200;

  // Pointer never moved: scroll a row under the centre and expect nothing active.
  await scrollTo(firstRow.top + firstRow.h / 2 - PY);
  await wait(600);
  console.log('never-moved', await state());

  await scrollTo(startY);
  await wait(800);
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: PX, y: PY });
  await wait(400);
  console.log('mouse placed at', PX, PY, await state());

  fs.mkdirSync(path.join(__dirname, 'projhover'), { recursive: true });
  const stepPx = Math.round(Math.min(...geo.rows.map(r => r.h)) * 0.6);
  const ys = [];
  for (let y = startY; y <= endY; y += stepPx) ys.push(y);
  const seq = [...ys.map(y => ['down', y]), ...ys.slice().reverse().map(y => ['up', y])];
  let n = 0, mismatches = 0;
  for (const [dir, y] of seq) {
    const st = await scrollTo(y);
    await wait(350);
    let s = JSON.parse(await state());
    let ok = s.under === s.active && s.active === s.hovered;
    if (!ok) {
      const fps = await evalv(`new Promise(r => { let f = 0; const t0 = performance.now(); const k = () => { f++; if (performance.now() - t0 < 500) requestAnimationFrame(k); else r(Math.round(f * 2)); }; requestAnimationFrame(k); })`);
      s = JSON.parse(await state());
      ok = s.under === s.active && s.active === s.hovered;
      console.log('     recheck after 500ms (headless fps ~' + fps + '):', ok ? 'settled' : 'still wrong');
      if (!ok) mismatches++;
    }
    console.log(dir.padEnd(4), 'st', String(st).padStart(5), 'active', s.active.padEnd(14), 'under', s.under.padEnd(14), '--mainOpacity', s.mainOpacity, 'canvas', s.canvasOpacity, 'queue', s.queue, ok ? 'OK' : 'MISMATCH');
    if (n % 6 === 0) {
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      if (shot && shot.data) fs.writeFileSync(path.join(__dirname, 'projhover', `${String(n).padStart(2, '0')}_${dir}_${st}.png`), Buffer.from(shot.data, 'base64'));
    }
    n++;
  }
  console.log('mismatches', mismatches);

  // Smooth continuous scroll (Lenis-style, per-frame scrollTop) with sampling of transitions.
  const smooth = (from, to, ms) => evalv(`new Promise(res => { const sc = document.querySelector('.js-scroller'); const t0 = performance.now(); const seen = [];
      const tick = (t) => { const k = Math.min(1, (t - t0) / ${ms}); const e = k < .5 ? 2*k*k : 1 - Math.pow(-2*k + 2, 2) / 2;
        const y = ${from} + (${to} - ${from}) * e;
        if (window.lenis && window.lenis.scrollTo) window.lenis.scrollTo(y, { immediate: true, force: true }); sc.scrollTop = y;
        const a = [...document.querySelectorAll('.projects__entry.h-mainOpacity--full')].map(r => r.dataset.projectKey).join(',') || '-';
        if (seen[seen.length - 1] !== a) seen.push(a);
        if (k < 1) requestAnimationFrame(tick); else setTimeout(() => res(seen.join(' > ')), 400); };
      requestAnimationFrame(tick); })`);
  console.log('smooth down', await smooth(startY, endY, 3000));
  console.log('smooth up  ', await smooth(endY, startY, 3000));
  await wait(500);
  console.log('after smooth up (pointer above rows)', await state());

  await scrollTo(firstRow.top + firstRow.h / 2 - PY);
  await wait(500);
  console.log('back on row 1', await state());
  await scrollTo(0);
  await wait(800);
  console.log('section out of view (top)', await state());
  await scrollTo(endY + H * 2);
  await wait(800);
  console.log('section out of view (below)', await state());

  console.log('errors', JSON.stringify(errors));
  ws.close();
  chrome.kill();
  process.exit(0);
})();
