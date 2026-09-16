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
            const hero = document.querySelector('.ll-section--hero_extended');
            const h1 = hero ? hero.querySelector('h1') : null;
            const menu = document.querySelector('.js-menu');
            const canvas = document.querySelector('.js-canvas');
            const body = document.body;
            const html = document.documentElement;
            return {
              hero: hero ? {
                display: window.getComputedStyle(hero).display,
                visibility: window.getComputedStyle(hero).visibility,
                opacity: window.getComputedStyle(hero).opacity,
                color: window.getComputedStyle(hero).color,
                mixBlendMode: window.getComputedStyle(hero).mixBlendMode,
                rect: hero.getBoundingClientRect()
              } : null,
              h1: h1 ? {
                text: h1.innerText,
                display: window.getComputedStyle(h1).display,
                visibility: window.getComputedStyle(h1).visibility,
                opacity: window.getComputedStyle(h1).opacity,
                color: window.getComputedStyle(h1).color,
                rect: h1.getBoundingClientRect()
              } : null,
              menu: menu ? {
                display: window.getComputedStyle(menu).display,
                visibility: window.getComputedStyle(menu).visibility,
                opacity: window.getComputedStyle(menu).opacity,
                rect: menu.getBoundingClientRect()
              } : null,
              canvas: canvas ? {
                display: window.getComputedStyle(canvas).display,
                visibility: window.getComputedStyle(canvas).visibility,
                opacity: window.getComputedStyle(canvas).opacity,
                width: canvas.width,
                height: canvas.height,
                rect: canvas.getBoundingClientRect()
              } : null,
              bodyBg: window.getComputedStyle(body).backgroundColor,
              htmlBg: window.getComputedStyle(html).backgroundColor
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
