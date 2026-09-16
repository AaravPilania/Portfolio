const http = require('http');

http.get('http://localhost:9222/json', res => {
  let raw = '';
  res.on('data', c => raw += c);
  res.on('end', () => {
    const list = JSON.parse(raw);
    const tab = list.find(t => t.url && t.url.includes('localhost:3000'));
    if (!tab) return;
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.onopen = () => {
      const expr = `
        (() => {
          const bodyBg = getComputedStyle(document.body).backgroundColor;
          const htmlBg = getComputedStyle(document.documentElement).backgroundColor;
          const page = document.getElementById('page');
          const pageBg = page ? getComputedStyle(page).backgroundColor : 'no page';
          const canvas = document.querySelector('.js-canvas');
          const hero = document.querySelector('.ll-section--hero_extended');
          const heroVideo = hero ? hero.querySelector('video') : null;
          const heroBackdrop = hero ? hero.querySelector('.js-backdrop-video-item') : null;
          const theme = window.$?.instances.get('colorTheme')?.getTheme();
          const pageTheme = window.$?.instances.get('colorTheme')?.getPageTheme();

          return {
            bodyBg,
            htmlBg,
            pageBg,
            canvasZIndex: canvas ? getComputedStyle(canvas).zIndex : null,
            canvasOpacity: canvas ? getComputedStyle(canvas).opacity : null,
            heroVideoSrc: heroVideo ? heroVideo.src : null,
            heroVideoPaused: heroVideo ? heroVideo.paused : null,
            heroVideoDisplay: heroVideo ? getComputedStyle(heroVideo).display : null,
            heroVideoOpacity: heroVideo ? getComputedStyle(heroVideo).opacity : null,
            heroBackdropOpacity: heroBackdrop ? getComputedStyle(heroBackdrop).opacity : null,
            theme,
            pageTheme
          };
        })()
      `;
      ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true } }));
    };
    ws.onmessage = msg => {
      const data = JSON.parse(msg.data);
      if (data.id === 1) {
        console.log('DOM & Theme state:', JSON.stringify(data.result.result.value, null, 2));
        ws.close();
      }
    };
  });
});
