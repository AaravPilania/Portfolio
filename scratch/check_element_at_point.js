const http = require('http');

http.get('http://localhost:9222/json', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const tabs = JSON.parse(d);
    const tab = tabs.find(t => t.url.includes('localhost:3000') && t.webSocketDebuggerUrl);
    if (!tab) { console.log('No tab found on 9222'); return; }
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.onopen = () => {
      const expr = `(() => {
        const loader = document.querySelector('.js-loader, .ll-loader');
        const scroller = document.querySelector('.ll-scroller');
        const elemAtCenter = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
        return {
          loaderClass: loader ? loader.className : null,
          loaderDisplay: loader ? window.getComputedStyle(loader).display : null,
          loaderPointerEvents: loader ? window.getComputedStyle(loader).pointerEvents : null,
          loaderZIndex: loader ? window.getComputedStyle(loader).zIndex : null,
          loaderOpacity: loader ? window.getComputedStyle(loader).opacity : null,
          elemAtCenter: elemAtCenter ? (elemAtCenter.tagName + '.' + elemAtCenter.className) : null,
          scrollerOverflow: scroller ? window.getComputedStyle(scroller).overflowY : null,
          scrollerHeight: scroller ? scroller.scrollHeight : null
        };
      })()`;
      ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true } }));
    };
    ws.onmessage = (e) => {
      console.log('Element at center and loader state:', JSON.parse(e.data).result?.result?.value);
      ws.close();
      process.exit(0);
    };
  });
});
