const http = require('http');
http.get('http://localhost:9222/json', (res) => {
  let d = ''; res.on('data', c => d += c);
  res.on('end', () => {
    const tabs = JSON.parse(d);
    const tab = tabs.find(t => t.url.includes('localhost:3000') && t.webSocketDebuggerUrl);
    if (!tab) return console.log('no tab');
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.onopen = () => {
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
          expression: `(() => {
            const loader = document.querySelector('.ll-loader');
            const main = document.querySelector('main');
            const scroller = document.querySelector('.ll-scroller');
            return {
              loader: loader ? {
                className: loader.className,
                style: loader.getAttribute('style'),
                display: window.getComputedStyle(loader).display,
                opacity: window.getComputedStyle(loader).opacity,
                visibility: window.getComputedStyle(loader).visibility,
                transform: window.getComputedStyle(loader).transform
              } : 'no loader',
              main: main ? {
                className: main.className,
                style: main.getAttribute('style'),
                display: window.getComputedStyle(main).display,
                opacity: window.getComputedStyle(main).opacity
              } : 'no main',
              scroller: scroller ? {
                scrollHeight: scroller.scrollHeight,
                offsetHeight: scroller.offsetHeight,
                scrollTop: scroller.scrollTop
              } : 'no scroller'
            };
          })()`,
          returnByValue: true
        }
      }));
    };
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id === 1) {
        console.log(JSON.stringify(msg.result?.result?.value, null, 2));
        ws.close();
        process.exit(0);
      }
    };
  });
});
