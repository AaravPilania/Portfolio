const http = require('http');

http.get('http://localhost:9222/json', res => {
  let raw = ''; res.on('data', c => raw += c);
  res.on('end', () => {
    const list = JSON.parse(raw);
    const tab = list.find(t => t.url && t.url.includes('localhost:3000'));
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.onopen = () => {
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
          expression: `(() => {
            const scroller = document.querySelector('.js-scroller') || document.documentElement;
            const sec = document.querySelector('.ll-section--services');
            return {
              hasScroller: !!document.querySelector('.js-scroller'),
              secOffsetTop: sec?.offsetTop,
              secBoundingTop: sec?.getBoundingClientRect().top,
              secHeight: sec?.clientHeight,
              scrollerScrollTop: scroller?.scrollTop,
              scrollerScrollHeight: scroller?.scrollHeight
            };
          })()`,
          returnByValue: true
        }
      }));
    };
    ws.onmessage = e => {
      console.log('Result:', JSON.parse(e.data).result?.result?.value);
      ws.close();
    };
  });
});
