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
            const scroller = document.querySelector('.ll-scroller');
            const main = document.querySelector('main');
            const hero = document.querySelector('.ll-section--hero_extended');
            const h1 = document.querySelector('h1');
            const menu = document.querySelector('.js-menu');
            const loader = document.querySelector('.ll-loader');
            return {
              windowScrollY: window.scrollY,
              windowHeight: window.innerHeight,
              scroller: scroller ? {
                scrollTop: scroller.scrollTop,
                scrollHeight: scroller.scrollHeight,
                offsetHeight: scroller.offsetHeight,
                style: scroller.getAttribute('style'),
                className: scroller.className
              } : null,
              loader: loader ? {
                className: loader.className,
                style: loader.getAttribute('style')
              } : null,
              hero: hero ? {
                offsetHeight: hero.offsetHeight,
                className: hero.className,
                style: hero.getAttribute('style')
              } : null,
              h1: h1 ? {
                innerText: h1.innerText,
                className: h1.className,
                style: h1.getAttribute('style'),
                computedStyle: {
                  opacity: window.getComputedStyle(h1).opacity,
                  visibility: window.getComputedStyle(h1).visibility,
                  color: window.getComputedStyle(h1).color,
                  transform: window.getComputedStyle(h1).transform
                }
              } : null,
              menu: menu ? {
                className: menu.className,
                computedStyle: {
                  opacity: window.getComputedStyle(menu).opacity,
                  visibility: window.getComputedStyle(menu).visibility,
                  transform: window.getComputedStyle(menu).transform
                }
              } : null
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
