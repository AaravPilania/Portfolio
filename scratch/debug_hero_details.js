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
        let heroBt = null;
        if (page?.instances) {
          page.instances.forEach((v, k) => {
            if (v?.key?.includes('hero_extended') || (k?.dataset?.component === 'blocks/backdrop_theme' && k?.closest('.ll-section--hero_extended'))) {
              heroBt = v;
            }
          });
        }
        if (!heroBt) return { error: 'heroBt not found' };
        return {
          hasGridLayer: !!heroBt.gridLayer,
          gridLayerType: heroBt.gridLayer?.type,
          u_content_theme: heroBt.gridLayer?.uniforms?.get('u_content_theme')?.value,
          u_theme: heroBt.gridLayer?.uniforms?.get('u_theme')?.value,
          u_render_content: heroBt.gridLayer?.uniforms?.get('u_render_content')?.value,
          u_nogrid: heroBt.gridLayer?.uniforms?.get('u_nogrid')?.value,
          u_reveal_progress: heroBt.gridLayer?.uniforms?.get('u_reveal_progress')?.value,
          u_scale: heroBt.gridLayer?.uniforms?.get('u_scale')?.value,
          inView: heroBt.inView,
          backdropItemTexture: heroBt.backdropItem?.texture ? true : false,
          textureDims: heroBt.gridLayer?.uniforms?.get('u_content_dimensions')?.value,
          videoPaused: heroBt.backdropContent?.paused,
          videoReadyState: heroBt.backdropContent?.readyState
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
