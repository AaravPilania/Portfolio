const http = require('http');
http.get('http://localhost:9222/json', (res) => {
  let d = ''; res.on('data', c => d += c);
  res.on('end', () => {
    const tabs = JSON.parse(d);
    const tab = tabs.find(t => t.url.includes('lamalama.com') && t.webSocketDebuggerUrl);
    if (!tab) return console.log('no lamalama tab');
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.onopen = () => {
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
          expression: `(() => {
            const html = document.documentElement;
            const body = document.body;
            const main = document.querySelector('main');
            const scroller = document.querySelector('.ll-scroller');
            const hero = document.querySelector('.ll-section--hero_extended');
            const heroH1 = hero ? hero.querySelector('h1') : null;
            return {
              html: {
                position: window.getComputedStyle(html).position,
                overflow: window.getComputedStyle(html).overflow,
                height: window.getComputedStyle(html).height
              },
              body: {
                position: window.getComputedStyle(body).position,
                overflow: window.getComputedStyle(body).overflow,
                height: window.getComputedStyle(body).height
              },
              main: main ? {
                position: window.getComputedStyle(main).position,
                overflow: window.getComputedStyle(main).overflow,
                height: window.getComputedStyle(main).height
              } : null,
              scroller: scroller ? {
                position: window.getComputedStyle(scroller).position,
                overflowY: window.getComputedStyle(scroller).overflowY,
                height: window.getComputedStyle(scroller).height,
                scrollHeight: scroller.scrollHeight,
                offsetHeight: scroller.offsetHeight
              } : null,
              hero: hero ? {
                position: window.getComputedStyle(hero).position,
                mixBlendMode: window.getComputedStyle(hero).mixBlendMode,
                color: window.getComputedStyle(hero).color,
                bg: window.getComputedStyle(hero).backgroundColor
              } : null,
              heroH1: heroH1 ? {
                color: window.getComputedStyle(heroH1).color,
                opacity: window.getComputedStyle(heroH1).opacity,
                transform: window.getComputedStyle(heroH1).transform
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
