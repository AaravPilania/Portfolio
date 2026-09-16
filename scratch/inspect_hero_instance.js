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
        const page = window.$?.instances.get('page');
        const heroEntries = [];
        if (page?.instances) {
          page.instances.forEach((v, k) => {
            const sec = (k instanceof HTMLElement ? k.closest('section') : v?.section);
            if (sec?.className?.includes('hero_extended')) {
              heroEntries.push({
                keyComp: k?.dataset?.component,
                valName: v?.constructor?.name,
                isGl: v?.IS_WEBGL,
                nogrid: v?.nogrid,
                hasGridLayer: !!v?.gridLayer,
                u_nogrid: v?.gridLayer?.uniforms?.get('u_nogrid')?.value,
                u_render_content: v?.gridLayer?.uniforms?.get('u_render_content')?.value,
                backdropItem: !!v?.backdropItem,
                backdropTexture: !!v?.backdropItem?.texture,
                inView: v?.inView,
                videoEl: v?.videoEl?.tagName
              });
            }
          });
        }
        return heroEntries;
      })()`;
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: { expression: expr, returnByValue: true }
      }));
    };
    ws.onmessage = (e) => {
      console.log('Hero instances:', JSON.parse(e.data).result?.result?.value);
      ws.close();
      process.exit(0);
    };
  });
});
