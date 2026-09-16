const http = require('http');

http.get('http://localhost:9222/json', res => {
  let raw = '';
  res.on('data', c => raw += c);
  res.on('end', () => {
    const list = JSON.parse(raw);
    const tab = list.find(t => t.url && t.url.includes('localhost:3000'));
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.onopen = () => {
      const expr = `
        (() => {
          const upper = document.querySelector('.js-upper-canvas');
          const lower = document.querySelector('.js-canvas');
          // Let's sample pixel at center of both canvases
          function getPixel(canvas) {
            if (!canvas) return 'no canvas';
            const gl = canvas.getContext('webgl2');
            if (!gl) return 'no gl';
            const pixels = new Uint8Array(4);
            gl.readPixels(canvas.width / 2, canvas.height / 2, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
            return Array.from(pixels);
          }
          return {
            upperPixel: getPixel(upper),
            lowerPixel: getPixel(lower),
            upperDisplay: upper ? getComputedStyle(upper).display : null,
            upperOpacity: upper ? getComputedStyle(upper).opacity : null,
            upperVisibility: upper ? getComputedStyle(upper).visibility : null,
          };
        })()
      `;
      ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true } }));
    };
    ws.onmessage = msg => {
      const data = JSON.parse(msg.data);
      if (data.id === 1) {
        console.log(data.result.result.value);
        ws.close();
      }
    };
  });
});
