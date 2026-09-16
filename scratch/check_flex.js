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
        const content = document.querySelector('.js-scroll-content');
        const flex = document.querySelector('.ll-flexible');
        return {
          contentStyle: {
            pos: window.getComputedStyle(content).position,
            height: window.getComputedStyle(content).height,
            overflow: window.getComputedStyle(content).overflow
          },
          flexStyle: flex ? {
            pos: window.getComputedStyle(flex).position,
            height: window.getComputedStyle(flex).height,
            top: flex.getBoundingClientRect().top
          } : null,
          parentOfFlex: flex ? flex.parentElement.className : null
        };
      })()`;
      ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true } }));
    };
    ws.onmessage = (e) => {
      console.log('FLEX AND CONTENT:', JSON.parse(e.data).result?.result?.value);
      ws.close();
      process.exit(0);
    };
  });
});
