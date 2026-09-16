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
      // 1. Scroll so top of services enters (Start / Entry gradient)
      await evaluate(`(() => {
        const scroller = document.querySelector('.js-scroller');
        scroller.scrollTop = 3050;
        scroller.dispatchEvent(new Event('scroll'));
        window.dispatchEvent(new Event('scroll'));
      })()`);
      await new Promise(r => setTimeout(r, 600));
      await screenshot('services_scroll_entry.png');

      // 2. Scroll so services is centered (Mid view)
      await evaluate(`(() => {
        const scroller = document.querySelector('.js-scroller');
        scroller.scrollTop = 3450;
        scroller.dispatchEvent(new Event('scroll'));
        window.dispatchEvent(new Event('scroll'));
      })()`);
      await new Promise(r => setTimeout(r, 600));
      await screenshot('services_scroll_mid.png');

      // 3. Scroll so bottom of services exits (End / Exit gradient)
      await evaluate(`(() => {
        const scroller = document.querySelector('.js-scroller');
        scroller.scrollTop = 3850;
        scroller.dispatchEvent(new Event('scroll'));
        window.dispatchEvent(new Event('scroll'));
      })()`);
      await new Promise(r => setTimeout(r, 600));
      await screenshot('services_scroll_exit.png');

      ws.close();
    };
  });
});
