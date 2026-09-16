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
        const id = Math.floor(Math.random() * 10000);
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
        const id = Math.floor(Math.random() * 10000);
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
      const info = await evaluate(`(() => {
        const sec = document.querySelector('.ll-section--services');
        const scroller = document.querySelector('.js-scroller');
        return {
          windowInner: { w: window.innerWidth, h: window.innerHeight },
          secRect: sec ? sec.getBoundingClientRect() : null,
          secOffsetTop: sec ? sec.offsetTop : null,
          scrollerHeight: scroller ? scroller.scrollHeight : null
        };
      })()`);
      console.log('Services Info:', info);

      // Scroll so services section is entered
      await evaluate(`(() => {
        const scroller = document.querySelector('.js-scroller');
        const sec = document.querySelector('.ll-section--services');
        if (scroller && sec) {
          scroller.scrollTop = sec.offsetTop - 100;
          scroller.dispatchEvent(new Event('scroll'));
          window.dispatchEvent(new Event('scroll'));
        }
      })()`);
      await new Promise(r => setTimeout(r, 600));
      await screenshot('live_services_scroll_entry.png');

      // Scroll so services section is centered
      await evaluate(`(() => {
        const scroller = document.querySelector('.js-scroller');
        const sec = document.querySelector('.ll-section--services');
        if (scroller && sec) {
          scroller.scrollTop = sec.offsetTop + (sec.clientHeight - window.innerHeight) / 2;
          scroller.dispatchEvent(new Event('scroll'));
          window.dispatchEvent(new Event('scroll'));
        }
      })()`);
      await new Promise(r => setTimeout(r, 600));
      await screenshot('live_services_scroll_mid.png');

      // Scroll so services section is exiting
      await evaluate(`(() => {
        const scroller = document.querySelector('.js-scroller');
        const sec = document.querySelector('.ll-section--services');
        if (scroller && sec) {
          scroller.scrollTop = sec.offsetTop + sec.clientHeight - 150;
          scroller.dispatchEvent(new Event('scroll'));
          window.dispatchEvent(new Event('scroll'));
        }
      })()`);
      await new Promise(r => setTimeout(r, 600));
      await screenshot('live_services_scroll_exit.png');

      ws.close();
    };
  });
});
