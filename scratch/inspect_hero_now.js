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
            const page = window.$?.instances?.get('page');
            let heroBt = null;
            if (page?.instances) {
              page.instances.forEach((v, k) => {
                if (v?.key?.includes('hero_extended')) heroBt = v;
              });
            }
            return {
              found: !!heroBt,
              inView: heroBt?.inView,
              paused: heroBt?.paused,
              hasBackdropItem: !!heroBt?.backdropItem,
              texture: !!heroBt?.backdropItem?.texture,
              player: heroBt?.gridLayer?.uniforms?.get('u_content')?.value?.player?.tagName,
              u_render_content: heroBt?.gridLayer?.uniforms?.get('u_render_content')?.value,
              u_nogrid: heroBt?.gridLayer?.uniforms?.get('u_nogrid')?.value,
              u_reveal_progress: heroBt?.gridLayer?.uniforms?.get('u_reveal_progress')?.value
            };
          })()`,
          returnByValue: true
        }
      }));
    };
    ws.onmessage = (e) => {
      console.log('Result:', JSON.parse(e.data).result?.result?.value);
      ws.close();
    };
  });
});
