const http = require('http');
const fs = require('fs');

const svgContent = fs.readFileSync('public/coded-avatar/avatar.svg', 'utf8');
const match = svgContent.match(/\bd="([^"]+)"/);
if (!match) {
  console.error('Could not extract d attribute from avatar.svg');
  process.exit(1);
}
const pathD = match[1];

http.get('http://localhost:9222/json', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const tabs = JSON.parse(d);
    const tab = tabs.find(t => t.url.includes('localhost:3000') && t.webSocketDebuggerUrl);
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.onopen = () => {
      const expr = `(() => {
        const c = document.createElement('canvas');
        c.width = 1920;
        c.height = 1080;
        const ctx = c.getContext('2d');
        const t0 = performance.now();
        const p = new Path2D(${JSON.stringify(pathD)});
        ctx.fillStyle = '#ffffff';
        ctx.fill(p, 'evenodd');
        const t1 = performance.now();
        return {
          pathValid: p instanceof Path2D,
          drawTimeMs: t1 - t0,
          canvasPixelAlpha: ctx.getImageData(900, 300, 1, 1).data[3]
        };
      })()`;
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: { expression: expr, returnByValue: true }
      }));
    };
    ws.onmessage = (e) => {
      console.log('Path2D test in Edge:', JSON.parse(e.data).result?.result?.value);
      ws.close();
      process.exit(0);
    };
  });
});
