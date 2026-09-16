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
        const scroller = document.querySelector('.js-scroller');
        const loader = document.querySelector('.js-loader');
        const bodyOverflow = window.getComputedStyle(document.body).overflow;
        const htmlOverflow = window.getComputedStyle(document.documentElement).overflow;
        return {
          loaderExists: !!loader,
          loaderStyle: loader?.getAttribute('style'),
          bodyOverflow,
          htmlOverflow,
          scrollerHeight: scroller?.scrollHeight,
          scrollerClientHeight: scroller?.clientHeight,
          scrollerOverflow: scroller ? window.getComputedStyle(scroller).overflow : null
        };
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
