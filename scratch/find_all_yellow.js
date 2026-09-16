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
          const yellowElements = [];
          document.querySelectorAll('*').forEach(el => {
            const cs = getComputedStyle(el);
            const bg = cs.backgroundColor;
            if (bg.includes('247') || bg.includes('255, 2') || bg.includes('240') || bg.includes('230') || bg.includes('yellow')) {
              yellowElements.push({
                tag: el.tagName,
                id: el.id,
                className: el.className,
                bg,
                w: el.offsetWidth,
                h: el.offsetHeight,
                zIndex: cs.zIndex
              });
            }
          });
          return yellowElements;
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
