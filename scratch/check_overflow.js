const { spawn } = require('child_process');
const http = require('http');

async function check() {
  const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless=new',
    '--remote-debugging-port=9226',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1440,900',
    'http://localhost:3010/'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  http.get('http://localhost:9226/json', (res) => {
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

        await new Promise(r => setTimeout(r, 4500));

        const info = await send('Runtime.evaluate', {
          expression: `(() => {
            return {
              bodyStyle: document.body.getAttribute('style'),
              bodyClass: document.body.className,
              htmlStyle: document.documentElement.getAttribute('style'),
              htmlClass: document.documentElement.className,
              matchedBodyRules: Array.from(document.styleSheets).flatMap(sheet => {
                try {
                  return Array.from(sheet.cssRules).filter(r => r.selectorText && (r.selectorText.includes('body') || r.selectorText.includes('html')) && r.cssText.includes('overflow'));
                } catch(e) { return []; }
              }).map(r => r.cssText)
            };
          })()`,
          returnByValue: true
        });

        console.log('Overflow Inspection:', JSON.stringify(info.result.value, null, 2));

        ws.close();
        edge.kill();
        process.exit(0);
      };
    });
  });
}
check();
