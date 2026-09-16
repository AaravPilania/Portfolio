const http = require('http');
http.get('http://localhost:9222/json', res => {
  let raw = '';
  res.on('data', c => raw += c);
  res.on('end', () => {
    const list = JSON.parse(raw);
    const tab = list.find(t => t.url && t.url.includes('localhost:3000') && !t.url.includes('coded-avatar'));
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.onopen = () => {
      const code = `(() => {
        const sections = Array.from(document.querySelectorAll('section')).map(s => {
          const items = Array.from(s.querySelectorAll('.js-backdrop-item, video, img')).map(el => ({
            tagName: el.tagName,
            className: el.className,
            src: el.currentSrc || el.src || el.dataset?.src,
            style: el.getAttribute('style')
          }));
          return {
            id: s.id,
            className: s.className,
            dataset: s.dataset,
            items
          };
        });
        return sections;
      })()`;
      ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: code, returnByValue: true } }));
    };
    ws.onmessage = e => {
      const msg = JSON.parse(e.data);
      if (msg.id === 1) {
        console.log(JSON.stringify(msg.result?.result?.value, null, 2));
        ws.close();
        process.exit(0);
      }
    };
  });
});
