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
            const heroSection = document.querySelector('.ll-section--hero_extended');
            const h1 = heroSection?.querySelector('h1') || document.querySelector('h1');
            const canvasList = [...document.querySelectorAll('canvas')].map(c => ({
              width: c.width,
              height: c.height,
              style: c.style.cssText,
              className: c.className
            }));
            const page = window.$?.instances?.get('page');
            let heroBt = null;
            if (page?.instances) {
              page.instances.forEach((v, k) => {
                if (v?.key?.includes('hero_extended')) heroBt = v;
              });
            }
            return {
              heroFound: !!heroSection,
              heroBounding: heroSection?.getBoundingClientRect(),
              heroComputedOpacity: heroSection ? window.getComputedStyle(heroSection).opacity : null,
              h1Text: h1?.innerText,
              h1Bounding: h1?.getBoundingClientRect(),
              h1ComputedOpacity: h1 ? window.getComputedStyle(h1).opacity : null,
              h1ComputedVisibility: h1 ? window.getComputedStyle(h1).visibility : null,
              canvasCount: canvasList.length,
              canvasList,
              heroBtInView: heroBt?.inView,
              heroBtPaused: heroBt?.paused,
              heroBtCanUseWebGL: heroBt?.canUseWebGL?.(),
              scale: heroBt?.scale,
              nogrid_progress: heroBt?.nogrid_progress,
              backdropItem: {
                exists: !!heroBt?.backdropItem,
                hasTexture: !!heroBt?.backdropItem?.texture,
                type: heroBt?.backdropItem?.type,
                width: heroBt?.backdropItem?.width,
                height: heroBt?.backdropItem?.height
              }
            };
          })()`,
          returnByValue: true
        }
      }));
    };
    ws.onmessage = (e) => {
      console.log('Hero DOM inspection:', JSON.stringify(JSON.parse(e.data).result?.result?.value, null, 2));
      ws.close();
    };
  });
});
