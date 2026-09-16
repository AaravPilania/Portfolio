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
          const el = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
          const loader = document.querySelector('.js-loader');
          const canvases = Array.from(document.querySelectorAll('canvas')).map(c => ({
            id: c.id,
            className: c.className,
            w: c.width,
            h: c.height,
            style: c.style.cssText,
            zIndex: getComputedStyle(c).zIndex
          }));
          return {
            centerElement: el ? el.tagName + '.' + el.className : null,
            loader: loader ? { style: loader.style.cssText, class: loader.className } : null,
            canvases
          };
        })()
      `;
      ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true } }));
    };
    ws.onmessage = msg => {
      const data = JSON.parse(msg.data);
      if (data.id === 1) {
        console.log(JSON.stringify(data.result.result.value, null, 2));
        ws.close();
      }
    };
  });
});
