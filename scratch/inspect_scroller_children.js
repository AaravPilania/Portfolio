const http = require('http');

http.get('http://localhost:9222/json', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const tabs = JSON.parse(d);
    const localTab = tabs.find(t => t.url.includes('localhost:3000') && t.webSocketDebuggerUrl);
    if (!localTab) return;
    const ws = new WebSocket(localTab.webSocketDebuggerUrl);
    ws.onopen = () => {
      const expr = `(() => {
        const s = document.querySelector('.ll-scroller');
        const content = document.querySelector('.js-scroll-content');
        const sections = Array.from(document.querySelectorAll('section')).map(sec => ({
          class: sec.className.slice(0, 40),
          height: sec.getBoundingClientRect().height,
          top: sec.getBoundingClientRect().top
        }));
        return {
          contentHeight: content?.scrollHeight,
          contentRect: content?.getBoundingClientRect(),
          sections
        };
      })()`;
      ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true } }));
    };
    ws.onmessage = (e) => {
      console.log('SECTIONS IN DOM:', JSON.parse(e.data).result?.result?.value);
      ws.close();
      process.exit(0);
    };
  });
});
