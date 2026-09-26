const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

async function testScroller() {
  const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless=new',
    '--remote-debugging-port=9228',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1440,900',
    'http://localhost:3010/'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  http.get('http://localhost:9228/json', (res) => {
    let raw = '';
    res.on('data', c => raw += c);
    res.on('end', async () => {
      const list = JSON.parse(raw);
      const tab = list.find(t => t.type === 'page');
      const ws = new WebSocket(tab.webSocketDebuggerUrl);

      ws.onopen = async () => {
        let id = 0;
        function send(method, params = {}) {
          return new Promise(res => {
            const curId = ++id;
            const h = (evt) => {
              const d = JSON.parse(evt.data);
              if (d.id === curId) { ws.removeEventListener('message', h); res(d.result); }
            };
            ws.addEventListener('message', h);
            ws.send(JSON.stringify({ id: curId, method, params }));
          });
        }

        await new Promise(r => setTimeout(r, 5000));

        const scrollInfo = await send('Runtime.evaluate', {
          expression: `(() => {
            const scroller = document.querySelector('.ll-scroller, .js-scroller') || document.querySelector('main');
            const sec = document.querySelector('.ll-section--services');
            const projects = document.querySelector('#section-projects');
            const contact = document.querySelector('.ll-section--services .ll-block--contact-card');
            const logos = document.querySelector('.ll-section--logos');

            return {
              hasScroller: !!scroller,
              scrollerTag: scroller ? scroller.tagName + '.' + scroller.className : null,
              scrollerHeight: scroller ? scroller.scrollHeight : null,
              scrollerScrollTop: scroller ? scroller.scrollTop : null,
              secTop: sec ? sec.offsetTop : null,
              projectsTop: projects ? projects.offsetTop : null
            };
          })()`,
          returnByValue: true
        });

        console.log('Scroller info:', JSON.stringify(scrollInfo.result.value, null, 2));

        // Now scroll the scroller to the services section!
        await send('Runtime.evaluate', {
          expression: `(() => {
            const scroller = document.querySelector('.ll-scroller, .js-scroller') || document.querySelector('main');
            const sec = document.querySelector('.ll-section--services');
            if (scroller && sec) {
              scroller.scrollTop = sec.offsetTop;
            }
          })()`
        });

        await new Promise(r => setTimeout(r, 1500));

        const shotTop = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('scratch/services_scrolled_top.png', Buffer.from(shotTop.data, 'base64'));
        console.log('Saved scratch/services_scrolled_top.png');

        // Scroll scroller 400px down
        await send('Runtime.evaluate', {
          expression: `(() => {
            const scroller = document.querySelector('.ll-scroller, .js-scroller') || document.querySelector('main');
            if (scroller) scroller.scrollTop += 400;
          })()`
        });

        await new Promise(r => setTimeout(r, 1200));

        const shotMid = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('scratch/services_scrolled_mid.png', Buffer.from(shotMid.data, 'base64'));
        console.log('Saved scratch/services_scrolled_mid.png');

        // Scroll scroller 400px more down
        await send('Runtime.evaluate', {
          expression: `(() => {
            const scroller = document.querySelector('.ll-scroller, .js-scroller') || document.querySelector('main');
            if (scroller) scroller.scrollTop += 400;
          })()`
        });

        await new Promise(r => setTimeout(r, 1200));

        const shotBottom = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('scratch/services_scrolled_bottom.png', Buffer.from(shotBottom.data, 'base64'));
        console.log('Saved scratch/services_scrolled_bottom.png');

        ws.close();
        edge.kill();
        process.exit(0);
      };
    });
  });
}
testScroller();
