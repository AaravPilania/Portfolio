const http = require('http');
const fs = require('fs');

http.get('http://localhost:9222/json', res => {
  let raw = '';
  res.on('data', c => raw += c);
  res.on('end', async () => {
    const list = JSON.parse(raw);
    const tab = list.find(t => t.url && t.url.includes('localhost:3000') && !t.url.includes('coded-avatar')) || list[0];
    if (!tab) {
      console.error('No localhost:3000 tab found');
      process.exit(1);
    }
    console.log('Targeting tab:', tab.title, tab.url);

    const ws = new WebSocket(tab.webSocketDebuggerUrl);

    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = Math.floor(Math.random() * 1000000);
        const timeout = setTimeout(() => {
          ws.removeEventListener('message', handler);
          reject(new Error(`Timeout for ${method}`));
        }, 10000);

        const handler = (event) => {
          const msg = JSON.parse(event.data);
          if (msg.id === id) {
            clearTimeout(timeout);
            ws.removeEventListener('message', handler);
            resolve(msg.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    ws.onopen = async () => {
      console.log('Connected to CDP');
      await send('Page.enable');
      await send('Runtime.enable');

      const freshUrl = 'http://localhost:3000/?fresh=' + Date.now();
      console.log('Navigating to', freshUrl);
      await send('Page.navigate', { url: freshUrl });

      // t = 1.0s: intro central AP logo
      setTimeout(async () => {
        console.log('Capturing intro at 1.0s...');
        try {
          const shot = await send('Page.captureScreenshot', { format: 'png' });
          if (shot?.data) {
            fs.writeFileSync('scratch/live_intro_1000ms.png', Buffer.from(shot.data, 'base64'));
            console.log('Saved scratch/live_intro_1000ms.png');
          }
        } catch (e) { console.error('Error shot 1s:', e.message); }
      }, 1000);

      // t = 2.2s: intro progression
      setTimeout(async () => {
        console.log('Capturing intro at 2.2s...');
        try {
          const shot = await send('Page.captureScreenshot', { format: 'png' });
          if (shot?.data) {
            fs.writeFileSync('scratch/live_intro_2200ms.png', Buffer.from(shot.data, 'base64'));
            console.log('Saved scratch/live_intro_2200ms.png');
          }
        } catch (e) { console.error('Error shot 2.2s:', e.message); }
      }, 2200);

      // t = 3.2s: intro grid fill
      setTimeout(async () => {
        console.log('Capturing intro at 3.2s...');
        try {
          const shot = await send('Page.captureScreenshot', { format: 'png' });
          if (shot?.data) {
            fs.writeFileSync('scratch/live_intro_3200ms.png', Buffer.from(shot.data, 'base64'));
            console.log('Saved scratch/live_intro_3200ms.png');
          }
        } catch (e) { console.error('Error shot 3.2s:', e.message); }
      }, 3200);

      // t = 5.2s: revealed hero & navbar
      setTimeout(async () => {
        console.log('Capturing revealed page & navbar...');
        try {
          const shot = await send('Page.captureScreenshot', { format: 'png' });
          if (shot?.data) {
            fs.writeFileSync('scratch/live_revealed_navbar.png', Buffer.from(shot.data, 'base64'));
            console.log('Saved scratch/live_revealed_navbar.png');
          }
        } catch (e) { console.error('Error shot revealed:', e.message); }

        // Scroll to work section transition
        console.log('Scrolling to work section...');
        await send('Runtime.evaluate', {
          expression: `
            window.scrollTo({ top: 750, behavior: 'instant' });
            document.documentElement.scrollTop = 750;
            document.body.scrollTop = 750;
          `
        });

        setTimeout(async () => {
          console.log('Capturing work transition at scroll 750px...');
          try {
            const shot = await send('Page.captureScreenshot', { format: 'png' });
            if (shot?.data) {
              fs.writeFileSync('scratch/live_work_transition.png', Buffer.from(shot.data, 'base64'));
              console.log('Saved scratch/live_work_transition.png');
            }
          } catch (e) { console.error('Error shot work:', e.message); }

          ws.close();
          console.log('Visual capture complete.');
          process.exit(0);
        }, 1200);
      }, 5200);
    };

    ws.onerror = err => {
      console.error('WS Error:', err);
      process.exit(1);
    };
  });
});
