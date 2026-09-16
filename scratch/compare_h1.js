const http = require('http');
http.get('http://localhost:9222/json', (res) => {
  let d = ''; res.on('data', c => d += c);
  res.on('end', () => {
    const tabs = JSON.parse(d);
    const tabLocal = tabs.find(t => t.url.includes('localhost:3000') && t.webSocketDebuggerUrl);
    const tabLama = tabs.find(t => t.url.includes('lamalama.com') && t.webSocketDebuggerUrl);
    if (!tabLocal || !tabLama) return console.log('missing tab');

    const wsLocal = new WebSocket(tabLocal.webSocketDebuggerUrl);
    wsLocal.onopen = () => {
      wsLocal.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
          expression: `(() => {
            const h1 = document.querySelector('h1');
            return {
              text: h1 ? h1.innerText : null,
              color: h1 ? window.getComputedStyle(h1).color : null,
              opacity: h1 ? window.getComputedStyle(h1).opacity : null,
              mixBlendMode: h1 ? window.getComputedStyle(h1).mixBlendMode : null,
              parentMixBlendMode: h1?.parentElement ? window.getComputedStyle(h1.parentElement).mixBlendMode : null,
              heroMixBlendMode: document.querySelector('.ll-section--hero_extended') ? window.getComputedStyle(document.querySelector('.ll-section--hero_extended')).mixBlendMode : null
            };
          })()`,
          returnByValue: true
        }
      }));
    };
    wsLocal.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id === 1) {
        console.log('Local:', msg.result?.result?.value);
        wsLocal.close();

        const wsLama = new WebSocket(tabLama.webSocketDebuggerUrl);
        wsLama.onopen = () => {
          wsLama.send(JSON.stringify({
            id: 2,
            method: 'Runtime.evaluate',
            params: {
              expression: `(() => {
                const h1 = document.querySelector('h1');
                return {
                  text: h1 ? h1.innerText : null,
                  color: h1 ? window.getComputedStyle(h1).color : null,
                  opacity: h1 ? window.getComputedStyle(h1).opacity : null,
                  mixBlendMode: h1 ? window.getComputedStyle(h1).mixBlendMode : null,
                  parentMixBlendMode: h1?.parentElement ? window.getComputedStyle(h1.parentElement).mixBlendMode : null,
                  heroMixBlendMode: document.querySelector('.ll-section--hero_extended') ? window.getComputedStyle(document.querySelector('.ll-section--hero_extended')).mixBlendMode : null
                };
              })()`,
              returnByValue: true
            }
          }));
        };
        wsLama.onmessage = (e2) => {
          const msg2 = JSON.parse(e2.data);
          if (msg2.id === 2) {
            console.log('Official:', msg2.result?.result?.value);
            wsLama.close();
            process.exit(0);
          }
        };
      }
    };
  });
});
