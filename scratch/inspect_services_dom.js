const http = require('http');
const { spawn } = require('child_process');

async function inspect() {
  const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless=new',
    '--remote-debugging-port=9295',
    '--window-size=1440,900',
    'http://localhost:3010/'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  http.get('http://localhost:9295/json', res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', async () => {
      const tab = JSON.parse(d).find(t => t.type === 'page');
      const ws = new WebSocket(tab.webSocketDebuggerUrl);
      let id = 0;
      function send(method, params = {}) {
        return new Promise(resolve => {
          const curId = ++id;
          const handler = evt => {
            const data = JSON.parse(evt.data);
            if (data.id === curId) {
              ws.removeEventListener('message', handler);
              resolve(data.result);
            }
          };
          ws.addEventListener('message', handler);
          ws.send(JSON.stringify({ id: curId, method, params }));
        });
      }

      ws.onopen = async () => {
        await send('Runtime.enable');
        async function evalCode(exp) {
          const res = await send('Runtime.evaluate', { expression: exp, returnByValue: true });
          return res.result.value;
        }

        console.log('--- Scroll to 3618: ---');
        await evalCode(`(() => {
          const s = document.querySelector('.ll-scroller');
          s.scrollTop = 3618;
          s.dispatchEvent(new Event('scroll'));
        })()`);
        await new Promise(r => setTimeout(r, 1000));

        const topEl = await evalCode(`(() => {
          const el = document.elementFromPoint(100, 250);
          return {
            tag: el ? el.tagName : null,
            cls: el ? el.className : null,
            id: el ? el.id : null,
            color: el ? window.getComputedStyle(el).color : null,
            bg: el ? window.getComputedStyle(el).backgroundColor : null,
            zIndex: el ? window.getComputedStyle(el).zIndex : null
          };
        })()`);
        console.log('Top element at (100, 250):', JSON.stringify(topEl, null, 2));

        const info = await evalCode(`(() => {
          const sec = document.querySelector('.ll-section--services');
          const h2 = sec ? sec.querySelector('h2') : null;
          const container = sec ? sec.querySelector('.ll-container') : null;
          const textContainers = sec ? Array.from(sec.querySelectorAll('.js-text-container')).map(el => ({
            tag: el.tagName,
            cls: el.className,
            text: el.textContent.trim().slice(0, 30),
            opacity: window.getComputedStyle(el).opacity,
            vis: window.getComputedStyle(el).visibility,
            rect: el.getBoundingClientRect()
          })) : [];

          function getBox(el) {
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return { top: Math.round(r.top), left: Math.round(r.left), width: Math.round(r.width), height: Math.round(r.height) };
          }

          return {
            secRect: getBox(sec),
            containerRect: getBox(container),
            containerZIndex: container ? window.getComputedStyle(container).zIndex : null,
            containerOpacity: container ? window.getComputedStyle(container).opacity : null,
            secZIndex: sec ? window.getComputedStyle(sec).zIndex : null,
            h2Text: h2 ? h2.textContent.trim().slice(0, 40) : null,
            h2Opacity: h2 ? window.getComputedStyle(h2).opacity : null,
            h2Vis: h2 ? window.getComputedStyle(h2).visibility : null,
            h2Rect: getBox(h2),
            meaningfulDiv: (() => {
              const div = Array.from(sec.querySelectorAll('div')).find(d => d.textContent.includes('meaningful brands'));
              return div ? {
                text: div.textContent.trim().slice(0, 30),
                cls: div.className,
                rect: getBox(div),
                opacity: window.getComputedStyle(div).opacity,
                vis: window.getComputedStyle(div).visibility,
                display: window.getComputedStyle(div).display
              } : null;
            })()
          };
        })()`);

        console.log(JSON.stringify(info, null, 2));

        ws.close();
        edge.kill();
        process.exit(0);
      };
    });
  });
}

inspect().catch(err => { console.error(err); process.exit(1); });
