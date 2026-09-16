const http = require('http');
http.get('http://localhost:9222/json', (res) => {
  let d = ''; res.on('data', c => d += c);
  res.on('end', () => {
    const tabs = JSON.parse(d);
    const tab = tabs.find(t => t.url.includes('localhost:3000') && t.webSocketDebuggerUrl);
    if (!tab) return console.log('no tab');
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.onopen = () => {
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
          expression: `(() => {
            const c1 = document.querySelector('.js-canvas');
            const c2 = document.querySelector('.js-upper-canvas');
            function sampleCanvas(c) {
              if (!c) return null;
              const gl = c.getContext('webgl2') || c.getContext('webgl');
              if (gl) {
                const pixels = new Uint8Array(4);
                gl.readPixels(c.width / 2, c.height / 2, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
                return { isWebGL: true, pixelCenter: Array.from(pixels), zIndex: window.getComputedStyle(c).zIndex };
              }
              return { isWebGL: false };
            }
            return {
              canvas: sampleCanvas(c1),
              upperCanvas: sampleCanvas(c2),
              theme: document.querySelector('main')?.dataset?.theme,
              htmlTheme: document.documentElement.className
            };
          })()`,
          returnByValue: true
        }
      }));
    };
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id === 1) {
        console.log(JSON.stringify(msg.result?.result?.value, null, 2));
        ws.close();
        process.exit(0);
      }
    };
  });
});
