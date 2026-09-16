const http = require('http');
const fs = require('fs');
const path = require('path');

http.get('http://localhost:9222/json', (res) => {
  let d = ''; res.on('data', c => d += c);
  res.on('end', () => {
    const tabs = JSON.parse(d);
    const tab = tabs.find(t => t.url.includes('localhost:3000') && t.webSocketDebuggerUrl);
    if (!tab) return console.log('no tab found');
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    
    let step = 0;

    ws.onopen = () => {
      console.log('Connected to Chrome tab. Enabling Runtime & Log and reloading...');
      ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
      ws.send(JSON.stringify({ id: 2, method: 'Log.enable' }));
      ws.send(JSON.stringify({ id: 3, method: 'Page.reload', params: { ignoreCache: true } }));
    };

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.method === 'Runtime.consoleAPICalled') {
        console.log('[BROWSER]', msg.params.type, msg.params.args.map(a => a.value || a.description).join(' '));
      } else if (msg.method === 'Runtime.exceptionThrown') {
        console.error('[BROWSER ERR]', msg.params.exceptionDetails.text, msg.params.exceptionDetails.exception?.description);
      }

      if (msg.id === 3) {
        console.log('Page reloaded. Waiting 6.5s for entrance animations...');
        setTimeout(checkHeroState, 6500);
      } else if (msg.id === 10 && msg.result?.result) {
        console.log('Hero State:', JSON.stringify(msg.result.result.value, null, 2));
        // Take screenshot 1: Hero slide
        ws.send(JSON.stringify({ id: 11, method: 'Page.captureScreenshot', params: { format: 'png' } }));
      } else if (msg.id === 11 && msg.result?.data) {
        fs.writeFileSync(path.join(__dirname, '../public/test_slide1_hero.png'), Buffer.from(msg.result.data, 'base64'));
        console.log('Saved public/test_slide1_hero.png');

        // Test mouse movement (look top-right)
        console.log('Dispatching mouse move top-right...');
        ws.send(JSON.stringify({
          id: 12,
          method: 'Input.dispatchMouseEvent',
          params: { type: 'mouseMoved', x: 1400, y: 150 }
        }));
        setTimeout(() => {
          ws.send(JSON.stringify({ id: 13, method: 'Page.captureScreenshot', params: { format: 'png' } }));
        }, 500);
      } else if (msg.id === 13 && msg.result?.data) {
        fs.writeFileSync(path.join(__dirname, '../public/test_slide1_look_top_right.png'), Buffer.from(msg.result.data, 'base64'));
        console.log('Saved public/test_slide1_look_top_right.png');

        // Now test scroll down 350px for particle shader transition
        console.log('Scrolling down 350px for particle shader transition...');
        ws.send(JSON.stringify({
          id: 20,
          method: 'Runtime.evaluate',
          params: {
            expression: `(() => {
              const scroller = document.querySelector('.ll-scroller');
              if (scroller) {
                scroller.scrollTop = 350;
                window.dispatchEvent(new Event('scroll'));
                return { scrollerFound: true, scrollTop: scroller.scrollTop };
              }
              window.scrollTo(0, 350);
              return { scrollerFound: false, scrollY: window.scrollY };
            })()`,
            returnByValue: true
          }
        }));
        setTimeout(() => {
          ws.send(JSON.stringify({ id: 21, method: 'Page.captureScreenshot', params: { format: 'png' } }));
        }, 600);
      } else if (msg.id === 21 && msg.result?.data) {
        fs.writeFileSync(path.join(__dirname, '../public/test_transition_350px.png'), Buffer.from(msg.result.data, 'base64'));
        console.log('Saved public/test_transition_350px.png');

        // Scroll down further to Slide 2 (1200px)
        console.log('Scrolling down 1200px to Slide 2...');
        ws.send(JSON.stringify({
          id: 30,
          method: 'Runtime.evaluate',
          params: {
            expression: `(() => {
              const scroller = document.querySelector('.ll-scroller');
              if (scroller) {
                scroller.scrollTop = 1200;
                window.dispatchEvent(new Event('scroll'));
                return { scrollerFound: true, scrollTop: scroller.scrollTop };
              }
              window.scrollTo(0, 1200);
              return { scrollerFound: false, scrollY: window.scrollY };
            })()`,
            returnByValue: true
          }
        }));
        setTimeout(() => {
          ws.send(JSON.stringify({ id: 31, method: 'Page.captureScreenshot', params: { format: 'png' } }));
        }, 600);
      } else if (msg.id === 31 && msg.result?.data) {
        fs.writeFileSync(path.join(__dirname, '../public/test_slide2_clean.png'), Buffer.from(msg.result.data, 'base64'));
        console.log('Saved public/test_slide2_clean.png');
        console.log('All tests completed successfully!');
        ws.close();
        process.exit(0);
      }
    };

    function checkHeroState() {
      ws.send(JSON.stringify({
        id: 10,
        method: 'Runtime.evaluate',
        params: {
          expression: `(() => {
            const hasAvatarEngine = !!window.__heroAvatarEngine;
            const hero = document.querySelector('.ll-section--hero_extended');
            const videos = hero ? Array.from(hero.querySelectorAll('video')).map(v => ({
              src: v.src || v.currentSrc,
              paused: v.paused,
              style: v.getAttribute('style')
            })) : [];
            const canvas = document.querySelector('.js-canvas');
            return {
              hasAvatarEngine,
              heroFound: !!hero,
              heroVideos: videos,
              webglCanvasWidth: canvas ? canvas.width : null,
              webglCanvasHeight: canvas ? canvas.height : null
            };
          })()`,
          returnByValue: true
        }
      }));
    }
  });
});
