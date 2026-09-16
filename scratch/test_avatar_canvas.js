const fs = require('fs');
const http = require('http');

// Read the avatar path from coded-avatar/avatar.svg
const svgContent = fs.readFileSync('public/coded-avatar/avatar.svg', 'utf8');
const dMatch = svgContent.match(/d="([^"]+)"/);
const pathD = dMatch ? dMatch[1] : '';

console.log('Path D length:', pathD.length);

http.get('http://localhost:9222/json', (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', async () => {
    const tabs = JSON.parse(data);
    const tab = tabs.find(t => t.url.includes('localhost:3000') && t.webSocketDebuggerUrl);
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.onopen = () => {
      const code = `(() => {
        const c = document.createElement('canvas');
        c.width = 1920;
        c.height = 1080;
        const ctx = c.getContext('2d');

        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 1920, 1080);

        const p = new Path2D('${pathD.replace(/\s+/g, ' ')}');
        ctx.fillStyle = '#ffffff';
        ctx.fill(p, 'evenodd');

        return {
          dataUrl: c.toDataURL('image/png', 0.8).substring(0, 100),
          ok: true
        };
      })()`;
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: { expression: code, returnByValue: true }
      }));
    };
    ws.onmessage = (e) => {
      console.log('Result:', JSON.parse(e.data).result?.result?.value);
      ws.close();
      process.exit(0);
    };
  });
});
