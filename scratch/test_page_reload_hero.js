const http = require('http');
const fs = require('fs');

http.get('http://localhost:9222/json', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const tabs = JSON.parse(d);
    const tab = tabs.find(t => t.url.includes('localhost:3000') && t.webSocketDebuggerUrl);
    if (!tab) {
      console.error('No tab found on localhost:3000');
      process.exit(1);
    }
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.onopen = () => {
      // Reload page
      ws.send(JSON.stringify({
        id: 1,
        method: 'Page.reload',
        params: { ignoreCache: true }
      }));
    };
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id === 1) {
        console.log('Page reload triggered. Waiting 9.5s for intro & hero load...');
        setTimeout(() => {
          // Check state
          ws.send(JSON.stringify({
            id: 2,
            method: 'Runtime.evaluate',
            params: {
              expression: `(() => {
                const page = window.$?.instances?.get('page');
                let heroBt = null;
                if (page?.instances) {
                  page.instances.forEach((v, k) => {
                    if (v?.key?.includes('hero_extended') || (k?.dataset?.component === 'blocks/backdrop_theme' && k?.closest('.ll-section--hero_extended'))) {
                      heroBt = v;
                    }
                  });
                }
                const cu = heroBt?.gridLayer?.uniforms?.get('u_content');
                return {
                  engineLoaded: !!window.__heroAvatarEngine,
                  heroBtFound: !!heroBt,
                  playerTag: cu?.value?.player?.tagName,
                  u_nogrid: heroBt?.gridLayer?.uniforms?.get('u_nogrid')?.value,
                  u_content_theme: heroBt?.gridLayer?.uniforms?.get('u_content_theme')?.value,
                  u_render_content: heroBt?.gridLayer?.uniforms?.get('u_render_content')?.value,
                  u_reveal_progress: heroBt?.gridLayer?.uniforms?.get('u_reveal_progress')?.value
                };
              })()`,
              returnByValue: true
            }
          }));
        }, 9500);
      } else if (msg.id === 2) {
        console.log('Hero state after reload:', msg.result?.result?.value);
        // Capture screenshot
        ws.send(JSON.stringify({
          id: 3,
          method: 'Page.captureScreenshot',
          params: { format: 'png' }
        }));
      } else if (msg.id === 3) {
        if (msg.result?.data) {
          fs.writeFileSync('scratch/hero_avatar_live.png', Buffer.from(msg.result.data, 'base64'));
          console.log('Saved scratch/hero_avatar_live.png');
        }
        ws.close();
        process.exit(0);
      }
    };
  });
});
