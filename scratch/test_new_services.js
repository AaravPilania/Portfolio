const http = require('http');
const fs = require('fs');

http.get('http://localhost:9222/json', (res) => {
  let d = ''; res.on('data', c => d += c);
  res.on('end', () => {
    const tabs = JSON.parse(d);
    const tab = tabs.find(t => t.url.includes('localhost:3000') && t.webSocketDebuggerUrl);
    if (!tab) return console.log('no tab');
    const ws = new WebSocket(tab.webSocketDebuggerUrl);

    function evaluate(expr) {
      return new Promise((resolve) => {
        const id = Math.floor(Math.random() * 100000);
        const handler = (msg) => {
          const data = JSON.parse(msg.data);
          if (data.id === id) {
            ws.removeEventListener('message', handler);
            resolve(data.result?.result?.value);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true } }));
      });
    }

    function screenshot(name) {
      return new Promise((resolve) => {
        const id = Math.floor(Math.random() * 100000);
        const handler = (msg) => {
          const data = JSON.parse(msg.data);
          if (data.id === id) {
            ws.removeEventListener('message', handler);
            if (data.result?.data) {
              fs.writeFileSync(`scratch/${name}`, Buffer.from(data.result.data, 'base64'));
              console.log(`Saved scratch/${name}`);
            }
            resolve();
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id, method: 'Page.captureScreenshot', params: { format: 'png' } }));
      });
    }

    ws.onopen = async () => {
      // Wait until loader is dismissed
      console.log('Waiting for loader to complete...');
      for (let i = 0; i < 30; i++) {
        const isLoaded = await evaluate(`(() => {
          const l = document.querySelector('.js-loader');
          if (!l) return true;
          if (l.classList.contains('is-loaded') || window.getComputedStyle(l).opacity === '0' || window.getComputedStyle(l).display === 'none') return true;
          // Force dismiss if stuck over 3 seconds
          if (${i} > 15) {
            l.classList.add('is-loaded');
            return true;
          }
          return false;
        })()`);
        if (isLoaded) {
          console.log('Loader complete!');
          break;
        }
        await new Promise(r => setTimeout(r, 200));
      }

      await new Promise(r => setTimeout(r, 1000));

      const secInfo = await evaluate(`(() => {
        const sec = document.querySelector('.ll-section--services');
        const scroller = document.querySelector('.js-scroller');
        return {
          offsetTop: sec ? sec.offsetTop : null,
          clientHeight: sec ? sec.clientHeight : null,
          scrollerTop: scroller ? scroller.scrollTop : null
        };
      })()`);
      console.log('Services Section Info:', secInfo);

      // 1. Scroll to entry
      await evaluate(`(() => {
        const scroller = document.querySelector('.js-scroller');
        const sec = document.querySelector('.ll-section--services');
        if (scroller && sec) {
          scroller.scrollTop = sec.offsetTop - 140;
          scroller.dispatchEvent(new Event('scroll'));
          window.dispatchEvent(new Event('scroll'));
        }
      })()`);
      await new Promise(r => setTimeout(r, 800));
      await screenshot('new_services_scroll_entry.png');

      // 2. Scroll to mid
      await evaluate(`(() => {
        const scroller = document.querySelector('.js-scroller');
        const sec = document.querySelector('.ll-section--services');
        if (scroller && sec) {
          scroller.scrollTop = sec.offsetTop + (sec.clientHeight - window.innerHeight) / 2;
          scroller.dispatchEvent(new Event('scroll'));
          window.dispatchEvent(new Event('scroll'));
        }
      })()`);
      await new Promise(r => setTimeout(r, 800));
      await screenshot('new_services_scroll_mid.png');

      // 3. Scroll to exit
      await evaluate(`(() => {
        const scroller = document.querySelector('.js-scroller');
        const sec = document.querySelector('.ll-section--services');
        if (scroller && sec) {
          scroller.scrollTop = sec.offsetTop + sec.clientHeight - 200;
          scroller.dispatchEvent(new Event('scroll'));
          window.dispatchEvent(new Event('scroll'));
        }
      })()`);
      await new Promise(r => setTimeout(r, 800));
      await screenshot('new_services_scroll_exit.png');

      ws.close();
    };
  });
});
