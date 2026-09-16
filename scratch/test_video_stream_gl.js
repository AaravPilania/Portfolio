const http = require('http');

http.get('http://localhost:9222/json', (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', async () => {
    const tabs = JSON.parse(data);
    const tab = tabs.find(t => t.url.includes('localhost:3000') && t.webSocketDebuggerUrl);
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.onopen = () => {
      const code = `(async () => {
        const c = document.createElement('canvas');
        c.width = 100;
        c.height = 100;
        const ctx = c.getContext('2d');
        ctx.fillStyle = 'blue';
        ctx.fillRect(0, 0, 100, 100);

        const v = document.createElement('video');
        v.autoplay = true;
        v.muted = true;
        v.playsInline = true;
        v.srcObject = c.captureStream(30);
        await v.play();

        const glCanvas = document.createElement('canvas');
        const gl = glCanvas.getContext('webgl2');
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, v);
        const err = gl.getError();
        return { success: err === 0, videoReady: v.readyState >= 2 };
      })()`;
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: { expression: code, awaitPromise: true, returnByValue: true }
      }));
    };
    ws.onmessage = (e) => {
      console.log('Result:', JSON.parse(e.data).result?.result?.value);
      ws.close();
      process.exit(0);
    };
  });
});
