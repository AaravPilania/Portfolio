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
        return Array.from(document.querySelectorAll('section')).slice(0, 4).map(s => ({
          id: s.id,
          class: s.className,
          backdropItemSrc: s.querySelector('.js-backdrop-item')?.src || s.querySelector('.js-backdrop-item')?.currentSrc || null,
          dataTheme: s.dataset.theme
        }));
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
