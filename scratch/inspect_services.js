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
        let servicesBt = null;
        if (page?.instances) {
          page.instances.forEach((v, k) => {
            const sec = (k instanceof HTMLElement ? k.closest('section') : v?.section);
            if (sec?.className?.includes('services') && k?.dataset?.component === 'blocks/backdrop_theme') {
              servicesBt = v;
            }
          });
        }
        if (!servicesBt) return { error: 'servicesBt not found' };
        return {
          hasGridLayer: !!servicesBt.gridLayer,
          theme: servicesBt.theme,
          selectedTheme: servicesBt.selectedTheme,
          u_content_theme: servicesBt.gridLayer?.uniforms?.get('u_content_theme')?.value,
          u_theme: servicesBt.gridLayer?.uniforms?.get('u_theme')?.value,
          u_nogrid: servicesBt.gridLayer?.uniforms?.get('u_nogrid')?.value,
          backdropContent: servicesBt.backdropContent?.outerHTML?.slice(0, 300)
        };
      })()`;
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: { expression: expr, returnByValue: true }
      }));
    };
    ws.onmessage = (e) => {
      console.log('Services details:', JSON.parse(e.data).result?.result?.value);
      ws.close();
      process.exit(0);
    };
  });
});
