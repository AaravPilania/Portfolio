const http = require('http');
const fs = require('fs');

http.get('http://localhost:9222/json', (res) => {
  let raw = '';
  res.on('data', c => raw += c);
  res.on('end', () => {
    const list = JSON.parse(raw);
    const tab = list.find(t => t.url && t.url.includes('localhost:3000'));
    if (!tab) {
      console.log('No tab found');
      return;
    }
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.onopen = () => {
      ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
      setTimeout(() => {
        ws.send(JSON.stringify({
          id: 2,
          method: 'Runtime.evaluate',
          params: {
            expression: `(() => {
              const hero = document.querySelector('.ll-section--hero_extended');
              const work = document.querySelector('#work');
              return JSON.stringify({
                scrollY: window.scrollY,
                innerHeight: window.innerHeight,
                bodyHeight: document.body.scrollHeight,
                heroRect: hero ? hero.getBoundingClientRect() : null,
                workRect: work ? work.getBoundingClientRect() : null,
                activeTheme: document.body.getAttribute('data-theme')
              }, null, 2);
            })()`,
            returnByValue: true
          }
        }));
      }, 200);
    };
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id === 2) {
        console.log(msg.result?.result?.value);
        ws.close();
        process.exit(0);
      }
    };
    setTimeout(() => { ws.close(); process.exit(0); }, 3000);
  });
});
