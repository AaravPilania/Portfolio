const http = require('http');

http.get('http://localhost:9222/json', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const tabs = JSON.parse(d);
    const tab = tabs.find(t => t.url.includes('localhost:3000') && t.webSocketDebuggerUrl);
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.onopen = () => {
      const expr = `(() => {
        const hero = document.querySelector('.ll-section--hero_extended');
        const h1 = hero?.querySelector('h1') || hero?.querySelector('.ll-text-reveal');
        const v = hero?.querySelector('video');
        const page = window.$?.instances?.get('page');
        let heroBt = null;
        if (page?.instances) {
          page.instances.forEach((inst, k) => {
            if (inst?.key?.includes('hero_extended') || (k?.dataset?.component === 'blocks/backdrop_theme' && k?.closest('.ll-section--hero_extended'))) {
              heroBt = inst;
            }
          });
        }
        return {
          h1Text: h1?.innerText,
          h1Opacity: h1 ? window.getComputedStyle(h1).opacity : null,
          h1Vis: h1 ? window.getComputedStyle(h1).visibility : null,
          h1Class: h1?.className,
          heroBtFound: !!heroBt,
          heroBtInView: heroBt?.inView,
          heroBtCanUseWebGL: heroBt?.canUseWebGL(),
          gridLayerUniforms: {
            u_reveal_progress: heroBt?.gridLayer?.uniforms?.get('u_reveal_progress')?.value,
            u_render_content: heroBt?.gridLayer?.uniforms?.get('u_render_content')?.value,
            u_nogrid: heroBt?.gridLayer?.uniforms?.get('u_nogrid')?.value,
            u_content_theme: heroBt?.gridLayer?.uniforms?.get('u_content_theme')?.value,
            playerTag: heroBt?.gridLayer?.uniforms?.get('u_content')?.value?.player?.tagName
          },
          videoPaused: v?.paused,
          videoSrc: v?.src
        };
      })()`;
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: { expression: expr, returnByValue: true }
      }));
    };
    ws.onmessage = (e) => {
      console.log('Hero details:', JSON.parse(e.data).result?.result?.value);
      ws.close();
      process.exit(0);
    };
  });
});
